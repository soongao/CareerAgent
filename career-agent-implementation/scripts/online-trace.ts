import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createApp } from "../src/app.js";
import { nowIso } from "../src/shared/utils.js";

process.env.CAREER_AGENT_TRACE_LLM = "1";

const stamp = nowIso().replace(/[:.]/g, "-");
const root = resolve(process.env.ONLINE_TRACE_ROOT ?? `./online-traces/${stamp}`);
await mkdir(root, { recursive: true });
const userId = "online-trace";
const app = await createApp({ workspaceRoot: root, userId, projectRoot: process.cwd() });

const resume = `# Candidate\nBackend engineer using Java, MySQL and Redis.\n\n## Project\nUsed Redis cache-aside in an e-commerce service. Improved API latency by 40%.`;
const jd = `Backend Engineer. Strong Java concurrency required. Experience with Redis caching and consistency required. Strong relational database transaction fundamentals preferred.`;

const summary: Record<string, unknown> = { startedAt: nowIso(), root, userId };

const boot = await app.bootstrap.run({ userId, careerTarget: "Backend Engineer", resumeText: resume, targetJob: { title: "Backend Engineer", company: "OnlineTraceCo", jdText: jd } });
summary.bootstrap = boot;
const before = await app.workflow.recommend();
summary.initialDecision = before.decision;

const targetJobId = boot.activeTargetJobId!;
const role = await app.ws.getRoleProfile("target_job", targetJobId);
const competencyId = before.decision.target?.competencyIds?.[0] ?? role?.requirements[0]?.competencyId;
if (!competencyId) throw new Error("Online trace could not resolve a competency to assess");

const assessContext = await app.context.buildTaskContext("assessment", { competencyId, targetJobId });
const assess = await app.tasks.start("assessment", { competencyId, targetJobId }, assessContext);
summary.assessmentTaskId = assess.task.id;
await app.tasks.send(assess.task.id, "I will answer from the underlying guarantee first, then give a concrete failure scenario and tradeoff. Please continue the assessment without giving me the answer.");
await app.tasks.send(assess.task.id, "For concurrency and consistency I separate safety from liveness, identify the ordering or visibility guarantee, and then test retries, overload and partial failure.");
await app.tasks.complete(assess.task.id);
summary.assessmentEvaluation = await app.taskEvaluation.evaluate(assess.task.id);

const tutorContext = await app.context.buildTaskContext("tutor", { competencyIds: [competencyId], targetJobId, learningGoal: "Strengthen the main gap found in assessment" });
const tutor = await app.tasks.start("tutor", { competencyIds: [competencyId], targetJobId, learningGoal: "Strengthen the main gap found in assessment" }, tutorContext);
summary.tutorTaskId = tutor.task.id;
await app.tasks.send(tutor.task.id, "Explain the weakest point compactly, then make me restate it and give me a new failure case rather than asking whether I understand.");
await app.tasks.send(tutor.task.id, "My restatement: the guarantee defines what can be observed; an implementation choice such as buffering or retry must preserve that guarantee under overload and partial failure rather than only working on the happy path.");
await app.tasks.complete(tutor.task.id);
summary.tutorEvaluation = await app.taskEvaluation.evaluate(tutor.task.id);

const interviewContext = await app.context.buildTaskContext("interview", { mode: "technical_focus", targetJobId });
const interview = await app.tasks.start("interview", { mode: "technical_focus", targetJobId }, interviewContext);
summary.interviewTaskId = interview.task.id;
await app.tasks.send(interview.task.id, "I would start with assumptions and the invariant, then explain the failure mode, operational signal, and tradeoff. Please push back on one assumption.");
await app.tasks.send(interview.task.id, "If that assumption is false, I would revise the design rather than defend it: first bound the failure domain, then choose backpressure/retry semantics that keep the system stable and observable.");
await app.tasks.complete(interview.task.id);
summary.interviewEvaluation = await app.taskEvaluation.evaluate(interview.task.id);

summary.finalDecision = (await app.workflow.recommend()).decision;
summary.validation = await app.maintenance.validateWorkspace();
summary.finishedAt = nowIso();
await writeFile(join(root, "TRACE_SUMMARY.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
await writeFile(join(root, "README.md"), `# Real Pi online trace\n\nGenerated at ${summary.finishedAt}.\n\nThe exact persisted trace is under \`users/${userId}/\`. Important files:\n\n- \`runtime/llm-calls.jsonl\`: real structured LLM requests/responses.\n- \`runtime/events.jsonl\`: runtime/workflow events.\n- \`tasks/*/transcript.jsonl\`: real Pi task transcripts.\n- \`tasks/*/result.json\`: independent evaluator outputs.\n- \`observations/events.jsonl\`: long-term observations.\n- \`state/user-model.json\`: final derived state.\n- \`TRACE_SUMMARY.json\`: journey summary.\n\nInputs can contain personal information; protect this directory.\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", traceRoot: root, ...summary }, null, 2));
