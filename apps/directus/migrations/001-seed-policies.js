import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadJson(file) {
  const raw = JSON.parse(readFileSync(resolve(__dirname, file), "utf-8"));
  return raw.data ?? raw;
}

const tables = [
  {
    table: "directus_roles",
    file: "001-roles.json",
    filter: null,
  },
  {
    table: "directus_policies",
    file: "001-policies.json",
    filter: null,
  },
  {
    table: "directus_access",
    file: "001-access.json",
    filter: (item) => item.role !== null,
  },
  {
    table: "directus_permissions",
    file: "001-permissions.json",
    filter: null,
  },
];

function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

export async function up(knex) {
  for (const { table, file, filter } of tables) {
    // Tatsächliche DB-Spalten abfragen
    const columnInfo = await knex(table).columnInfo();
    const dbColumns = Object.keys(columnInfo);

    let items = loadJson(file);
    if (filter) items = items.filter(filter);
    if (!items || items.length === 0) continue;

    for (const raw of items) {
      const item = pick(raw, dbColumns);
      const exists = await knex(table).where("id", item.id).first();
      if (exists) {
        await knex(table).where("id", item.id).update(item);
      } else {
        await knex(table).insert(item);
      }
    }

    console.log(`  ${table}: ${items.length} items synced`);
  }
}

export async function down(knex) {
  for (const { table, file } of [...tables].reverse()) {
    const items = loadJson(file);
    const ids = items.map((i) => i.id);
    await knex(table).whereIn("id", ids).del();
  }
}
