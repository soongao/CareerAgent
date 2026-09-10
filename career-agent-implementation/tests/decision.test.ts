import test from "node:test";
import assert from "node:assert/strict";
import { NextActionDecider } from "../src/application/workflow/next-action.js";
import { RecordedStructuredLLM } from "../src/infrastructure/llm/recorded-structured-llm.js";
import { nowIso } from "../src/shared/utils.js";

test("runtime strips LLM competency targets outside candidate scope",async()=>{const llm=new RecordedStructuredLLM([{name:"workflow.next_action",model:"GPT-5.6 Sol",provenance:"Current implementation session",capturedAt:nowIso(),output:{action:"ASSESS",target:{competencyIds:["not.allowed"]},reason:"probe",expectedOutcome:"reduce uncertainty",priority:"high"}}]);const ctx:any={mode:"career",target:{id:"c"},readiness:{},topCompetencyGaps:[],interview:[],evidence:[],claimSupport:[],recentActions:[],candidates:[{action:"ASSESS",allowed:true,targetCompetencyIds:["java.concurrency"]},{action:"NO_ACTION",allowed:true}]};const d=await new NextActionDecider(llm).decide(ctx);assert.equal(d.action,"ASSESS");assert.equal(d.target?.competencyIds,undefined);});

test("runtime rejects an LLM action outside allowed candidate set",async()=>{const llm=new RecordedStructuredLLM([{name:"workflow.next_action",model:"GPT-5.6 Sol",provenance:"Current implementation session",capturedAt:nowIso(),output:{action:"MOCK_INTERVIEW",reason:"x",expectedOutcome:"x",priority:"high"}}]);const ctx:any={mode:"career",target:{id:"c"},readiness:{},topCompetencyGaps:[],interview:[],evidence:[],claimSupport:[],recentActions:[],candidates:[{action:"ASSESS",allowed:true},{action:"NO_ACTION",allowed:true}]};const d=await new NextActionDecider(llm).decide(ctx);assert.equal(d.action,"NO_ACTION");});
