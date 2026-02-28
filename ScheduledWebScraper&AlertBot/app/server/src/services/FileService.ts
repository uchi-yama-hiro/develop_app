import fs from "node:fs/promises";
import path from "node:path";

/**
 * ファイルシステムへの読み書きを抽象化するサービス
 */
export class FileService {
  /**
   * JSONファイルを読み込んでパースする
   * ファイルが存在しない場合は null を返す
   */
  async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch (err) {
      if (this.isNodeError(err) && err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * データをJSONファイルにアトミックに書き込む
   * 一時ファイルに書き込み後、リネームで上書き
   */
  async writeJson(filePath: string, data: unknown): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);

    const tempPath = `${filePath}.tmp`;
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, filePath);
  }

  /**
   * HTMLファイルを保存する
   * @returns 保存先の相対パス（outputDirからの相対）
   */
  async saveHtml(
    dir: string,
    filename: string,
    content: string,
  ): Promise<string> {
    await this.ensureDir(dir);
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content, "utf-8");
    return filePath;
  }

  /**
   * 指定ディレクトリ内のHTMLファイルを列挙する
   */
  async listHtmlFiles(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile() && e.name.endsWith(".html"))
        .map((e) => e.name);
    } catch (err) {
      if (this.isNodeError(err) && err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  /**
   * ディレクトリを再帰的に作成する
   */
  async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * ファイルまたはディレクトリが存在するか確認する
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ディレクトリへの書き込み権限があるか確認する
   */
  async isWritable(dir: string): Promise<boolean> {
    try {
      await fs.access(dir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * バックアップファイルを作成する
   */
  async createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.bak`;
    try {
      await fs.copyFile(filePath, backupPath);
    } catch {
      // バックアップ失敗は無視（元ファイルが存在しない場合など）
    }
  }

  /**
   * バックアップからの復元を試みる
   */
  async restoreFromBackup<T>(filePath: string): Promise<T | null> {
    const backupPath = `${filePath}.bak`;
    return this.readJson<T>(backupPath);
  }

  private isNodeError(err: unknown): err is NodeJS.ErrnoException {
    return err instanceof Error && "code" in err;
  }
}
