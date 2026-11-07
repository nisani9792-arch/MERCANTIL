import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
const rows=Array.from({length:100},(_,i)=>({date:'2026-11-07',description:`שכירות ${i}`,reference:String(i),amount:-100}));
function harness(duplicate=false,source=fs.readFileSync('src/app/api/import/xlsx/route.ts','utf8')) {
 const calls={sql:0,categories:0,learn:0,ai:0};
 const category={id:'22222222-2222-4222-8222-222222222222',type:'expense',name:'דיור'};
 const sql=async(parts,...values)=>{calls.sql++;const query=parts.join('?');if(query.includes('select import_hash'))return duplicate?rows.map(r=>({import_hash:r.reference})):[];if(query.includes('select id from transactions'))return duplicate?[{id:'existing'}]:[];if(query.includes('insert into transactions')&&query.includes('jsonb_to_recordset'))return JSON.parse(values.find(v=>typeof v==='string'&&v.startsWith('[{'))).map(r=>({import_hash:r.hash}));return [];};
 sql.transaction=queries=>Promise.all(queries);
 const mocks={
 'next/server':{NextResponse:{json:(v,i)=>Response.json(v,i)}},
 '@/lib/api/route':{withApi:f=>f,RouteError:Error,logServerError:()=>{}},
 '@/lib/auth/session':{getSession:async()=>({userId:'owner'})},
 '@/lib/security/rate-limit':{enforceRateLimit:async()=>{}},
 '@/lib/db/categories':{listCategories:async()=>[category],findCategoryByName:async()=>{calls.categories++;return category;},createCategory:async()=>{throw new Error('unexpected category creation');}},
 '@/lib/ai/categorize':{classifyTransactions:async batch=>{calls.ai++;return {results:batch.map(()=>({type:'expense',categoryName:'דיור',cleanedNotes:'Synthetic'}))};}},
 '@/lib/parsers/mercantil-xlsx':{parseMercantilXlsx:async()=>({rows}),mercantilImportHash:r=>r.reference,legacyMercantilImportHash:r=>'legacy'+r.reference},
 '@/lib/filters/household-relevance':{isRelevantTransaction:()=>true},
 '@/lib/db/client':{getSql:()=>sql},
 '@/lib/db/patterns':{ensurePatternsTable:async()=>{},learnPattern:async()=>{calls.learn++;},learnPatterns:async()=>{calls.learn++;}},
 '@/lib/db/reconciliation':{ensureReconciliationSchema:async()=>{}},
 };
 const out={};new Function('exports','require',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(out,n=>{assert.ok(mocks[n],n);return mocks[n];});
 const request={formData:async()=>new Map([['file',new File(['fixture'],'fixture.xlsx')]])};
 return {calls,run:()=>out.POST(request)};
}
test('100-row import batches database writes and learns once without changing totals',async()=>{const h=harness();const response=await h.run();assert.equal(response.status,200);assert.equal((await response.json()).imported,100);assert.deepEqual(h.calls,{sql:3,categories:0,learn:1,ai:4});});
test('reimporting 100 known rows skips AI and inserts entirely',async()=>{const h=harness(true);const result=await(await h.run()).json();assert.equal(result.imported,0);assert.equal(result.skipped,100);assert.deepEqual(h.calls,{sql:1,categories:0,learn:0,ai:0});});
export {harness};
