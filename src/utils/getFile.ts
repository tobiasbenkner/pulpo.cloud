// Pattern: {pocketbase_url}/api/files/{collection_name}/{record_id}/{filename}

const POCKETBASE_URL = "https://pulpo.cloud";

export function getFileUrl(
  recordId: string,
  filename: string,
  collectionName: "products" | "categories"
): string {
  if (!filename) return "";
  return `${POCKETBASE_URL}/api/files/${collectionName}/${recordId}/${filename}`;
}
