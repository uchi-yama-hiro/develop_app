import type { Company } from "./company.ts";
import type { Article } from "./article.ts";
import type { ScrapingSource, ScrapeMode } from "./common.ts";

/** アプリケーション設定（config.json の構造） */
export interface AppConfig {
  /** 記事保存先ディレクトリの絶対パス */
  outputDir: string;
  /** スクレイピングモード (デフォルト: 'today_only') */
  scrapeMode: ScrapeMode;
  /** 登録企業一覧 */
  companies: Company[];
  /** 収集済み記事メタデータ */
  articles: Article[];
}

/** スクレイピング実行結果 */
export interface ScrapeResult {
  companyId: string;
  companyName: string;
  /** 取得記事数 */
  totalArticles: number;
  /** 新規保存件数 */
  newArticles: number;
  /** 重複スキップ数 */
  skippedDuplicates: number;
  /** サイト別エラー */
  errors: ScrapeError[];
}

/** サイト別エラー */
export interface ScrapeError {
  source: ScrapingSource;
  message: string;
  statusCode?: number;
}

// --- API リクエスト/レスポンス型 ---

/** POST /api/companies リクエスト */
export interface AddCompanyRequest {
  name: string;
}

/** PUT /api/companies/:id リクエスト */
export interface UpdateCompanyRequest {
  name: string;
}

/** POST /api/scrape リクエスト */
export interface ScrapeRequest {
  companyId: string;
  mode?: ScrapeMode;
}

/** POST /api/scrape/all リクエスト */
export interface ScrapeAllRequest {
  mode?: ScrapeMode;
}

/** PUT /api/config/output-dir リクエスト */
export interface SetOutputDirRequest {
  outputDir: string;
}

/** PUT /api/config/scrape-mode リクエスト */
export interface SetScrapeModeRequest {
  mode: ScrapeMode;
}

/** GET /api/config レスポンス */
export interface ConfigResponse {
  outputDir: string;
  scrapeMode: ScrapeMode;
}

/** API エラーレスポンス */
export interface ApiErrorResponse {
  error: string;
  code?: string;
}
