const pages=new Set(["/month","/dashboard","/library","/templates","/setup","/settings","/import","/transactions","/categories","/insights","/finance","/trends"]);
/** Never pass an untrusted URL or script scheme to Next's client router. */
export function safeReturnPath(value: string | null): string {
  if(!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value))return "/month";
  try {const url=new URL(value,"https://mercantil.invalid");return url.origin==="https://mercantil.invalid"&&pages.has(url.pathname)?url.pathname+url.search+url.hash:"/month";}
  catch{return "/month";}
}
