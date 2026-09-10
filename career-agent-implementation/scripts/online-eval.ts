import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../src/app.js";

const resume=`Backend engineer. Java, MySQL, Redis. Built an e-commerce backend with Redis cache.`;
const jd=`Backend Engineer: strong Java concurrency; MySQL transactions; Redis cache consistency; system design.`;
const root=await mkdtemp(join(tmpdir(),"career-agent-online-"));
try{
  const app=await createApp({workspaceRoot:root,userId:"online",projectRoot:process.cwd()});
  const boot=await app.bootstrap.run({userId:"online",careerTarget:"Backend Engineer",resumeText:resume,targetJob:{title:"Backend Engineer",company:"EvalCo",jdText:jd}});
  assert.ok(boot.activeTargetJobId);
  const rec=await app.workflow.recommend();
  assert.ok(rec.decision.reason.length>10);
  const role=await app.ws.getRoleProfile("target_job",boot.activeTargetJobId!);assert.ok(role&&role.requirements.length>0);
  const comp=role!.requirements[0]!.competencyId;
  const ctx=await app.context.buildTaskContext("assessment",{competencyId:comp,targetJobId:boot.activeTargetJobId});
  const started=await app.tasks.start("assessment",{competencyId:comp,targetJobId:boot.activeTargetJobId},ctx);
  await app.tasks.send(started.task.id,"I will reason from the underlying guarantees and tradeoffs. Please probe with a concrete scenario.");
  await app.tasks.send(started.task.id,"For concurrency/consistency questions I distinguish safety from liveness, identify the ordering/visibility guarantee, then test failure and retry cases.");
  await app.tasks.complete(started.task.id);
  const evaluation:any=await app.taskEvaluation.evaluate(started.task.id);
  assert.ok(evaluation.evaluation);
  const beforeEvidence=(await app.ws.getEvidence()).length;
  const tutorCtx=await app.context.buildTaskContext("tutor",{competencyIds:[comp],learningGoal:"strengthen the main gap",targetJobId:boot.activeTargetJobId});
  const tutor=await app.tasks.start("tutor",{competencyIds:[comp],learningGoal:"strengthen the main gap",targetJobId:boot.activeTargetJobId},tutorCtx);
  await app.tasks.send(tutor.task.id,"Let me restate it in my own words and then test it against a failure case.");
  await app.tasks.complete(tutor.task.id);await app.taskEvaluation.evaluate(tutor.task.id);
  assert.equal((await app.ws.getEvidence()).length,beforeEvidence,"Tutor must not create project evidence");
  const interviewCtx=await app.context.buildTaskContext("interview",{mode:"technical_focus",targetJobId:boot.activeTargetJobId});
  const interview=await app.tasks.start("interview",{mode:"technical_focus",targetJobId:boot.activeTargetJobId},interviewCtx);
  await app.tasks.send(interview.task.id,"I would first state assumptions, then reason through correctness, failure modes and the operational tradeoff.");
  await app.tasks.complete(interview.task.id);await app.taskEvaluation.evaluate(interview.task.id);
  const validation=await app.maintenance.validateWorkspace();assert.equal(validation.ok,true,validation.errors.join("; "));
  console.log(JSON.stringify({status:"PASS",bootstrap:boot,nextAction:rec.decision.action,competency:comp,validation},null,2));
}finally{await rm(root,{recursive:true,force:true});}
