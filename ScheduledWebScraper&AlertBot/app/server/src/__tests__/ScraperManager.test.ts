import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ScraperManager } from "../services/ScraperManager.ts";
import { ConfigManager } from "../services/ConfigManager.ts";
import { BaseScraper } from "../scrapers/BaseScraper.ts";
import { RateLimiter } from "../utils/rateLimiter.ts";
import type {
  ScrapedArticle,
  ArticleLink,
  ScrapingSource,
  Company,
} from "../../../shared/types/index.ts";

/** テスト用モックスクレイパー */
class MockScraper extends BaseScraper {
  private mockArticles: ScrapedArticle[];

  constructor(source: ScrapingSource, articles: ScrapedArticle[]) {
    super(source, new RateLimiter(0));
    this.mockArticles = articles;
  }

  override async scrape(
    _companyName: string,
    _todayOnly: boolean = false,
  ): Promise<ScrapedArticle[]> {
    return this.mockArticles;
  }

  protected parseArticleLinks(
    _html: string,
    _companyName: string,
  ): ArticleLink[] {
    return [];
  }

  protected buildSearchUrl(_companyName: string): string {
    return "";
  }
}

/** テスト用エラースクレイパー */
class ErrorScraper extends BaseScraper {
  constructor(source: ScrapingSource) {
    super(source, new RateLimiter(0));
  }

  override async scrape(_companyName: string): Promise<ScrapedArticle[]> {
    throw new Error("Request timeout");
  }

  protected parseArticleLinks(
    _html: string,
    _companyName: string,
  ): ArticleLink[] {
    return [];
  }

  protected buildSearchUrl(_companyName: string): string {
    return "";
  }
}

describe("ScraperManager", () => {
  let tempDir: string;
  let configManager: ConfigManager;

  const testCompany: Company = {
    id: "test-company-id",
    name: "テスト企業",
    createdAt: "2026-02-28T10:00:00Z",
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "scraper-mgr-test-"));
    const configPath = path.join(tempDir, "config.json");
    const outputDir = path.join(tempDir, "output");
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({
        outputDir,
        scrapeMode: "today_only",
        companies: [testCompany],
        articles: [],
      }),
    );
    configManager = new ConfigManager(configPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("スクレイピング結果を集約して返す", async () => {
    const mockArticles: ScrapedArticle[] = [
      {
        title: "テスト記事1",
        url: "https://example.com/1",
        source: "google_news",
        publishedAt: "2026-02-28T09:00:00Z",
        htmlContent: "<html>記事1</html>",
      },
    ];

    const scrapers = new Map<ScrapingSource, BaseScraper>();
    scrapers.set("google_news", new MockScraper("google_news", mockArticles));

    const manager = new ScraperManager(configManager, scrapers);
    const result = await manager.scrapeCompany(
      testCompany,
      ["google_news"],
      "full",
    );

    expect(result.companyId).toBe("test-company-id");
    expect(result.companyName).toBe("テスト企業");
    expect(result.totalArticles).toBe(1);
    expect(result.newArticles).toBe(1);
    expect(result.skippedDuplicates).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("重複記事がスキップされる (TC-017)", async () => {
    // 既存記事を追加
    await configManager.addArticles([
      {
        id: "existing",
        companyId: "test-company-id",
        title: "既存記事",
        url: "https://example.com/existing",
        source: "google_news",
        publishedAt: "2026-02-27T09:00:00Z",
        scrapedAt: "2026-02-27T10:00:00Z",
        filePath: "",
      },
    ]);

    const mockArticles: ScrapedArticle[] = [
      {
        title: "既存記事",
        url: "https://example.com/existing", // 重複URL
        source: "google_news",
        publishedAt: "2026-02-27T09:00:00Z",
      },
      {
        title: "新規記事",
        url: "https://example.com/new",
        source: "google_news",
        publishedAt: "2026-02-28T09:00:00Z",
      },
    ];

    const scrapers = new Map<ScrapingSource, BaseScraper>();
    scrapers.set("google_news", new MockScraper("google_news", mockArticles));

    const manager = new ScraperManager(configManager, scrapers);
    const result = await manager.scrapeCompany(testCompany, ["google_news"]);

    expect(result.totalArticles).toBe(2);
    expect(result.newArticles).toBe(1);
    expect(result.skippedDuplicates).toBe(1);
  });

  it("1サイト失敗でも他サイトの結果が保存される (TC-016)", async () => {
    const mockArticles: ScrapedArticle[] = [
      {
        title: "正常記事",
        url: "https://example.com/ok",
        source: "yahoo_news",
        publishedAt: "2026-02-28T09:00:00Z",
      },
    ];

    const scrapers = new Map<ScrapingSource, BaseScraper>();
    scrapers.set("google_news", new ErrorScraper("google_news"));
    scrapers.set("yahoo_news", new MockScraper("yahoo_news", mockArticles));

    const manager = new ScraperManager(configManager, scrapers);
    const result = await manager.scrapeCompany(testCompany, [
      "google_news",
      "yahoo_news",
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.source).toBe("google_news");
    expect(result.newArticles).toBe(1);
  });

  it("HTMLファイルが正しいパスに保存される (TC-020)", async () => {
    const mockArticles: ScrapedArticle[] = [
      {
        title: "保存テスト記事",
        url: "https://example.com/save-test",
        source: "google_news",
        publishedAt: "2026-02-28T09:00:00Z",
        htmlContent: "<html><body>保存テスト</body></html>",
      },
    ];

    const scrapers = new Map<ScrapingSource, BaseScraper>();
    scrapers.set("google_news", new MockScraper("google_news", mockArticles));

    const manager = new ScraperManager(configManager, scrapers);
    await manager.scrapeCompany(testCompany, ["google_news"], "full");

    // 保存されたファイルを確認
    const articlesDir = path.join(
      tempDir,
      "output",
      "articles",
      "test-company-id",
    );
    const files = await fs.readdir(articlesDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.html$/);

    const content = await fs.readFile(
      path.join(articlesDir, files[0]!),
      "utf-8",
    );
    expect(content).toBe("<html><body>保存テスト</body></html>");
  });

  it("全企業一括スクレイピングが動作する", async () => {
    const mockArticles: ScrapedArticle[] = [
      {
        title: "一括テスト記事",
        url: "https://example.com/batch",
        source: "google_news",
        publishedAt: "2026-02-28T09:00:00Z",
      },
    ];

    const scrapers = new Map<ScrapingSource, BaseScraper>();
    scrapers.set("google_news", new MockScraper("google_news", mockArticles));

    const manager = new ScraperManager(configManager, scrapers);
    const results = await manager.scrapeAll([testCompany]);

    expect(results).toHaveLength(1);
    expect(results[0]!.companyName).toBe("テスト企業");
    expect(results[0]!.newArticles).toBe(1);
  });
});
