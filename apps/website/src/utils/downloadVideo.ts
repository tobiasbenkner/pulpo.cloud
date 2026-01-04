import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

export async function downloadVideoToPublic(
  url: string,
  id: string,
  filename: string
) {
  const publicDir = path.join(process.cwd(), "public", "videos");
  const ext = filename ? path.extname(filename) : ".mp4";
  const targetName = `${id}${ext}`;
  const filePath = path.join(publicDir, targetName);

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      return `/videos/${targetName}`;
    }
  }

  try {
    const headers: HeadersInit = {};
    if (import.meta.env.DIRECTUS_TOKEN) {
      headers["Authorization"] = `Bearer ${import.meta.env.DIRECTUS_TOKEN}`;
    }
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(
        `Video fetch failed for ${url}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    if (!response.body) throw new Error("No body in response");
    const fileStream = fs.createWriteStream(filePath);
    // @ts-ignore: Readable.fromWeb ist in neueren Node Versionen verfügbar, TS kennt es manchmal nicht
    await pipeline(Readable.fromWeb(response.body), fileStream);
    console.log(`✅ Downloaded: ${targetName}`);
    return `/videos/${targetName}`;
  } catch (e) {
    console.error(`❌ Fehler beim Video Download ${id}:`, e);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return null;
  }
}
