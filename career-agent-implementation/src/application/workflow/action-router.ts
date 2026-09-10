import type { NextActionDecision } from "../../domain/types.js";
import { ContextBuilder } from "../context/context-builder.js";
import { BaseTaskRuntime } from "../../agents/base-task-runtime.js";
import { RoleAnalysisService } from "./role-analysis.js";
import { EvidenceService } from "../../evidence/evidence-service.js";
import { ResumeService } from "../../resume/resume-service.js";
import { MaintenanceService } from "../../maintenance/maintenance.js";

export type RouteResult =
  | {kind:"interactive_started";taskId:string;message:string}
  | {kind:"automatic_completed";result:unknown}
  | {kind:"needs_input";message:string}
  | {kind:"no_action";message:string};

export class ActionRouter{
  constructor(private readonly context:ContextBuilder,private readonly tasks:BaseTaskRuntime,private readonly role:RoleAnalysisService,private readonly evidence:EvidenceService,private readonly resume:ResumeService,private readonly maintenance:MaintenanceService){}
  async route(decision:NextActionDecision,opts:{confirmed?:boolean;evidencePaths?:string[];marketEvidence?:string}={}):Promise<RouteResult>{
    if(decision.action==="NO_ACTION")return{kind:"no_action",message:decision.reason};
    if(["ASSESS","LEARN","REVIEW","MOCK_INTERVIEW"].includes(decision.action)&&!opts.confirmed)return{kind:"needs_input",message:"This action starts an interactive task and requires user confirmation."};
    if(decision.action==="ASSESS"){const id=decision.target?.competencyIds?.[0];if(!id)return{kind:"needs_input",message:"Assessment requires a target competency."};const input={competencyId:id,targetJobId:decision.target?.targetJobId};const ctx=await this.context.buildTaskContext("assessment",input);const r=await this.tasks.start("assessment",input,ctx);return{kind:"interactive_started",taskId:r.task.id,message:r.message};}
    if(decision.action==="LEARN"||decision.action==="REVIEW"){const ids=decision.target?.competencyIds??[];if(!ids.length)return{kind:"needs_input",message:"Tutor requires at least one target competency."};const input={competencyIds:ids,targetJobId:decision.target?.targetJobId,learningGoal:decision.expectedOutcome,review:decision.action==="REVIEW"};const ctx=await this.context.buildTaskContext("tutor",input);const r=await this.tasks.start("tutor",input,ctx);return{kind:"interactive_started",taskId:r.task.id,message:r.message};}
    if(decision.action==="MOCK_INTERVIEW"){const input={mode:"full_mock" as const,targetJobId:decision.target?.targetJobId};const ctx=await this.context.buildTaskContext("interview",input);const r=await this.tasks.start("interview",input,ctx);return{kind:"interactive_started",taskId:r.task.id,message:r.message};}
    if(decision.action==="ANALYZE_ROLE")return{kind:"automatic_completed",result:await this.role.analyze(opts.marketEvidence)};
    if(decision.action==="ANALYZE_EVIDENCE"){if(!opts.evidencePaths?.length)return{kind:"needs_input",message:"Evidence analysis requires existing material paths."};return{kind:"automatic_completed",result:await this.evidence.analyze(opts.evidencePaths)};}
    if(decision.action==="UPDATE_RESUME"){if(!opts.confirmed)return{kind:"needs_input",message:"Resume mutation requires explicit confirmation."};const jobId=decision.target?.targetJobId;if(!jobId)return{kind:"needs_input",message:"Target resume update requires targetJobId."};return{kind:"automatic_completed",result:await this.resume.draftTarget(jobId,true)};}
    if(decision.action==="REFRESH_PROFILE")return{kind:"automatic_completed",result:await this.maintenance.compactProfile()};
    return{kind:"no_action",message:"Action not routed."};
  }
}
