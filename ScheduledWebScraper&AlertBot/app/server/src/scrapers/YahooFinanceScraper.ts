import { BaseScraper } from "./BaseScraper.ts";
import type { ArticleLink } from "../../../shared/types/index.ts";
import type { RateLimiter } from "../utils/rateLimiter.ts";

/**
 * Yahoo!ファイナンス スクレイパー
 * https://finance.yahoo.co.jp/search/?query={企業名}
 */
export class YahooFinanceScraper extends BaseScraper {
  constructor(rateLimiter?: RateLimiter) {
    super("yahoo_finance", rateLimiter);
  }

  protected buildSearchUrl(companyName: string): string {
    const query = encodeURIComponent(companyName);
    return `https://finance.yahoo.co.jp/search/?query=${query}`;
  }

  protected parseArticleLinks(
    html: string,
    _companyName: string,
  ): ArticleLink[] {
    const $ = this.parseHtml(html);
    const links: ArticleLink[] = [];

    // Yahoo!ファイナンスのニュース記事リンクを取得
    $("a[href*='finance.yahoo.co.jp/news']").each((_i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title || title.length < 5) return;

      const url = href.startsWith("http")
        ? href
        : `https://finance.yahoo.co.jp${href}`;

      // 日付の取得
      const dateText = $(el)
        .parent()
        .find("time, span.date, .dtl")
        .text()
        .trim();
      const publishedAt = this.parseDateText(dateText);

      links.push({ title, url, publishedAt });
    });

    return links;
  }

  private parseDateText(dateText: string): string {
    // "2026/02/28 10:00" のような形式をISO形式に変換
    const match = dateText.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}T00:00:00Z`;
    }
    return new Date().toISOString();
  }
}
