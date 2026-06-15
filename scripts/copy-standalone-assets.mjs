/**
 * Copy static assets into Next.js standalone output (required for production).
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");

if (!existsSync(standalone)) {
  console.log("[postbuild] No standalone output — skip asset copy");
  process.exit(0);
}

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

copyDir(publicDir, path.join(standalone, "public"));
copyDir(staticDir, path.join(standalone, ".next", "static"));
console.log("[postbuild] Standalone assets copied");
