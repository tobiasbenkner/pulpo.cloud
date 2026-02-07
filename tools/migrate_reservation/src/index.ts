import "dotenv/config";
import PocketBase, { type RecordModel } from "pocketbase";
import { createDirectus, staticToken, rest, createItems } from "@directus/sdk";

// ==========================================
// 1. TYP DEFINITIONEN
// ==========================================

interface PbReservation extends RecordModel {
  date: string;
  time: string;
  name: string;
  contact: string;
  person_count: string;
  notes: string;
  was_there: boolean;
  user: string;
}

// Directus Schema (Ziel)
interface DirectusReservation {
  id: string;
  tenant: string;
  date: string;
  time: string;
  name: string;
  person_count: number;
  contact: string;
  notes: string;
  arrived: boolean;
  user: string;
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

const directus = createDirectus(CONFIG.directus.url)
  .with(staticToken(CONFIG.directus.token))
  .with(rest());

const users = {
  lbp4i7jlr730pc9: {
    id: "14e2c39d-eb1e-4f09-8fda-a627a027a48d",
    name: "Paula",
  },
  v04v9r53p1qrbbo: {
    id: "3666996d-9800-4462-9132-3a76fd79668b",
    name: "Dany",
  },
  "68tt8wji7gtwg67": {
    id: "e0f829a3-a07a-42bd-9cf5-9d77f2c1c63a",
    name: "Avril",
  },
  s7nyrfrms630iht: {
    id: "6e4f69de-9adc-42c3-9e56-67c68f5b3d34",
    name: "A2",
  },
  mtl2ovocxuaxnw1: {
    id: "6c5f8e59-99af-4e4e-a76a-a1bf3cf1dd91",
    name: "A1",
  },
};

// ==========================================
// 4. HAUPTFUNKTION
// ==========================================

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
    console.log("\n📦 Migriere Reservations...");

    const reservations = await pb
      .collection("reservations")
      .getFullList<PbReservation>({ batch: 200 });

    console.log(`   Gefunden: ${reservations.length} Reservierungen`);

    const mapped = reservations.map((reservation) => {
      const parsedCount = parseInt(reservation.person_count, 10);
      return {
        tenant: CONFIG.directus.tenant,
        name: reservation.name,
        contact: reservation.contact,
        date: reservation.date,
        time: reservation.time,
        notes: reservation.notes,
        arrived: reservation.was_there,
        person_count: isNaN(parsedCount) ? undefined : parsedCount,
        user: users[reservation.user]?.id,
      };
    });

    const BATCH_SIZE = 200;
    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      try {
        await directus.request(createItems("reservations", batch));
        console.log(
          `   > Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mapped.length / BATCH_SIZE)} (${batch.length} Einträge)`,
        );
      } catch (err: any) {
        console.log(
          `   ❌ Fehler bei Batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
          err,
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
