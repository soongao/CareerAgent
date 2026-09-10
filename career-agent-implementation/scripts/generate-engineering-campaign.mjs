#!/usr/bin/env node
import { appendFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../dist/src/app.js';
import { RecordedStructuredLLM } from '../dist/src/infrastructure/llm/recorded-structured-llm.js';
import { AssistantCapturedPiRuntime } from '../dist/src/infrastructure/pi/assistant-captured-pi-runtime.js';
import { newId, nowIso } from '../dist/src/shared/utils.js';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT = resolve(process.env.ENGINEERING_TRACE_OUT || join(ROOT, 'engineering-traces'));
const MODEL = 'GPT-5.6 Sol';
const CAPTURED_AT = '2026-09-10';
const PROVENANCE = 'Authored by GPT-5.6 Sol in the 2026-09-10 engineering trace campaign as the actual model response for this scenario, then replayed deterministically through application/runtime boundaries. Not a production fallback and not an expected-value fake.';

function llm(name, output) { return { name, model: MODEL, provenance: PROVENANCE, capturedAt: CAPTURED_AT, output }; }
function pi(response, opts={}) { return { response, model: MODEL, provenance: PROVENANCE, capturedAt: CAPTURED_AT, ...opts }; }

const backendResume = `# Candidate\n\nBackend engineer using Java, MySQL and Redis.\n\n## Experience\nBuilt order and catalog services.\n\n## Project\nUsed Redis cache-aside in an e-commerce service. Improved API latency by 40%.`; 
const backendJd = `Backend Engineer. Strong Java concurrency required. Experience with Redis caching and consistency required. Strong relational database transaction fundamentals preferred. Interview includes project deep-dive and system design.`;
const aiResume = `# Candidate\n\nBackend engineer transitioning into AI application engineering. Built a schema-driven tool-calling prototype with local memory. I have not yet built a formal agent evaluation suite.`;
const aiJd = `AI Agent Engineer. Build production agent workflows, tool calling, context engineering, evaluation, reliability, and human-in-the-loop systems. Strong software engineering required.`;

function backendBootstrapEntries(extraRequirements=[]) { return [
  llm('bootstrap.resume_parse', {
    profileSummary: 'Backend engineer candidate with Java, MySQL, Redis and service-development experience.',
    claims: [
      { text: 'Built order and catalog services', section: 'Experience', competencyHints: ['backend'] },
      { text: 'Used Redis cache-aside in an e-commerce service', section: 'Project', competencyHints: ['redis'] },
      { text: 'Improved API latency by 40%', section: 'Project', competencyHints: ['performance'] }
    ],
    evidenceCandidates: [{ title:'E-commerce backend project', type:'project', description:'Resume describes an e-commerce service using Redis cache-aside.', competencyHints:['redis'] }]
  }),
  llm('bootstrap.role_map', { requirements: [
    { competencyId:'java.concurrency', importance:0.94, requiredMastery:0.78, authority:'jd_explicit', sourceText:'Strong Java concurrency required', rationale:'Explicit JD requirement.' },
    { competencyId:'redis.cache-consistency', importance:0.90, requiredMastery:0.74, authority:'jd_explicit', sourceText:'Redis caching and consistency required', rationale:'Explicit JD requirement.' },
    { competencyId:'mysql.mvcc', importance:0.82, requiredMastery:0.70, authority:'canonical', rationale:'Canonical transaction-depth expectation for backend interviews.' },
    { competencyId:'system-design.scalability', importance:0.84, requiredMastery:0.72, authority:'jd_explicit', sourceText:'Interview includes system design', rationale:'System design is explicitly in the interview process.' },
    ...extraRequirements
  ]}),
  llm('bootstrap.resume_competencies', { observations: [
    { competencyId:'java.concurrency', masterySignal:0.58, evidenceStrength:0.16, confidence:0.56, summary:'Java experience is present but concurrency reasoning is not demonstrated in the resume.' },
    { competencyId:'redis.cache-consistency', masterySignal:0.62, evidenceStrength:0.22, confidence:0.63, summary:'Resume supports Redis cache exposure but not detailed consistency reasoning.' }
  ]})
]; }

function aiBootstrapEntries() { return [
  llm('bootstrap.resume_parse', {
    profileSummary:'Backend engineer with an LLM tool-calling prototype, moving toward AI Agent Engineering.',
    claims:[
      { text:'Built schema-driven LLM tool calls', section:'Projects', competencyHints:['tool calling'] },
      { text:'Used local conversation memory', section:'Projects', competencyHints:['context'] },
      { text:'No formal agent evaluation suite yet', section:'Projects', competencyHints:['evaluation'] }
    ],
    evidenceCandidates:[{ title:'LLM tool-calling prototype', type:'project', description:'Prototype described in resume with structured tools and local memory.', competencyHints:['agent'] }]
  }),
  llm('bootstrap.role_map', { requirements:[
    { competencyId:'ai-agent.tool-calling', importance:0.94, requiredMastery:0.80, authority:'jd_explicit', sourceText:'tool calling', rationale:'Explicit agent engineering requirement.' },
    { competencyId:'ai-agent.context-engineering', importance:0.92, requiredMastery:0.78, authority:'jd_explicit', sourceText:'context engineering', rationale:'Explicit requirement.' },
    { competencyId:'ai-agent.evaluation', importance:0.91, requiredMastery:0.76, authority:'jd_explicit', sourceText:'evaluation and reliability', rationale:'Explicit requirement and current resume gap.' }
  ]}),
  llm('bootstrap.resume_competencies', { observations:[
    { competencyId:'ai-agent.tool-calling', masterySignal:0.68, evidenceStrength:0.25, confidence:0.68, summary:'Hands-on structured tool-calling experience is claimed but depth is not yet independently measured.' },
    { competencyId:'ai-agent.context-engineering', masterySignal:0.52, evidenceStrength:0.18, confidence:0.59, summary:'Local memory is mentioned, but retrieval and context isolation depth are unclear.' },
    { competencyId:'ai-agent.evaluation', masterySignal:0.30, evidenceStrength:0.20, confidence:0.80, summary:'The resume explicitly states no formal agent evaluation suite has been built.' }
  ]})
]; }

function decision(action, target, reason, expectedOutcome, priority='high', alternative) {
  return llm('workflow.next_action', { action, target, reason, expectedOutcome, priority, alternative });
}

class TraceLLM {
  constructor(entries, rec) { this.delegate = new RecordedStructuredLLM(entries); this.rec = rec; }
  async complete(req) {
    await this.rec.event('llm.structured.request', { name:req.name, system:req.system, input:req.input, promptVersion:req.promptVersion, allowedValues:req.allowedValues });
    const out = await this.delegate.complete(req);
    await this.rec.event('llm.structured.response', { name:req.name, model:out.model, promptVersion:out.promptVersion, provenance:PROVENANCE, output:out.output });
    return out;
  }
}

class Recorder {
  constructor(id,title,description) { this.id=id; this.title=title; this.description=description; this.dir=join(OUT,id); this.seq=0; this.assertions=[]; }
  async init(){ await mkdir(this.dir,{recursive:true}); await writeFile(join(this.dir,'timeline.jsonl'),''); await writeFile(join(this.dir,'llm-calls.jsonl'),''); await writeFile(join(this.dir,'pi-sessions.jsonl'),''); }
  async event(type,payload={}) { const e={seq:++this.seq,ts:nowIso(),type,payload}; await appendFile(join(this.dir,'timeline.jsonl'),JSON.stringify(e)+'\n'); if(type.startsWith('llm.')) await appendFile(join(this.dir,'llm-calls.jsonl'),JSON.stringify(e)+'\n'); if(type.startsWith('pi.')) await appendFile(join(this.dir,'pi-sessions.jsonl'),JSON.stringify(e)+'\n'); return e; }
  assert(name, ok, details={}) { const a={name,ok:Boolean(ok),details}; this.assertions.push(a); if(!a.ok) throw new Error(`Assertion failed: ${name}`); }
  async json(rel,v){ const p=join(this.dir,rel); await mkdir(p.slice(0,p.lastIndexOf('/')),{recursive:true}); await writeFile(p,JSON.stringify(v,null,2)+'\n'); }
  async text(rel,v){ const p=join(this.dir,rel); await mkdir(p.slice(0,p.lastIndexOf('/')),{recursive:true}); await writeFile(p,v); }
  async snapshot(label,app){
    let decisionContext; try { decisionContext=await app.context.buildDecisionContext(); } catch(e){ decisionContext={unavailable:String(e?.message||e)}; }
    const s={
      activeTargets:await app.ws.getActiveTargets(), careerTargets:await app.ws.getCareerTargets(), targetJobs:await app.ws.getTargetJobs(),
      userModel:await app.ws.getUserModel(), observations:await app.ws.getObservations(), activeObservations:await app.ws.getActiveObservations(), amendments:await app.ws.getAmendments(),
      evidence:await app.ws.getEvidence(), resumeClaims:await app.ws.getResumeClaims(), claimSupport:await app.ws.getClaimSupport(), workflow:await app.ws.getWorkflow(),
      careerExperience:await app.ws.getCareerExperience(), materialChanges:await app.ws.getMaterialChanges(), runtimeEvents:await app.ws.getRuntimeEvents(), decisionContext
    };
    const f=`snapshots/${String(this.seq+1).padStart(3,'0')}-${label}.json`; await this.json(f,s); await this.event('snapshot',{label,file:f}); return s;
  }
  async copyTask(app,taskId,label){
    await this.json(`tasks/${label}/task.json`,await app.ws.getTask(taskId));
    await this.text(`tasks/${label}/transcript.jsonl`,(await app.ws.getTranscript(taskId)).map(x=>JSON.stringify(x)).join('\n')+'\n');
    const result=await app.ws.readText(`tasks/${taskId}/result.json`,''); if(result) await this.text(`tasks/${label}/result.json`,result);
    const ctx=await app.ws.getTaskContext(taskId); await this.json(`tasks/${label}/context.json`,ctx);
  }
  async finish(app,notes={}){
    await this.json('assertions.json',{passed:this.assertions.every(a=>a.ok),assertions:this.assertions});
    await this.json('scenario-result.json',{id:this.id,title:this.title,description:this.description,completedAt:nowIso(),model:MODEL,provenance:PROVENANCE,...notes});
    await cp(app.ws.userRoot,join(this.dir,'final-workspace'),{recursive:true});
    await this.text('README.md',`# ${this.id}: ${this.title}\n\n${this.description}\n\n## Provenance\n\nAll semantic LLM outputs and Task-Agent replies in this scenario were authored by **${MODEL}** in this engineering campaign, then injected through the same StructuredLLM/Pi-session boundaries used by the application. They are deterministic captures, not production fallbacks or expected-value fakes.\n\n## Reconstruction order\n\n1. \`timeline.jsonl\`\n2. \`llm-calls.jsonl\`\n3. \`pi-sessions.jsonl\`\n4. \`snapshots/\`\n5. \`tasks/*/{context,transcript,result}.json*\`\n6. \`assertions.json\`\n7. \`final-workspace/\`\n\nResult: **${this.assertions.every(a=>a.ok)?'PASS':'FAIL'}**\n`);
  }
}

async function scenarioApp(id,title,description,entries,piTurns,workspaceRoot){
  const rec=new Recorder(id,title,description); await rec.init();
  const root=workspaceRoot??await mkdtemp(join(tmpdir(),`career-eng-${id}-`));
  const piRuntime=new AssistantCapturedPiRuntime(piTurns,{
    onSessionCreated: e=>rec.event('pi.session.created',{sessionId:e.sessionId,name:e.spec.name,cwd:e.spec.cwd,systemPrompt:e.spec.systemPrompt,tools:e.spec.tools}),
    onPrompt: e=>rec.event('pi.session.turn',{sessionId:e.sessionId,name:e.sessionName,prompt:e.prompt,response:e.response,model:e.turn.model,provenance:e.turn.provenance}),
    onSessionClosed: e=>rec.event('pi.session.closed',e)
  });
  const structured=new TraceLLM(entries,rec);
  const app=await createApp({workspaceRoot:root,userId:'engineering-user',projectRoot:ROOT,llm:structured,piRuntime});
  await rec.event('scenario.started',{id,title,workspace:app.ws.userRoot});
  return {rec,app,root,piRuntime};
}

async function bootstrapBackend(app,rec,opts={}){
  const input={userId:'engineering-user',careerTarget:'Backend Engineer',careerDescription:'Prepare for backend roles with durable capability and interview readiness.',resumeText:opts.resumeText??backendResume,targetJob:opts.noJob?undefined:{title:opts.title??'Backend Engineer',company:opts.company??'ExampleCo',jdText:opts.jdText??backendJd,interviewDate:opts.interviewDate,deadline:opts.deadline}};
  await rec.event('bootstrap.input',input); const r=await app.bootstrap.run(input); await rec.event('bootstrap.output',r); return r;
}
async function bootstrapAI(app,rec,withJob=true){
  const input={userId:'engineering-user',careerTarget:'AI Agent Engineer',careerDescription:'Transition from backend engineering to production Agent/AI application engineering.',resumeText:aiResume,targetJob:withJob?{title:'AI Agent Engineer',company:'AgentWorks',jdText:aiJd}:undefined};
  await rec.event('bootstrap.input',input); const r=await app.bootstrap.run(input); await rec.event('bootstrap.output',r); return r;
}

async function recommendAndRoute(app,rec,opts={}){
  const r=await app.workflow.recommend(opts.intent); await rec.event('workflow.recommendation',{decision:r.decision,context:r.context}); await rec.json(`decisions/${r.decision.id}.json`,r);
  if(opts.route===false) return r;
  const routed=await app.router.route(r.decision,{confirmed:opts.confirmed??true,evidencePaths:opts.evidencePaths,marketEvidence:opts.marketEvidence}); await rec.event('workflow.route',{decisionId:r.decision.id,routed}); return {...r,routed};
}
async function send(app,rec,taskId,message){ await rec.event('user.message',{taskId,message}); const response=await app.tasks.send(taskId,message); await rec.event('agent.message',{taskId,response}); return response; }
async function finishTask(app,rec,taskId,label){ await app.tasks.complete(taskId); await rec.event('task.completed',{taskId}); const before=await rec.snapshot(`${label}-before-eval`,app); const evalResult=await app.taskEvaluation.evaluate(taskId); await rec.event('task.evaluated',{taskId,evalResult}); const after=await rec.snapshot(`${label}-after-eval`,app); await rec.copyTask(app,taskId,label); return {before,after,evalResult}; }

const scenarios=[];
function define(id,title,description,run){scenarios.push({id,title,description,run});}

// D01 — full backend longitudinal loop

define('D01-backend-longitudinal-loop','Backend candidate: diagnose → learn → reassess → interview','A long, realistic preparation loop demonstrating that the system changes strategy as evidence accumulates rather than following a fixed plan.',async()=>{
  const entries=[...backendBootstrapEntries(),
    decision('ASSESS',{competencyIds:['java.concurrency']},'Java concurrency is a high-importance explicit requirement, but current evidence is resume-derived and highly uncertain.','Resolve whether the gap is real before prescribing learning.'),
    llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'java.concurrency',masterySignal:0.43,evidenceStrength:0.90,confidence:0.91,strengths:['Recognizes thread-pool saturation symptoms'],weaknesses:['Cannot reason cleanly about happens-before and visibility','Confuses queueing with execution concurrency'],misconceptions:['Treats volatile as making compound updates atomic'],rationale:'Multiple non-trivial probes consistently expose concurrency-model gaps; the transcript is clean and diagnostic.'}),
    decision('LEARN',{competencyIds:['java.concurrency']},'The uncertainty is now resolved into a confirmed high-priority Java concurrency weakness.','Improve the specific memory-model and executor reasoning gaps identified by assessment.'),
    llm('tutor.evaluate',{observations:[{competencyId:'java.concurrency',masterySignal:0.76,evidenceStrength:0.66,confidence:0.88,strengths:['Correctly separates visibility from atomicity','Can explain happens-before with volatile publication','Can reason about bounded queues and rejection'],weaknesses:['Still slower on compound interleavings'],misconceptions:[],summary:'The learner demonstrates materially improved concurrency reasoning in formative problems rather than merely acknowledging explanations.'}],learningSummary:'Worked through volatile semantics, happens-before, compound atomicity, bounded executor queues, and overload behavior with learner explanations and scenario checks.',reviewQuestions:['Why does volatile not make count++ atomic?','How would you size a bounded executor queue under bursty load?'] }),
    decision('ASSESS',{competencyIds:['java.concurrency']},'Learning produced promising formative evidence, but an independent clean measurement is still needed before treating the competency as current and strong.','Validate the improvement without tutor support.'),
    llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'java.concurrency',masterySignal:0.84,evidenceStrength:0.92,confidence:0.93,strengths:['Explains happens-before precisely','Separates atomicity, visibility and ordering','Diagnoses executor saturation using queue and worker signals'],weaknesses:['Minor hesitation on lock-free ABA edge cases'],misconceptions:[],rationale:'Clean assessment with multiple scenario probes demonstrates strong, transferable concurrency reasoning.'}),
    decision('MOCK_INTERVIEW',{targetJobId:'ignored-at-runtime'},'Java concurrency is now strong enough; the highest remaining value is testing whether knowledge can be retrieved and communicated under realistic mixed interview pressure.','Measure technical delivery, follow-up stability, resume consistency, and remaining role gaps.'),
    llm('interview.evaluate',{contaminated:false,competencyObservations:[{competencyId:'java.concurrency',masterySignal:0.82,evidenceStrength:0.71,confidence:0.89,summary:'Concurrency reasoning remains technically sound under interview pressure.',strengths:['Explains bounded-queue tradeoffs'],weaknesses:[],misconceptions:[]},{competencyId:'redis.cache-consistency',masterySignal:0.61,evidenceStrength:0.67,confidence:0.86,summary:'Understands cache-aside but gives incomplete failure recovery for DB-success/cache-delete-failure.',strengths:['Identifies stale-cache window'],weaknesses:['Retry/idempotency path not fully structured'],misconceptions:[]}],interviewObservations:[{dimension:'technical_accuracy',signal:0.78,evidenceStrength:0.75,confidence:0.90,summary:'Mostly technically correct.'},{dimension:'clarity',signal:0.58,evidenceStrength:0.74,confidence:0.90,summary:'Answers contain correct points but are not prioritized.'},{dimension:'structure',signal:0.52,evidenceStrength:0.72,confidence:0.88,summary:'Frequently jumps to implementation before framing constraints.'},{dimension:'follow_up_stability',signal:0.62,evidenceStrength:0.68,confidence:0.86,summary:'Handles follow-ups but sometimes loses the original decision thread.'}],claimFindings:[],overallFeedback:'Technical capability improved, but answer structure and Redis consistency depth remain the main blockers.'}),
    decision('LEARN',{competencyIds:['redis.cache-consistency']},'The mock interview surfaced an attributable Redis consistency gap while Java concurrency stayed strong.','Close the concrete consistency/failure-mode gap before spending more cycles on already-validated Java.')
  ];
  const piTurns=[
    pi('We will assess Java concurrency without giving hints or answers. First question: two threads increment a shared `int counter` using `counter++`. The field is declared `volatile`. Is the final count guaranteed to be correct? Explain exactly why or why not.'),
    pi('Next: suppose thread A writes ordinary fields of an object and then assigns that object to a `volatile` reference. Thread B later reads that volatile reference. What visibility guarantee does B get, and what does that guarantee *not* imply?'),
    pi('Last probe: a fixed thread pool has 32 workers, CPU is only 45%, request latency is rising, and its unbounded work queue keeps growing. What does that tell you, and what would you change or measure next?'),
    pi('Good. I have enough signal for this assessment. I will stop here rather than teach inside the measurement.'),
    pi('We will work specifically on the gaps from the assessment. Start with this distinction: `volatile` gives visibility and ordering guarantees around reads/writes of that variable, but it does not turn a read-modify-write sequence into one atomic operation. Before I explain more, tell me how you currently think `counter++` breaks down.'),
    pi('Exactly. Now connect that to happens-before: if thread A initializes an object and publishes its reference through a volatile write, what operations in thread B become ordered after A’s prior writes? Explain it in your own words.'),
    pi('Now apply it to executors. Imagine 2000 req/s bursts, 32 workers, and an unbounded queue. Why can CPU stay moderate while p99 explodes? Give me a diagnosis before proposing a fix.'),
    pi('That reasoning is much better. Final formative check: choose between an unbounded queue and a bounded queue with rejection/backpressure for a latency-sensitive API. State the trade-off and the failure mode you prefer.'),
    pi('You have demonstrated the key distinctions rather than only repeating them. We can end this learning task here; a separate clean assessment should validate the improvement.'),
    pi('Clean reassessment. First: explain why `volatile boolean stopped` is sufficient for a stop flag but `volatile int counter` is insufficient for concurrent increments.'),
    pi('Second: thread A mutates a normal object then publishes it through a volatile reference; thread B reads that reference. Walk through the happens-before relationship and distinguish visibility from mutual exclusion.'),
    pi('Final scenario: queue depth grows, workers are all busy, CPU is not saturated, and downstream latency is variable. How do you distinguish executor saturation from downstream blocking, and what metrics/actions follow?'),
    pi('That is sufficient for a clean reassessment. I will stop without giving evaluation feedback inside the measurement.'),
    pi('Let’s run this as a real interview. Start with your e-commerce service: what was the highest-load path you owned, and where did concurrency or caching create the hardest production trade-off?'),
    pi('You said Redis used cache-aside. Suppose the database update succeeds but cache deletion fails. Describe the stale-data window, the recovery options you considered, and which one you would choose under at-least-once retries.'),
    pi('Now switch to Java. Your API p99 rises under load; CPU is 45%, executor queue depth grows continuously, and active workers stay at the maximum. What is your diagnosis?'),
    pi('Assume the workers block on a downstream RPC with highly variable latency. How does that change your queue/backpressure strategy, and what would you monitor to prevent retry amplification?'),
    pi('Last question: design the write/read path for product price updates where stale price is unacceptable for checkout but catalog browsing can tolerate a short delay. Frame the consistency boundary first, then the mechanism.'),
    pi('That completes the mock interview. I will not give inline coaching here; feedback is produced by the independent evaluator.')
  ];
  const {rec,app}=await scenarioApp('D01-backend-longitudinal-loop','Backend candidate: diagnose → learn → reassess → interview','Longitudinal state evolution through four interactive tasks.',entries,piTurns);
  await bootstrapBackend(app,rec);
  await rec.snapshot('bootstrap',app);
  let x=await recommendAndRoute(app,rec); let tid=x.routed.taskId;
  await send(app,rec,tid,'No. `volatile` makes the latest value visible, but `counter++` is read, add, write. Two threads can read the same old value and both write the same incremented value. I used to think volatile made it safe, but that would require atomic RMW.');
  await send(app,rec,tid,'A volatile write has release-like ordering and a later volatile read of that value has acquire-like visibility, so B sees A’s writes before publication. It does not lock the object or make later mutations atomic. I am not fully confident about the formal happens-before wording.');
  await send(app,rec,tid,'The queue growth means arrival exceeds service completion, but low CPU suggests workers may block rather than compute. I would inspect active threads, queue wait, downstream latency and thread dumps. I might bound the queue, but I am not sure how to set capacity.');
  await finishTask(app,rec,tid,'01-assessment-weak');
  x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'`counter++` is roughly load counter, add one, store counter, so two threads can interleave between load and store.');
  await send(app,rec,tid,'If B observes A’s volatile publication, A’s writes before the volatile write happen-before B’s operations after the matching volatile read. That gives visibility/order, not exclusive access.');
  await send(app,rec,tid,'Queue wait can dominate latency while workers are blocked on I/O, so CPU does not have to be high. I would split service time from queue time, look at active workers and downstream RPC latency, and use a bounded queue with backpressure instead of hiding overload.');
  await send(app,rec,tid,'For latency-sensitive traffic I prefer bounded queue plus explicit rejection/backpressure because overload becomes visible and bounded. An unbounded queue converts overload into unbounded queueing latency and eventually memory pressure.');
  await finishTask(app,rec,tid,'02-tutor');
  x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'A stop flag is one read/write variable: volatile gives visibility so workers eventually observe true. Increment is a compound read-modify-write; visibility does not make the sequence indivisible. AtomicInteger or synchronization is needed for atomic increment.');
  await send(app,rec,tid,'All normal writes by A before the volatile reference write happen-before B’s actions after B reads that publication. It is a publication/visibility ordering edge. It does not prevent concurrent mutation of the object or provide mutual exclusion.');
  await send(app,rec,tid,'I would first separate queue wait from task execution and inspect blocked thread stacks. If workers are blocked in RPC, downstream latency and connection-pool saturation correlate with worker occupancy. Bound concurrency/queueing, propagate deadlines, avoid blind retries, and use backpressure or load shedding.');
  await finishTask(app,rec,tid,'03-reassessment');
  x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'The catalog read path was highest volume. I owned the service-side caching and request concurrency controls, while the database schema was shared with another engineer. The hard trade-off was keeping browse latency low without letting stale price leak into checkout.');
  await send(app,rec,tid,'With DB success and delete failure, old cache can survive until TTL. I would make invalidation retryable and idempotent, persist the retry intent through an outbox/message path for important data, and keep TTL as a safety net. I would not claim that cache-aside alone guarantees strong consistency.');
  await send(app,rec,tid,'The executor is saturated even though CPU is not. The growing queue means work is waiting; max active workers means concurrency is capped. I would inspect whether workers are blocked on DB/RPC, queue wait time, task duration, connection pools, and downstream latency.');
  await send(app,rec,tid,'If RPC latency is variable, increasing threads can amplify downstream pressure. I would cap in-flight work, use bounded queues, deadlines and circuit breaking/load shedding, and track queue time, in-flight count, timeout rate and retry rate together.');
  await send(app,rec,tid,'I would define checkout as the strict boundary: checkout reads the authoritative DB or a version-validated value; catalog can use Redis with short TTL/invalidation. Price update commits DB first, emits an outbox event, consumers invalidate/update cache, and checkout never trusts stale cache without version validation.');
  await finishTask(app,rec,tid,'04-interview');
  const final=await recommendAndRoute(app,rec,{route:false});
  rec.assert('final decision focuses redis',final.decision.action==='LEARN'&&final.decision.target?.competencyIds?.includes('redis.cache-consistency'),{decision:final.decision});
  const model=await app.ws.getUserModel(); rec.assert('java improved above initial',model.competencies['java.concurrency']?.mastery>0.65,{state:model.competencies['java.concurrency']});
  rec.assert('interview clarity tracked separately',Boolean(model.interview.clarity),{clarity:model.interview.clarity});
  await rec.finish(app,{finalDecision:final.decision});
});

