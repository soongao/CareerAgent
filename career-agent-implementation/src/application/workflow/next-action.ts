import type { ActionCandidate, DecisionContext, NextActionDecision } from "../../domain/types.js";
import type { StructuredLLM } from "../../infrastructure/llm/structured-llm.js";
import { newId, nowIso } from "../../shared/utils.js";

const SYSTEM=`You are the Next Action decision service for a longitudinal career agent. Select exactly ONE action from the allowed candidates. Optimize current Target Job readiness under time constraints; without a job optimize active Career Target readiness. Distinguish unknown/stale from weak. Do not invent requirements. Explicit user intent wins over recommendation unless runtime candidates disallow it. Prefer assessment for important uncertainty, learning/review for confirmed gaps, interview practice when knowledge is strong but interview performance is weak, resume/evidence action for factual support problems, and NO_ACTION when no material blocker exists. Return JSON: {action,target?,reason,expectedOutcome,priority,alternative?}.`;
export class NextActionDecider {
  constructor(private readonly llm:StructuredLLM){}
  async decide(ctx:DecisionContext):Promise<NextActionDecision>{
    const allowed=ctx.candidates.filter(c=>c.allowed);const response=await this.llm.complete<any>({name:"workflow.next_action",system:SYSTEM,input:ctx,promptVersion:"next-action-v1",allowedValues:{action:allowed.map(x=>x.action)}}); const o=response.output;
    const candidate=allowed.find(c=>c.action===o.action); if(!candidate) return {schemaVersion:1,id:newId("decision"),action:"NO_ACTION",reason:"Model selected an action outside runtime policy; runtime rejected it.",expectedOutcome:"Preserve workflow invariants and request a new decision.",priority:"low",generatedAt:nowIso(),model:response.model,promptVersion:"next-action-v1"};
    let competencyIds:string[]|undefined=o.target?.competencyIds; if(competencyIds&&candidate.targetCompetencyIds){const valid=competencyIds.filter((id:string)=>candidate.targetCompetencyIds!.includes(id));competencyIds=valid.length?valid:undefined;}
    const targetJobId=ctx.mode==="target_job" ? (ctx.target as any).id : o.target?.targetJobId;
    return {schemaVersion:1,id:newId("decision"),action:candidate.action,target:{...o.target,competencyIds,targetJobId},reason:String(o.reason||"Model selected this allowed action."),expectedOutcome:String(o.expectedOutcome||"Improve readiness."),priority:["high","medium","low"].includes(o.priority)?o.priority:"medium",alternative:o.alternative,generatedAt:nowIso(),model:response.model,promptVersion:"next-action-v1"};
  }
}
