#!/usr/bin/env node
// Fix pg-cloudflare exports for Node-style bundlers (esbuild/wrangler).
// pg-cloudflare declares exports["."].require only under the "workerd"
// condition; standard Node resolution falls back to dist/empty.js, which
// breaks the OpenNext/Cloudflare worker bundle ("Could not resolve
// pg-cloudflare"). Patch both the hoisted install and the copy inside
// apps/web/.open-next (rebuilt each run).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");

function patchExports(pkgJsonPath) {
  if (!fs.existsSync(pkgJsonPath)) return false;
  const raw = fs.readFileSync(pkgJsonPath, "utf8");
  const pkg = JSON.parse(raw);
  const exp = pkg.exports && pkg.exports["."];
  if (exp && (exp.require === "./dist/empty.js" || exp.default === "./dist/empty.js" || (!exp.require && !exp.import))) {
    pkg.exports = {
      ".": { import: "./esm/index.mjs", require: "./dist/index.js", default: "./dist/index.js" },
      "./package.json": "./package.json",
    };
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
    return true;
  }
  return false;
}

let changed = 0;
changed += patchExports(path.join(root, "node_modules", "pg-cloudflare", "package.json")) ? 1 : 0;
changed += patchExports(path.join(root, "apps", "web", ".open-next", "server-functions", "default", "node_modules", "pg-cloudflare", "package.json")) ? 1 : 0;
console.log(`pg-cloudflare exports patched: ${changed} location(s)`);