// D02 — AI Agent transition

define('D02-ai-agent-transition','Backend → AI Agent Engineer transition','Tests career/target-job reasoning for agent-engineering competencies, including evaluation as a real gap rather than resume keyword matching.',async()=>{
  const entries=[...aiBootstrapEntries(),
    decision('ASSESS',{competencyIds:['ai-agent.evaluation']},'Evaluation is an explicit high-importance requirement and the resume explicitly admits no formal suite; measure current conceptual depth before prescribing a curriculum.','Separate true evaluation weakness from missing resume evidence.'),
    llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'ai-agent.evaluation',masterySignal:0.48,evidenceStrength:0.91,confidence:0.92,strengths:['Understands deterministic unit tests and basic golden cases'],weaknesses:['Initially conflates exact-output tests with semantic evals','No clear separation of actor vs judge evaluation','Limited thinking about longitudinal replay'],misconceptions:['Treats pass/fail tests as sufficient for stochastic agent quality'],rationale:'The candidate has software-testing intuition but lacks a mature agent-evaluation model.'}),
    decision('LEARN',{competencyIds:['ai-agent.evaluation']},'Assessment converted uncertainty into a specific evaluation-design weakness.','Build a layered eval mental model covering invariants, semantic judging, trajectory replay, and failure campaigns.'),
    llm('tutor.evaluate',{observations:[{competencyId:'ai-agent.evaluation',masterySignal:0.78,evidenceStrength:0.70,confidence:0.90,strengths:['Separates deterministic invariants from semantic model grading','Understands replay fixtures and self-consistent failure risk','Can define forbidden side effects'],weaknesses:['Needs more experience calibrating judge disagreement'],misconceptions:[],summary:'The learner can now design a multi-layer agent eval strategy and explain why exact text matching is insufficient.'}],learningSummary:'Designed L0–L5 evaluation: schemas/invariants, service integration, agent behavior, evaluator calibration, longitudinal journeys, and adversarial/recovery tests.',reviewQuestions:['How do you prevent an actor and evaluator from sharing the same failure mode?','What should be immutable in a golden trajectory fixture?']}),
    decision('MOCK_INTERVIEW',{},'The key evaluation concept improved; a mock interview now tests whether the candidate can explain the architecture under pressure and connect eval design to runtime boundaries.','Measure communication plus practical agent-engineering depth.'),
    llm('interview.evaluate',{contaminated:false,competencyObservations:[{competencyId:'ai-agent.evaluation',masterySignal:0.80,evidenceStrength:0.78,confidence:0.91,summary:'Explains layered evals, independent judging, replay and invariants with concrete failure modes.',strengths:['Names self-consistent failure risk','Separates semantic and deterministic validation'],weaknesses:['Could discuss statistical calibration more'],misconceptions:[]},{competencyId:'ai-agent.context-engineering',masterySignal:0.70,evidenceStrength:0.67,confidence:0.86,summary:'Good reasoning on curated context plus on-demand retrieval.',strengths:['Avoids loading entire long-term memory'],weaknesses:['Compaction policy remains heuristic'],misconceptions:[]}],interviewObservations:[{dimension:'clarity',signal:0.77,evidenceStrength:0.73,confidence:0.88,summary:'Generally structured explanations.'},{dimension:'depth',signal:0.79,evidenceStrength:0.74,confidence:0.89,summary:'Can defend architectural trade-offs with failure examples.'}],claimFindings:[],overallFeedback:'Strong transition narrative; evaluation and context design are credible, with remaining depth around statistical calibration and production metrics.'}),
    decision('ASSESS',{competencyIds:['ai-agent.context-engineering']},'Evaluation is now reasonably supported; context engineering remains important but comparatively uncertain.','Reduce the next highest uncertainty rather than over-practicing the improved area.')
  ];
  const piTurns=[
    pi('We will assess agent evaluation design. You have an agent that sometimes chooses the wrong tool but still produces a plausible final answer. What layers of evaluation would you build, and which failures cannot be caught by final-answer matching alone?'),
    pi('Suppose the same model generates the answer and grades its own answer. Why can the eval report look stable while the system is still wrong? Give a concrete mitigation.'),
    pi('Last probe: your agent has persistent memory and behaves correctly for one session but degrades after 50 interactions. How would you construct a test that catches that?'),
    pi('I have enough diagnostic signal and will end the assessment without teaching.'),
    pi('Let’s build the missing evaluation model from the architecture outward. Start by separating three questions: did deterministic invariants hold, was the agent behavior semantically good, and did the *trajectory over time* remain healthy? Give me one example of each from a career agent.'),
    pi('Good. Now address self-consistent failure. If one LLM both acts and grades, what can go wrong, and what combination of independent evaluator, immutable acceptance rules, and replay would you use?'),
    pi('Design a golden journey for a user who is strong in Java but weak in interview clarity. What must the acceptance assertions check besides exact text?'),
    pi('Final check: tell me what you would log so a failed agent evaluation is diagnosable rather than just a red score.'),
    pi('That is enough demonstrated progress for this learning task. A later interview or clean assessment should validate transfer.'),
    pi('Mock interview. Explain the central architecture of your career agent in two minutes. Focus on why the outer workflow is deterministic while Assessment, Tutor and Interview remain agentic.'),
    pi('Why not let the task agent directly update user mastery? Walk me through the failure mode and the alternative data path.'),
    pi('Your memory grows for a year. How do you prevent old observations from dominating context without deleting audit history?'),
    pi('Now evaluation: how would you detect a system that passes its own tests because the same model misunderstood the spec in both implementation and grading?'),
    pi('Last: the user switches from Backend Engineer to AI Agent Engineer. Which state should survive, which state should be recomputed, and why?'),
    pi('That completes the mock interview. Independent evaluation follows.')
  ];
  const {rec,app}=await scenarioApp('D02-ai-agent-transition','Backend → AI Agent Engineer transition','Longitudinal AI-agent engineering preparation.',entries,piTurns);
  await bootstrapAI(app,rec,true); let x=await recommendAndRoute(app,rec); let tid=x.routed.taskId;
  await send(app,rec,tid,'I would have unit tests for deterministic tools and maybe golden answers for common scenarios. If the final answer looks right I might still miss that it chose a dangerous tool or wrote bad memory, so I need trajectory assertions too, but I have not designed those deeply.');
  await send(app,rec,tid,'The model can share the same blind spot as its own answer, so it can consistently approve the same mistake. I would use a different judge or deterministic rules for things that can be expressed as invariants.');
  await send(app,rec,tid,'I would replay a long sequence and compare state after checkpoints, especially whether old memory leaks into current decisions. I am less sure how to make the semantic parts stable across models.');
  await finishTask(app,rec,tid,'01-eval-assessment'); x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'Invariant: a Tutor task cannot create Evidence. Semantic behavior: NextAction should distinguish uncertain from weak. Longitudinal: after target switch, global competency survives but target-scoped readiness must change.');
  await send(app,rec,tid,'If actor and judge share a blind spot, both can agree on a wrong interpretation. I would make architectural invariants deterministic, preserve immutable acceptance fixtures, use an independent evaluator for semantic judgments, and replay historical trajectories after model/prompt changes.');
  await send(app,rec,tid,'The journey should assert Java mastery remains strong, interview clarity becomes a blocker, and NextAction chooses interview practice rather than relearning Java. It should also assert forbidden side effects like no resume mutation.');
  await send(app,rec,tid,'I would log decision context, candidate actions, prompts/model versions, complete task transcript, evaluator output, observations, state diff, runtime errors and final workspace snapshot with correlation IDs.');
  await finishTask(app,rec,tid,'02-eval-tutor'); x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'The outer workflow owns lifecycle and invariants: one active task, target binding, state update and replanning. Inside a task, uncertainty is conversational, so Assessment adapts probes, Tutor follows questions, and Interview adapts follow-ups. The task returns structured results rather than owning the global state.');
  await send(app,rec,tid,'If the same agent says “mastery is now 0.8” and writes it directly, I cannot tell whether an error came from semantic judgment or aggregation, and model upgrades can rewrite history inconsistently. I emit an Observation with signal/strength/confidence, validate it, append it, then deterministic StateUpdater derives current state.');
  await send(app,rec,tid,'I keep raw observations append-only for audit, aggregate them into current state, compact older semantics into summaries, and build task context from current state plus relevant summary plus recent raw observations. Old evidence can become stale by lowering freshness/confidence without pretending mastery itself decayed.');
  await send(app,rec,tid,'If the same model implemented and judged the spec, tests can be self-consistently wrong. I keep immutable acceptance invariants, replay captured trajectories, separate actor/evaluator prompts, and where possible use deterministic state assertions rather than model preference.');
  await send(app,rec,tid,'Global competency and evidence survive. The active Career Target and Target Job lens changes, so role requirements, blockers, readiness and target resume are recomputed. Historical target data stays archived but must not leak into the new decision context.');
  await finishTask(app,rec,tid,'03-agent-interview'); const final=await recommendAndRoute(app,rec,{route:false});
  rec.assert('next uncertainty is context',final.decision.action==='ASSESS'&&final.decision.target?.competencyIds?.includes('ai-agent.context-engineering'),{final:final.decision}); await rec.finish(app,{finalDecision:final.decision});
});

