import type { Observation, ObservationAmendment, PreferenceState } from "../domain/types.js";
import { FileWorkspace } from "../infrastructure/filesystem/file-workspace.js";
import { StateUpdater } from "./state-update/state-updater.js";
import { newId, nowIso } from "../shared/utils.js";
import type { CompetencyCatalog } from "../competency/catalog.js";
export class UserModelService{
  constructor(private readonly ws:FileWorkspace,private readonly updater:StateUpdater,private readonly catalog:CompetencyCatalog){}
  async selfReportCompetency(competencyId:string,masterySignal:number,summary:string):Promise<void>{if(!this.catalog.has(competencyId))throw new Error("Unknown canonical competency");const evalId=newId("eval");const o:Observation={schemaVersion:1,id:newId("obs"),evaluationId:evalId,semanticKey:`competency:${competencyId}`,timestamp:nowIso(),source:"self_report",target:{type:"competency",competencyId},masterySignal,evidenceStrength:0.3,confidence:0.6,summary,evaluator:{name:"self-report",promptVersion:"self-report-v1"}};await this.updater.apply([o]);}
  async contestObservation(observationId:string,reason:string):Promise<void>{const a:ObservationAmendment={schemaVersion:1,id:newId("amend"),observationId,action:"contest",reason,timestamp:nowIso()};await this.ws.appendAmendment(a);await this.updater.rebuild();}
  async correctProfileFact(note:string):Promise<void>{const current=await this.ws.readText("profile.md","# Career Profile\n");await this.ws.writeText("profile.md",`${current.trim()}\n\n## User correction ${nowIso()}\n\n${note}\n`);await this.ws.runtimeEvent("profile.fact.corrected",newId("trace"),{note});}
  async setPreference(key:string,value:string,explicit=true):Promise<void>{const model=await this.ws.getUserModel();const p:PreferenceState={schemaVersion:1,key,value,confidence:explicit?1:0.4,source:explicit?"explicit":"inferred",updatedAt:nowIso()};model.preferences[key]=p;await this.ws.saveUserModel(model);}
}
