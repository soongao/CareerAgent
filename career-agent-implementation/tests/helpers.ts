import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RecordedStructuredLLM } from "../src/infrastructure/llm/recorded-structured-llm.js";

export async function tempWorkspace():Promise<string>{return mkdtemp(join(tmpdir(),"career-agent-test-"));}
export async function recorded():Promise<RecordedStructuredLLM>{return RecordedStructuredLLM.fromFile(join(process.cwd(),"evals/recorded/gpt-5.6-sol-regression.json"));}
export async function writeTempFile(root:string,name:string,text:string):Promise<string>{const p=join(root,name);await mkdir(join(root),{recursive:true});await writeFile(p,text,"utf8");return p;}
export const sampleResume=`# Candidate\n\nBackend engineer using Java, MySQL and Redis.\n\n## Project\nUsed Redis cache in an e-commerce service. Improved API latency by 40%.`;
export const sampleJd=`Backend Engineer. Strong Java concurrency required. Experience with Redis caching and consistency required. Strong relational database transaction fundamentals preferred.`;