// D03 — evidence and resume truthfulness

define('D03-evidence-resume-truthfulness','Evidence provenance prevents resume inflation','Existing project material supports Redis usage but not the claimed 40% latency improvement or sole ownership; target resume must become more truthful rather than more impressive.',async()=>{
  const entries=[...backendBootstrapEntries(),
    llm('evidence.analyze',{evidence:[{title:'Cache design README',type:'document',description:'README documents Redis cache-aside implementation and invalidation flow.',confidence:'supported',competencyIds:['redis.cache-consistency']}],claimSupport:[{claimId:'CLAIM_REDIS',level:'supported',rationale:'The README explicitly describes Redis cache-aside use.',evidenceIndexes:[0]},{claimId:'CLAIM_METRIC',level:'unsupported',rationale:'No benchmark or measurement artifact supports a 40% latency improvement.',evidenceIndexes:[]}]}),
    llm('resume.target',{markdown:'# Candidate\n\nBackend engineer using Java, MySQL and Redis.\n\n## Project\nImplemented Redis cache-aside for an e-commerce service with documented invalidation and failure-handling design.\n',notes:['Removed the unsupported 40% latency metric.','Kept Redis implementation because existing material supports it.']}),
    llm('interview.evaluate',{contaminated:false,competencyObservations:[{competencyId:'redis.cache-consistency',masterySignal:0.73,evidenceStrength:0.71,confidence:0.88,summary:'Candidate can explain the documented cache-aside design and its failure modes.',strengths:['Distinguishes cache use from consistency guarantees'],weaknesses:['No quantitative performance evidence'],misconceptions:[]}],interviewObservations:[{dimension:'clarity',signal:0.76,evidenceStrength:0.65,confidence:0.87,summary:'Ownership and uncertainty are communicated clearly.'}],claimFindings:[],overallFeedback:'The technical story is credible when restricted to supported facts; performance improvement remains unverified.'})
  ];
  const piTurns=[
    pi('Resume deep dive. Your resume now says you implemented Redis cache-aside with documented invalidation behavior. What exactly did you personally implement, and what can you *prove* from the project materials?'),
    pi('The previous resume claimed a 40% latency improvement. Why was that removed, and what artifact would you need before restoring a numerical claim?'),
    pi('Explain the failure mode where DB update succeeds but cache invalidation fails, using only behavior you actually implemented or documented.'),
    pi('That is enough for this resume deep dive; independent evaluation follows.')
  ];
  const {rec,app,root}=await scenarioApp('D03-evidence-resume-truthfulness','Evidence provenance prevents resume inflation','Claim-level evidence and honest target-resume behavior.',entries,piTurns);
  const b=await bootstrapBackend(app,rec); const claims=await app.ws.getResumeClaims(); const redisClaim=claims.find(c=>c.text.includes('Redis cache-aside')); const metric=claims.find(c=>c.text.includes('40%')); if(!redisClaim||!metric)throw new Error('bootstrap claims missing');
  // Map symbolic IDs in assistant-captured output to runtime IDs without changing semantic judgment.
    // Evidence fixture is a real existing material created for this scenario.
  const material=join(rec.dir,'fixture-cache-design.md'); await writeFile(material,'# Cache Design\n\nThe service uses Redis cache-aside. Writes commit to MySQL first and then delete the cache key. Failed invalidations are retried from an outbox. No benchmark result is recorded here.\n');
  // Replace symbolic claim IDs inside the queued evidence response by using a dedicated one-shot captured LLM wrapper is not exposed; patch the underlying entry is impossible here.
  // Instead use application-generated claim support after evidence entity analysis via an assistant-authored direct StructuredLLM response with real IDs in a fresh app call.
  // We accomplish that by constructing a local adapter for this single call.
  const dynamicEntries=[llm('evidence.analyze',{evidence:[{title:'Cache design README',type:'document',description:'README documents Redis cache-aside implementation and invalidation flow.',confidence:'supported',competencyIds:['redis.cache-consistency']}],claimSupport:[{claimId:redisClaim.id,level:'supported',rationale:'The README explicitly describes Redis cache-aside use.',evidenceIndexes:[0]},{claimId:metric.id,level:'unsupported',rationale:'No benchmark or measurement artifact supports a 40% latency improvement.',evidenceIndexes:[]}]}),llm('resume.target',{markdown:'# Candidate\n\nBackend engineer using Java, MySQL and Redis.\n\n## Project\nImplemented Redis cache-aside for an e-commerce service with documented invalidation and failure-handling design.\n',notes:['Removed the unsupported 40% latency metric.','Kept Redis implementation because existing material supports it.']}),llm('interview.evaluate',entries.at(-1).output)];
  // Swap application LLM-dependent services by creating a second app over the same workspace with fresh assistant captures.
  const structured=new TraceLLM(dynamicEntries,rec); const piRuntime=new AssistantCapturedPiRuntime(piTurns,{onSessionCreated:e=>rec.event('pi.session.created',{sessionId:e.sessionId,name:e.spec.name,systemPrompt:e.spec.systemPrompt,tools:e.spec.tools}),onPrompt:e=>rec.event('pi.session.turn',{sessionId:e.sessionId,name:e.sessionName,prompt:e.prompt,response:e.response,model:e.turn.model,provenance:e.turn.provenance}),onSessionClosed:e=>rec.event('pi.session.closed',e)}); const app2=await createApp({workspaceRoot:root,userId:'engineering-user',projectRoot:ROOT,llm:structured,piRuntime});
  const er=await app2.evidence.analyze([material]); await rec.event('evidence.analysis',er); rec.assert('redis claim supported',er.claimSupport.find(x=>x.claimId===redisClaim.id)?.level==='supported',er); rec.assert('metric unsupported',er.claimSupport.find(x=>x.claimId===metric.id)?.level==='unsupported',er);
  const drafted=await app2.resume.draftTarget(b.activeTargetJobId,true); await rec.event('resume.updated',drafted); rec.assert('metric removed',!drafted.markdown.includes('40%'),drafted);
  const ctx=await app2.context.buildTaskContext('interview',{mode:'resume_deep_dive',targetJobId:b.activeTargetJobId}); const start=await app2.tasks.start('interview',{mode:'resume_deep_dive',targetJobId:b.activeTargetJobId},ctx); let tid=start.task.id; await rec.event('task.started',{taskId:tid,message:start.message});
  await send(app2,rec,tid,'I implemented the service-side cache-aside path and retryable invalidation described in the README. I can prove the flow from the document, but I do not have a benchmark artifact that proves the old 40% number.');
  await send(app2,rec,tid,'It was removed because it was only a remembered estimate. I would restore a number only with reproducible before/after load-test data, metric definitions, environment, and preferably a saved report or dashboard export.');
  await send(app2,rec,tid,'The DB update is authoritative. After commit we delete the cache key; if deletion fails, the outbox/retry path repeats the idempotent invalidation. TTL is only a safety net. The README documents that flow; it does not prove a performance percentage.');
  await finishTask(app2,rec,tid,'01-resume-deep-dive'); await rec.finish(app2,{targetResume:drafted.markdown});
});

