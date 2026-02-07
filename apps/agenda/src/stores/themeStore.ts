import { writable } from "svelte/store";

const STORAGE_KEY = "pulpo_agenda_theme";

function getInitialTheme(): "light" | "dark" {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const theme = writable<"light" | "dark">(getInitialTheme());

export function toggleTheme() {
  theme.update((t) => {
    const next = t === "light" ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return next;
  });
}
