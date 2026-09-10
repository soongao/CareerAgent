import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const files=(await walk("src")).filter(f=>f.endsWith(".ts"));const text=(await Promise.all(files.map(f=>readFile(f,"utf8")))).join("\n");
const errors=[];
if(/BUILD_EVIDENCE/.test(text))errors.push("Deprecated BUILD_EVIDENCE appears in source");
if(/read_(profile|resume|competency)|write_(profile|resume|competency)/i.test(text))errors.push("Unnecessary read_xxx/write_xxx wrapper naming appears in source");
const taskRuntime=await readFile("src/agents/base-task-runtime.ts","utf8");if(/StateUpdater|saveUserModel|appendObservation/.test(taskRuntime))errors.push("Task runtime may be mutating long-term user model directly");
if(errors.length){console.error(errors.join("\n"));process.exit(1);}console.log(`Static architecture checks PASS (${files.length} source files scanned)`);
