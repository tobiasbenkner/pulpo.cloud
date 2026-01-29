import { URL as BASE_URL } from "./config";

export const getAssetUrl = (
  id: string,
  cmsUrl: string,
  token: string,
  options?: { width?: number; quality?: number },
) => {
  if (!id) return "";
  const url = new URL(`/assets/${id}?access_token=${token}`, cmsUrl);
  if (options?.width) url.searchParams.set("width", options.width.toString());
  if (options?.quality)
    url.searchParams.set("quality", options.quality.toString());
  return url.toString();
};


export function imageUrl(id: string, width: number = 800) {
  return getAssetUrl(id, BASE_URL, "", { width });
}
  