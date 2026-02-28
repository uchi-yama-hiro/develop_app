import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ConfigManager, ValidationError } from "../services/ConfigManager.ts";

function createCleanConfig(): string {
  return JSON.stringify({
    outputDir: "",
    scrapeMode: "today_only",
    companies: [],
    articles: [],
  });
}

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "configmgr-test-"));
    configPath = path.join(tempDir, "config.json");
    // 明示的にクリーンな設定ファイルを書き込む
    await fs.writeFile(configPath, createCleanConfig(), "utf-8");
    configManager = new ConfigManager(configPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getConfig", () => {
    it("config.json が存在しない場合はデフォルト設定を返す", async () => {
      // 事前にファイルを削除
      await fs.unlink(configPath);
      const config = await configManager.getConfig();
      expect(config.outputDir).toBe("");
      expect(config.scrapeMode).toBe("today_only");
      expect(config.companies).toEqual([]);
      expect(config.articles).toEqual([]);
    });

    it("config.json が破損している場合はデフォルト設定で初期化する", async () => {
      await fs.writeFile(configPath, "invalid json {{{");
      const config = await configManager.getConfig();
      expect(config.companies).toEqual([]);
    });
  });

  describe("企業管理", () => {
    it("企業を登録できる (TC-001)", async () => {
      const company = await configManager.addCompany("トヨタ自動車");

      expect(company.name).toBe("トヨタ自動車");
      expect(company.id).toBeTruthy();
      expect(company.createdAt).toBeTruthy();

      // config.json に保存されている
      const companies = await configManager.getCompanies();
      expect(companies).toHaveLength(1);
      expect(companies[0]!.name).toBe("トヨタ自動車");
    });

    it("企業名を編集できる (TC-002)", async () => {
      const company = await configManager.addCompany("トヨタ");
      const updated = await configManager.updateCompany(
        company.id,
        "トヨタ自動車",
      );

      expect(updated.name).toBe("トヨタ自動車");
      expect(updated.id).toBe(company.id);

      const companies = await configManager.getCompanies();
      expect(companies[0]!.name).toBe("トヨタ自動車");
    });

    it("企業を削除できる (TC-003)", async () => {
      const company = await configManager.addCompany("トヨタ自動車");
      await configManager.deleteCompany(company.id);

      const companies = await configManager.getCompanies();
      expect(companies).toHaveLength(0);
    });

    it("企業名が空の場合に400エラー (TC-004)", async () => {
      await expect(configManager.addCompany("")).rejects.toThrow(
        ValidationError,
      );
      await expect(configManager.addCompany("   ")).rejects.toThrow(
        ValidationError,
      );

      try {
        await configManager.addCompany("");
      } catch (e) {
        expect((e as ValidationError).statusCode).toBe(400);
      }
    });

    it("30社登録済みの場合に409エラー (TC-005)", async () => {
      for (let i = 0; i < 30; i++) {
        await configManager.addCompany(`企業_TC005_${i}`);
      }

      await expect(configManager.addCompany("企業_TC005_追加")).rejects.toThrow(
        ValidationError,
      );

      try {
        await configManager.addCompany("企業_TC005_追加2");
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).statusCode).toBe(409);
      }
    });

    it("同名企業の登録時に409エラー (TC-006)", async () => {
      await configManager.addCompany("テスト企業_TC006");

      await expect(
        configManager.addCompany("テスト企業_TC006"),
      ).rejects.toThrow(ValidationError);

      try {
        await configManager.addCompany("テスト企業_TC006");
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).statusCode).toBe(409);
      }
    });

    it("企業一覧を取得できる (TC-007)", async () => {
      await configManager.addCompany("テスト企業A");
      await configManager.addCompany("テスト企業B");

      const companies = await configManager.getCompanies();
      expect(companies).toHaveLength(2);
      expect(companies.map((c) => c.name)).toContain("テスト企業A");
      expect(companies.map((c) => c.name)).toContain("テスト企業B");
    });

    it("企業を削除すると関連する記事も削除される", async () => {
      const company = await configManager.addCompany("削除テスト企業");
      await configManager.addArticles([
        {
          id: "article-1",
          companyId: company.id,
          title: "テスト記事",
          url: "https://example.com",
          source: "google_news",
          publishedAt: "2026-02-28T10:00:00Z",
          scrapedAt: "2026-02-28T10:30:00Z",
          filePath: "",
        },
      ]);

      await configManager.deleteCompany(company.id);
      const articles = await configManager.getArticles();
      expect(articles).toHaveLength(0);
    });
  });

  describe("保存先ディレクトリ", () => {
    it("保存先ディレクトリを変更できる (TC-024)", async () => {
      const outputDir = path.join(tempDir, "output");
      await fs.mkdir(outputDir, { recursive: true });

      await configManager.setOutputDir(outputDir);

      const result = await configManager.getOutputDir();
      expect(result).toBe(outputDir);
    });

    it("空文字列で400エラーを返す", async () => {
      try {
        await configManager.setOutputDir("");
      } catch (e) {
        expect((e as ValidationError).statusCode).toBe(400);
      }
    });

    it("相対パスで400エラーを返す", async () => {
      try {
        await configManager.setOutputDir("relative/path");
      } catch (e) {
        expect((e as ValidationError).statusCode).toBe(400);
      }
    });

    it("存在しないディレクトリで404エラーを返す", async () => {
      try {
        await configManager.setOutputDir("/nonexistent/path");
      } catch (e) {
        expect((e as ValidationError).statusCode).toBe(404);
      }
    });
  });

  describe("スクレイピングモード", () => {
    it("スクレイピングモードを変更できる", async () => {
      await configManager.setScrapeMode("full");
      const mode = await configManager.getScrapeMode();
      expect(mode).toBe("full");
    });
  });

  describe("記事管理", () => {
    it("記事を追加し日付降順で取得できる (TC-030)", async () => {
      await configManager.addArticles([
        {
          id: "a1",
          companyId: "c1",
          title: "古い記事",
          url: "https://example.com/1",
          source: "google_news",
          publishedAt: "2026-02-27T09:00:00Z",
          scrapedAt: "2026-02-28T10:00:00Z",
          filePath: "",
        },
        {
          id: "a2",
          companyId: "c1",
          title: "新しい記事",
          url: "https://example.com/2",
          source: "yahoo_news",
          publishedAt: "2026-02-28T09:00:00Z",
          scrapedAt: "2026-02-28T10:00:00Z",
          filePath: "",
        },
      ]);

      const articles = await configManager.getArticles();
      expect(articles).toHaveLength(2);
      expect(articles[0]!.title).toBe("新しい記事");
      expect(articles[1]!.title).toBe("古い記事");
    });

    it("企業IDでフィルターできる (TC-031)", async () => {
      await configManager.addArticles([
        {
          id: "a1",
          companyId: "c1",
          title: "企業1の記事",
          url: "https://example.com/1",
          source: "google_news",
          publishedAt: "2026-02-28T09:00:00Z",
          scrapedAt: "2026-02-28T10:00:00Z",
          filePath: "",
        },
        {
          id: "a2",
          companyId: "c2",
          title: "企業2の記事",
          url: "https://example.com/2",
          source: "yahoo_news",
          publishedAt: "2026-02-28T09:00:00Z",
          scrapedAt: "2026-02-28T10:00:00Z",
          filePath: "",
        },
      ]);

      const articles = await configManager.getArticles("c1");
      expect(articles).toHaveLength(1);
      expect(articles[0]!.companyId).toBe("c1");
    });

    it("記事が0件の場合に空配列が返る (TC-032)", async () => {
      const articles = await configManager.getArticles();
      expect(articles).toEqual([]);
    });
  });
});
