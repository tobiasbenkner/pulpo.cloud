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
  const ext = path.extname(filename) || ".mp4";
  const targetName = `${id}${ext}`;
  const filePath = path.join(publicDir, targetName);

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    return `/videos/${targetName}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Video fetch failed: ${response.statusText}`);

    if (response.body) {
      await pipeline(
        // @ts-ignore
        Readable.fromWeb(response.body),
        fs.createWriteStream(filePath)
      );
    }

    return `/videos/${targetName}`;
  } catch (e) {
    console.error(`Fehler beim Video Download ${id}:`, e);
    return null;
  }
}
