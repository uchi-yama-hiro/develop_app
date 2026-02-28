import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapingSource } from "../../../shared/types/index.ts";
import type {
  ScrapedArticle,
  ArticleLink,
} from "../../../shared/types/index.ts";
import { RateLimiter } from "../utils/rateLimiter.ts";

/** HTTP リクエストのタイムアウト（ミリ秒） */
const REQUEST_TIMEOUT = 10_000;

/** リトライ前の待機時間（ミリ秒） */
const RETRY_DELAY = 3_000;

/** 取得記事上限数 */
const MAX_ARTICLES_PER_SOURCE = 5;

/** User-Agent */
const USER_AGENT = "StockNewsScraper/0.1.0";

/**
 * スクレイパーの共通基底クラス
 * サイトごとに parseArticleLinks と buildSearchUrl を実装する
 */
export abstract class BaseScraper {
  readonly source: ScrapingSource;
  protected rateLimiter: RateLimiter;

  constructor(source: ScrapingSource, rateLimiter?: RateLimiter) {
    this.source = source;
    this.rateLimiter = rateLimiter ?? new RateLimiter();
  }

  /**
   * 企業名で検索し、記事を取得する
   * @param companyName 企業名
   * @param todayOnly true の場合、当日公開記事のみ（htmlContent なし）
   */
  async scrape(
    companyName: string,
    todayOnly: boolean = false,
  ): Promise<ScrapedArticle[]> {
    const searchUrl = this.buildSearchUrl(companyName);
    const searchHtml = await this.fetchPage(searchUrl);

    // E-S003: パースエラー — ログ記録してスキップ
    let articleLinks: ArticleLink[];
    try {
      articleLinks = this.parseArticleLinks(searchHtml, companyName);
    } catch (err) {
      console.error(`[${this.source}] パースエラー:`, err);
      throw new Error(`${this.source}: ページ構造の解析に失敗しました`);
    }

    if (todayOnly) {
      // 当日公開の記事のみフィルター
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      articleLinks = articleLinks.filter(
        (link) => link.publishedAt.slice(0, 10) === today,
      );

      // today_only モードでは htmlContent を取得しない
      return articleLinks.map((link) => ({
        title: link.title,
        url: link.url,
        source: this.source,
        publishedAt: link.publishedAt,
        htmlContent: undefined,
      }));
    }

    // full モード: 上位5件の記事本文を取得
    const limitedLinks = articleLinks.slice(0, MAX_ARTICLES_PER_SOURCE);
    const results: ScrapedArticle[] = [];

    for (const link of limitedLinks) {
      try {
        const htmlContent = await this.fetchArticleContent(link.url);
        results.push({
          title: link.title,
          url: link.url,
          source: this.source,
          publishedAt: link.publishedAt,
          htmlContent: htmlContent ?? undefined,
        });
      } catch (err) {
        console.error(`[${this.source}] 記事取得エラー: ${link.url}`, err);
        // 個別記事のエラーは記録して続行
        results.push({
          title: link.title,
          url: link.url,
          source: this.source,
          publishedAt: link.publishedAt,
          htmlContent: undefined,
        });
      }
    }

    return results;
  }

  /**
   * ページを取得する（リトライ1回付き）
   * エラー時は具体的なメッセージ付きで throw する
   */
  protected async fetchPage(url: string): Promise<string> {
    await this.rateLimiter.wait();

    try {
      const response = await axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": USER_AGENT },
        responseType: "text",
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // E-S005: 403 アクセス拒否 — リトライせずスキップ
        if (err.response?.status === 403) {
          console.error(
            `[${this.source}] アクセス拒否 (403)。レート制限の可能性: ${url}`,
          );
          throw new Error(`${this.source}: アクセスが拒否されました`);
        }

        // E-S002: タイムアウト — 3秒待機後に1回リトライ
        if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
          console.warn(
            `[${this.source}] タイムアウト。${RETRY_DELAY}ms後にリトライ: ${url}`,
          );
          await new Promise<void>((resolve) =>
            setTimeout(resolve, RETRY_DELAY),
          );
          await this.rateLimiter.wait();

          try {
            const response = await axios.get<string>(url, {
              timeout: REQUEST_TIMEOUT,
              headers: { "User-Agent": USER_AGENT },
              responseType: "text",
            });
            return response.data;
          } catch {
            console.error(`[${this.source}] リトライ失敗: ${url}`);
            throw new Error(`${this.source}: リクエストがタイムアウトしました`);
          }
        }

        // E-S001: HTTP エラー（ステータスコード付き）
        if (err.response) {
          console.error(
            `[${this.source}] HTTP ${err.response.status} エラー: ${url}`,
          );
          throw new Error(`${this.source}: HTTP ${err.response.status} エラー`);
        }
      }

      console.error(`[${this.source}] フェッチエラー: ${url}`, err);
      throw new Error(`${this.source}: ページの取得に失敗しました`);
    }
  }

  /**
   * 記事本文を取得する
   * 個別記事の取得失敗は null を返す（部分的成功を許容）
   */
  protected async fetchArticleContent(url: string): Promise<string | null> {
    try {
      return await this.fetchPage(url);
    } catch {
      return null;
    }
  }

  /**
   * HTMLをパースしてCheerio APIを返す
   */
  protected parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  /**
   * 検索結果HTMLから記事リンクを抽出する（サイト別実装）
   */
  protected abstract parseArticleLinks(
    html: string,
    companyName: string,
  ): ArticleLink[];

  /**
   * 検索URLを生成する（サイト別実装）
   */
  protected abstract buildSearchUrl(companyName: string): string;
}
