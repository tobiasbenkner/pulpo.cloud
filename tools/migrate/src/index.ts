import "dotenv/config";
import PocketBase, { type RecordModel } from "pocketbase";
import {
  createDirectus,
  staticToken,
  rest,
  createItem,
  uploadFiles,
} from "@directus/sdk";
import axios from "axios";

// ==========================================
// 1. TYP DEFINITIONEN
// ==========================================

type I18N = {
  translations: Record<string, string>;
  value: string;
};

interface PBCategory extends RecordModel {
  name: I18N;
  description?: I18N;
  photo?: string;
}

interface PBProduct extends RecordModel {
  name: I18N;
  description?: I18N;
  price: number;
  category: string;
  photo?: string;
  allergies: string[];
  note: I18N;
}

interface TranslationItem {
  languages_id: string;
  name: string;
  description?: string;
  note?: string;
}

// Directus Schema (Ziel)
interface DirectusCategory {
  id: string;
  tenant: string;
  name: string;
  translations: TranslationItem[];
  image: string | null;
}

interface DirectusProduct {
  id: string;
  translations: TranslationItem[];
  price: number;
  name: string;
  category: string | null;
  image: string | null;
  tenant: string;
  sort: number;
  allergies: string[];
  tax_class: string;
  price_gross: number;
}

interface MyDirectusSchema {
  categories: DirectusCategory[];
  products: DirectusProduct[];
}

// ==========================================
// 2. CONFIG & HELPER
// ==========================================

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`❌ Missing ENV variable: ${key}`);
  return value;
}

const CONFIG = {
  pb: {
    url: getEnv("PB_URL"),
    user: getEnv("PB_EMAIL"),
    pass: getEnv("PB_PASSWORD"),
  },
  directus: {
    url: getEnv("DIRECTUS_URL"),
    token: getEnv("DIRECTUS_TOKEN"),
    tenant: getEnv("DIRECTUS_TENANT"),
  },
};

// ==========================================
// 3. INITIALISIERUNG
// ==========================================

const pb = new PocketBase(CONFIG.pb.url);

const directus = createDirectus<MyDirectusSchema>(CONFIG.directus.url)
  .with(staticToken(CONFIG.directus.token))
  .with(rest());

// Map speichert: "Alte PB ID" -> "Neue Directus UUID"
const categoryIdMap = new Map<string, string>();

// ==========================================
// 4. HAUPTFUNKTION
// ==========================================

const languages = ["es", "en", "de"];

