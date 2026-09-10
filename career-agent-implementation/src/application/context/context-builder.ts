import type { DecisionContext, Evidence, RoleCompetencyProfile } from "../../domain/types.js";
import { FileWorkspace } from "../../infrastructure/filesystem/file-workspace.js";
import { buildReadiness } from "../readiness/readiness.js";
import { CandidateBuilder } from "../workflow/candidate-builder.js";

export class ContextBuilder {
  constructor(private readonly ws:FileWorkspace,private readonly candidates:CandidateBuilder){}
  async buildDecisionContext(userIntent?:string):Promise<DecisionContext>{
    const active=await this.ws.getActiveTargets(); const careers=await this.ws.getCareerTargets(); const jobs=await this.ws.getTargetJobs();
    const job=jobs.find(j=>j.id===active.activeTargetJobId); const career=careers.find(c=>c.id===(job?.careerTargetId??active.activeCareerTargetId)); if(!career)throw new Error("No active Career Target");
    const scope=job?"target_job":"career" as const; const scopeId=job?.id??career.id; const role=await this.ws.getRoleProfile(scope,scopeId); if(!role)throw new Error(`Missing role profile for ${scope}:${scopeId}`);
    const model=await this.ws.getUserModel(), evidence=await this.ws.getEvidence(), claimSupport=await this.ws.getClaimSupport(), wf=await this.ws.getWorkflow();
    const readiness=buildReadiness(role,model,claimSupport,job); const candidates=await this.candidates.build({mode:scope,target:job??career,role,readiness,workflow:wf});
    return {mode:scope,target:job??career,readiness,topCompetencyGaps:readiness.gaps.slice(0,12),interview:Object.values(model.interview),evidence,claimSupport,timeConstraint:readiness.timeConstraint,recentActions:wf.recentActions.slice(-12),userIntent,candidates};
  }
  async buildTaskContext(type:"assessment"|"tutor"|"interview",input:any):Promise<Record<string,unknown>>{
    const active=await this.ws.getActiveTargets(), model=await this.ws.getUserModel(), evidence=await this.ws.getEvidence(), claims=await this.ws.getResumeClaims();
    const jobs=await this.ws.getTargetJobs(), careers=await this.ws.getCareerTargets(); const job=jobs.find(j=>j.id===active.activeTargetJobId); const career=careers.find(c=>c.id===active.activeCareerTargetId); const ids:string[]=input.competencyIds??(input.competencyId?[input.competencyId]:[]);
    const competencyState=Object.fromEntries(ids.map(id=>[id,model.competencies[id]])); const recent=(await this.ws.getActiveObservations()).filter(o=>o.target.type==="competency"&&ids.includes((o.target as any).competencyId)).slice(-10);
    const base={type,input,target:{career,job},competencyState,recentObservations:recent,preferences:model.preferences};
    if(type==="interview")return{...base,interview:Object.values(model.interview),evidence,claims,targetResume:job?await this.ws.readText(`resumes/targets/${job.id}.md`,await this.ws.readText("resumes/master.md")):await this.ws.readText("resumes/master.md")};
    return base;
  }
}
