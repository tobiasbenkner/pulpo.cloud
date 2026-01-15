import { map } from "nanostores";

export const authStore = map({
  isAuthenticated: false,
  loading: true,
});
