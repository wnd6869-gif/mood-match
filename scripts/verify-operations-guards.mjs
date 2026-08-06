import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const proxySource = await readFile(resolve(root, "lib/supabase/proxy.ts"), "utf8");
const migrationsDir = resolve(root, "supabase/migrations");
const migrationFiles = (await readdir(migrationsDir))
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();

if (!proxySource.includes('pathname.startsWith("/dev")')) {
  throw new Error("Production /dev route guard is missing.");
}

if (migrationFiles.length < 2) {
  throw new Error("Expected a registered baseline and at least one migration.");
}

if (new Set(migrationFiles).size !== migrationFiles.length) {
  throw new Error("Duplicate migration filenames found.");
}

console.log(JSON.stringify({
  productionDevRoutes: "blocked",
  migrations: migrationFiles,
}, null, 2));
