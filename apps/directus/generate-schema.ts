import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(dir, "snapshot.json");
const outputPath = join(dir, "SCHEMA.md");

interface Field {
  collection: string;
  field: string;
  type: string;
  meta?: {
    required?: boolean;
    special?: string[];
    options?: { choices?: { value: string }[] };
  };
  schema?: {
    data_type?: string;
    is_nullable?: boolean;
    foreign_key_table?: string;
    foreign_key_column?: string;
  };
}

interface Collection {
  collection: string;
  meta?: { group?: string; hidden?: boolean };
  schema?: { name: string };
}

interface Relation {
  collection: string;
  field: string;
  related_collection?: string;
  meta?: { one_field?: string; one_deselect_action?: string };
}

interface Snapshot {
  data: {
    directus: string;
    collections: Collection[];
    fields: Field[];
    relations: Relation[];
  };
}

const snapshot: Snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
const { directus, collections, fields, relations } = snapshot.data;

const colMeta = new Map(
  collections.map((c) => [
    c.collection,
    { group: c.meta?.group, hasSchema: !!c.schema },
  ])
);

const realCollections = collections
  .filter((c) => c.schema)
  .map((c) => c.collection);
const folders = collections
  .filter((c) => !c.schema)
  .map((c) => c.collection);

// Group fields by collection, skip UI-only alias groups
const fieldsByCol = new Map<string, Field[]>();
for (const f of fields) {
  const special = f.meta?.special ?? [];
  if (f.type === "alias" && special.includes("no-data")) continue;
  if (!fieldsByCol.has(f.collection)) fieldsByCol.set(f.collection, []);
  fieldsByCol.get(f.collection)!.push(f);
}

const lines: string[] = [];
const push = (s: string) => lines.push(s);

push("# Directus Schema Reference");
push("");
push("> Auto-generated from snapshot.json — do not edit manually");
push(`> Directus ${directus} / PostgreSQL`);
push("");

push("## Collection Groups (Folders)");
push("");
for (const f of folders) {
  const children = realCollections.filter((rc) => colMeta.get(rc)?.group === f);
  push(`- **${f}**: ${children.join(", ")}`);
}
push("");

for (const col of realCollections) {
  const colFields = fieldsByCol.get(col) ?? [];
  push(`## ${col}`);
  push("");
  if (colFields.length === 0) {
    push("_No fields_");
    push("");
    continue;
  }

  push("| Field | Type | Nullable | FK | Notes |");
  push("|-------|------|----------|----|-------|");

  for (const f of colFields) {
    const type = f.schema?.data_type ?? f.type ?? "";
    const nullable = (f.schema?.is_nullable ?? true) ? "yes" : "no";
    const fk = f.schema?.foreign_key_table
      ? `${f.schema.foreign_key_table}.${f.schema.foreign_key_column}`
      : "";

    const sp = f.meta?.special ?? [];
    const notes: string[] = [];
    if (sp.includes("uuid")) notes.push("PK");
    if (sp.includes("m2o")) notes.push("M2O");
    if (sp.includes("o2m")) notes.push("O2M");
    if (sp.includes("m2m")) notes.push("M2M");
    if (sp.includes("translations")) notes.push("translations");
    if (sp.includes("date-created") || sp.includes("date-updated")) notes.push("auto");
    if (sp.includes("user-created") || sp.includes("user-updated")) notes.push("auto");
    if (sp.includes("cast-json")) notes.push("JSON");
    if (f.meta?.required) notes.push("required");
    const choices = f.meta?.options?.choices?.map((c) => c.value) ?? [];
    if (choices.length) notes.push(`choices: ${choices.join(", ")}`);

    push(`| ${f.field} | ${type} | ${nullable} | ${fk} | ${notes.join(", ")} |`);
  }
  push("");
}

push("## Relations");
push("");
push("| Collection | Field | Related Collection | Related Field | Type |");
push("|-----------|-------|--------------------|---------------|------|");
for (const r of relations) {
  const type = r.meta?.one_deselect_action ? "M2O" : "";
  push(
    `| ${r.collection} | ${r.field} | ${r.related_collection ?? ""} | ${r.meta?.one_field ?? ""} | ${type} |`
  );
}

const output = lines.join("\n") + "\n";
writeFileSync(outputPath, output);
console.log(`SCHEMA.md generated (${lines.length} lines, ${Buffer.byteLength(output)} bytes)`);
