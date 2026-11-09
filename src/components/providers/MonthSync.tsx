"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useMonthStore} from "@/stores/useMonthStore";
import {isMonthKey} from "@/lib/utils/month";

/** One writer per device; a late read never overwrites a newer local selection. */
export function MonthSync({initialMonthKey,onReady}:{initialMonthKey?:string;onReady?:()=>void}={}) {
  const monthKey=useMonthStore(s=>s.monthKey), setMonthKey=useMonthStore(s=>s.setMonthKey);
  const hydrated=useRef(false),remote=useRef(""),queued=useRef<string|null>(null),running=useRef(false),cancelled=useRef(false);
  const [error,setError]=useState("");
  const push=useCallback(async(value:string)=>{
    queued.current=value;if(running.current)return;running.current=true;
    try {
      while(queued.current&&!cancelled.current){
        const next=queued.current;queued.current=null;if(next===remote.current)continue;
        const response=await fetch("/api/preferences/month",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({monthKey:next})});
        if(!response.ok)throw new Error("save");remote.current=next;if(!cancelled.current)setError("");
      }
    } catch {if(!cancelled.current)setError("החודש שנבחר עדיין לא הסתנכרן עם השרת.");}
    finally{running.current=false;}
  },[]);
  useEffect(()=>{
    cancelled.current=false;
    const initialLocal=useMonthStore.getState().monthKey;
    const pull=async()=>{
      if(running.current||queued.current)return;
      if(hydrated.current&&useMonthStore.getState().monthKey!==remote.current)return;
      const startedWith=useMonthStore.getState().monthKey;
      try {
        const response=await fetch("/api/preferences/month",{cache:"no-store"});if(!response.ok)throw new Error("read");
        const data=await response.json() as {monthKey?:unknown};
        if(cancelled.current)return;
        if(typeof data.monthKey!=="string"||!isMonthKey(data.monthKey))throw new Error("invalid month");
        if(running.current||queued.current)return;
        remote.current=data.monthKey;setError("");
        if(useMonthStore.getState().monthKey===startedWith&&data.monthKey!==startedWith)setMonthKey(data.monthKey);
      } catch {if(!cancelled.current)setError("לא הצלחנו לסנכרן את החודש. אפשר להמשיך לעבוד ולנסות שוב.");}
    };
    const initialPull=initialMonthKey&&isMonthKey(initialMonthKey) ? Promise.resolve().then(()=>{remote.current=initialMonthKey;if(useMonthStore.getState().monthKey===initialLocal&&initialLocal!==initialMonthKey)setMonthKey(initialMonthKey);}) : pull();
    void initialPull.catch(()=>{if(!cancelled.current)setError("לא הצלחנו לסנכרן את החודש. אפשר לנסות שוב.");}).finally(()=>{if(cancelled.current)return;hydrated.current=true;onReady?.();const value=useMonthStore.getState().monthKey;if((remote.current&&value!==remote.current)||value!==initialLocal)void push(value);});
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible"){void pull();}},30000);
    return()=>{cancelled.current=true;window.clearInterval(timer);};
  },[initialMonthKey,onReady,push,setMonthKey]);
  useEffect(()=>{
    if(!hydrated.current||monthKey===remote.current)return;
    const timer=window.setTimeout(()=>void push(monthKey),200);return()=>window.clearTimeout(timer);
  },[monthKey,push]);
  return error?<div role="status" className="mx-4 my-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm">{error} <button className="min-h-10 px-2 font-bold text-primary" onClick={()=>void push(useMonthStore.getState().monthKey)}>ניסיון חוזר</button></div>:null;
}
