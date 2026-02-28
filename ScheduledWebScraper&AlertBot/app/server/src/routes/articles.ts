import { Router } from "express";
import type { ConfigManager } from "../services/ConfigManager.js";

export function createArticlesRouter(configManager: ConfigManager): Router {
  const router = Router();

  /** GET /api/articles — 記事一覧取得 */
  router.get("/", async (req, res, next) => {
    try {
      const companyId = req.query.companyId as string | undefined;
      const articles = await configManager.getArticles(companyId);
      res.json(articles);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
