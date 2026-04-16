import PocketBase, { type RecordModel } from "pocketbase";

const url = import.meta.env.DEV ? "http://localhost:8090" : "/";
export const pb = new PocketBase(url);

export interface Config extends RecordModel {
  name?: string;
  languages?: string[];
  default_language?: string;
  _websiteConfig?: RecordModel;
  [key: string]: any;
}

/** Loads `company` (always) and `website_config` (optional) and merges them. */
export async function loadConfig(): Promise<Config> {
  const [companyList, configList] = await Promise.all([
    pb.collection("company").getFullList({ requestKey: null }),
    pb.collection("website_config").getFullList({ requestKey: null }).catch(() => []),
  ]);
  const company = companyList[0] || ({} as RecordModel);
  const websiteConfig = configList[0];
  return { ...company, ...(websiteConfig || {}), _websiteConfig: websiteConfig } as Config;
}
