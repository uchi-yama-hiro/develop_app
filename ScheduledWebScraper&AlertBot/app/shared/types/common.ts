/** スクレイピング対象サイト */
export type ScrapingSource =
  | "google_news"
  | "yahoo_finance"
  | "nikkei"
  | "yahoo_news";

/**
 * スクレイピングモード
 * - 'full':       検索結果上位5件の記事本文HTMLを取得・保存（通常モード）
 * - 'today_only': 検索結果ページのみ取得し、当日公開の記事メタデータのみ保存。
 */
export type ScrapeMode = "full" | "today_only";

/** 全スクレイピングソース一覧 */
export const ALL_SCRAPING_SOURCES: ScrapingSource[] = [
  "google_news",
  "yahoo_finance",
  "nikkei",
  "yahoo_news",
];

/** スクレイピングソースの表示名 */
export const SOURCE_LABELS: Record<ScrapingSource, string> = {
  google_news: "Google News",
  yahoo_finance: "Yahoo!ファイナンス",
  nikkei: "日経電子版",
  yahoo_news: "Yahoo!ニュース",
};
