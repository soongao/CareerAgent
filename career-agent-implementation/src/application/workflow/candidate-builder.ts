import type { ActionCandidate, ReadinessProfile, RoleCompetencyProfile, WorkflowState } from "../../domain/types.js";
export class CandidateBuilder {
  async build(input:{mode:"career"|"target_job";target:unknown;role:RoleCompetencyProfile;readiness:ReadinessProfile;workflow:WorkflowState}):Promise<ActionCandidate[]>{
    const interactiveBlocked=Boolean(input.workflow.activeTaskId); const compIds=input.role.requirements.map(r=>r.competencyId);
    const all:ActionCandidate[]=[
      {action:"ANALYZE_ROLE",allowed:true},{action:"ASSESS",allowed:!interactiveBlocked,targetCompetencyIds:compIds,reason:interactiveBlocked?"An interactive task is already active":undefined},
      {action:"LEARN",allowed:!interactiveBlocked,targetCompetencyIds:compIds},{action:"REVIEW",allowed:!interactiveBlocked,targetCompetencyIds:compIds},
      {action:"MOCK_INTERVIEW",allowed:!interactiveBlocked},{action:"ANALYZE_EVIDENCE",allowed:true},{action:"UPDATE_RESUME",allowed:true},{action:"REFRESH_PROFILE",allowed:true},{action:"NO_ACTION",allowed:true},
    ];
    const wf=input.workflow.recentActions; for(const c of all){const key=c.action;const recent=wf.slice(-4).filter(r=>r.action===c.action&&!r.producedUsefulObservation&&!r.materiallyChangedState);if(recent.length>=2&&c.action!=="NO_ACTION"){c.allowed=false;c.reason="Suppressed by no-progress loop guard";}}
    return all;
  }
}