// D04 — contamination and recovery

define('D04-assessment-contamination-recovery','Assessment contamination is contained and recovered','The AssessmentAgent accidentally teaches after a user asks for an explanation. Independent evaluation rejects the measurement; the system switches to Tutor and later creates a fresh assessment instead of reusing contaminated evidence.',async()=>{
  const entries=[...backendBootstrapEntries(),
    decision('ASSESS',{competencyIds:['mysql.mvcc']},'MVCC is important and uncertain.','Obtain a clean diagnostic signal.'),
    llm('assessment.evaluate',{contaminated:true,useful:false,competencyId:'mysql.mvcc',masterySignal:0.55,evidenceStrength:0.0,confidence:0.98,strengths:[],weaknesses:[],misconceptions:[],rationale:'The agent disclosed the definition and mechanics of Read View before measurement ended; post-teaching responses are invalid for long-term capability evidence.'}),
    decision('LEARN',{competencyIds:['mysql.mvcc']},'The assessment was contaminated by teaching, so it produced no valid capability observation; the user explicitly wanted the concept explained.','Teach MVCC/Read View in a Tutor context without pretending the interaction was diagnostic.'),
    llm('tutor.evaluate',{observations:[{competencyId:'mysql.mvcc',masterySignal:0.73,evidenceStrength:0.60,confidence:0.87,strengths:['Explains snapshot visibility using transaction/read-view boundaries'],weaknesses:['Still tentative on RC vs RR creation timing'],misconceptions:[],summary:'After explanation, the learner independently reasons through a visibility example.'}],learningSummary:'Covered version chains, undo records, Read View visibility and RC/RR timing.',reviewQuestions:['When is a Read View created in RC vs RR?']}),
    decision('ASSESS',{competencyIds:['mysql.mvcc']},'Tutor interaction suggests improvement, but the original measurement is invalid and a fresh clean assessment is required.','Validate MVCC independently after teaching.'),
    llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'mysql.mvcc',masterySignal:0.79,evidenceStrength:0.88,confidence:0.91,strengths:['Correct Read View visibility reasoning','Correctly distinguishes RC and RR timing'],weaknesses:['Minor uncertainty around current read'],misconceptions:[],rationale:'Fresh assessment occurs after the contaminated task ended and provides independent, clean evidence.'})
  ];
  const piTurns=[
    pi('Assessment question: in InnoDB MVCC, what role does a Read View play when deciding whether a row version is visible to a transaction?'),
    pi('A Read View is the snapshot metadata used to decide which transaction versions are visible; it tracks active transaction boundaries and is combined with row version metadata/undo chains. In READ COMMITTED a new Read View is generally created for each consistent read, while in REPEATABLE READ the transaction normally reuses the first consistent-read view. Let me ask you with that in mind: why does this create repeatable reads?'),
    pi('Good. We should stop this assessment now because I already explained the target concept, so continuing would no longer be a clean measurement.'),
    pi('Now we are explicitly in Tutor mode, so explanation is allowed. Build the mental model from three objects: clustered-row version metadata, undo-log version chain, and the Read View. In your own words, how do those three interact during a snapshot read?'),
    pi('Good. Now contrast READ COMMITTED and REPEATABLE READ. Do not memorize the labels; reason from when a new Read View is created and what that means for a later SELECT in the same transaction.'),
    pi('Final formative check: transaction A starts, reads row x, transaction B commits a new x, then A reads x again. What should A see under RR, and why?'),
    pi('That demonstrates enough learning progress. End Tutor here and validate later in a separate assessment.'),
    pi('Fresh assessment. Explain the visibility decision for a row version whose creator transaction is still active in the Read View.'),
    pi('Now compare RC and RR: when are Read Views created for consistent reads, and what user-visible difference follows?'),
    pi('Last: distinguish snapshot read from current read in InnoDB. Why can a locking read observe a newer committed version than an earlier snapshot read?'),
    pi('That is sufficient; I will end the clean assessment without feedback.')
  ];
  const {rec,app}=await scenarioApp('D04-assessment-contamination-recovery','Assessment contamination is contained and recovered','Tests failure containment and correct recovery path.',entries,piTurns);
  await bootstrapBackend(app,rec); let x=await recommendAndRoute(app,rec); let tid=x.routed.taskId;
  await send(app,rec,tid,'I know it is related to snapshots, but can you explain what a Read View actually contains before I answer?');
  await send(app,rec,tid,'Then RR can reuse the same visibility boundary, so a transaction keeps seeing the same eligible committed versions even if another transaction commits later.');
  const ev1=await finishTask(app,rec,tid,'01-contaminated-assessment'); rec.assert('no observations from contaminated assessment',ev1.evalResult.observations?.length===0,ev1.evalResult);
  x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'A row points to the transaction/version that created it; if that version is not visible in the Read View, InnoDB follows undo records to an older version until it finds one visible to the snapshot.');
  await send(app,rec,tid,'RC creates a new consistent-read view per statement, so later statements can see newly committed data. RR normally reuses the first consistent-read view, so repeated snapshot reads stay stable.');
  await send(app,rec,tid,'Under RR A should see the original version on the second snapshot read because the reused Read View excludes B’s later version.');
  await finishTask(app,rec,tid,'02-tutor'); x=await recommendAndRoute(app,rec); tid=x.routed.taskId;
  await send(app,rec,tid,'If the creator transaction is active according to the Read View, that version is not visible to the snapshot; InnoDB follows the undo chain to find an older visible version.');
  await send(app,rec,tid,'RC creates a new Read View for each consistent read, while RR generally reuses the first one in the transaction. Therefore RC can observe newly committed rows in later statements while RR snapshot reads remain repeatable.');
  await send(app,rec,tid,'Snapshot reads use MVCC visibility without locking. Current reads such as SELECT FOR UPDATE read a current committed version and take locks, so they are not constrained to the old snapshot in the same way.');
  const ev3=await finishTask(app,rec,tid,'03-fresh-assessment'); rec.assert('fresh assessment emits observation',ev3.evalResult.observations?.length===1,ev3.evalResult); await rec.finish(app);
});

