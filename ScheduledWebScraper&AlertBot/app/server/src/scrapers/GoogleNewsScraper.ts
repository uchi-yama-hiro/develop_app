import { BaseScraper } from "./BaseScraper.ts";
import type { ArticleLink } from "../../../shared/types/index.ts";
import type { RateLimiter } from "../utils/rateLimiter.ts";

/**
 * Google News スクレイパー
 * https://news.google.com/search?q={企業名}&hl=ja
 */
export class GoogleNewsScraper extends BaseScraper {
  constructor(rateLimiter?: RateLimiter) {
    super("google_news", rateLimiter);
  }

  protected buildSearchUrl(companyName: string): string {
    const query = encodeURIComponent(companyName);
    return `https://news.google.com/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;
  }

  protected parseArticleLinks(
    html: string,
    _companyName: string,
  ): ArticleLink[] {
    const $ = this.parseHtml(html);
    const links: ArticleLink[] = [];

    // Google News の記事リンクを取得
    $("article a[href]").each((_i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title) return;

      // Google News の相対リンクを絶対URLに変換
      const url = href.startsWith("./")
        ? `https://news.google.com${href.slice(1)}`
        : href;

      // 日付情報の取得（time 要素から）
      const timeEl = $(el).closest("article").find("time[datetime]");
      const publishedAt = timeEl.attr("datetime") || new Date().toISOString();

      links.push({ title, url, publishedAt });
    });

    return links;
  }
}
