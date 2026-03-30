import PocketBase from "pocketbase";

const url = import.meta.env.DEV ? "http://localhost:8090" : "/";

export const pb = new PocketBase(url);
