import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { CompetencyNode } from "../domain/types.js";
import { similarity, sortBy } from "../shared/utils.js";

function parseScalar(v: string): unknown {
  const s=v.trim();
  if (!s) return "";
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1,-1).split(",").map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^['\"]|['\"]$/g,""));
  return s.replace(/^['\"]|['\"]$/g,"");
}

function parseFrontmatter(text: string): { meta: Record<string, unknown>; body: string } {
  if (!text.startsWith("---")) throw new Error("Competency file missing frontmatter");
  const end=text.indexOf("\n---",3); if (end<0) throw new Error("Competency file has invalid frontmatter");
  const meta: Record<string,unknown>={};
  for (const line of text.slice(3,end).split(/\r?\n/)) {
    const m=line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/); if (!m) continue;
    meta[m[1]!] = parseScalar(m[2]!);
  }
  return { meta, body:text.slice(end+4).trim() };
}

async function walk(dir:string):Promise<string[]> {
  const out:string[]=[];
  for (const e of await readdir(dir,{withFileTypes:true})) {
    const p=join(dir,e.name); if(e.isDirectory()) out.push(...await walk(p)); else if(extname(e.name)===".md") out.push(p);
  }
  return out;
}

export class CompetencyCatalog {
  readonly nodes = new Map<string, CompetencyNode>();
  readonly version: string;
  constructor(nodes: CompetencyNode[], version="v1") { for(const n of nodes)this.nodes.set(n.id,n); this.version=version; this.validate(); }
  static async load(root:string, version="v1"):Promise<CompetencyCatalog> {
    const nodes:CompetencyNode[]=[];
    for(const file of await walk(root)) {
      const {meta,body}=parseFrontmatter(await readFile(file,"utf8"));
      const node:CompetencyNode={
        schemaVersion:1,
        id:String(meta.id), name:String(meta.name), description:String(meta.description || body.split("\n")[0] || meta.name),
        kind:(meta.kind === "taxonomy" ? "taxonomy":"assessable"), domain:String(meta.domain||"general"),
        parents:Array.isArray(meta.parents)?meta.parents.map(String):[], prerequisites:Array.isArray(meta.prerequisites)?meta.prerequisites.map(String):[],
        relatedCompetencies:Array.isArray(meta.related)?meta.related.map(String):[], aliases:Array.isArray(meta.aliases)?meta.aliases.map(String):[],
        tags:Array.isArray(meta.tags)?meta.tags.map(String):[], version:Number(meta.version||1),
      };
      if(!node.id || node.id==="undefined") throw new Error(`Competency missing id: ${file}`);
      nodes.push(node);
    }
    return new CompetencyCatalog(nodes,version);
  }
  get(id:string):CompetencyNode|undefined{return this.nodes.get(id)}
  has(id:string):boolean{return this.nodes.has(id)}
  assessable():CompetencyNode[]{return [...this.nodes.values()].filter(n=>n.kind==="assessable")}
  retrieve(query:string, topK=12):Array<{node:CompetencyNode;score:number}> {
    return sortBy(this.assessable().map(node=>({node,score:similarity(query,[node.id,node.name,node.description,...node.aliases,...node.tags].join(" "))})),x=>x.score).filter(x=>x.score>0).slice(0,topK);
  }
  validateIds(ids:string[]):string[]{return ids.filter(id=>this.has(id) && this.get(id)?.kind==="assessable")}
  private validate():void {
    for(const n of this.nodes.values()) for(const p of [...n.parents,...n.prerequisites,...n.relatedCompetencies]) if(!this.nodes.has(p)) throw new Error(`Unknown competency edge ${n.id} -> ${p}`);
    const visiting=new Set<string>(), done=new Set<string>();
    const visit=(id:string)=>{ if(done.has(id))return; if(visiting.has(id))throw new Error(`Competency prerequisite/parent cycle at ${id}`); visiting.add(id); const n=this.nodes.get(id)!; for(const p of [...n.parents,...n.prerequisites]) visit(p); visiting.delete(id); done.add(id); };
    for(const id of this.nodes.keys()) visit(id);
  }
}
