import type { ClaimSupport, ReadinessBlocker, ReadinessProfile, RoleCompetencyProfile, TargetJob, UserModel } from "../../domain/types.js";
import { newId, nowIso } from "../../shared/utils.js";

export interface ReadinessConfig { uncertaintyThreshold:number; weakMasteryThreshold:number; highImportance:number }
export const defaultReadinessConfig:ReadinessConfig={uncertaintyThreshold:0.45,weakMasteryThreshold:0.55,highImportance:0.7};

export function buildReadiness(profile:RoleCompetencyProfile,user:UserModel,claimSupport:ClaimSupport[],target?:TargetJob,cfg:ReadinessConfig=defaultReadinessConfig):ReadinessProfile{
  const blockers:ReadinessBlocker[]=[];
  const gaps=profile.requirements.map(r=>{const s=user.competencies[r.competencyId]; const mastery=s?.mastery??null, conf=s?.effectiveConfidence??0, status=s?.status??"unknown"; const gap=mastery===null?null:Math.max(0,r.requiredMastery-mastery);
    if(r.importance>=cfg.highImportance && (status!=="current" || conf<cfg.uncertaintyThreshold)) blockers.push({id:newId("block"),type:"uncertainty",severity:r.importance>0.85?"high":"medium",title:`Uncertain: ${r.competencyId}`,rationale:`Important requirement (${r.importance.toFixed(2)}) lacks fresh, confident evidence.`,competencyId:r.competencyId});
    else if(r.importance>=cfg.highImportance && mastery!==null && mastery<Math.min(cfg.weakMasteryThreshold,r.requiredMastery)) blockers.push({id:newId("block"),type:"competency",severity:r.importance>0.85?"high":"medium",title:`Competency gap: ${r.competencyId}`,rationale:`Current mastery evidence is below the target requirement.`,competencyId:r.competencyId});
    return {competencyId:r.competencyId,importance:r.importance,requiredMastery:r.requiredMastery,mastery,effectiveConfidence:conf,status,gap};});
  for(const d of ["clarity","structure","follow_up_stability"] as const){const s=user.interview[d]; if(s?.value!=null && s.effectiveConfidence>=0.35 && s.value<0.5) blockers.push({id:newId("block"),type:"interview",severity:"medium",title:`Interview ${d} is weak`,rationale:"Observed interview performance is weaker than underlying knowledge.",interviewDimension:d});}
  for(const cs of claimSupport.filter(x=>x.level==="unsupported"||x.level==="partial")) blockers.push({id:newId("block"),type:"evidence_resume",severity:cs.level==="unsupported"?"high":"medium",title:"Resume claim lacks support",rationale:cs.rationale,claimId:cs.claimId});
  let timeConstraint:ReadinessProfile["timeConstraint"]|undefined; if(target){const date=target.interviewDate||target.deadline; if(date){const days=Math.ceil((new Date(date).getTime()-Date.now())/86400000);timeConstraint={daysRemaining:days,interviewDate:target.interviewDate,deadline:target.deadline};}}
  return {schemaVersion:1,mode:profile.scope==="target_job"?"target_job":"career",scopeId:profile.scopeId,generatedAt:nowIso(),gaps:gaps.sort((a,b)=>b.importance-a.importance),blockers,ready:blockers.length===0,timeConstraint};
}
