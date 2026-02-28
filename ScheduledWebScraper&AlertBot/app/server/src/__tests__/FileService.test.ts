import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { FileService } from "../services/FileService.ts";

describe("FileService", () => {
  let fileService: FileService;
  let tempDir: string;

  beforeEach(async () => {
    fileService = new FileService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fileservice-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("readJson / writeJson", () => {
    it("JSONファイルを書き込み・読み込みできる", async () => {
      const filePath = path.join(tempDir, "test.json");
      const data = { name: "test", value: 42 };

      await fileService.writeJson(filePath, data);
      const result = await fileService.readJson<typeof data>(filePath);

      expect(result).toEqual(data);
    });

    it("存在しないファイルの読み込みは null を返す", async () => {
      const result = await fileService.readJson(
        path.join(tempDir, "nonexistent.json"),
      );
      expect(result).toBeNull();
    });

    it("アトミック書き込みが機能する（一時ファイル経由）", async () => {
      const filePath = path.join(tempDir, "atomic.json");
      await fileService.writeJson(filePath, { step: 1 });
      await fileService.writeJson(filePath, { step: 2 });

      const result = await fileService.readJson<{ step: number }>(filePath);
      expect(result?.step).toBe(2);

      // 一時ファイルが残っていないことを確認
      const tmpExists = await fileService.exists(`${filePath}.tmp`);
      expect(tmpExists).toBe(false);
    });
  });

  describe("saveHtml", () => {
    it("HTMLファイルを保存できる", async () => {
      const dir = path.join(tempDir, "articles", "company1");
      const filename = "article1.html";
      const content = "<html><body>テスト記事</body></html>";

      const savedPath = await fileService.saveHtml(dir, filename, content);

      expect(savedPath).toBe(path.join(dir, filename));
      const readContent = await fs.readFile(savedPath, "utf-8");
      expect(readContent).toBe(content);
    });

    it("存在しないディレクトリを自動作成する", async () => {
      const dir = path.join(tempDir, "deep", "nested", "dir");
      await fileService.saveHtml(dir, "test.html", "<html></html>");

      const exists = await fileService.exists(dir);
      expect(exists).toBe(true);
    });
  });

  describe("listHtmlFiles", () => {
    it("HTMLファイル一覧を取得できる", async () => {
      await fs.writeFile(path.join(tempDir, "a.html"), "");
      await fs.writeFile(path.join(tempDir, "b.html"), "");
      await fs.writeFile(path.join(tempDir, "c.txt"), "");

      const files = await fileService.listHtmlFiles(tempDir);
      expect(files).toHaveLength(2);
      expect(files).toContain("a.html");
      expect(files).toContain("b.html");
    });

    it("存在しないディレクトリでは空配列を返す", async () => {
      const files = await fileService.listHtmlFiles(
        path.join(tempDir, "nonexistent"),
      );
      expect(files).toEqual([]);
    });
  });

  describe("exists", () => {
    it("存在するファイルは true を返す", async () => {
      const filePath = path.join(tempDir, "exists.txt");
      await fs.writeFile(filePath, "");
      expect(await fileService.exists(filePath)).toBe(true);
    });

    it("存在しないファイルは false を返す", async () => {
      expect(await fileService.exists(path.join(tempDir, "no.txt"))).toBe(
        false,
      );
    });
  });

  describe("createBackup / restoreFromBackup", () => {
    it("バックアップを作成・復元できる", async () => {
      const filePath = path.join(tempDir, "config.json");
      await fileService.writeJson(filePath, { version: 1 });
      await fileService.createBackup(filePath);

      // 元ファイルを破壊
      await fs.writeFile(filePath, "invalid json");

      const restored = await fileService.restoreFromBackup<{ version: number }>(
        filePath,
      );
      expect(restored?.version).toBe(1);
    });
  });
});
