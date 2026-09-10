#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const [rootArg='./scenario-traces', scenarioArg] = process.argv.slice(2);
if (!scenarioArg) {
  console.error('Usage: node scripts/trace-view.mjs <trace-root> <scenario-id>');
  process.exit(2);
}
const dir=resolve(rootArg,scenarioArg);
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const readJsonl=async p=>(await readFile(p,'utf8')).split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));
const maybeJson=async p=>{try{return await readJson(p)}catch{return undefined}};
const result=await readJson(join(dir,'scenario-result.json'));
console.log(`\n# ${result.id}: ${result.title}\n${result.description}\n`);
console.log('## Timeline');
for (const e of await readJsonl(join(dir,'timeline.jsonl'))) {
  const compact=e.type==='llm.request'||e.type==='llm.structured.request'?` ${e.payload.name}`:e.type==='llm.response'||e.type==='llm.structured.response'?` ${e.payload.name} -> ${e.payload.model}`:e.type.startsWith('task.transcript')?` ${e.payload.role}: ${String(e.payload.content).replace(/\s+/g,' ').slice(0,110)}`:e.type==='pi.session.turn'?` ${e.payload.name||''}: ${String(e.payload.prompt||'').replace(/\s+/g,' ').slice(0,90)}`:'';
  console.log(`${String(e.seq).padStart(3,'0')} ${e.type}${compact}`);
}
try {
  const tasksRoot=join(dir,'tasks');
  const taskIds=(await readdir(tasksRoot)).sort();
  for(const id of taskIds){
    console.log(`\n## Task ${id}`);
    const context=await maybeJson(join(tasksRoot,id,'context.json'));
    if(context) console.log(`\n[CONTEXT]\n${JSON.stringify(context,null,2)}`);
    for(const m of await readJsonl(join(tasksRoot,id,'transcript.jsonl'))) console.log(`\n[${m.role.toUpperCase()}]\n${m.content}`);
    const evalResult=(await maybeJson(join(tasksRoot,id,'evaluation.json'))) ?? (await maybeJson(join(tasksRoot,id,'result.json')));
    if(evalResult) console.log(`\n[RESULT / EVALUATION]\n${JSON.stringify(evalResult,null,2)}`);
  }
} catch {}
console.log(`\n## Assertions\n${JSON.stringify(await readJson(join(dir,'assertions.json')),null,2)}`);
