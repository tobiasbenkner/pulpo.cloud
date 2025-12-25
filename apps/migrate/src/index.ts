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
}

interface TranslationItem {
  languages_id: string;
  name: string;
  description?: string;
}

// Directus Schema (Ziel)
interface DirectusCategory {
  id: string;
  tenant: string;
  translations: TranslationItem[];
  image: string | null;
}

interface DirectusProduct {
  id: string;
  translations: TranslationItem[];
  price: number;
  category: string | null;
  image: string | null;
  tenant: string;
  sort: number;
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

const languages = ["es", "es-ar", "de", "gb"];

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
            `     ⚠️ Bild-Upload fehlgeschlagen für ${cat.name.value}: ${err.message}`
          );
        }
      }

      const translations: TranslationItem[] = [];
      for (const lang of languages) {
        if (lang === "es") {
          translations.push({
            languages_id: "c4836a78-a698-4640-9bb7-47b11809e77a",
            name: cat.name.value ?? null,
            description: cat.description?.value ?? undefined,
          });
        } else if (lang === "gb") {
          translations.push({
            languages_id: "8bfe8257-10c4-41bf-8ca2-b5eabdd9ab86",
            name: cat.name?.translations["gb"] ?? cat.name.value ?? "",
            description: cat.description?.translations["gb"] ?? undefined,
          });
        } else if (lang === "de") {
          translations.push({
            languages_id: "6c7bd7c2-fcb4-4b05-bae6-9c92713bad01",
            name: cat.name?.translations[lang] ?? cat.name?.value ?? "",
            description: cat.description?.translations[lang] ?? undefined,
          });
        } else if (lang === "es-ar") {
          translations.push({
            languages_id: "273b9bf2-68d7-49f1-8c2e-80585b022a59",
            name: cat.name?.translations[lang] ?? cat.name?.value ?? "",
            description: cat.description?.translations[lang] ?? undefined,
          });
        }
      }

      try {
        const newCat = await directus.request(
          createItem("categories", {
            image: directusImageId,
            tenant: CONFIG.directus.tenant,
            translations: translations,
          })
        );

        if (newCat && newCat.id) {
          categoryIdMap.set(cat.id, newCat.id);
        }
      } catch (err: any) {
        console.error(
          `     ❌ Fehler beim Erstellen von Kategorie ${cat.name}:`,
          err.message
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
            `     ⚠️ Bild-Upload fehlgeschlagen für ${prod.name.value}: ${err.message}`
          );
        }
      }

      // 2. Kategorie Zuordnung
      const newCategoryId = categoryIdMap.get(prod.category);
      if (!newCategoryId) {
        console.warn(
          `     ⚠️ Keine neue Kategorie für PB-ID "${prod.category}" gefunden. Produkt wird ohne Kategorie angelegt.`
        );
      }

      const translations: TranslationItem[] = [];
      for (const lang of languages) {
        if (lang === "es") {
          translations.push({
            languages_id: "c4836a78-a698-4640-9bb7-47b11809e77a",
            name: prod.name?.value ?? "",
            description: prod.description?.value ?? undefined,
          });
        } else if (lang === "gb") {
          translations.push({
            languages_id: "8bfe8257-10c4-41bf-8ca2-b5eabdd9ab86",
            name: prod.name?.translations?.["gb"] ?? prod.name.value ?? "",
            description: prod.description?.translations?.["gb"] ?? undefined,
          });
        } else if (lang === "de") {
          translations.push({
            languages_id: "6c7bd7c2-fcb4-4b05-bae6-9c92713bad01",
            name: prod.name?.translations?.[lang] ?? prod.name.value ?? "",
            description: prod.description?.translations?.[lang] ?? undefined,
          });
        } else if (lang === "es-ar") {
          translations.push({
            languages_id: "273b9bf2-68d7-49f1-8c2e-80585b022a59",
            name: prod.name?.translations?.[lang] ?? prod.name?.value ?? "",
            description: prod.description?.translations?.[lang] ?? undefined,
          });
        }
      }

      // 3. Produkt erstellen
      try {
        await directus.request(
          createItem("products", {
            translations: translations,
            price: prod.price,
            category: newCategoryId || null,
            image: directusImageId,
            tenant: CONFIG.directus.tenant,
            sort: count++,
          })
        );
      } catch (err: any) {
        console.error(
          `     ❌ Fehler beim Speichern von Produkt ${prod.name}:`,
          err.message
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
