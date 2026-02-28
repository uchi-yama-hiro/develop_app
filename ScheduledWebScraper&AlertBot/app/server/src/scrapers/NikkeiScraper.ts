import { BaseScraper } from "./BaseScraper.ts";
import type { ArticleLink } from "../../../shared/types/index.ts";
import type { RateLimiter } from "../utils/rateLimiter.ts";

/**
 * 日経電子版 スクレイパー
 * https://www.nikkei.com/search?keyword={企業名}
 */
export class NikkeiScraper extends BaseScraper {
  constructor(rateLimiter?: RateLimiter) {
    super("nikkei", rateLimiter);
  }

  protected buildSearchUrl(companyName: string): string {
    const query = encodeURIComponent(companyName);
    return `https://www.nikkei.com/search?keyword=${query}&volume=10`;
  }

  protected parseArticleLinks(
    html: string,
    _companyName: string,
  ): ArticleLink[] {
    const $ = this.parseHtml(html);
    const links: ArticleLink[] = [];

    // 日経電子版の記事リンクを取得
    $("a[href*='/article/']").each((_i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title || title.length < 5) return;

      const url = href.startsWith("http")
        ? href
        : `https://www.nikkei.com${href}`;

      // 日付情報の取得
      const dateEl = $(el)
        .closest("div, li, article")
        .find("time[datetime], span.date, .timestamp");
      const dateAttr = dateEl.attr("datetime") || dateEl.text().trim();
      const publishedAt = this.parseDate(dateAttr);

      links.push({ title, url, publishedAt });
    });

    return links;
  }

  private parseDate(dateStr: string): string {
    // ISO形式ならそのまま
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      return dateStr;
    }
    // "2026/2/28" や "2026年2月28日" 形式
    const match = dateStr.match(/(\d{4})[/年.-](\d{1,2})[/月.-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}T00:00:00Z`;
    }
    return new Date().toISOString();
  }
}
