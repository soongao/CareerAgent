#!/usr/bin/env node
import { resolve } from "node:path";
import { createApp } from "./app.js";
import type { NextActionDecision, TargetJobStatus } from "./domain/types.js";

function parseArgs(argv:string[]):{cmd:string;positionals:string[];flags:Record<string,string|boolean>}{const [cmd="help",...rest]=argv;const flags:Record<string,string|boolean>={},positionals:string[]=[];for(let i=0;i<rest.length;i++){const x=rest[i]!;if(x.startsWith("--")){const k=x.slice(2);const next=rest[i+1];if(next&&!next.startsWith("--")){flags[k]=next;i++;}else flags[k]=true;}else positionals.push(x);}return{cmd,positionals,flags};}
const str=(f:Record<string,string|boolean>,k:string,required=false):string|undefined=>{const v=f[k];if(required&&!v)throw new Error(`Missing --${k}`);return typeof v==="string"?v:undefined};
const bool=(f:Record<string,string|boolean>,k:string):boolean=>f[k]===true||f[k]==="true";

function help(){console.log(`Career Agent (Pi)\n\nGlobal flags: --workspace <dir> --user <id>\n\nCommands:\n  bootstrap --career <name> --resume <path> [--job-title <title> --company <name> --jd <path> --interview-date <date>]\n  status\n  recommend [--intent <text>]\n  execute --decision-file <json> [--confirm] [--evidence <a,b>]\n  task-send --task <id> --message <text>\n  task-pause|task-resume|task-cancel|task-complete --task <id>\n  evidence --paths <a,b>\n  resume --target-job <id> [--write]\n  outcome --target-job <id> --kind <application|real_interview|offer|rejection|withdrawn|feedback> [--feedback <text>]\n  target-status --target-job <id> --status <status>\n  activate-career --id <id>\n  activate-job --id <id>\n  self-report --competency <id> --mastery <0..1> --summary <text>\n  contest --observation <id> --reason <text>\n  correct-fact --note <text>\n  preference --key <key> --value <value>\n  validate-workspace\n  rebuild-state\n  compact-profile\n`)}

async function main(){const parsed=parseArgs(process.argv.slice(2));if(parsed.cmd==="help"||parsed.cmd==="--help"){help();return;}const workspace=resolve(str(parsed.flags,"workspace")??"./workspace"),user=str(parsed.flags,"user")??"default";const app=await createApp({workspaceRoot:workspace,userId:user,projectRoot:resolve(process.env.CAREER_AGENT_ROOT??process.cwd())});switch(parsed.cmd){
  case "bootstrap":{const targetJob=str(parsed.flags,"job-title")?{title:str(parsed.flags,"job-title",true)!,company:str(parsed.flags,"company"),jdPath:str(parsed.flags,"jd",true),interviewDate:str(parsed.flags,"interview-date"),deadline:str(parsed.flags,"deadline")}:undefined;const r=await app.bootstrap.run({userId:user,careerTarget:str(parsed.flags,"career",true)!,careerDescription:str(parsed.flags,"career-description"),resumePath:str(parsed.flags,"resume",true),targetJob});console.log(JSON.stringify(r,null,2));break;}
  case "status":{const active=await app.targets.active();let readiness=null;try{readiness=(await app.context.buildDecisionContext()).readiness;}catch{}console.log(JSON.stringify({active,userModel:await app.ws.getUserModel(),readiness,evidence:await app.ws.getEvidence(),claimSupport:await app.ws.getClaimSupport(),workflow:await app.ws.getWorkflow()},null,2));break;}
  case "recommend":{const r=await app.workflow.recommend(str(parsed.flags,"intent"));console.log(JSON.stringify(r.decision,null,2));break;}
  case "execute":{const p=str(parsed.flags,"decision-file",true)!;const fs=await import("node:fs/promises");const decision=JSON.parse(await fs.readFile(p,"utf8")) as NextActionDecision;const result=await app.router.route(decision,{confirmed:bool(parsed.flags,"confirm"),evidencePaths:str(parsed.flags,"evidence")?.split(",").filter(Boolean),marketEvidence:str(parsed.flags,"market")});console.log(JSON.stringify(result,null,2));break;}
  case "task-send":console.log(await app.tasks.send(str(parsed.flags,"task",true)!,str(parsed.flags,"message",true)!));break;
  case "task-pause":await app.tasks.pause(str(parsed.flags,"task",true)!);console.log("paused");break;
  case "task-resume":console.log(await app.tasks.resume(str(parsed.flags,"task",true)!));break;
  case "task-cancel":await app.tasks.cancel(str(parsed.flags,"task",true)!);console.log("cancelled");break;
  case "task-complete":{const id=str(parsed.flags,"task",true)!;await app.tasks.complete(id);console.log(JSON.stringify(await app.taskEvaluation.evaluate(id),null,2));break;}
  case "evidence":console.log(JSON.stringify(await app.evidence.analyze(str(parsed.flags,"paths",true)!.split(",").filter(Boolean)),null,2));break;
  case "resume":console.log(JSON.stringify(await app.resume.draftTarget(str(parsed.flags,"target-job",true)!,bool(parsed.flags,"write")),null,2));break;
  case "outcome":console.log(JSON.stringify(await app.outcomes.record({targetJobId:str(parsed.flags,"target-job",true)!,kind:str(parsed.flags,"kind",true)! as any,feedback:str(parsed.flags,"feedback")}),null,2));break;
  case "target-status":console.log(JSON.stringify(await app.targets.transitionJob(str(parsed.flags,"target-job",true)!,str(parsed.flags,"status",true)! as TargetJobStatus),null,2));break;
  case "activate-career":await app.targets.activateCareer(str(parsed.flags,"id",true)!);console.log("activated");break;
  case "activate-job":await app.targets.activateJob(str(parsed.flags,"id",true)!);console.log("activated");break;
  case "self-report":await app.userModel.selfReportCompetency(str(parsed.flags,"competency",true)!,Number(str(parsed.flags,"mastery",true)),str(parsed.flags,"summary",true)!);console.log("recorded");break;
  case "contest":await app.userModel.contestObservation(str(parsed.flags,"observation",true)!,str(parsed.flags,"reason",true)!);console.log("contested");break;
  case "correct-fact":await app.userModel.correctProfileFact(str(parsed.flags,"note",true)!);console.log("corrected");break;
  case "preference":await app.userModel.setPreference(str(parsed.flags,"key",true)!,str(parsed.flags,"value",true)!);console.log("saved");break;
  case "validate-workspace":console.log(JSON.stringify(await app.maintenance.validateWorkspace(),null,2));break;
  case "rebuild-state":await app.maintenance.rebuildDerivedState();console.log("rebuilt");break;
  case "compact-profile":console.log(JSON.stringify(await app.maintenance.compactProfile(),null,2));break;
  default:help();process.exitCode=1;
}}
main().catch(err=>{console.error(err instanceof Error?err.stack||err.message:String(err));process.exitCode=1;});
