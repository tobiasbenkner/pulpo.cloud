import { pb } from "./pb";

export async function checkAuthentication(): Promise<{
  isAuthenticated: boolean;
}> {
  if (!pb.authStore.isValid) {
    throw new Error("Not authenticated");
  }

  try {
    await pb.collection("users").authRefresh();
    return { isAuthenticated: true };
  } catch {
    pb.authStore.clear();
    throw new Error("Not authenticated");
  }
}

export async function logout() {
  pb.authStore.clear();
}
