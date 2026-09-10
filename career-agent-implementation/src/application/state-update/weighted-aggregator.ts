import type { InterviewDimensionState, Observation, UserCompetencyState, UserModel } from "../../domain/types.js";
import { clamp, daysBetween, nowIso, uniq } from "../../shared/utils.js";

export interface StateUpdateConfig {
  version: string;
  sourceEvidenceCaps: Record<string, number>;
  minEvidenceMass: number;
  freshnessHalfLifeDays: number;
  staleThreshold: number;
}

export const defaultStateUpdateConfig: StateUpdateConfig = {
  version: "v1",
  sourceEvidenceCaps: { self_report:0.3,resume:0.25,tutor:0.7,assessment:1,interview:1,evidence:1,real_feedback:1 },
  minEvidenceMass:0.5,freshnessHalfLifeDays:180,staleThreshold:0.5,
};

type WeightedSignal={signal:number;weight:number;timestamp:string;obs:Observation};
function weighted(obs:Observation[], selector:(o:Observation)=>number|undefined, cfg:StateUpdateConfig):WeightedSignal[]{
  const out:WeightedSignal[]=[];
  for(const o of obs){const signal=selector(o); if(signal===undefined||!Number.isFinite(signal))continue; const raw=clamp(o.evidenceStrength)*clamp(o.confidence); const cap=cfg.sourceEvidenceCaps[o.source] ?? 1; const weight=Math.min(raw,cap); if(weight<=0)continue; out.push({signal:clamp(signal),weight,timestamp:o.timestamp,obs:o});}
  return out;
}
function aggregateSignals(items:WeightedSignal[], cfg:StateUpdateConfig){
  const mass=items.reduce((s,x)=>s+x.weight,0); if(mass<=0)return {value:null,mass:0,baseConfidence:0,freshness:0,effectiveConfidence:0,status:"unknown" as const,lastObservedAt:undefined};
  const value=items.reduce((s,x)=>s+x.signal*x.weight,0)/mass;
  const variance=items.reduce((s,x)=>s+x.weight*(x.signal-value)**2,0)/mass;
  const quantity=1-Math.exp(-mass/2.5); const consistency=clamp(1-variance/0.25); const baseConfidence=clamp(quantity*(0.5+0.5*consistency));
  const strong=items.filter(x=>x.weight>=0.5); const source=strong.length?strong:items; const latest=source.map(x=>x.timestamp).sort().at(-1)!;
  const freshness=Math.exp(-Math.log(2)*daysBetween(latest)/cfg.freshnessHalfLifeDays); const effectiveConfidence=baseConfidence*freshness;
  const status = mass<cfg.minEvidenceMass ? "unknown" as const : freshness<cfg.staleThreshold ? "stale" as const : "current" as const;
  return {value,mass,baseConfidence,freshness,effectiveConfidence,status,lastObservedAt:latest};
}

export function deriveUserModel(activeObservations:Observation[], previous?:UserModel, cfg:StateUpdateConfig=defaultStateUpdateConfig):UserModel{
  const compIds=uniq(activeObservations.filter(o=>o.target.type==="competency").map(o=>(o.target as {type:"competency";competencyId:string}).competencyId));
  const competencies:Record<string,UserCompetencyState>={};
  for(const id of compIds){const related=activeObservations.filter(o=>o.target.type==="competency"&&(o.target as any).competencyId===id); const a=aggregateSignals(weighted(related,o=>o.masterySignal,cfg),cfg); competencies[id]={schemaVersion:1,competencyId:id,mastery:a.value,baseConfidence:a.baseConfidence,freshness:a.freshness,effectiveConfidence:a.effectiveConfidence,status:a.status,evidenceMass:a.mass,observationCount:related.length,lastObservedAt:a.lastObservedAt,strengths:uniq(related.flatMap(o=>o.strengths??[])).slice(-12),weaknesses:uniq(related.flatMap(o=>o.weaknesses??[])).slice(-12),misconceptions:uniq(related.flatMap(o=>o.misconceptions??[])).slice(-12),aggregatorVersion:cfg.version};}
  const dimensions=uniq(activeObservations.filter(o=>o.target.type==="interview_dimension").map(o=>(o.target as any).dimension as string));
  const interview:Record<string,InterviewDimensionState>={};
  for(const d of dimensions){const related=activeObservations.filter(o=>o.target.type==="interview_dimension"&&(o.target as any).dimension===d); const a=aggregateSignals(weighted(related,o=>o.signal,cfg),cfg); interview[d]={schemaVersion:1,dimension:d as any,value:a.value,baseConfidence:a.baseConfidence,freshness:a.freshness,effectiveConfidence:a.effectiveConfidence,status:a.status,evidenceMass:a.mass,observationCount:related.length,lastObservedAt:a.lastObservedAt};}
  return {schemaVersion:1,updatedAt:nowIso(),competencies,interview,preferences:previous?.preferences??{}};
}
