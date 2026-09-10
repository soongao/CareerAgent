export type ISODateTime = string;
export type ID = string;

export type ActionType =
  | "ANALYZE_ROLE"
  | "ASSESS"
  | "LEARN"
  | "REVIEW"
  | "MOCK_INTERVIEW"
  | "ANALYZE_EVIDENCE"
  | "UPDATE_RESUME"
  | "REFRESH_PROFILE"
  | "NO_ACTION";

export type TaskStatus = "active" | "paused" | "completed" | "cancelled" | "failed";
export type ObservationSource = "assessment" | "tutor" | "interview" | "self_report" | "resume" | "evidence" | "real_feedback";
export type ObservationTarget =
  | { type: "competency"; competencyId: string }
  | { type: "interview_dimension"; dimension: InterviewDimension }
  | { type: "preference"; preference: string }
  | { type: "evidence"; evidenceId: string };

export type InterviewDimension = "technical_accuracy" | "depth" | "clarity" | "structure" | "follow_up_stability";

export interface SourceRef {
  id: ID;
  kind: "user_input" | "file" | "transcript" | "web" | "market";
  locator: string;
  capturedAt?: ISODateTime;
}

export interface ArtifactRef {
  id: ID;
  kind: "file" | "resume" | "learning_note" | "report";
  path: string;
  version?: string;
}

export interface Observation {
  schemaVersion: 1;
  id: ID;
  evaluationId: ID;
  semanticKey: string;
  timestamp: ISODateTime;
  source: ObservationSource;
  target: ObservationTarget;
  masterySignal?: number;
  signal?: number;
  evidenceStrength: number;
  confidence: number;
  taskId?: ID;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  misconceptions?: string[];
  evidenceRefs?: string[];
  sourceRefs?: SourceRef[];
  evaluator: { name: string; model?: string; promptVersion: string; rubricVersion?: string };
}

export interface ObservationAmendment {
  schemaVersion: 1;
  id: ID;
  observationId: ID;
  action: "contest" | "supersede" | "restore";
  reason: string;
  timestamp: ISODateTime;
  replacementObservationId?: ID;
}

export interface RuntimeEvent {
  schemaVersion: 1;
  id: ID;
  type: string;
  timestamp: ISODateTime;
  traceId: ID;
  executionId?: ID;
  taskId?: ID;
  evaluationId?: ID;
  decisionId?: ID;
  payload?: unknown;
  error?: { code: string; message: string; stack?: string };
}

export interface CompetencyNode {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  kind: "taxonomy" | "assessable";
  domain: string;
  parents: string[];
  prerequisites: string[];
  relatedCompetencies: string[];
  aliases: string[];
  tags: string[];
  version: number;
}

export interface UserCompetencyState {
  schemaVersion: 1;
  competencyId: string;
  mastery: number | null;
  baseConfidence: number;
  freshness: number;
  effectiveConfidence: number;
  status: "unknown" | "current" | "stale";
  evidenceMass: number;
  observationCount: number;
  lastObservedAt?: ISODateTime;
  strengths: string[];
  weaknesses: string[];
  misconceptions: string[];
  aggregatorVersion: string;
}

export interface InterviewDimensionState {
  schemaVersion: 1;
  dimension: InterviewDimension;
  value: number | null;
  baseConfidence: number;
  freshness: number;
  effectiveConfidence: number;
  status: "unknown" | "current" | "stale";
  evidenceMass: number;
  observationCount: number;
  lastObservedAt?: ISODateTime;
}

export interface PreferenceState {
  schemaVersion: 1;
  key: string;
  value: string;
  confidence: number;
  source: "explicit" | "inferred";
  updatedAt: ISODateTime;
}

export interface UserModel {
  schemaVersion: 1;
  updatedAt: ISODateTime;
  competencies: Record<string, UserCompetencyState>;
  interview: Record<string, InterviewDimensionState>;
  preferences: Record<string, PreferenceState>;
}

export interface CareerTarget {
  schemaVersion: 1;
  id: ID;
  name: string;
  description?: string;
  createdAt: ISODateTime;
  archived?: boolean;
}

