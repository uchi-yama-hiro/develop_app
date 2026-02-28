import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createApp } from "../app.ts";
import { ConfigManager } from "../services/ConfigManager.ts";
import type { Express } from "express";

describe("Companies API", () => {
  let app: Express;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-test-"));
    const configPath = path.join(tempDir, "config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        outputDir: "",
        scrapeMode: "today_only",
        companies: [],
        articles: [],
      }),
    );
    const configManager = new ConfigManager(configPath);
    app = createApp({ configManager });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("GET /api/companies", () => {
    it("空の企業一覧を返す", async () => {
      const res = await request(app).get("/api/companies");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/companies", () => {
    it("企業を登録できる", async () => {
      const res = await request(app)
        .post("/api/companies")
        .send({ name: "トヨタ自動車" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("トヨタ自動車");
      expect(res.body.id).toBeTruthy();
    });

    it("名前が空の場合400を返す", async () => {
      const res = await request(app).post("/api/companies").send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it("名前なしで400を返す", async () => {
      const res = await request(app).post("/api/companies").send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/companies/:id", () => {
    it("企業名を更新できる", async () => {
      const createRes = await request(app)
        .post("/api/companies")
        .send({ name: "テスト企業" });

      const res = await request(app)
        .put(`/api/companies/${createRes.body.id}`)
        .send({ name: "更新後企業" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("更新後企業");
    });

    it("存在しないIDで404を返す", async () => {
      const res = await request(app)
        .put("/api/companies/nonexistent-id")
        .send({ name: "テスト" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/companies/:id", () => {
    it("企業を削除できる", async () => {
      const createRes = await request(app)
        .post("/api/companies")
        .send({ name: "削除テスト" });

      const res = await request(app).delete(
        `/api/companies/${createRes.body.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 削除後の一覧確認
      const listRes = await request(app).get("/api/companies");
      expect(listRes.body).toHaveLength(0);
    });
  });
});

describe("Config API", () => {
  let app: Express;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-test-"));
    const configPath = path.join(tempDir, "config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        outputDir: "",
        scrapeMode: "today_only",
        companies: [],
        articles: [],
      }),
    );
    const configManager = new ConfigManager(configPath);
    app = createApp({ configManager });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("GET /api/config", () => {
    it("設定を返す", async () => {
      const res = await request(app).get("/api/config");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("outputDir");
      expect(res.body).toHaveProperty("scrapeMode");
    });
  });

  describe("PUT /api/config/output-dir", () => {
    it("保存先ディレクトリを変更できる", async () => {
      const outputDir = path.join(tempDir, "output");
      await fs.mkdir(outputDir, { recursive: true });

      const res = await request(app)
        .put("/api/config/output-dir")
        .send({ outputDir });

      expect(res.status).toBe(200);
      expect(res.body.outputDir).toBe(outputDir);
    });

    it("空文字列で400を返す", async () => {
      const res = await request(app)
        .put("/api/config/output-dir")
        .send({ outputDir: "" });

      expect(res.status).toBe(400);
    });

    it("存在しないパスで404を返す", async () => {
      const res = await request(app)
        .put("/api/config/output-dir")
        .send({ outputDir: "/nonexistent/path" });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/config/scrape-mode", () => {
    it("スクレイピングモードを変更できる", async () => {
      const res = await request(app)
        .put("/api/config/scrape-mode")
        .send({ mode: "full" });

      expect(res.status).toBe(200);
      expect(res.body.scrapeMode).toBe("full");
    });

    it("不正なモードで400を返す", async () => {
      const res = await request(app)
        .put("/api/config/scrape-mode")
        .send({ mode: "invalid" });

      expect(res.status).toBe(400);
    });
  });
});

describe("Articles API", () => {
  let app: Express;
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-test-"));
    const configPath = path.join(tempDir, "config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        outputDir: "",
        scrapeMode: "today_only",
        companies: [],
        articles: [],
      }),
    );
    configManager = new ConfigManager(configPath);
    app = createApp({ configManager });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("GET /api/articles", () => {
    it("空の記事一覧を返す", async () => {
      const res = await request(app).get("/api/articles");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("記事を取得できる", async () => {
      await configManager.addArticles([
        {
          id: "test-article",
          companyId: "test-company",
          title: "テスト記事",
          url: "https://example.com",
          source: "google_news",
          publishedAt: "2026-02-28T10:00:00Z",
          scrapedAt: "2026-02-28T10:30:00Z",
          filePath: "",
        },
      ]);

      const res = await request(app).get("/api/articles");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("テスト記事");
    });

    it("companyIdでフィルターできる", async () => {
      await configManager.addArticles([
        {
          id: "a1",
          companyId: "c1",
          title: "記事1",
          url: "https://example.com/1",
          source: "google_news",
          publishedAt: "2026-02-28T10:00:00Z",
          scrapedAt: "2026-02-28T10:30:00Z",
          filePath: "",
        },
        {
          id: "a2",
          companyId: "c2",
          title: "記事2",
          url: "https://example.com/2",
          source: "yahoo_news",
          publishedAt: "2026-02-28T10:00:00Z",
          scrapedAt: "2026-02-28T10:30:00Z",
          filePath: "",
        },
      ]);

      const res = await request(app).get("/api/articles?companyId=c1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].companyId).toBe("c1");
    });
  });
});
