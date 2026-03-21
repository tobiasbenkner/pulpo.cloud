import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.PB_URL || "http://127.0.0.1:8090");

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: npx tsx pb/setup.ts <admin-email> <admin-password>");
  process.exit(1);
}

await pb.collection("_superusers").authWithPassword(email, password);

const users = await pb.collections.getOne("users");

const existingFields = new Set(users.fields.map((f: any) => f.name));

const newFields: any[] = [];

const textFields = [
  { name: "businessName", max: 200 },
  { name: "legalName", max: 200 },
  { name: "nif", max: 20 },
  { name: "address", max: 300 },
  { name: "postalCode", max: 10 },
  { name: "city", max: 100 },
];

for (const f of textFields) {
  if (!existingFields.has(f.name)) {
    newFields.push({
      type: "text",
      name: f.name,
      required: false,
      options: { max: f.max },
    });
  }
}

if (!existingFields.has("businessType")) {
  newFields.push({
    type: "select",
    name: "businessType",
    required: false,
    options: { maxSelect: 1, values: ["gastro", "retail", "other"] },
  });
}

if (newFields.length === 0) {
  console.log("All fields already exist.");
  process.exit(0);
}

await pb.collections.update(users.id, {
  fields: [...users.fields, ...newFields],
});

console.log(`Added ${newFields.length} fields: ${newFields.map((f) => f.name).join(", ")}`);
