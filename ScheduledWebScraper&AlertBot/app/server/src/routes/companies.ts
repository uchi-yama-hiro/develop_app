import { Router } from "express";
import { ConfigManager, ValidationError } from "../services/ConfigManager.js";

export function createCompaniesRouter(configManager: ConfigManager): Router {
  const router = Router();

  /** GET /api/companies — 企業一覧取得 */
  router.get("/", async (_req, res, next) => {
    try {
      const companies = await configManager.getCompanies();
      res.json(companies);
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/companies — 企業登録 */
  router.post("/", async (req, res, next) => {
    try {
      const { name } = req.body as { name?: string };
      if (!name) {
        res.status(400).json({ error: "Company name is required" });
        return;
      }
      const company = await configManager.addCompany(name);
      res.status(201).json(company);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  /** PUT /api/companies/:id — 企業名更新 */
  router.put("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name } = req.body as { name?: string };
      if (!name) {
        res.status(400).json({ error: "Company name is required" });
        return;
      }
      const company = await configManager.updateCompany(id, name);
      res.json(company);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  /** DELETE /api/companies/:id — 企業削除 */
  router.delete("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      await configManager.deleteCompany(id);
      res.json({ success: true });
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