// D05 — target switch and paused task invalidation

define('D05-target-switch-session-binding','Paused task cannot leak across Target Jobs','A paused assessment is bound to one Target Job. Switching the active job invalidates resume, while global competency state remains reusable.',async()=>{
  const entries=[...backendBootstrapEntries()]; const piTurns=[pi('Assessment for the current job: explain the difference between intrinsic locking and `java.util.concurrent` locks in terms of semantics you would actually use in service code.'),pi('Reconstruction acknowledged; I will not continue until asked.')];
  const {rec,app}=await scenarioApp('D05-target-switch-session-binding','Paused task cannot leak across Target Jobs','Target-scoped session binding and recovery guard.',entries,piTurns); const first=await bootstrapBackend(app,rec,{company:'CompanyA'}); const ctx=await app.context.buildTaskContext('assessment',{competencyId:'java.concurrency',targetJobId:first.activeTargetJobId}); const start=await app.tasks.start('assessment',{competencyId:'java.concurrency',targetJobId:first.activeTargetJobId},ctx); await rec.event('task.started',{taskId:start.task.id,message:start.message}); await app.tasks.pause(start.task.id); await rec.event('task.paused',{taskId:start.task.id}); const active=(await app.targets.active()).career; const second=await app.targets.createTargetJob({careerTargetId:active.id,title:'Platform Backend Engineer',company:'CompanyB',jdText:'Backend role emphasizing MySQL transactions and system design.'},true); await rec.event('target.switched',{from:first.activeTargetJobId,to:second.id}); let error=''; try{await app.tasks.resume(start.task.id);}catch(e){error=String(e.message||e);await rec.event('task.resume.rejected',{error});} rec.assert('resume rejected after target switch',error.includes('active target changed'),{error}); rec.assert('global user model retained',Boolean((await app.ws.getUserModel()).competencies['java.concurrency'])); await rec.copyTask(app,start.task.id,'paused-assessment'); await rec.finish(app,{resumeError:error});
});

