import type { Router } from "express";
import pkg from "../../package.json";

export function registerHealth(router: Router) {
  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      version: pkg.version,
      timestamp: new Date().toISOString(),
    });
  });
}
