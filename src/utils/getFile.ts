// Pattern: {pocketbase_url}/api/files/{collection_name}/{record_id}/{filename}

const POCKETBASE_URL = "https://pulpo.cloud";
const COLLECTION_NAME = "products";

export function getFileUrl(
  recordId: string,
  filename: string,
  collectionName: string = COLLECTION_NAME
): string {
  if (!filename) return "";
  return `${POCKETBASE_URL}/api/files/${collectionName}/${recordId}/${filename}`;
}