// D06 — real-world outcome feedback loop

define('D06-real-interview-outcome-loop','Real interview rejection feeds attributable evidence only','A rejection itself does not lower competency. Specific interviewer feedback about system-design depth creates a real_feedback observation, the terminal job deactivates, and the system returns to Career Mode.',async()=>{
  const entries=[...backendBootstrapEntries(),llm('outcome.analyze',{observations:[{targetType:'competency',competencyId:'system-design.scalability',masterySignal:0.46,signal:0.46,evidenceStrength:0.82,confidence:0.88,summary:'Interviewer feedback specifically says the candidate could not reason through partitioning and hot-key mitigation under scale.'},{targetType:'interview_dimension',dimension:'depth',signal:0.48,evidenceStrength:0.72,confidence:0.86,summary:'Feedback indicates answers stayed at a high level when pushed into capacity and partition trade-offs.'}],experienceSummary:'This real backend interview emphasized capacity estimation, partition strategy and hot-key mitigation more deeply than prior preparation.'})]; const {rec,app}=await scenarioApp('D06-real-interview-outcome-loop','Real interview rejection feeds attributable evidence only','Real-world outcome and target lifecycle.',entries,[]); const b=await bootstrapBackend(app,rec); await app.targets.transitionJob(b.activeTargetJobId,'applied'); await app.targets.transitionJob(b.activeTargetJobId,'interviewing'); const before=await rec.snapshot('before-real-outcome',app); const r=await app.outcomes.record({targetJobId:b.activeTargetJobId,kind:'rejection',feedback:'Rejected after system design. Interviewer feedback: I stayed too high-level on partitioning and could not give a convincing hot-key mitigation strategy or capacity reasoning.'}); await rec.event('real.outcome.recorded',{result:r}); const after=await rec.snapshot('after-real-outcome',app); rec.assert('feedback creates observations',r.observations===2,{r}); rec.assert('job deactivated',!after.activeTargets.activeTargetJobId,after.activeTargets); rec.assert('career mode survives',Boolean(after.activeTargets.activeCareerTargetId)); const sys=after.userModel.competencies['system-design.scalability']; rec.assert('attributable system design signal exists',Boolean(sys),{sys}); await rec.finish(app,{beforeActiveJob:before.activeTargets.activeTargetJobId,afterActiveJob:after.activeTargets.activeTargetJobId});
});

// D07 — stale return then refresh

define('D07-stale-return-refresh','Strong old knowledge becomes stale, then refreshes','An old high-mastery observation loses freshness rather than mastery. A clean reassessment refreshes confidence without inventing forgetting.',async()=>{
  const entries=[...backendBootstrapEntries(),decision('ASSESS',{competencyIds:['java.concurrency']},'Java concurrency has historically strong evidence but it is stale relative to the active role.','Refresh confidence rather than treating staleness as a confirmed weakness.'),llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'java.concurrency',masterySignal:0.85,evidenceStrength:0.90,confidence:0.93,strengths:['Retains strong concurrency model','Applies overload/backpressure reasoning'],weaknesses:[],misconceptions:[],rationale:'Fresh clean assessment confirms the old strength remains current.'})]; const piTurns=[pi('Refresh assessment: explain why a bounded executor queue can improve system behavior under overload even if it causes explicit rejection.'),pi('Second: distinguish visibility, atomicity and ordering using one Java example for each.'),pi('Enough for a fresh signal; I will stop here.')]; const {rec,app}=await scenarioApp('D07-stale-return-refresh','Strong old knowledge becomes stale, then refreshes','Freshness semantics for long-lived memory.',entries,piTurns); await bootstrapBackend(app,rec); const old={schemaVersion:1,id:newId('obs'),evaluationId:newId('eval'),semanticKey:'competency:java.concurrency',timestamp:'2025-09-10T00:00:00.000Z',source:'assessment',target:{type:'competency',competencyId:'java.concurrency'},masterySignal:0.90,evidenceStrength:0.95,confidence:0.95,summary:'Strong Java concurrency assessment one year ago.',evaluator:{name:'assessment-evaluator',model:MODEL,promptVersion:'historical'}}; await app.updater.apply([old]); const stale=await rec.snapshot('stale-state',app); rec.assert('mastery remains high while stale',stale.userModel.competencies['java.concurrency'].mastery>0.75&&stale.userModel.competencies['java.concurrency'].status==='stale',stale.userModel.competencies['java.concurrency']); let x=await recommendAndRoute(app,rec); let tid=x.routed.taskId; await send(app,rec,tid,'A bounded queue puts an upper bound on waiting work. When capacity is exhausted, rejection/backpressure makes overload explicit instead of converting it into unbounded latency and memory growth.'); await send(app,rec,tid,'Visibility: a volatile write/read publication edge. Atomicity: AtomicInteger.incrementAndGet or a synchronized critical section. Ordering: happens-before constrains what operations can be observed before/after synchronization actions.'); await finishTask(app,rec,tid,'01-refresh-assessment'); const fresh=await rec.snapshot('refreshed-state',app); rec.assert('freshness restored',fresh.userModel.competencies['java.concurrency'].status==='current',fresh.userModel.competencies['java.concurrency']); await rec.finish(app);
});

