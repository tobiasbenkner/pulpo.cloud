import { DirectusFile } from "@directus/sdk";

export type User = {
  id: string;
  first_name: string | null;
  avatar: string | DirectusFile;
  tenant: string;
};
