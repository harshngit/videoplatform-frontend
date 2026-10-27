// Copies the video composition from the backend repo so the editor's live preview
// renders exactly what the server exports. Run after changing server/remotion:
//   npm run sync:remotion            (expects the backend at ../server)
//   REMOTION_SRC=/path/to/backend/remotion npm run sync:remotion
import fs from "node:fs";
import path from "node:path";

const src = path.resolve(process.env.REMOTION_SRC ?? "../server/remotion");
const dest = path.resolve("src/remotion");
const skip = new Set(["index.ts", "Root.tsx"]); // server-only entry points

if (!fs.existsSync(src)) {
  console.error(`Composition not found at ${src}`);
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
const copy = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(e.name) && from === src) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copy(a, b);
    else fs.writeFileSync(b, `// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.\n${fs.readFileSync(a, "utf8")}`);
  }
};
copy(src, dest);
console.log(`Synced composition from ${src}`);
