import assert from "node:assert/strict";
import {spawn,execFileSync} from "node:child_process";
import net from "node:net";
import path from "node:path";
import {setTimeout as delay} from "node:timers/promises";
const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,[path.resolve("node_modules/wrangler/bin/wrangler.js"),"dev","--local","--port",String(port),"--ip","127.0.0.1","--inspector-port","0","--show-interactive-dev-session=false","--infer-origin-from-routes=false"],{windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
let logs="",exited=false;child.on("exit",()=>{exited=true;});child.stdout.on("data",v=>{logs=(logs+v).slice(-10000);});child.stderr.on("data",v=>{logs=(logs+v).slice(-10000);});
try {
  let ready=false;
  for(let i=0;i<150;i++){if(exited)throw new Error("Worker exited before readiness");try{const r=await fetch(base+"/deploy-version.txt",{signal:AbortSignal.timeout(1000)});if(r.ok){assert.equal((await r.text()).trim(),"clear-planning-cycle-2026-11-13");ready=true;break;}}catch{ /* Runtime startup may still be in progress. */ }await delay(200);}
  assert.ok(ready,"Worker readiness timeout");
  assert.equal((await fetch(base+"/login")).status,200,"Worker login render");
  assert.equal((await fetch(base+"/api/ledger?monthKey=2026-11")).status,401,"Unauthenticated ledger");
  assert.equal((await fetch(base+"/api/ai/health?full=1")).status,401,"Paid AI must require authentication");
  assert.equal((await fetch(base+"/api/ledger",{method:"POST",headers:{Origin:"https://untrusted.example","Content-Type":"application/json"},body:"{}"})).status,403,"Cross-origin write");
  console.log("PASS Workers runtime: login 200, protected API 401, cross-origin write 403, release marker correct.");
} catch(error){console.error(logs);throw error;}
finally{if(!exited){if(process.platform==="win32"){try{execFileSync("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});}catch{ /* Already closed. */ }}else child.kill("SIGTERM");}}

