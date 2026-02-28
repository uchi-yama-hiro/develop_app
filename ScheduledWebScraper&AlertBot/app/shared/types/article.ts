import type { ScrapingSource } from "./common.ts";

/** 収集記事（メタデータ。保存後に生成） */
export interface Article {
  /** UUID v4 */
  id: string;
  /** 対応する Company.id */
  companyId: string;
  /** 記事タイトル */
  title: string;
  /** 記事元URL */
  url: string;
  /** 取得元サイト */
  source: ScrapingSource;
  /** 記事公開日 ISO 8601（取得できない場合はスクレイピング日） */
  publishedAt: string;
  /** スクレイピング実行日時 ISO 8601 */
  scrapedAt: string;
  /** 保存先HTMLファイルの相対パス（today_onlyモードでは空文字列） */
  filePath: string;
  /** true: filePath のファイルが実在しない（outputDir 変更後の旧記事等） */
  missing?: boolean;
}

/** スクレイパーが返す中間データ（本文HTML含む） */
export interface ScrapedArticle {
  /** 記事タイトル */
  title: string;
  /** 記事元URL */
  url: string;
  /** 取得元サイト */
  source: ScrapingSource;
  /** 記事公開日 ISO 8601 */
  publishedAt: string;
  /** 記事本文HTML（fullモード時のみ。today_onlyモードでは undefined） */
  htmlContent?: string;
}

/** 記事リンク（パース結果の中間表現） */
export interface ArticleLink {
  title: string;
  url: string;
  publishedAt: string;
}
