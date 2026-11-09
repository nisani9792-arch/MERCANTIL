"use client";
import dynamic from "next/dynamic";
import {useState} from "react";
import {BottomSheet} from "@/components/ui/BottomSheet";
import {InitMonthPanel} from "@/components/ledger/InitMonthPanel";
import {formatMonthLabel} from "@/lib/utils/month";
const TemplatePicker=dynamic(()=>import("@/components/templates/TemplateList").then(m=>m.TemplateList),{loading:()=> <p role="status">טוען את התבנית…</p>});
export function MonthSources({open,onClose,monthKey,onLoaded}:{open:boolean;onClose:()=>void;monthKey:string;onLoaded:(created:number)=>void}) {
  const [source,setSource]=useState<"template"|"history">("template");
  return <BottomSheet open={open} onClose={onClose} title={`מילוי ${formatMonthLabel(monthKey)}`}>
    <p className="mb-4 text-sm text-on-surface-variant">בוחרים מה צריך החודש. שום דבר לא נוסף עד לאישור שלך.</p>
    <div className="workspace-tabs mb-4" role="group" aria-label="מאיפה להוסיף פריטים">
      <button aria-pressed={source==="template"} onClick={()=>setSource("template")}>מהתבנית שלי</button>
      <button aria-pressed={source==="history"} onClick={()=>setSource("history")}>מחודשים קודמים</button>
    </div>
    {source==="template" ? <TemplatePicker key={monthKey} pickerOnly onLoaded={onLoaded}/> : <InitMonthPanel key={monthKey} monthKey={monthKey} initialized initiallyOpen title="בחירת פריטים קודמים" onAdded={onLoaded}/>}
  </BottomSheet>;
}
