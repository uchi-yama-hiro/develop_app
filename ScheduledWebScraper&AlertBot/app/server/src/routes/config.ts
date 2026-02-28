import { Router } from "express";
import { ConfigManager, ValidationError } from "../services/ConfigManager.js";
import type { ScrapeMode } from "../../../shared/types/index.ts";

export function createConfigRouter(configManager: ConfigManager): Router {
  const router = Router();

  /** GET /api/config — 現在の設定を取得 */
  router.get("/", async (_req, res, next) => {
    try {
      const config = await configManager.getConfig();
      res.json({
        outputDir: config.outputDir,
        scrapeMode: config.scrapeMode,
      });
    } catch (err) {
      next(err);
    }
  });

  /** PUT /api/config/output-dir — 保存先ディレクトリ変更 */
  router.put("/output-dir", async (req, res, next) => {
    try {
      const { outputDir } = req.body as { outputDir?: string };
      if (!outputDir) {
        res.status(400).json({ error: "outputDir is required" });
        return;
      }
      await configManager.setOutputDir(outputDir);
      res.json({ outputDir });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  /** PUT /api/config/scrape-mode — スクレイピングモード変更 */
  router.put("/scrape-mode", async (req, res, next) => {
    try {
      const { mode } = req.body as { mode?: ScrapeMode };
      if (!mode) {
        res.status(400).json({ error: "mode is required" });
        return;
      }
      await configManager.setScrapeMode(mode);
      res.json({ scrapeMode: mode });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  return router;
}
