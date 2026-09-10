import test from "node:test";
import assert from "node:assert/strict";
import type { Observation } from "../src/domain/types.js";
import { deriveUserModel } from "../src/application/state-update/weighted-aggregator.js";
import { createApp } from "../src/app.js";
import { tempWorkspace, recorded } from "./helpers.js";
import { nowIso } from "../src/shared/utils.js";
const obs=(id:string,signal:number,strength:number,confidence:number,source:Observation["source"],timestamp="2026-09-10T00:00:00Z"):Observation=>({schemaVersion:1,id,evaluationId:`e-${id}`,semanticKey:"competency:mysql.mvcc",timestamp,source,target:{type:"competency",competencyId:"mysql.mvcc"},masterySignal:signal,evidenceStrength:strength,confidence,summary:id,evaluator:{name:"test",promptVersion:"v1"}});

test("self-report cap prevents strong confidence from self claim",()=>{const m=deriveUserModel([obs("1",0.95,1,1,"self_report")]);assert.equal(m.competencies["mysql.mvcc"]?.status,"unknown");assert.ok((m.competencies["mysql.mvcc"]?.evidenceMass??1)<=0.300001);});
test("conflicting observations reduce confidence without overwriting history",()=>{const a=deriveUserModel([obs("1",0.9,1,1,"assessment"),obs("2",0.2,1,1,"interview")]);const s=a.competencies["mysql.mvcc"]!;assert.ok(s.mastery!==null&&s.mastery>0.45&&s.mastery<0.65);assert.ok(s.baseConfidence<0.5);assert.equal(s.observationCount,2);});
test("stale does not mean weak: mastery remains while freshness drops",()=>{const a=deriveUserModel([obs("1",0.9,1,1,"assessment","2025-01-01T00:00:00Z")]);const s=a.competencies["mysql.mvcc"]!;assert.ok((s.mastery??0)>0.85);assert.equal(s.status,"stale");assert.ok(s.effectiveConfidence<s.baseConfidence);});


test("contested observations no longer influence rebuilt derived state",async()=>{
  const root=await tempWorkspace();
  const app=await createApp({workspaceRoot:root,userId:"u",projectRoot:process.cwd(),llm:await recorded()});
  const obs:Observation={schemaVersion:1,id:"obs_contest_only",evaluationId:"eval_contest_only",semanticKey:"competency:mysql.mvcc",timestamp:nowIso(),source:"assessment",target:{type:"competency",competencyId:"mysql.mvcc"},masterySignal:0.91,evidenceStrength:0.9,confidence:0.9,summary:"Strong assessment",evaluator:{name:"test",promptVersion:"v1"}};
  await app.updater.apply([obs]);
  assert.ok((await app.ws.getUserModel()).competencies["mysql.mvcc"]);
  await app.userModel.contestObservation(obs.id,"measurement conditions were invalid");
  assert.equal((await app.ws.getUserModel()).competencies["mysql.mvcc"],undefined);
});