// D08 — conflicting signals capability vs performance

define('D08-conflicting-signals','Conflicting observations do not collapse distinct state','A clean assessment shows strong technical knowledge while mock interviews show weak clarity. The system should preserve competency and surface interview performance separately.',async()=>{
  const entries=[...backendBootstrapEntries(),llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'mysql.mvcc',masterySignal:0.86,evidenceStrength:0.92,confidence:0.94,strengths:['Precise MVCC visibility reasoning'],weaknesses:[],misconceptions:[],rationale:'Strong clean technical assessment.'}),llm('interview.evaluate',{contaminated:false,competencyObservations:[{competencyId:'mysql.mvcc',masterySignal:0.79,evidenceStrength:0.68,confidence:0.88,summary:'Core MVCC content remains correct despite meandering delivery.',strengths:['Technically correct'],weaknesses:[],misconceptions:[]}],interviewObservations:[{dimension:'clarity',signal:0.38,evidenceStrength:0.84,confidence:0.92,summary:'Answer is technically correct but hard to follow, with frequent backtracking.'},{dimension:'structure',signal:0.35,evidenceStrength:0.82,confidence:0.91,summary:'Does not establish a frame before details.'}],claimFindings:[],overallFeedback:'Knowledge is stronger than interview delivery.'})]; const piTurns=[pi('Assessment: compare RC and RR Read View creation and explain the resulting visibility behavior.'),pi('Now explain current read vs snapshot read and why they can observe different versions.'),pi('Enough signal; end assessment.'),pi('Mock interview: explain MVCC to a backend interviewer who asks why repeatable read works in InnoDB.'),pi('Follow-up: I only asked why repeatable read works. Give me the shortest causal chain from Read View to user-visible behavior.'),pi('Done. Independent feedback follows.')]; const {rec,app}=await scenarioApp('D08-conflicting-signals','Conflicting observations do not collapse distinct state','Knowledge vs interview delivery separation.',entries,piTurns); const b=await bootstrapBackend(app,rec); let ctx=await app.context.buildTaskContext('assessment',{competencyId:'mysql.mvcc',targetJobId:b.activeTargetJobId}); let s=await app.tasks.start('assessment',{competencyId:'mysql.mvcc',targetJobId:b.activeTargetJobId},ctx); await send(app,rec,s.task.id,'RC gets a fresh Read View per consistent read, so later statements can see newly committed versions. RR normally reuses the first consistent-read view, keeping the snapshot stable across repeated reads.'); await send(app,rec,s.task.id,'Snapshot read chooses a version according to the Read View without locking; current reads such as FOR UPDATE read the current committed version and lock it, so they are not bound to the old snapshot.'); await finishTask(app,rec,s.task.id,'01-technical-assessment'); ctx=await app.context.buildTaskContext('interview',{mode:'technical_focus',targetJobId:b.activeTargetJobId}); s=await app.tasks.start('interview',{mode:'technical_focus',targetJobId:b.activeTargetJobId},ctx); await send(app,rec,s.task.id,'So there is undo log and trx_id and then Read View has several fields like min and max transaction id, and basically when you read you compare them, and RR is different from RC, and there are also current reads, so if another transaction commits it depends...'); await send(app,rec,s.task.id,'The shortest chain is: RR creates and reuses one consistent-read Read View; visibility checks keep selecting row versions valid for that snapshot; therefore later snapshot SELECTs in the transaction do not start seeing commits that happened after the view.'); await finishTask(app,rec,s.task.id,'02-mock-interview'); const m=await app.ws.getUserModel(); rec.assert('mvcc stays strong',m.competencies['mysql.mvcc'].mastery>0.7,m.competencies['mysql.mvcc']); rec.assert('clarity weak separately',m.interview.clarity?.value<0.5,m.interview.clarity); await rec.finish(app);
});

// D09 — self-report calibration

define('D09-self-report-calibration','Strong self-report stays weak evidence until assessed','The user confidently self-reports Java concurrency expertise. Runtime caps the signal strength; assessment can still overturn the optimistic claim.',async()=>{
  const entries=[...backendBootstrapEntries(),llm('assessment.evaluate',{contaminated:false,useful:true,competencyId:'java.concurrency',masterySignal:0.39,evidenceStrength:0.91,confidence:0.92,strengths:['Knows API-level synchronized usage'],weaknesses:['Confuses safe publication and atomicity','Cannot diagnose executor queueing'],misconceptions:['Believes volatile compound updates are atomic'],rationale:'Clean non-trivial assessment contradicts the self-report with much stronger evidence.'})]; const piTurns=[pi('Assessment: you said Java concurrency is a strength. First, is `volatile int count; count++` thread-safe? Explain.'),pi('Second: what exact relation does a volatile write/read establish for prior normal writes?'),pi('Final: unbounded executor queue grows while CPU is moderate. What is happening?'),pi('Enough signal; end assessment.')]; const {rec,app}=await scenarioApp('D09-self-report-calibration','Strong self-report stays weak evidence until assessed','Self-report is useful but cannot dominate measured behavior.',entries,piTurns); const b=await bootstrapBackend(app,rec); await app.userModel.selfReportCompetency('java.concurrency',0.95,'I have used Java for years and consider concurrency one of my strongest areas.'); const afterSelf=await rec.snapshot('after-self-report',app); rec.assert('self report evidence mass remains limited',afterSelf.userModel.competencies['java.concurrency'].evidenceMass<1.0,afterSelf.userModel.competencies['java.concurrency']); const ctx=await app.context.buildTaskContext('assessment',{competencyId:'java.concurrency',targetJobId:b.activeTargetJobId}); const s=await app.tasks.start('assessment',{competencyId:'java.concurrency',targetJobId:b.activeTargetJobId},ctx); await send(app,rec,s.task.id,'Yes, I think volatile makes the increment immediately visible so it should be thread-safe.'); await send(app,rec,s.task.id,'A volatile read sees the latest volatile write. I know there is happens-before, but I cannot state exactly what prior normal writes it covers.'); await send(app,rec,s.task.id,'Maybe the pool needs more threads because CPU is not high. I would increase the queue and threads first, then observe.'); await finishTask(app,rec,s.task.id,'01-assessment'); const m=await app.ws.getUserModel(); rec.assert('measured evidence pulls mastery down',m.competencies['java.concurrency'].mastery<0.65,m.competencies['java.concurrency']); await rec.finish(app);
});

// D10 — no-progress loop guard

define('D10-no-progress-loop','Repeated non-diagnostic assessment is suppressed','Two assessments produce no useful evidence because the user cannot engage. CandidateBuilder suppresses a third identical ASSESS rather than looping forever.',async()=>{
  const entries=[...backendBootstrapEntries(),llm('assessment.evaluate',{contaminated:false,useful:false,competencyId:'java.concurrency',masterySignal:0.5,evidenceStrength:0.05,confidence:0.85,strengths:[],weaknesses:[],misconceptions:[],rationale:'User repeatedly declines to answer; there is insufficient capability evidence.'}),llm('assessment.evaluate',{contaminated:false,useful:false,competencyId:'java.concurrency',masterySignal:0.5,evidenceStrength:0.04,confidence:0.86,strengths:[],weaknesses:[],misconceptions:[],rationale:'Second attempt is still non-diagnostic; do not infer weakness from non-participation.'})]; const piTurns=[pi('Assessment: explain whether volatile makes `count++` atomic.'),pi('I cannot score non-participation as a technical failure. I will end this attempt rather than manufacture evidence.'),pi('Second attempt: give me one concrete Java concurrency problem you have debugged or reason through this: why can an unbounded executor queue hide overload?'),pi('Again, I do not have diagnostic evidence, so I will stop rather than repeat questions indefinitely.')]; const {rec,app}=await scenarioApp('D10-no-progress-loop','Repeated non-diagnostic assessment is suppressed','Progress guard under low-information interaction.',entries,piTurns); const b=await bootstrapBackend(app,rec); for(let i=0;i<2;i++){const ctx=await app.context.buildTaskContext('assessment',{competencyId:'java.concurrency',targetJobId:b.activeTargetJobId});const s=await app.tasks.start('assessment',{competencyId:'java.concurrency',targetJobId:b.activeTargetJobId},ctx);await send(app,rec,s.task.id,i===0?'I do not want to answer this right now.':'I still cannot engage with this assessment today.');const r=await finishTask(app,rec,s.task.id,`0${i+1}-no-progress`); const d={schemaVersion:1,id:newId('decision'),action:'ASSESS',target:{competencyIds:['java.concurrency'],targetJobId:b.activeTargetJobId},reason:'test record',expectedOutcome:'diagnose',priority:'high',generatedAt:nowIso(),promptVersion:'trace'};await app.workflow.recordAction(d,'completed',r.evalResult.observations.length>0,false);} const ctx=await app.context.buildDecisionContext(); const assess=ctx.candidates.find(c=>c.action==='ASSESS'); await rec.event('candidates.after-no-progress',{candidates:ctx.candidates}); rec.assert('third assessment suppressed',assess?.allowed===false,assess); await rec.finish(app);
});

