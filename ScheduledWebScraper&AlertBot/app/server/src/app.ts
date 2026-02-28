import express from "express";
import cors from "cors";
import { createCompaniesRouter } from "./routes/companies.js";
import { createConfigRouter } from "./routes/config.js";
import { createScrapeRouter } from "./routes/scrape.js";
import { createArticlesRouter } from "./routes/articles.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ConfigManager } from "./services/ConfigManager.js";

export interface AppDependencies {
  configManager?: ConfigManager;
}

export function createApp(deps: AppDependencies = {}) {
  const configManager = deps.configManager ?? new ConfigManager();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use("/api/companies", createCompaniesRouter(configManager));
  app.use("/api/config", createConfigRouter(configManager));
  app.use("/api/scrape", createScrapeRouter(configManager));
  app.use("/api/articles", createArticlesRouter(configManager));

  // Error handling middleware
  app.use(errorHandler);

  return app;
}
