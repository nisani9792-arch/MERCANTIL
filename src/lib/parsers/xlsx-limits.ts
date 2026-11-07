/** Bound ZIP metadata before ExcelJS allocates worksheet buffers. No filesystem extraction. */
export function validateXlsxArchive(input: Buffer) {
  const start = Math.max(0,input.length-65557);
  let end=-1;
  for(let i=input.length-22;i>=start;i--) if(input.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0) throw new Error("קובץ Excel אינו תקין");
  const count=input.readUInt16LE(end+10), offset=input.readUInt32LE(end+16);
  if(count>500 || offset>input.length || count===0) throw new Error("מבנה קובץ Excel גדול מדי");
  let current=offset,total=0,workbook=false;
  for(let i=0;i<count;i++) {
    if(current+46>input.length || input.readUInt32LE(current)!==0x02014b50) throw new Error("ארכיון Excel אינו תקין");
    const size=input.readUInt32LE(current+24),nameLength=input.readUInt16LE(current+28),extra=input.readUInt16LE(current+30),comment=input.readUInt16LE(current+32);
    total+=size;
    if(size>16*1024*1024 || total>32*1024*1024 || input.readUInt16LE(current+8)&1) throw new Error("קובץ Excel גדול או מוצפן אינו נתמך");
    if(current+46+nameLength+extra+comment>input.length) throw new Error("ארכיון Excel אינו תקין");
    if(input.subarray(current+46,current+46+nameLength).toString()==="xl/workbook.xml")workbook=true;
    current+=46+nameLength+extra+comment;
  }
  if(!workbook) throw new Error("יש להעלות קובץ XLSX תקין");
}
