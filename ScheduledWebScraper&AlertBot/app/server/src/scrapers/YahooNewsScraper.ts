import { BaseScraper } from "./BaseScraper.ts";
import type { ArticleLink } from "../../../shared/types/index.ts";
import type { RateLimiter } from "../utils/rateLimiter.ts";

/**
 * Yahoo!ニュース スクレイパー
 * https://news.yahoo.co.jp/search?p={企業名}
 */
export class YahooNewsScraper extends BaseScraper {
  constructor(rateLimiter?: RateLimiter) {
    super("yahoo_news", rateLimiter);
  }

  protected buildSearchUrl(companyName: string): string {
    const query = encodeURIComponent(companyName);
    return `https://news.yahoo.co.jp/search?p=${query}`;
  }

  protected parseArticleLinks(
    html: string,
    _companyName: string,
  ): ArticleLink[] {
    const $ = this.parseHtml(html);
    const links: ArticleLink[] = [];

    // Yahoo!ニュースの記事リンクを取得
    $("a[href*='news.yahoo.co.jp']").each((_i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title || title.length < 5) return;
      // フィルター: 記事詳細ページのリンクのみ
      if (!href.includes("/articles/") && !href.includes("/pickup/")) return;

      const url = href.startsWith("http")
        ? href
        : `https://news.yahoo.co.jp${href}`;

      // 日付情報の取得
      const parent = $(el).closest("div, li, article, section");
      const timeEl = parent.find("time[datetime]");
      const dateSpan = parent.find("span").filter((_i, s) => {
        const text = $(s).text();
        return /\d{1,2}\/\d{1,2}|月|日/.test(text);
      });

      let publishedAt: string;
      if (timeEl.length > 0) {
        publishedAt = timeEl.attr("datetime") || new Date().toISOString();
      } else if (dateSpan.length > 0) {
        publishedAt = this.parseDateText(dateSpan.first().text().trim());
      } else {
        publishedAt = new Date().toISOString();
      }

      links.push({ title, url, publishedAt });
    });

    return links;
  }

  private parseDateText(dateText: string): string {
    const match = dateText.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}T00:00:00Z`;
    }
    // "2/28(金)" のような形式
    const shortMatch = dateText.match(/(\d{1,2})[/月](\d{1,2})/);
    if (shortMatch) {
      const year = new Date().getFullYear();
      const [, month, day] = shortMatch;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}T00:00:00Z`;
    }
    return new Date().toISOString();
  }
}
