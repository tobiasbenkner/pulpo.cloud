import "dotenv/config";
import PocketBase, { type RecordModel } from "pocketbase";
import {
  createDirectus,
  staticToken,
  rest,
  createItem,
  uploadFiles,
  updateFile,
} from "@directus/sdk";
import axios from "axios";

// ==========================================
// 1. TYP DEFINITIONEN
// ==========================================

type I18N = {
  translations: Record<string, string>;
  value: string;
};

interface PbPost extends RecordModel {
  image?: string;
  tenant: string;
  slug: I18N;
  title: I18N;
  description: I18N;
  article: I18N;
  created: string;
}

interface TranslationItem {
  languages_id: string;
  title: string;
  slug: string;
  content: string;
  seo: {
    title: string;
    meta_description: string;
  };
}

// Directus Schema (Ziel)
interface DirectusPosts {
  id: string;
  tenant: string;
  translations: TranslationItem[];
  image: string | null;
  category: string;
  title: string;
  status: "published";
  date: string;
}

interface MyDirectusSchema {
  posts: DirectusPosts[];
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

// ==========================================
// 4. HAUPTFUNKTION
// ==========================================

const languages = ["es", "de", "en"];

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

    const pbPost = await pb.collection("articles").getFullList<PbPost>();

    for (const post of pbPost) {
      console.log(`   > Verarbeite: ${post.title.value}`);

      let directusImageId: string | null = null;

      // 1. Bild Handling
      if (post.image) {
        try {
          const imgUrl = `${CONFIG.pb.url}/api/files/articles/${post.id}/${post.image}`;

          const response = await axios.get(imgUrl, {
            responseType: "arraybuffer",
          });

          const buffer = Buffer.from(response.data);

          // Native FormData verwenden (Node.js >= 18)
          const formData = new FormData();
          const blob = new Blob([buffer], {
            type: "image/webp",
          });

          formData.append("folder", "8b3b3d7a-a11b-4d1c-b557-cb979918ab90");
          formData.append("file", blob, post.image);
          formData.append("tenant", CONFIG.directus.tenant);

          const fileResult = await directus.request(uploadFiles(formData));
          directusImageId = fileResult.id;

          await directus.request(
            updateFile(fileResult.id, {
              tenant: CONFIG.directus.tenant,
            } as any),
          );
        } catch (err: any) {
          console.error(
            `     ⚠️ Bild-Upload fehlgeschlagen für ${post.title.value}: ${err.message}`,
          );
        }
      }

      const translations: TranslationItem[] = [];
      for (const lang of languages) {
        if (lang === "es") {
          translations.push({
            languages_id: "b15b2463-bc03-449e-9ee9-9e185d557b11",
            title: post.title.value ?? null,
            content: post.article?.value ?? undefined,
            slug: post.slug.value ?? "",
            seo: {
              title: post.title.value ?? null,
              meta_description: post.description.value ?? null,
            },
          });
        } else if (lang === "en") {
          translations.push({
            languages_id: "cdb27c31-1890-4340-ae0f-1a96ff628dec",
            title: post.title?.translations["en"] ?? post.title.value ?? "",
            content: post.article?.translations["en"] ?? undefined,
            slug: post.slug?.translations["en"] ?? post.slug.value ?? "",
            seo: {
              title: post.title.value ?? null,
              meta_description: post.description?.translations["en"] ?? undefined,
            },
          });
        } else if (lang === "de") {
          translations.push({
            languages_id: "a2368b05-3d11-48eb-bf42-d369f2bbe4d8",
            title: post.title?.translations["de"] ?? post.title?.value ?? "",
            content: post.article?.translations["de"] ?? undefined,
            slug: post.slug?.translations["de"] ?? post.slug.value ?? "",
            seo: {
              title: post.title?.translations["de"] ?? post.title?.value ?? "",
              meta_description: post.description?.translations["de"] ?? undefined,
            },
          });
        }
      }

      try {
        await directus.request(
          createItem("posts", {
            image: directusImageId,
            tenant: CONFIG.directus.tenant,
            translations: translations,
            category: "2441ed0b-b857-408c-b01d-a837a016fac4",
            title: translations[0]?.title ?? "",
            status: "published",
            date: new Date(post.created).toISOString().substring(0, 10),
          }),
        );
      } catch (err: any) {
        console.error(
          `     ❌ Fehler beim Erstellen von Kategorie ${post.title.value}:`,
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
