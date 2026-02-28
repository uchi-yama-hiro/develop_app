import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  Company,
  Article,
  ScrapedArticle,
  ScrapeResult,
  ScrapeError,
  ScrapingSource,
  ScrapeMode,
} from "../../../shared/types/index.ts";
import { ALL_SCRAPING_SOURCES } from "../../../shared/types/index.ts";
import { BaseScraper } from "../scrapers/BaseScraper.ts";
import { GoogleNewsScraper } from "../scrapers/GoogleNewsScraper.ts";
import { YahooFinanceScraper } from "../scrapers/YahooFinanceScraper.ts";
import { NikkeiScraper } from "../scrapers/NikkeiScraper.ts";
import { YahooNewsScraper } from "../scrapers/YahooNewsScraper.ts";
import { FileService } from "./FileService.ts";
import { ConfigManager } from "./ConfigManager.ts";
import { RateLimiter } from "../utils/rateLimiter.ts";

/** 最大並行サイト数 */
const MAX_CONCURRENT_SITES = 4;

/**
 * スクレイピング全体の制御を行うマネージャ
 * - 対象サイトの振り分け
 * - 並行制御（サイト間は並行、同一サイト内は直列）
 * - 結果の保存
 */
export class ScraperManager {
  private scrapers: Map<ScrapingSource, BaseScraper>;
  private fileService: FileService;
  private configManager: ConfigManager;

  constructor(
    configManager: ConfigManager,
    scrapers?: Map<ScrapingSource, BaseScraper>,
  ) {
    this.configManager = configManager;
    this.fileService = new FileService();

    if (scrapers) {
      this.scrapers = scrapers;
    } else {
      // サイトごとに個別の RateLimiter を生成
      this.scrapers = new Map<ScrapingSource, BaseScraper>();
      this.scrapers.set(
        "google_news",
        new GoogleNewsScraper(new RateLimiter()),
      );
      this.scrapers.set(
        "yahoo_finance",
        new YahooFinanceScraper(new RateLimiter()),
      );
      this.scrapers.set("nikkei", new NikkeiScraper(new RateLimiter()));
      this.scrapers.set("yahoo_news", new YahooNewsScraper(new RateLimiter()));
    }
  }

  /**
   * 単一企業のスクレイピングを実行する
   */
  async scrapeCompany(
    company: Company,
    sources?: ScrapingSource[],
    mode?: ScrapeMode,
  ): Promise<ScrapeResult> {
    const config = await this.configManager.getConfig();
    const scrapeMode = mode ?? config.scrapeMode;
    const todayOnly = scrapeMode === "today_only";
    const targetSources = sources ?? ALL_SCRAPING_SOURCES;

    const errors: ScrapeError[] = [];
    const allScrapedArticles: ScrapedArticle[] = [];

    // サイト間は並行実行（最大 MAX_CONCURRENT_SITES）
    const scrapePromises = targetSources
      .filter((s) => this.scrapers.has(s))
      .slice(0, MAX_CONCURRENT_SITES)
      .map(async (source) => {
        const scraper = this.scrapers.get(source)!;
        try {
          const articles = await scraper.scrape(company.name, todayOnly);
          return { source, articles, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[ScraperManager] ${source} エラー:`, message);
          return {
            source,
            articles: [] as ScrapedArticle[],
            error: { source, message } as ScrapeError,
          };
        }
      });

    const results = await Promise.all(scrapePromises);

    for (const result of results) {
      if (result.error) {
        errors.push(result.error);
      }
      allScrapedArticles.push(...result.articles);
    }

    // 重複チェック & 保存
    const existingArticles = await this.configManager.getArticles(company.id);
    const existingUrls = new Set(existingArticles.map((a) => a.url));

    const newScrapedArticles = allScrapedArticles.filter(
      (sa) => !existingUrls.has(sa.url),
    );
    const skippedDuplicates =
      allScrapedArticles.length - newScrapedArticles.length;

    // 記事メタデータの生成 & HTML保存
    const newArticles = await this.saveArticles(
      company,
      newScrapedArticles,
      config.outputDir,
    );

    if (newArticles.length > 0) {
      await this.configManager.addArticles(newArticles);
    }

    return {
      companyId: company.id,
      companyName: company.name,
      totalArticles: allScrapedArticles.length,
      newArticles: newArticles.length,
      skippedDuplicates,
      errors,
    };
  }

  /**
   * 全企業を対象に一括スクレイピングを実行する
   */
  async scrapeAll(
    companies: Company[],
    mode?: ScrapeMode,
  ): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];

    // 企業は直列実行（各企業内でサイト並行）
    for (const company of companies) {
      try {
        const result = await this.scrapeCompany(company, undefined, mode);
        results.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[ScraperManager] ${company.name} 全体エラー:`, message);
        results.push({
          companyId: company.id,
          companyName: company.name,
          totalArticles: 0,
          newArticles: 0,
          skippedDuplicates: 0,
          errors: ALL_SCRAPING_SOURCES.map((source) => ({
            source,
            message,
          })),
        });
      }
    }

    return results;
  }

  /**
   * スクレイピング結果を保存し、Article メタデータを生成する
   */
  private async saveArticles(
    company: Company,
    scrapedArticles: ScrapedArticle[],
    outputDir: string,
  ): Promise<Article[]> {
    const articles: Article[] = [];
    const now = new Date().toISOString();

    for (const scraped of scrapedArticles) {
      const articleId = uuidv4();
      let filePath = "";

      // htmlContent がある場合（full モード）のみ保存
      if (scraped.htmlContent && outputDir) {
        const dir = path.join(outputDir, "articles", company.id);
        const filename = `${articleId}.html`;
        await this.fileService.saveHtml(dir, filename, scraped.htmlContent);
        filePath = path.join("articles", company.id, filename);
      }

      articles.push({
        id: articleId,
        companyId: company.id,
        title: scraped.title,
        url: scraped.url,
        source: scraped.source,
        publishedAt: scraped.publishedAt,
        scrapedAt: now,
        filePath,
      });
    }

    return articles;
  }
}
