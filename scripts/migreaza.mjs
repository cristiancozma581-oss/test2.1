#!/usr/bin/env node
/**
 * Aplică migrațiile `supabase/migrations/*.sql` în ordinea numelui.
 *
 * Cere `DATABASE_URL` — șirul de conexiune direct la Postgres, NU cheia
 * Supabase: migrațiile creează extensii, funcții și politici, lucruri pe care
 * API-ul REST nu le poate face.
 *
 * Fiecare fișier rulează într-o singură tranzacție: dacă o instrucțiune cade,
 * fișierul se anulează întreg. O migrație aplicată pe jumătate este mai greu
 * de reparat decât una neaplicată.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const radacina = join(dirname(fileURLToPath(import.meta.url)), "..");
const director = join(radacina, "supabase", "migrations");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "DATABASE_URL lipsește.\n\n" +
      "Îl găsești în Supabase → Project Settings → Database → Connection string → URI.\n" +
      "Exemplu:\n" +
      "  DATABASE_URL='postgresql://postgres:PAROLA@db.xxxx.supabase.co:5432/postgres' \\\n" +
      "    node scripts/migreaza.mjs",
  );
  process.exit(1);
}

// Doar migrațiile IMMY & EMY, dacă nu se cere altfel.
const prefix = process.argv[2] ?? "00";
const doarIe = process.argv[2] === undefined;

const fisiere = readdirSync(director)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => (doarIe ? f.includes("_ie_") : f.startsWith(prefix)))
  .sort();

if (fisiere.length === 0) {
  console.error(`Nicio migrație de aplicat în ${director}.`);
  process.exit(1);
}

let Client;
try {
  ({ Client } = await import("pg"));
} catch {
  console.error(
    "Pachetul `pg` nu este instalat.\n" +
      "Rulează: npm install --no-save pg\n" +
      "(este necesar doar pentru migrații, nu pentru aplicație)",
  );
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  // Supabase servește un certificat gestionat; conexiunea rămâne TLS.
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Conectat. ${fisiere.length} migrații de aplicat.\n`);

for (const fisier of fisiere) {
  const sql = readFileSync(join(director, fisier), "utf8");
  process.stdout.write(`  ${fisier} … `);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("ok");
  } catch (e) {
    await client.query("rollback");
    console.log("EȘEC");
    console.error(`\n${e.message}\n`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\nGata. Rulează apoi `node scripts/seed-demo.mjs` dacă vrei date de exemplu.");
