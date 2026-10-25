import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const output=ts.transpileModule(fs.readFileSync('src/lib/ledger/planning.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const loaded={};new Function('exports',output)(loaded);
const plan=loaded.monthlyPlan;
test('estimate includes recorded purchases without adding them twice',()=>{ assert.deepEqual(plan(10000,4000,600,2000),{variable:2000,unrecordedEstimate:1400,remaining:4000}); });
test('spending exceeding estimate uses recorded amount',()=>{assert.equal(plan(10000,4000,2500,2000).remaining,3500);});
test('missing estimate counts known variable spending only',()=>{assert.equal(plan(10000,4000,600,null).remaining,5400);});
test('zero estimate never hides recorded spending',()=>{assert.equal(plan(10000,4000,600,0).variable,600);});
test('money calculation rounds in cents',()=>{assert.equal(plan(0.3,0.1,0.2,null).remaining,0);});

function apiHarness() {
  const rows = new Map(); let user = 'alice'; let calls = 0;
  const sql = async (parts, ...values) => {
    calls++; const query = parts.join('?');
    if (query.includes('create table')) return [];
    const key = `${values[0]}:${values[1]}`;
    if (query.includes('insert into')) { rows.set(key, values[2]); return []; }
    return rows.has(key) ? [{ amount: rows.get(key) }] : [];
  };
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/auth/session': { getSession: async () => user ? { userId: user } : null },
    '@/lib/db/client': { getSql: () => sql },
  };
  const source=ts.transpileModule(fs.readFileSync('src/app/api/preferences/planning/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const api={};new Function('exports','require',source)(api,(name)=>mocks[name]);
  return {api, rows, setUser: (value)=>{user=value;}, calls:()=>calls};
}
const getRequest=(month='2026-10')=>new Request(`https://test.local/api/preferences/planning?month=${month}`);
const putRequest=(amount,month='2026-10')=>new Request('https://test.local/api/preferences/planning',{method:'PUT',body:JSON.stringify({amount,month})});
test('planning saves exact amounts, keeps months and users separate, and clears to unknown',async()=>{
  const {api,setUser}=apiHarness();
  assert.equal((await api.PUT(putRequest(2000.25))).status,200);
  assert.equal((await (await api.GET(getRequest())).json()).amount,2000.25);
  assert.equal((await (await api.GET(getRequest('2026-11'))).json()).amount,null);
  setUser('bob');assert.equal((await (await api.GET(getRequest())).json()).amount,null);
  setUser('alice');await api.PUT(putRequest(null));assert.equal((await (await api.GET(getRequest())).json()).amount,null);
  await api.PUT(putRequest(0));assert.equal((await (await api.GET(getRequest())).json()).amount,0);
});
test('planning rejects invalid amounts and invalid months before database access',async()=>{
  const {api,calls}=apiHarness();
  for (const amount of [-1,1.001,'200',1000000000]) assert.equal((await api.PUT(putRequest(amount))).status,400);
  assert.equal((await api.GET(getRequest('2026-13'))).status,400);
  assert.equal(calls(),0);
});
test('planning requires authentication for reads and writes',async()=>{
  const {api,setUser,calls}=apiHarness();setUser(null);
  assert.equal((await api.GET(getRequest())).status,401);assert.equal((await api.PUT(putRequest(20))).status,401);assert.equal(calls(),0);
});
