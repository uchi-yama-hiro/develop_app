import { Router } from "express";
import { ConfigManager, ValidationError } from "../services/ConfigManager.js";
import { ScraperManager } from "../services/ScraperManager.js";
import type { ScrapeMode } from "../../../shared/types/index.ts";

export function createScrapeRouter(configManager: ConfigManager): Router {
  const router = Router();
  const scraperManager = new ScraperManager(configManager);

  /** POST /api/scrape — 単一企業スクレイピング */
  router.post("/", async (req, res, next) => {
    try {
      const { companyId, mode } = req.body as {
        companyId?: string;
        mode?: ScrapeMode;
      };

      if (!companyId) {
        res.status(400).json({ error: "companyId is required" });
        return;
      }

      const companies = await configManager.getCompanies();
      const company = companies.find((c) => c.id === companyId);
      if (!company) {
        res.status(404).json({ error: "Company not found" });
        return;
      }

      const result = await scraperManager.scrapeCompany(
        company,
        undefined,
        mode,
      );
      res.json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  /** POST /api/scrape/all — 全企業一括スクレイピング */
  router.post("/all", async (req, res, next) => {
    try {
      const { mode } = req.body as { mode?: ScrapeMode };
      const companies = await configManager.getCompanies();

      if (companies.length === 0) {
        res.json([]);
        return;
      }

      const results = await scraperManager.scrapeAll(companies, mode);
      res.json(results);
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
