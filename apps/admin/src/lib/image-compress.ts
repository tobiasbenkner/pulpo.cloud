// Client-side image compression for upload forms.
//
// - Resizes images so the longer edge is at most `maxDimension` pixels.
// - Re-encodes to WebP (Q=80 by default). Falls back to JPEG on browsers
//   that cannot encode WebP (ancient Safari); alpha is lost in that case,
//   which is fine for product/category photos.
// - HEIC/HEIF input is decoded via a lazy-loaded `heic-to` fallback, so the
//   library only ships on pages where HEIC upload actually happens.
// - Returns the original File unchanged when compression fails, the result
//   would be larger than the source, or the input is SVG/non-image.
//
// Server-side Go hook still runs as defense-in-depth; if this utility is
// bypassed, uploads are still resized and re-encoded before hitting disk.

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  preferredType?: "image/webp" | "image/jpeg";
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1200,
  quality: 0.8,
  preferredType: "image/webp",
};

let webpSupport: Promise<boolean> | null = null;

function supportsWebpEncoding(): Promise<boolean> {
  if (!webpSupport) {
    webpSupport = new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      canvas.toBlob(
        (b) => resolve(!!b && b.type === "image/webp"),
        "image/webp",
      );
    });
  }
  return webpSupport;
}

// iOS Safari sometimes reports empty file.type for HEIC/HEIF, so we also
// check the filename extension. Returns true for both .heic and .heif plus
// the matching image/heic, image/heif MIME strings.
function looksLikeHeic(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    n.endsWith(".heic") ||
    n.endsWith(".heif")
  );
}

async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  if (looksLikeHeic(file)) {
    const { heicTo } = await import("heic-to");
    return heicTo({ blob: file, type: "bitmap" });
  }
  return createImageBitmap(file);
}

function extFor(mime: string): string {
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "bin";
}

function swapExt(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const { maxDimension, quality, preferredType } = { ...DEFAULTS, ...opts };

  if (file.type === "image/svg+xml") return file;
  if (!file.type.startsWith("image/") && !looksLikeHeic(file)) {
    console.info("[compressImage] not an image, passing through:", file.name, file.type);
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeToBitmap(file);
  } catch (err) {
    console.warn("[compressImage] decode failed, uploading original:", file.name, file.type, err);
    return file;
  }

  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const newW = Math.max(1, Math.round(width * scale));
  const newH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close();

  const targetType =
    preferredType === "image/webp" && !(await supportsWebpEncoding())
      ? "image/jpeg"
      : preferredType;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, targetType, quality);
  });
  if (!blob) {
    console.warn("[compressImage] toBlob returned null, uploading original:", file.name);
    return file;
  }

  if (blob.size >= file.size) {
    console.info(
      `[compressImage] compressed ${blob.size}B >= original ${file.size}B, keeping original:`,
      file.name,
    );
    return file;
  }

  const out = new File([blob], swapExt(file.name, extFor(targetType)), {
    type: targetType,
    lastModified: file.lastModified,
  });
  console.info(
    `[compressImage] ${file.name} (${file.size}B, ${width}x${height}) → ${out.name} (${out.size}B, ${newW}x${newH}, ${targetType})`,
  );
  return out;
}