async function runMigration() {
  console.log("🚀 Starte Migration...");

  try {
    // A. Login PocketBase
    await pb
      .collection("users")
      .authWithPassword(CONFIG.pb.user, CONFIG.pb.pass);
    console.log("✅ PocketBase Login erfolgreich");

    // -------------------------------------------------------
    // SCHRITT A: KATEGORIEN
    // -------------------------------------------------------
    console.log("\n📦 Migriere Kategorien...");

    const pbCats = await pb.collection("categories").getFullList<PBCategory>();

    for (const cat of pbCats) {
      console.log(`   > Verarbeite: ${cat.name.value}`);

      let directusImageId: string | null = null;

      // 1. Bild Handling
      if (cat.photo) {
        try {
          const imgUrl = `${CONFIG.pb.url}/api/files/categories/${cat.id}/${cat.photo}`;

          const response = await axios.get(imgUrl, {
            responseType: "arraybuffer",
          });

          const buffer = Buffer.from(response.data);

          // Native FormData verwenden (Node.js >= 18)
          const formData = new FormData();
          const blob = new Blob([buffer], {
            type: "image/webp",
          });

          formData.append("folder", "f1a07a0c-3452-4194-9997-b364e350fd42");
          formData.append("file", blob, cat.photo);

          const fileResult = await directus.request(uploadFiles(formData));
          directusImageId = fileResult.id;
        } catch (err: any) {
          console.error(
            `     ⚠️ Bild-Upload fehlgeschlagen für ${cat.name.value}: ${err.message}`,
          );
        }
      }

      const translations: TranslationItem[] = [];
      for (const lang of languages) {
        if (lang === "es") {
          translations.push({
            languages_id: "d3d8db1e-8247-4b82-bea9-6c00318d61be",
            name: cat.name.value ?? null,
            description: cat.description?.value ?? undefined,
          });
        } else if (lang === "en") {
          translations.push({
            languages_id: "ce4f5188-2ac6-494f-a8f3-3f9e008c154d",
            name: cat.name?.translations?.["en"] ?? cat.name.value ?? "",
            description: cat.description?.translations?.["en"] ?? undefined,
          });
        } else if (lang === "de") {
          translations.push({
            languages_id: "76b2da22-8005-4880-83b7-ca8797bb16f8",
            name: cat.name?.translations?.[lang] ?? cat.name?.value ?? "",
            description: cat.description?.translations?.[lang] ?? undefined,
          });
        }
      }

      try {
        const newCat = await directus.request(
          createItem("categories", {
            image: directusImageId,
            name: cat.name.value,
            tenant: CONFIG.directus.tenant,
            translations: translations,
          }),
        );

        if (newCat && newCat.id) {
          categoryIdMap.set(cat.id, newCat.id);
        }
      } catch (err: any) {
        console.error(
          `     ❌ Fehler beim Erstellen von Kategorie ${cat.name}:`,
          err.message,
        );
      }
    }
    console.log(`✅ ${categoryIdMap.size} Kategorien migriert.`);

    // -------------------------------------------------------
    // SCHRITT B: PRODUKTE
    // -------------------------------------------------------
    console.log("\n🍔 Migriere Produkte...");

    const pbProds = await pb.collection("products").getFullList<PBProduct>();

    let count = 0;
    for (const prod of pbProds) {
      console.log(`   > Verarbeite: ${prod.name.value}`);

      let directusImageId: string | null = null;

      // 1. Bild Handling
      if (prod.photo) {
        try {
          const imgUrl = `${CONFIG.pb.url}/api/files/products/${prod.id}/${prod.photo}`;

          const response = await axios.get(imgUrl, {
            responseType: "arraybuffer",
          });

          const buffer = Buffer.from(response.data);

          const formData = new FormData();
          const blob = new Blob([buffer], {
            type: "image/webp",
          });

          formData.append("folder", "5e9aae86-772e-4b2c-99cd-7c1c404544dc");
          formData.append("file", blob, prod.photo);

          const fileResult = await directus.request(uploadFiles(formData));
          directusImageId = fileResult.id;
        } catch (err: any) {
          console.error(
            `     ⚠️ Bild-Upload fehlgeschlagen für ${prod.name.value}: ${err.message}`,
          );
        }
      }

      // 2. Kategorie Zuordnung
      const newCategoryId = categoryIdMap.get(prod.category);
      if (!newCategoryId) {
        console.warn(
          `     ⚠️ Keine neue Kategorie für PB-ID "${prod.category}" gefunden. Produkt wird ohne Kategorie angelegt.`,
        );
      }

      const translations: TranslationItem[] = [];
      for (const lang of languages) {
        if (lang === "es") {
          translations.push({
            languages_id: "d3d8db1e-8247-4b82-bea9-6c00318d61be",
            name: prod.name?.value ?? "",
            description: prod.description?.value ?? undefined,
            note: prod.note?.value ?? "",
          });
        } else if (lang === "en") {
          translations.push({
            languages_id: "ce4f5188-2ac6-494f-a8f3-3f9e008c154d",
            name: prod.name?.translations?.["en"] ?? prod.name.value ?? "",
            description: prod.description?.translations?.["en"] ?? undefined,
            note: prod.note?.translations?.["en"] ?? undefined,
          });
        } else if (lang === "de") {
          translations.push({
            languages_id: "76b2da22-8005-4880-83b7-ca8797bb16f8",
            name: prod.name?.translations?.[lang] ?? prod.name.value ?? "",
            description: prod.description?.translations?.[lang] ?? undefined,
            note: prod.note?.translations?.[lang] ?? undefined,
          });
        }
      }

      // 3. Produkt erstellen
      try {
        await directus.request(
          createItem("products", {
            name: prod.name.value,
            translations: translations,
            price: prod.price,
            category: newCategoryId || null,
            image: directusImageId,
            tenant: CONFIG.directus.tenant,
            sort: count++,
            allergies: prod.allergies ?? [],
            price_gross: prod.price / 100,
            tax_class: "90c06073-3bda-4e50-8dbd-ec2ba49c35bb",
          } as DirectusProduct),
        );
      } catch (err: any) {
        console.error(
          `     ❌ Fehler beim Speichern von Produkt ${prod.name}:`,
          err.message,
        );
      }
    }

    console.log("\n🎉 Migration abgeschlossen!");
  } catch (err: any) {
    console.error("\n❌ FATALER FEHLER:", err);
  }
}

// Starten
runMigration();
