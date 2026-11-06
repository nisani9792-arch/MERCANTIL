import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {test} from "node:test";
import ts from "typescript";

test("polling refreshes only active stale queries, pauses when hidden and cleans up", () => {
  let tick, cleanup, cleared = false; const calls=[];const events={};
  const document={visibilityState:"visible"};
  const window={setInterval:(fn,ms)=>{tick=fn;assert.equal(ms,30000);return 1;},clearInterval:()=>{cleared=true;},addEventListener:(key,fn)=>{events[key]=fn;},removeEventListener:(key)=>{delete events[key];}};
  const exports={}; const code=ts.transpileModule(fs.readFileSync("src/hooks/useRefetchOnVisible.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code,{exports,document,window,require:(name)=>name==='react'?{useEffect:(fn)=>{cleanup=fn();}}:{useQueryClient:()=>({refetchQueries:(args)=>calls.push(JSON.parse(JSON.stringify(args)))})}});
  exports.useRefetchOnVisible();tick();assert.deepEqual(calls,[{type:"active",stale:true}]);
  document.visibilityState="hidden";tick();assert.equal(calls.length,1);
  document.visibilityState="visible";events.pageshow({persisted:true});assert.equal(calls.length,2);
  cleanup();assert.ok(cleared);assert.equal(Object.keys(events).length,0);
});
