import { NextResponse } from "next/server";
import {getSession} from "@/lib/auth/session";
import {withApi,RouteError,logServerError,readFormData} from "@/lib/api/route";
import {listCategories,createCategory} from "@/lib/db/categories";
import {classifyTransactions} from "@/lib/ai/categorize";
import {parseMercantilXlsx,mercantilImportHash,legacyMercantilImportHash} from "@/lib/parsers/mercantil-xlsx";
import {isRelevantTransaction} from "@/lib/filters/household-relevance";
import {getSql} from "@/lib/db/client";
import {ensurePatternsTable,learnPatterns} from "@/lib/db/patterns";
import {ensureReconciliationSchema} from "@/lib/db/reconciliation";
import {enforceRateLimit} from "@/lib/security/rate-limit";

async function POSTHandler(request:Request) {
  const session=await getSession();if(!session)throw new RouteError(401,"UNAUTHORIZED","נדרשת התחברות");
  await enforceRateLimit(request,"import",session.userId,5,3600);
  const form=await readFormData(request),file=form.get("file");
  if(!(file instanceof File)||file.size===0||file.size>8*1024*1024||!/\.xlsx$/i.test(file.name))throw new RouteError(400,"INVALID_REQUEST","יש להעלות קובץ XLSX עד 8MB");
  let parsed;
  try {parsed=await parseMercantilXlsx(Buffer.from(await file.arrayBuffer()));}
  catch(error){throw new RouteError(400,"INVALID_REQUEST",error instanceof Error ? error.message : "קובץ Excel אינו תקין");}
  const {rows,accountHolder}=parsed;
  if(!rows.length||rows.length>500)throw new RouteError(400,"INVALID_REQUEST","יש להעלות קובץ עם 1–500 תנועות. אפשר לפצל קבצים גדולים.");
  await Promise.all([ensurePatternsTable(),ensureReconciliationSchema()]);
  const sql=getSql(),hashes=rows.flatMap(row=>[mercantilImportHash(row),legacyMercantilImportHash(row)]);
  const existing=await sql`select import_hash from transactions where user_id=${session.userId} and import_hash=any(${hashes}::text[])`;
  const seen=new Set(existing.map(row=>String(row.import_hash)));
  const categories=await listCategories(session.userId);
  const categoryMap=new Map(categories.map(c=>[`${c.type}:${c.name}`,c]));
  const prepared:Array<{amount:number;date:string;category_id:string;notes:string;hash:string;legacy:string;description:string}>=[];
  let skipped=0,filtered=0;
  const fresh=rows.filter(row=>{
    if(!isRelevantTransaction(row.description)){filtered++;return false;}
    const hash=mercantilImportHash(row),legacy=legacyMercantilImportHash(row);
    if(seen.has(hash)||seen.has(legacy)){skipped++;return false;}seen.add(hash);seen.add(legacy);return true;
  });
  for(let i=0;i<fresh.length;i+=25){
    const batch=fresh.slice(i,i+25);const {results}=await classifyTransactions(batch.map(r=>({description:r.description,amount:r.amount,date:r.date})),categories);
    if(results.length!==batch.length)throw new RouteError(502,"INTERNAL_ERROR","ניתוח הקובץ לא הושלם. אפשר לנסות שוב.");
    for(let j=0;j<batch.length;j++){
      const row=batch[j],result=results[j];
      if (!result || !["income","expense"].includes(result.type) || typeof result.categoryName!=="string" || !result.categoryName.trim() || result.categoryName.length>120 || typeof result.cleanedNotes!=="string" || result.cleanedNotes.length>2000) throw new RouteError(502,"INTERNAL_ERROR","תוצאת הניתוח אינה תקינה. לא בוצע ייבוא.");
      const key=`${result.type}:${result.categoryName}`;
      let category=categoryMap.get(key);
      if(!category){category=await createCategory(session.userId,{name:result.categoryName,type:result.type});categoryMap.set(key,category);categories.push(category);}
      prepared.push({amount:Math.abs(row.amount),date:row.date,category_id:category.id,notes:result.cleanedNotes,hash:mercantilImportHash(row),legacy:legacyMercantilImportHash(row),description:row.description});
    }
  }
  let imported=0,learningWarning: string | undefined;
  if(prepared.length){
    const result=await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtextextended(${session.userId+":import"},0))`,
      sql`insert into transactions(user_id,amount,date,category_id,account_source,notes,import_hash,reconciliation_status)
        select ${session.userId},r.amount,r.date,r.category_id,${accountHolder?`עובר ושב · ${accountHolder}`:"עובר ושב"},r.notes,r.hash,'unmatched'
        from jsonb_to_recordset(${JSON.stringify(prepared)}::jsonb) as r(amount numeric,date date,category_id uuid,notes text,hash text,legacy text)
        where not exists(select 1 from transactions t where t.user_id=${session.userId} and (t.import_hash=r.hash or t.import_hash=r.legacy))
        returning import_hash`,
    ]);
    imported=result[1].length;skipped+=prepared.length-imported;
    const inserted=new Set(result[1].map(r=>String(r.import_hash)));
    try {await learnPatterns(session.userId,prepared.filter(r=>inserted.has(r.hash)).map(r=>({description:r.description,categoryId:r.category_id})),"xlsx_upload");}
    catch(error){logServerError('import.learning',error);learningWarning="הייבוא נשמר, אך עדכון הלמידה לא הושלם.";}
  }
  return NextResponse.json({ok:true,imported,skipped,filtered,total:rows.length,warning:learningWarning});
}
export const POST=withApi(POSTHandler,"import.xlsx");
