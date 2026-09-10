import { join } from "node:path";
import { FileWorkspace } from "./infrastructure/filesystem/file-workspace.js";
import { PiRuntimeAdapter } from "./infrastructure/pi/pi-runtime-adapter.js";
import type { PiSessionRuntime } from "./infrastructure/pi/pi-session-runtime.js";
import { PiStructuredLLM } from "./infrastructure/llm/pi-structured-llm.js";
import type { StructuredLLM } from "./infrastructure/llm/structured-llm.js";
import { AuditedStructuredLLM } from "./infrastructure/llm/audited-structured-llm.js";
import { CompetencyCatalog } from "./competency/catalog.js";
import { StateUpdater } from "./application/state-update/state-updater.js";
import { CandidateBuilder } from "./application/workflow/candidate-builder.js";
import { ContextBuilder } from "./application/context/context-builder.js";
import { NextActionDecider } from "./application/workflow/next-action.js";
import { CareerWorkflowRunner } from "./application/workflow/workflow-runner.js";
import { BaseTaskRuntime } from "./agents/base-task-runtime.js";
import { TaskEvaluators } from "./evaluators/evaluators.js";
import { TaskEvaluationService } from "./evaluators/task-evaluation-service.js";
import { RoleAnalysisService } from "./application/workflow/role-analysis.js";
import { EvidenceService } from "./evidence/evidence-service.js";
import { ResumeService } from "./resume/resume-service.js";
import { OutcomeService } from "./outcome/outcome-service.js";
import { MaintenanceService } from "./maintenance/maintenance.js";
import { ActionRouter } from "./application/workflow/action-router.js";
import { BootstrapWorkflow } from "./application/bootstrap/bootstrap.js";
import { TargetService } from "./targets/target-service.js";
import { UserModelService } from "./application/user-model-service.js";

export interface CreateAppOptions{workspaceRoot:string;userId:string;projectRoot?:string;llm?:StructuredLLM;piRuntime?:PiSessionRuntime}
export async function createApp(options:CreateAppOptions){const projectRoot=options.projectRoot??process.cwd();const ws=new FileWorkspace(options.workspaceRoot,options.userId);await ws.init();const catalog=await CompetencyCatalog.load(join(projectRoot,"competency-catalog"));const pi=options.piRuntime??new PiRuntimeAdapter();const baseLlm=options.llm??new PiStructuredLLM(pi,ws.userRoot);const llm=process.env.CAREER_AGENT_TRACE_LLM==="1"?new AuditedStructuredLLM(baseLlm,join(ws.userRoot,"runtime/llm-calls.jsonl")):baseLlm;const updater=new StateUpdater(ws);const candidateBuilder=new CandidateBuilder();const context=new ContextBuilder(ws,candidateBuilder);const decider=new NextActionDecider(llm);const workflow=new CareerWorkflowRunner(ws,context,decider);const tasks=new BaseTaskRuntime(ws,pi);const evaluators=new TaskEvaluators(llm,catalog);const taskEvaluation=new TaskEvaluationService(ws,evaluators,updater);const role=new RoleAnalysisService(ws,llm,catalog);const evidence=new EvidenceService(ws,llm,catalog);const resume=new ResumeService(ws,llm);const maintenance=new MaintenanceService(ws,llm,updater);const router=new ActionRouter(context,tasks,role,evidence,resume,maintenance);const bootstrap=new BootstrapWorkflow(ws,llm,catalog,updater);const outcomes=new OutcomeService(ws,llm,catalog,updater);const targets=new TargetService(ws);const userModel=new UserModelService(ws,updater,catalog);return{ws,catalog,pi,llm,updater,context,workflow,tasks,evaluators,taskEvaluation,role,evidence,resume,maintenance,router,bootstrap,outcomes,targets,userModel};}
