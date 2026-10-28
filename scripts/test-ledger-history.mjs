import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
function harness() {
  let user='alice'; const calls=[];
  class RouteError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
  const mocks={
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
    '@/lib/auth/session':{getSession:async()=>user?{userId:user}:null},
    '@/lib/api/route':{RouteError,noStoreHeaders:{'Cache-Control':'no-store'},apiError:(e)=>Response.json({error:e.message},{status:e.status??500})},
    '@/lib/db/ledger-history':{listHistoryChoices:async(...args)=>{calls.push(args);return [];},addFromHistory:async(...args)=>{calls.push(args);return {created:1};}},
  };
  const api={};new Function('exports','require',ts.transpileModule(fs.readFileSync('src/app/api/ledger/history/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api,name=>mocks[name]);
  return {api,calls,setUser:value=>{user=value;}};
}
const id='11111111-1111-1111-1111-111111111111';
const get=month=>new Request('https://test.local/api/ledger/history?month='+month);
const post=body=>new Request('https://test.local/api/ledger/history',{method:'POST',body:JSON.stringify(body)});
test('history requires authentication for reading and adding',async()=>{const h=harness();h.setUser(null);assert.equal((await h.api.GET(get('2026-11'))).status,401);assert.equal((await h.api.POST(post({month:'2026-11',ids:[id]}))).status,401);assert.equal(h.calls.length,0);});
test('history rejects invalid months and empty or malformed selections without writing',async()=>{const h=harness();assert.equal((await h.api.GET(get('2026-13'))).status,400);for(const ids of [[],['bad'],Array(101).fill(id)])assert.equal((await h.api.POST(post({month:'2026-11',ids}))).status,400);assert.equal(h.calls.length,0);});
test('history adds only explicit identifiers using authenticated user and target month',async()=>{const h=harness();assert.equal((await h.api.POST(post({month:'2026-11',ids:[id,id],userId:'someone-else'}))).status,200);assert.deepEqual(h.calls,[['alice','2026-11',[id]]]);});
test('history reads are not cached and never invoke additions',async()=>{const h=harness();const res=await h.api.GET(get('2026-11'));assert.equal(res.headers.get('Cache-Control'),'no-store');assert.deepEqual(h.calls,[['alice','2026-11']]);});
