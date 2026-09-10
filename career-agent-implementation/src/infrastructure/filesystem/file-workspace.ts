import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import type {
  ActiveTargets, CareerExperienceEvent, CareerTarget, ClaimSupport, Evidence, MaterialStateChange,
  Observation, ObservationAmendment, RoleCompetencyProfile, RuntimeEvent, TargetJob, TaskSession,
  TranscriptMessage, UserModel, WorkflowState, ResumeClaim
} from "../../domain/types.js";
import { appendJsonl, fileExists, newId, nowIso, readJson, readJsonl, safeResolve, writeJsonAtomic } from "../../shared/utils.js";

export interface WorkspaceMeta { schemaVersion: 1; userId: string; createdAt: string; lastMigratedAt?: string }

const emptyUserModel = (): UserModel => ({ schemaVersion: 1, updatedAt: nowIso(), competencies: {}, interview: {}, preferences: {} });
const emptyTargets = (): ActiveTargets => ({ schemaVersion: 1, updatedAt: nowIso() });
const emptyWorkflow = (): WorkflowState => ({ schemaVersion: 1, pausedTaskIds: [], recentActions: [], updatedAt: nowIso() });

export class FileWorkspace {
  readonly userRoot: string;
  constructor(readonly workspaceRoot: string, readonly userId: string) {
    this.userRoot = safeResolve(workspaceRoot, `users/${userId}`);
  }

  path(rel: string): string { return safeResolve(this.userRoot, rel); }

  async init(): Promise<void> {
    for (const d of ["sources/resume", "goals", "targets", "roles", "state", "evidence", "resumes/targets", "observations", "runtime", "tasks", "career-experience", "summaries", "artifacts/learning"]) {
      await mkdir(this.path(d), { recursive: true });
    }
    const metaPath = this.path("meta.json");
    if (!(await fileExists(metaPath))) await writeJsonAtomic(metaPath, { schemaVersion: 1, userId: this.userId, createdAt: nowIso() } satisfies WorkspaceMeta);
    if (!(await fileExists(this.path("state/user-model.json")))) await this.saveUserModel(emptyUserModel());
    if (!(await fileExists(this.path("targets/active.json")))) await this.saveActiveTargets(emptyTargets());
    if (!(await fileExists(this.path("runtime/workflow.json")))) await this.saveWorkflow(emptyWorkflow());
    for (const file of ["targets/career-targets.json", "targets/target-jobs.json", "evidence/index.json", "evidence/claim-support.json", "resumes/claims.json"]) {
      if (!(await fileExists(this.path(file)))) await writeJsonAtomic(this.path(file), []);
    }
  }

  async saveSourceCopy(sourcePath: string, category = "source"): Promise<string> {
    const dest = this.path(`sources/${category}/${Date.now()}-${basename(sourcePath)}`);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(sourcePath, dest);
    return relative(this.userRoot, dest);
  }

  async writeText(rel: string, text: string): Promise<void> { const p=this.path(rel); await mkdir(dirname(p),{recursive:true}); await writeFile(p,text,"utf8"); }
  async readText(rel: string, fallback = ""): Promise<string> { const p=this.path(rel); return (await fileExists(p)) ? readFile(p,"utf8") : fallback; }
  async exists(rel: string): Promise<boolean> { return fileExists(this.path(rel)); }

  async getUserModel(): Promise<UserModel> { return readJson(this.path("state/user-model.json"), emptyUserModel()); }
  async saveUserModel(model: UserModel): Promise<void> { await writeJsonAtomic(this.path("state/user-model.json"), { ...model, updatedAt: nowIso() }); }

  async getActiveTargets(): Promise<ActiveTargets> { return readJson(this.path("targets/active.json"), emptyTargets()); }
  async saveActiveTargets(v: ActiveTargets): Promise<void> { await writeJsonAtomic(this.path("targets/active.json"), { ...v, updatedAt: nowIso() }); }
  async getCareerTargets(): Promise<CareerTarget[]> { return readJson(this.path("targets/career-targets.json"), []); }
  async saveCareerTargets(v: CareerTarget[]): Promise<void> { await writeJsonAtomic(this.path("targets/career-targets.json"), v); }
  async getTargetJobs(): Promise<TargetJob[]> { return readJson(this.path("targets/target-jobs.json"), []); }
  async saveTargetJobs(v: TargetJob[]): Promise<void> { await writeJsonAtomic(this.path("targets/target-jobs.json"), v); }

  async saveRoleProfile(profile: RoleCompetencyProfile): Promise<void> { await writeJsonAtomic(this.path(`roles/${profile.scope}-${profile.scopeId}.json`), profile); }
  async getRoleProfile(scope: "career"|"target_job", scopeId: string): Promise<RoleCompetencyProfile | undefined> {
    const p=this.path(`roles/${scope}-${scopeId}.json`); return (await fileExists(p)) ? readJson<RoleCompetencyProfile>(p, undefined as never) : undefined;
  }

