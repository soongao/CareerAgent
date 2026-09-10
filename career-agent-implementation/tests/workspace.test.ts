import test from "node:test";
import assert from "node:assert/strict";
import { FileWorkspace } from "../src/infrastructure/filesystem/file-workspace.js";
import { StateUpdater } from "../src/application/state-update/state-updater.js";
import { tempWorkspace } from "./helpers.js";
import type { Observation } from "../src/domain/types.js";
import { newId, nowIso } from "../src/shared/utils.js";

test("raw observations are append-only, idempotent and contestable",async()=>{const root=await tempWorkspace();const ws=new FileWorkspace(root,"u");await ws.init();const o:Observation={schemaVersion:1,id:newId("obs"),evaluationId:"eval-1",semanticKey:"competency:mysql.mvcc",timestamp:nowIso(),source:"assessment",target:{type:"competency",competencyId:"mysql.mvcc"},masterySignal:0.8,evidenceStrength:0.8,confidence:0.9,summary:"good",evaluator:{name:"assessment",promptVersion:"v1"}};const up=new StateUpdater(ws);assert.equal((await up.apply([o])).appended,1);assert.equal((await up.apply([o])).appended,0);assert.equal((await ws.getObservations()).length,1);await ws.appendAmendment({schemaVersion:1,id:newId("amend"),observationId:o.id,action:"contest",reason:"user disputes evaluator",timestamp:nowIso()});await up.rebuild();assert.equal((await ws.getActiveObservations()).length,0);assert.equal((await ws.getObservations()).length,1);});
test("workspace path escape is rejected",async()=>{const root=await tempWorkspace();const ws=new FileWorkspace(root,"u");assert.throws(()=>ws.path("../../etc/passwd"));});
