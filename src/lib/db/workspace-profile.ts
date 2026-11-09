import {getSql} from "@/lib/db/client";
import {isMonthKey} from "@/lib/utils/month";
export async function getWorkspaceProfile(userId:string) {
  const rows=await getSql()`select u.id,u.email,u.full_name,
    exists(select 1 from fixed_templates t where t.user_id=u.id) as configured,
    (select p.selected_month_key from user_finance_preferences p where p.user_id=u.id) as selected_month_key
    from users u where u.id=${userId} limit 1`;
  const row=rows[0];if(!row)return null;
  const month=String(row.selected_month_key??"");
  return {id:String(row.id),email:String(row.email),fullName:row.full_name?String(row.full_name):null,configured:Boolean(row.configured),monthKey:isMonthKey(month)?month:null};
}