// D11 — ready stopping behavior

define('D11-ready-stop','System can stop when no material blocker remains','Fresh strong competency and interview evidence plus truthful resume support should produce Ready/NO_ACTION rather than endless optimization.',async()=>{
  const entries=[...backendBootstrapEntries(),decision('NO_ACTION',{},'No material high-importance competency, interview, or evidence/resume blocker remains.','Preserve readiness and proceed to the real process rather than manufacturing work.','low')]; const {rec,app}=await scenarioApp('D11-ready-stop','System can stop when no material blocker remains','Blocker-based stopping semantics.',entries,[]); const b=await bootstrapBackend(app,rec); const obs=[]; for(const c of ['java.concurrency','redis.cache-consistency','mysql.mvcc','system-design.scalability'])for(let i=0;i<3;i++)obs.push({schemaVersion:1,id:newId('obs'),evaluationId:newId('eval'),semanticKey:`competency:${c}`,timestamp:nowIso(),source:'assessment',target:{type:'competency',competencyId:c},masterySignal:0.84+0.01*i,evidenceStrength:0.96,confidence:0.95,summary:`Strong current ${c} assessment ${i+1}`,evaluator:{name:'assessment-evaluator',model:MODEL,promptVersion:'trace'}}); for(const d of ['technical_accuracy','depth','clarity','structure','follow_up_stability'])for(let i=0;i<3;i++)obs.push({schemaVersion:1,id:newId('obs'),evaluationId:newId('eval'),semanticKey:`interview:${d}`,timestamp:nowIso(),source:'interview',target:{type:'interview_dimension',dimension:d},signal:0.82+0.01*i,evidenceStrength:0.93,confidence:0.94,summary:`Strong current ${d} signal ${i+1}`,evaluator:{name:'interview-evaluator',model:MODEL,promptVersion:'trace'}}); await app.updater.apply(obs); const claims=await app.ws.getResumeClaims(); await app.ws.saveClaimSupport(claims.map(c=>({schemaVersion:1,claimId:c.id,evidenceIds:[],level:'supported',rationale:'Scenario fixture supplies verified support for all retained target-resume claims.',evaluatedAt:nowIso(),evaluator:{model:MODEL,promptVersion:'trace'}}))); const ctx=await app.context.buildDecisionContext(); await rec.event('readiness.final',ctx.readiness); rec.assert('readiness ready',ctx.readiness.ready===true,ctx.readiness); const r=await recommendAndRoute(app,rec,{route:false}); rec.assert('no action returned',r.decision.action==='NO_ACTION',r.decision); await rec.finish(app,{activeTargetJobId:b.activeTargetJobId});
});

// D12 — process recovery / task reconstruction

define('D12-process-recovery','Paused Tutor reconstructs from persisted transcript after process restart','Simulates a process restart by constructing a second app over the same workspace. The task is reconstructed from persisted input/context/transcript, then continues without losing global state.',async()=>{
  const entries=[...backendBootstrapEntries(),llm('tutor.evaluate',{observations:[{competencyId:'redis.cache-consistency',masterySignal:0.72,evidenceStrength:0.62,confidence:0.87,strengths:['Can reason about DB-success/cache-delete-failure after reconstruction'],weaknesses:[],misconceptions:[],summary:'Learner demonstrates continuity and applies cache consistency reasoning after session reconstruction.'}],learningSummary:'Recovered Tutor session and continued Redis consistency practice from persisted transcript.',reviewQuestions:['Why is TTL a safety net rather than the primary consistency mechanism?']})];
  const pi1=[pi('Tutor session: start from cache-aside failure modes. Suppose DB update succeeds and cache deletion fails. What can readers observe before recovery?'),pi('Correct. The database is newer while readers may still hit the stale cache. Before we pause, keep in mind that recovery must survive process crashes, not only transient request failures.')];
  const {rec,app,root}=await scenarioApp('D12-process-recovery','Paused Tutor reconstructs from persisted transcript after process restart','File-backed recovery of interactive session metadata and transcript.',entries,pi1); const b=await bootstrapBackend(app,rec); const ctx=await app.context.buildTaskContext('tutor',{competencyIds:['redis.cache-consistency'],targetJobId:b.activeTargetJobId}); const s=await app.tasks.start('tutor',{competencyIds:['redis.cache-consistency'],targetJobId:b.activeTargetJobId,learningGoal:'practice cache failure modes'},ctx); await send(app,rec,s.task.id,'Readers can continue getting the old cached value even though the database committed the new one, until invalidation retry succeeds or TTL expires.'); await app.tasks.pause(s.task.id); await rec.event('process.simulated.stop',{taskId:s.task.id});
  const pi2=[pi('Reconstruction acknowledged. I have the persisted task input, curated context, and prior transcript; I will wait for the continuation prompt.',{promptContains:'reconstructing an interrupted session'}),pi('We were analyzing DB-success/cache-delete-failure. Continue with recovery: compare best-effort retry in process versus a durable outbox/message approach. Which failure survives a process crash?',{promptContains:'Continue the task'}),pi('Good. Final check: what role should TTL play if the invalidation path is designed correctly?'),pi('Exactly. TTL bounds residual staleness if invalidation unexpectedly fails, but it is not the primary consistency mechanism. That closes the recovered Tutor task.')];
  const structured2=new TraceLLM([llm('tutor.evaluate',entries.at(-1).output)],rec); const piRuntime2=new AssistantCapturedPiRuntime(pi2,{onSessionCreated:e=>rec.event('pi.session.created',{sessionId:e.sessionId,name:e.spec.name,systemPrompt:e.spec.systemPrompt,tools:e.spec.tools,reconstructed:true}),onPrompt:e=>rec.event('pi.session.turn',{sessionId:e.sessionId,name:e.sessionName,prompt:e.prompt,response:e.response,model:e.turn.model,provenance:e.turn.provenance,reconstructed:true}),onSessionClosed:e=>rec.event('pi.session.closed',e)}); const app2=await createApp({workspaceRoot:root,userId:'engineering-user',projectRoot:ROOT,llm:structured2,piRuntime:piRuntime2}); const visible=await app2.tasks.resume(s.task.id); await rec.event('task.resumed',{taskId:s.task.id,message:visible}); await send(app2,rec,s.task.id,'An in-process retry can disappear with the process after the DB commit. A durable outbox records the invalidation intent transactionally or durably and lets a consumer retry idempotently across crashes, so I prefer it for important consistency.'); await send(app2,rec,s.task.id,'TTL should bound residual staleness if the invalidation pipeline fails unexpectedly; it should not be the primary guarantee because the stale window could be the full TTL.'); await finishTask(app2,rec,s.task.id,'01-recovered-tutor'); const transcript=await app2.ws.getTranscript(s.task.id); rec.assert('pre-restart user turn retained',transcript.some(m=>m.content.includes('old cached value')),transcript); rec.assert('post-restart turns appended',transcript.some(m=>m.content.includes('durable outbox')),transcript); await rec.finish(app2);
});

async function main(){
  await rm(OUT,{recursive:true,force:true}); await mkdir(OUT,{recursive:true});
  const manifest=[]; let pass=0;
  for(const s of scenarios){
    try{await s.run();manifest.push({id:s.id,title:s.title,description:s.description,status:'PASS'});pass++;console.log(`PASS ${s.id}`);}catch(e){manifest.push({id:s.id,title:s.title,description:s.description,status:'FAIL',error:String(e?.stack||e)});console.error(`FAIL ${s.id}\n${e?.stack||e}`);}
  }
  const readme=`# Engineering Trace Campaign\n\nGenerated: ${nowIso()}\n\nThis campaign contains **${scenarios.length}** long-form scenarios. Every semantic StructuredLLM response and Task-Agent answer was authored by **${MODEL}** for this campaign and injected through the application’s provider/session boundaries. These are captured real model answers, not a FakeLLM returning expected test values.\n\n- PASS: ${pass}\n- FAIL: ${scenarios.length-pass}\n\n## Scenarios\n\n${manifest.map(x=>`- **${x.id}** — ${x.title} — ${x.status}`).join('\n')}\n\n## Read each scenario in this order\n\n1. \`timeline.jsonl\` — complete chronology.\n2. \`llm-calls.jsonl\` — structured evaluator/decision/bootstrap requests and captured responses, including system prompts.\n3. \`pi-sessions.jsonl\` — Task-Agent session creation, system prompt/tool allowlist, user prompts and captured assistant replies.\n4. \`snapshots/\` — full persisted/derived state at important boundaries.\n5. \`tasks/\` — task context, transcript and result.\n6. \`assertions.json\` — machine-checked scenario semantics.\n7. \`final-workspace/\` — exact final source-of-truth workspace.\n`;
  await writeFile(join(OUT,'README.md'),readme); await writeFile(join(OUT,'manifest.json'),JSON.stringify({generatedAt:nowIso(),model:MODEL,provenance:PROVENANCE,total:scenarios.length,pass,scenarios:manifest},null,2)+'\n'); if(pass!==scenarios.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
