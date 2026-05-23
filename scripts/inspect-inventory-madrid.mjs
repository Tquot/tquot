/**
 * One-off inspector: list inventory rows whose name/city/destination mention Madrid.
 * Run: node scripts/inspect-inventory-madrid.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY or anon + logged-in user not supported here.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://huggxtbkfpucfbztceno.supabase.co";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_QvcOjBhSI00AVcuf0r8idQ_p45uX6CC";

if (!url || !key) {
  console.error("Missing Supabase URL/key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from("inventory")
  .select("id,user_id,category,name,data,created_at")
  .order("created_at", { ascending: false })
  .limit(500);

if (error) {
  console.error(error);
  process.exit(1);
}

const madridRows = (data ?? []).filter((row) => {
  const blob = JSON.stringify({
    name: row.name,
    data: row.data,
  }).toLowerCase();
  return blob.includes("madrid");
});

console.log(`Total inventory rows fetched: ${data?.length ?? 0}`);
console.log(`Madrid-related rows: ${madridRows.length}\n`);

for (const row of madridRows) {
  console.log({
    id: row.id,
    category: row.category,
    categoryRepr: JSON.stringify(row.category),
    name: row.name,
    city: row.data?.city,
    destination: row.data?.destination,
    duration: row.data?.duration,
  });
}

const byCategory = {};
for (const row of madridRows) {
  byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
}
console.log("\nMadrid rows by category:", byCategory);
