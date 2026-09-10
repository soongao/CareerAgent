import type { Observation } from "../../domain/types.js";
import { FileWorkspace } from "../../infrastructure/filesystem/file-workspace.js";
import { deriveUserModel, defaultStateUpdateConfig, type StateUpdateConfig } from "./weighted-aggregator.js";
import { newId, nowIso } from "../../shared/utils.js";

export class StateUpdater {
  constructor(private readonly ws:FileWorkspace, private readonly config:StateUpdateConfig=defaultStateUpdateConfig){}
  async apply(observations:Observation[], traceId=newId("trace")):Promise<{appended:number}> {
    let appended=0; for(const o of observations) if(await this.ws.appendObservation(o)) appended++;
    const model=deriveUserModel(await this.ws.getActiveObservations(),await this.ws.getUserModel(),this.config); await this.ws.saveUserModel(model);
    await this.ws.runtimeEvent("state.updated",traceId,{appended,competencyCount:Object.keys(model.competencies).length,interviewDimensions:Object.keys(model.interview).length});
    return {appended};
  }
  async rebuild(traceId=newId("trace")):Promise<void>{const model=deriveUserModel(await this.ws.getActiveObservations(),await this.ws.getUserModel(),this.config); await this.ws.saveUserModel(model); await this.ws.runtimeEvent("state.rebuilt",traceId,{at:nowIso()});}
}