  async getEvidence(): Promise<Evidence[]> { return readJson(this.path("evidence/index.json"), []); }
  async saveEvidence(v: Evidence[]): Promise<void> { await writeJsonAtomic(this.path("evidence/index.json"), v); }
  async getClaimSupport(): Promise<ClaimSupport[]> { return readJson(this.path("evidence/claim-support.json"), []); }
  async saveClaimSupport(v: ClaimSupport[]): Promise<void> { await writeJsonAtomic(this.path("evidence/claim-support.json"), v); }
  async getResumeClaims(): Promise<ResumeClaim[]> { return readJson(this.path("resumes/claims.json"), []); }
  async saveResumeClaims(v: ResumeClaim[]): Promise<void> { await writeJsonAtomic(this.path("resumes/claims.json"), v); }

  async appendObservation(obs: Observation): Promise<boolean> {
    const existing = await this.getObservations();
    if (existing.some(o => o.evaluationId === obs.evaluationId && o.semanticKey === obs.semanticKey)) return false;
    await appendJsonl(this.path("observations/events.jsonl"), obs); return true;
  }
  async getObservations(): Promise<Observation[]> { return readJsonl(this.path("observations/events.jsonl")); }
  async appendAmendment(a: ObservationAmendment): Promise<void> { await appendJsonl(this.path("observations/amendments.jsonl"), a); }
  async getAmendments(): Promise<ObservationAmendment[]> { return readJsonl(this.path("observations/amendments.jsonl")); }

  async getActiveObservations(): Promise<Observation[]> {
    const obs=await this.getObservations(), amendments=await this.getAmendments();
    const status=new Map<string,"active"|"contested"|"superseded">();
    for (const a of amendments) {
      if (a.action === "contest") status.set(a.observationId,"contested");
      if (a.action === "supersede") status.set(a.observationId,"superseded");
      if (a.action === "restore") status.set(a.observationId,"active");
    }
    return obs.filter(o => !["contested","superseded"].includes(status.get(o.id) ?? "active"));
  }

  async appendRuntimeEvent(event: RuntimeEvent): Promise<void> { await appendJsonl(this.path("runtime/events.jsonl"), event); }
  async runtimeEvent(type: string, traceId: string, payload?: unknown, refs: Partial<RuntimeEvent> = {}): Promise<void> {
    await this.appendRuntimeEvent({ schemaVersion:1,id:newId("evt"),type,timestamp:nowIso(),traceId,payload,...refs });
  }
  async getRuntimeEvents(): Promise<RuntimeEvent[]> { return readJsonl(this.path("runtime/events.jsonl")); }

  async getWorkflow(): Promise<WorkflowState> { return readJson(this.path("runtime/workflow.json"), emptyWorkflow()); }
  async saveWorkflow(v: WorkflowState): Promise<void> { await writeJsonAtomic(this.path("runtime/workflow.json"), { ...v, updatedAt: nowIso() }); }

  async createTask(task: TaskSession, contextSnapshot: unknown): Promise<void> {
    const dir=`tasks/${task.id}`; await mkdir(this.path(dir),{recursive:true});
    await writeJsonAtomic(this.path(`${dir}/task.json`), task);
    await writeJsonAtomic(this.path(task.contextSnapshotPath), contextSnapshot);
  }
  async getTask(id: string): Promise<TaskSession | undefined> { const p=this.path(`tasks/${id}/task.json`); return (await fileExists(p)) ? readJson<TaskSession>(p, undefined as never) : undefined; }
  async saveTask(task: TaskSession): Promise<void> {
    const existing=await this.getTask(task.id);
    if(existing && JSON.stringify(existing.input)!==JSON.stringify(task.input)) throw new Error("Task input is immutable; create a new task instead.");
    await writeJsonAtomic(this.path(`tasks/${task.id}/task.json`), task);
  }
  async appendTranscript(msg: TranscriptMessage): Promise<void> { await appendJsonl(this.path(`tasks/${msg.taskId}/transcript.jsonl`), msg); }
  async getTranscript(taskId: string): Promise<TranscriptMessage[]> { return readJsonl(this.path(`tasks/${taskId}/transcript.jsonl`)); }
  async saveTaskResult(taskId: string, result: unknown): Promise<void> { await writeJsonAtomic(this.path(`tasks/${taskId}/result.json`), result); }
  async getTaskContext<T=unknown>(taskId: string): Promise<T> { return readJson(this.path(`tasks/${taskId}/context.json`), {} as T); }

  async appendCareerExperience(e: CareerExperienceEvent): Promise<void> { await appendJsonl(this.path("career-experience/events.jsonl"), e); }
  async getCareerExperience(): Promise<CareerExperienceEvent[]> { return readJsonl(this.path("career-experience/events.jsonl")); }
  async appendMaterialChange(c: MaterialStateChange): Promise<void> { await appendJsonl(this.path("runtime/material-changes.jsonl"), c); }
  async getMaterialChanges(): Promise<MaterialStateChange[]> { return readJsonl(this.path("runtime/material-changes.jsonl")); }
}