export type TargetJobStatus = "considering" | "preparing" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
export interface TargetJob {
  schemaVersion: 1;
  id: ID;
  careerTargetId: ID;
  title: string;
  company?: string;
  jdText: string;
  status: TargetJobStatus;
  applicationDate?: string;
  interviewDate?: string;
  deadline?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ActiveTargets {
  schemaVersion: 1;
  activeCareerTargetId?: ID;
  activeTargetJobId?: ID;
  updatedAt: ISODateTime;
}

export interface RoleCompetencyRequirement {
  competencyId: string;
  importance: number;
  requiredMastery: number;
  authority: "jd_explicit" | "canonical" | "market" | "llm_inferred" | "personal_experience";
  sourceText?: string;
  rationale?: string;
}

export interface RoleCompetencyProfile {
  schemaVersion: 1;
  id: ID;
  scope: "career" | "target_job";
  scopeId: ID;
  catalogVersion: string;
  generatedAt: ISODateTime;
  requirements: RoleCompetencyRequirement[];
}

export type EvidenceConfidence = "claimed" | "confirmed" | "supported";
export interface Evidence {
  schemaVersion: 1;
  id: ID;
  title: string;
  type: "project" | "work_experience" | "code" | "document" | "benchmark" | "other";
  description: string;
  confidence: EvidenceConfidence;
  competencyIds: string[];
  artifactRefs: ArtifactRef[];
  sourceRefs: SourceRef[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ResumeClaim {
  schemaVersion: 1;
  id: ID;
  text: string;
  section?: string;
  competencyIds: string[];
  createdAt: ISODateTime;
}

export interface ClaimSupport {
  schemaVersion: 1;
  claimId: ID;
  evidenceIds: ID[];
  level: "unsupported" | "partial" | "supported" | "self_report_only";
  rationale: string;
  evaluatedAt: ISODateTime;
  evaluator?: { model?: string; promptVersion: string };
}

export type InterviewMode = "full_mock" | "technical_focus" | "resume_deep_dive" | "system_design" | "behavioral";
export interface AssessmentTaskInput { competencyId: string; targetJobId?: string }
export interface TutorTaskInput { competencyIds: string[]; learningGoal?: string; targetJobId?: string; review?: boolean }
export interface InterviewTaskInput { mode: InterviewMode; targetJobId?: string }
export type TaskInput = AssessmentTaskInput | TutorTaskInput | InterviewTaskInput;

export interface AssessmentLocalState { coveredAreas: string[]; probeCount: number; measurementStatus: "clean" | "contaminated" }
export interface TutorLocalState { objectives: string[]; coveredTopics: string[] }
export interface InterviewLocalState { coveredTopics: string[]; mode: InterviewMode; feedbackRequested: boolean; measurementStatus: "clean" | "contaminated" }
export type TaskLocalState = AssessmentLocalState | TutorLocalState | InterviewLocalState;

export interface TaskSession {
  schemaVersion: 1;
  id: ID;
  type: "assessment" | "tutor" | "interview";
  status: TaskStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  input: TaskInput;
  localState: TaskLocalState;
  transcriptPath: string;
  resultPath?: string;
  contextSnapshotPath: string;
  contextBinding: { careerTargetId?: ID; targetJobId?: ID; resumeVersion?: string };
}

export interface TranscriptMessage {
  schemaVersion: 1;
  id: ID;
  ts: ISODateTime;
  role: "assistant" | "user" | "system";
  content: string;
  taskId: ID;
}

export interface ExecutionResult<T> {
  executionId: ID;
  sourceType: "tool" | "skill" | "subagent" | "service";
  sourceName: string;
  status: "completed" | "paused" | "failed" | "cancelled";
  summary?: string;
  observations?: Observation[];
  artifacts?: ArtifactRef[];
  payload?: T;
  error?: { code: string; message: string; retryable?: boolean };
}

export interface CompetencyGapSummary {
  competencyId: string;
  importance: number;
  requiredMastery: number;
  mastery: number | null;
  effectiveConfidence: number;
  status: "unknown" | "current" | "stale";
  gap: number | null;
}

export interface ReadinessBlocker {
  id: string;
  type: "uncertainty" | "competency" | "interview" | "evidence_resume";
  severity: "high" | "medium" | "low";
  title: string;
  rationale: string;
  competencyId?: string;
  interviewDimension?: InterviewDimension;
  claimId?: string;
}

export interface ReadinessProfile {
  schemaVersion: 1;
  mode: "career" | "target_job";
  scopeId: ID;
  generatedAt: ISODateTime;
  gaps: CompetencyGapSummary[];
  blockers: ReadinessBlocker[];
  ready: boolean;
  timeConstraint?: { daysRemaining?: number; interviewDate?: string; deadline?: string };
}

export interface ActionCandidate {
  action: ActionType;
  allowed: boolean;
  targetCompetencyIds?: string[];
  reason?: string;
}

export interface NextActionDecision {
  schemaVersion: 1;
  id: ID;
  action: ActionType;
  target?: { competencyIds?: string[]; targetJobId?: string };
  reason: string;
  expectedOutcome: string;
  priority: "high" | "medium" | "low";
  alternative?: { action: ActionType; reason: string };
  generatedAt: ISODateTime;
  model?: string;
  promptVersion: string;
}

export interface RecentActionRecord {
  action: ActionType;
  targetKey: string;
  status: "completed" | "cancelled" | "failed";
  producedUsefulObservation: boolean;
  materiallyChangedState: boolean;
  timestamp: ISODateTime;
}

export interface WorkflowState {
  schemaVersion: 1;
  activeTaskId?: ID;
  pausedTaskIds: ID[];
  lastCompletedTaskId?: ID;
  pendingUserRequest?: string;
  recentActions: RecentActionRecord[];
  updatedAt: ISODateTime;
}

export interface DecisionContext {
  mode: "career" | "target_job";
  target: CareerTarget | TargetJob;
  readiness: ReadinessProfile;
  topCompetencyGaps: CompetencyGapSummary[];
  interview: InterviewDimensionState[];
  evidence: Evidence[];
  claimSupport: ClaimSupport[];
  timeConstraint?: ReadinessProfile["timeConstraint"];
  recentActions: RecentActionRecord[];
  userIntent?: string;
  candidates: ActionCandidate[];
}

export interface CareerExperienceEvent {
  schemaVersion: 1;
  id: ID;
  targetJobId?: ID;
  kind: "application" | "real_interview" | "offer" | "rejection" | "withdrawn" | "feedback";
  summary: string;
  timestamp: ISODateTime;
  sourceRefs?: SourceRef[];
}

export interface MaterialStateChange {
  schemaVersion: 1;
  id: ID;
  kind: "blocker_changed" | "uncertainty_resolved" | "readiness_changed" | "resume_mismatch" | "goal_fit_changed";
  summary: string;
  timestamp: ISODateTime;
}
