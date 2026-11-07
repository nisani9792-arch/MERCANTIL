export function currentDateKey(date = new Date()): string {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const value=(kind: string)=>parts.find(p=>p.type===kind)?.value??"";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function currentMonthKey(date = new Date()): string { return currentDateKey(date).slice(0,7); }
export function isMonthKey(value: string): boolean {return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>0;}
export function shiftMonthKey(monthKey: string, delta: number): string {
  if(!isMonthKey(monthKey)||!Number.isInteger(delta))return monthKey;
  const [year,month]=monthKey.split("-").map(Number),index=year*12+month-1+delta;
  const nextYear=Math.floor(index/12);
  if(nextYear<1||nextYear>9999)return monthKey;
  return `${String(nextYear).padStart(4,"0")}-${String(index%12+1).padStart(2,"0")}`;
}

export function previousMonthKey(monthKey: string): string {
  return shiftMonthKey(monthKey, -1);
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}
