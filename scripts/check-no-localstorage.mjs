import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "index.html",
  "src/app.js",
  "supabase/migrations/0001_initial_schema.sql",
  "README.md"
];
const offenders = [];
const banned = "local" + "Storage";

for (const file of files) {
  const full = path.join(root, file);
  const text = fs.readFileSync(full, "utf8");
  if (text.includes(banned)) offenders.push(file);
}

if (offenders.length) {
  console.error(`Browser-only persistence usage remains in: ${offenders.join(", ")}`);
  process.exit(1);
}

console.log("No browser-only persistence usage found in shared application files.");
