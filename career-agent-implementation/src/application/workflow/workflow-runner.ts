import type { NextActionDecision } from "../../domain/types.js";
import { FileWorkspace } from "../../infrastructure/filesystem/file-workspace.js";
import { ContextBuilder } from "../context/context-builder.js";
import { NextActionDecider } from "./next-action.js";
import { newId, nowIso } from "../../shared/utils.js";
export class CareerWorkflowRunner{
  constructor(private readonly ws:FileWorkspace,private readonly context:ContextBuilder,private readonly decider:NextActionDecider){}
  async recommend(userIntent?:string):Promise<{decision:NextActionDecision;context:unknown}>{const trace=newId("trace");await this.ws.runtimeEvent("workflow.run.started",trace,{userIntent});const ctx=await this.context.buildDecisionContext(userIntent);const decision=await this.decider.decide(ctx);await this.ws.runtimeEvent("workflow.decision.created",trace,decision,{decisionId:decision.id});return{decision,context:ctx};}
  async recordAction(decision:NextActionDecision,status:"completed"|"cancelled"|"failed",producedUsefulObservation:boolean,materiallyChangedState:boolean):Promise<void>{const wf=await this.ws.getWorkflow();const targetKey=[decision.action,...(decision.target?.competencyIds??[]),decision.target?.targetJobId??""].join(":");await this.ws.saveWorkflow({...wf,recentActions:[...wf.recentActions,{action:decision.action,targetKey,status,producedUsefulObservation,materiallyChangedState,timestamp:nowIso()}].slice(-50),updatedAt:nowIso()});}
}
