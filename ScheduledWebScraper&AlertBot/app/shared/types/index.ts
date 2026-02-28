export type { Company } from "./company.ts";
export { MAX_COMPANIES } from "./company.ts";

export type { Article, ScrapedArticle, ArticleLink } from "./article.ts";

export type { ScrapingSource, ScrapeMode } from "./common.ts";
export { ALL_SCRAPING_SOURCES, SOURCE_LABELS } from "./common.ts";

export type {
  AppConfig,
  ScrapeResult,
  ScrapeError,
  AddCompanyRequest,
  UpdateCompanyRequest,
  ScrapeRequest,
  ScrapeAllRequest,
  SetOutputDirRequest,
  SetScrapeModeRequest,
  ConfigResponse,
  ApiErrorResponse,
} from "./api.ts";
