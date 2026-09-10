import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { tempWorkspace, recorded, sampleResume, sampleJd } from "./helpers.js";

test("recorded real-model bootstrap creates low-confidence state and target readiness",async()=>{const root=await tempWorkspace(),llm=await recorded();const app=await createApp({workspaceRoot:root,userId:"u",projectRoot:process.cwd(),llm});const r=await app.bootstrap.run({userId:"u",careerTarget:"Backend Engineer",resumeText:sampleResume,targetJob:{title:"Backend Engineer",company:"Example",jdText:sampleJd,interviewDate:"2026-09-12"}});assert.ok(r.activeTargetJobId);const model=await app.ws.getUserModel();assert.equal(model.competencies["java.concurrency"]?.status,"unknown");assert.ok((model.competencies["java.concurrency"]?.effectiveConfidence??1)<0.2);const ctx=await app.context.buildDecisionContext();assert.equal(ctx.mode,"target_job");assert.ok(ctx.readiness.blockers.some(b=>b.type==="uncertainty"));const rec=await app.workflow.recommend();assert.equal(rec.decision.action,"ASSESS");assert.deepEqual(rec.decision.target?.competencyIds,["java.concurrency"]);});
