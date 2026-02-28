import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  AppConfig,
  Company,
  Article,
  ScrapeMode,
} from "../../../shared/types/index.ts";
import { MAX_COMPANIES } from "../../../shared/types/index.ts";
import { FileService } from "./FileService.ts";

/** デフォルトの設定値 */
const DEFAULT_CONFIG: AppConfig = {
  outputDir: "",
  scrapeMode: "today_only",
  companies: [],
  articles: [],
};

/**
 * 企業設定（config.json）の読み書きを管理するサービス
 */
export class ConfigManager {
  private fileService: FileService;
  private configPath: string;

  constructor(configPath?: string) {
    this.fileService = new FileService();
    this.configPath = configPath ?? path.resolve(process.cwd(), "config.json");
  }

  /**
   * 現在の設定を取得する
   * config.json が存在しない場合はデフォルト設定を返す
   */
  async getConfig(): Promise<AppConfig> {
    try {
      const config = await this.fileService.readJson<AppConfig>(
        this.configPath,
      );
      if (config) {
        return { ...DEFAULT_CONFIG, ...config };
      }
    } catch {
      // JSONパースエラー等 → バックアップから復元を試行
      console.error(
        "[ConfigManager] config.json の読み込みに失敗。バックアップから復元を試行します",
      );
      const backup = await this.fileService.restoreFromBackup<AppConfig>(
        this.configPath,
      );
      if (backup) {
        await this.saveConfig(backup);
        return { ...DEFAULT_CONFIG, ...backup };
      }
      console.error(
        "[ConfigManager] バックアップからの復元に失敗。デフォルト設定で初期化します",
      );
    }

    // 新規作成
    await this.saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 企業一覧を取得する
   */
  async getCompanies(): Promise<Company[]> {
    const config = await this.getConfig();
    return config.companies;
  }

  /**
   * 企業を登録する
   * @throws Error 名前が空、上限超過、重複名の場合
   */
  async addCompany(name: string): Promise<Company> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError("Company name is required", 400);
    }

    const config = await this.getConfig();

    if (config.companies.length >= MAX_COMPANIES) {
      throw new ValidationError(
        `Maximum number of companies (${MAX_COMPANIES}) reached`,
        409,
      );
    }

    if (config.companies.some((c) => c.name === trimmed)) {
      throw new ValidationError("同じ企業名が既に登録されています", 409);
    }

    const company: Company = {
      id: uuidv4(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    config.companies.push(company);
    await this.saveConfig(config);
    return company;
  }

  /**
   * 企業名を更新する
   */
  async updateCompany(id: string, name: string): Promise<Company> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError("Company name is required", 400);
    }

    const config = await this.getConfig();
    const company = config.companies.find((c) => c.id === id);
    if (!company) {
      throw new ValidationError("Company not found", 404);
    }

    if (config.companies.some((c) => c.id !== id && c.name === trimmed)) {
      throw new ValidationError("同じ企業名が既に登録されています", 409);
    }

    company.name = trimmed;
    await this.saveConfig(config);
    return company;
  }

  /**
   * 企業を削除する
   */
  async deleteCompany(id: string): Promise<void> {
    const config = await this.getConfig();
    const index = config.companies.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new ValidationError("Company not found", 404);
    }

    config.companies.splice(index, 1);
    // 関連する記事も削除
    config.articles = config.articles.filter((a) => a.companyId !== id);
    await this.saveConfig(config);
  }

  /**
   * 保存先ディレクトリを取得する
   */
  async getOutputDir(): Promise<string> {
    const config = await this.getConfig();
    return config.outputDir;
  }

  /**
   * 保存先ディレクトリを設定する
   */
  async setOutputDir(dir: string): Promise<void> {
    if (!dir) {
      throw new ValidationError("outputDir is required", 400);
    }
    if (!path.isAbsolute(dir)) {
      throw new ValidationError("outputDir must be an absolute path", 400);
    }
    if (!(await this.fileService.exists(dir))) {
      throw new ValidationError(`Directory does not exist: ${dir}`, 404);
    }
    if (!(await this.fileService.isWritable(dir))) {
      throw new ValidationError(
        `No write permission for directory: ${dir}`,
        403,
      );
    }

    const config = await this.getConfig();
    config.outputDir = dir;
    await this.saveConfig(config);
  }

  /**
   * スクレイピングモードを取得する
   */
  async getScrapeMode(): Promise<ScrapeMode> {
    const config = await this.getConfig();
    return config.scrapeMode;
  }

  /**
   * スクレイピングモードを設定する
   */
  async setScrapeMode(mode: ScrapeMode): Promise<void> {
    if (mode !== "full" && mode !== "today_only") {
      throw new ValidationError(
        "Invalid mode. Allowed values: full, today_only",
        400,
      );
    }

    const config = await this.getConfig();
    config.scrapeMode = mode;
    await this.saveConfig(config);
  }

  /**
   * 記事メタデータを追加する
   */
  async addArticles(articles: Article[]): Promise<void> {
    const config = await this.getConfig();
    config.articles.push(...articles);
    await this.saveConfig(config);
  }

  /**
   * 記事一覧を取得する（publishedAt 降順）
   */
  async getArticles(companyId?: string): Promise<Article[]> {
    const config = await this.getConfig();
    let articles = config.articles;

    if (companyId) {
      articles = articles.filter((a) => a.companyId === companyId);
    }

    // publishedAt 降順ソート
    articles.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // missing フラグの付与（filePath が空でないもののみチェック）
    const outputDir = config.outputDir;
    if (outputDir) {
      for (const article of articles) {
        if (article.filePath) {
          const fullPath = path.join(outputDir, article.filePath);
          article.missing = !(await this.fileService.exists(fullPath));
        }
      }
    }

    return articles;
  }

  /**
   * 設定をファイルに保存する（バックアップ付き）
   */
  private async saveConfig(config: AppConfig): Promise<void> {
    // 既存ファイルのバックアップ
    if (await this.fileService.exists(this.configPath)) {
      await this.fileService.createBackup(this.configPath);
    }
    await this.fileService.writeJson(this.configPath, config);
  }
}

/**
 * バリデーションエラー（HTTPステータスコード付き）
 */
export class ValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}
