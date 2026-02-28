import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { GoogleNewsScraper } from "../scrapers/GoogleNewsScraper.ts";
import { YahooFinanceScraper } from "../scrapers/YahooFinanceScraper.ts";
import { NikkeiScraper } from "../scrapers/NikkeiScraper.ts";
import { YahooNewsScraper } from "../scrapers/YahooNewsScraper.ts";
import { RateLimiter } from "../utils/rateLimiter.ts";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

beforeEach(() => {
  vi.clearAllMocks();
});

// テスト用のRateLimiter（待機なし）
const fastLimiter = new RateLimiter(0);

describe("GoogleNewsScraper", () => {
  it("HTMLから記事リンクをパースできる (TC-010)", () => {
    const scraper = new GoogleNewsScraper(fastLimiter);
    const html = `
      <html>
        <body>
          <article>
            <a href="./articles/abc123">トヨタ、EV新型車を発表</a>
            <time datetime="2026-02-28T09:00:00Z">2月28日</time>
          </article>
          <article>
            <a href="./articles/def456">トヨタの業績好調</a>
            <time datetime="2026-02-27T09:00:00Z">2月27日</time>
          </article>
        </body>
      </html>
    `;

    // parseArticleLinks は protected なので、scrape のテストとして間接的にテスト
    // ここでは直接テストするため、型アサーションでアクセス
    const links = (scraper as any).parseArticleLinks(html, "トヨタ");

    expect(links).toHaveLength(2);
    expect(links[0].title).toBe("トヨタ、EV新型車を発表");
    expect(links[0].url).toContain("news.google.com");
    expect(links[0].publishedAt).toBe("2026-02-28T09:00:00Z");
  });

  it("空のHTMLでは空配列を返す", () => {
    const scraper = new GoogleNewsScraper(fastLimiter);
    const links = (scraper as any).parseArticleLinks("<html></html>", "テスト");
    expect(links).toEqual([]);
  });
});

describe("YahooFinanceScraper", () => {
  it("HTMLから記事リンクをパースできる (TC-011)", () => {
    const scraper = new YahooFinanceScraper(fastLimiter);
    const html = `
      <html>
        <body>
          <div>
            <a href="https://finance.yahoo.co.jp/news/detail/abc">ソニー好決算で株価上昇</a>
            <span class="date">2026/02/28 10:00</span>
          </div>
          <div>
            <a href="https://finance.yahoo.co.jp/news/detail/def">ソニーPS6の販売好調</a>
            <time>2026/02/27</time>
          </div>
        </body>
      </html>
    `;

    const links = (scraper as any).parseArticleLinks(html, "ソニー");

    expect(links).toHaveLength(2);
    expect(links[0].title).toBe("ソニー好決算で株価上昇");
    expect(links[0].url).toContain("finance.yahoo.co.jp");
  });
});

describe("NikkeiScraper", () => {
  it("HTMLから記事リンクをパースできる (TC-012)", () => {
    const scraper = new NikkeiScraper(fastLimiter);
    const html = `
      <html>
        <body>
          <div>
            <a href="/article/DGXZQO12345">任天堂、新作ゲーム発表で株価急上昇</a>
            <time datetime="2026-02-28T09:00:00Z">2月28日</time>
          </div>
          <div>
            <a href="https://www.nikkei.com/article/DGXZQO67890">任天堂の決算速報</a>
            <span class="date">2026年2月27日</span>
          </div>
        </body>
      </html>
    `;

    const links = (scraper as any).parseArticleLinks(html, "任天堂");

    expect(links).toHaveLength(2);
    expect(links[0].title).toContain("任天堂");
    expect(links[0].url).toContain("nikkei.com");
  });
});

describe("YahooNewsScraper", () => {
  it("HTMLから記事リンクをパースできる (TC-013)", () => {
    const scraper = new YahooNewsScraper(fastLimiter);
    const html = `
      <html>
        <body>
          <div>
            <a href="https://news.yahoo.co.jp/articles/abc123">トヨタの新戦略について詳しく解説</a>
            <time datetime="2026-02-28T09:00:00Z">2月28日</time>
          </div>
          <div>
            <a href="https://news.yahoo.co.jp/pickup/12345">トヨタ収益上方修正のニュース詳細</a>
            <span>2026/02/27</span>
          </div>
        </body>
      </html>
    `;

    const links = (scraper as any).parseArticleLinks(html, "トヨタ");

    expect(links).toHaveLength(2);
    expect(links[0].title).toContain("トヨタ");
    expect(links[0].url).toContain("news.yahoo.co.jp");
  });

  it("記事以外のリンクをフィルターする", () => {
    const scraper = new YahooNewsScraper(fastLimiter);
    const html = `
      <html>
        <body>
          <a href="https://news.yahoo.co.jp/categories/business">ビジネス</a>
          <a href="https://news.yahoo.co.jp/articles/valid">有効な記事タイトルです</a>
        </body>
      </html>
    `;

    const links = (scraper as any).parseArticleLinks(html, "テスト");
    expect(links).toHaveLength(1);
    expect(links[0].url).toContain("/articles/");
  });
});

describe("BaseScraper — fetchPage リトライ", () => {
  it("タイムアウト時に1回リトライされる (TC-014)", async () => {
    const scraper = new GoogleNewsScraper(fastLimiter);

    // 1回目: タイムアウトエラー
    const timeoutError = new Error("timeout") as any;
    timeoutError.code = "ECONNABORTED";
    timeoutError.isAxiosError = true;

    // 2回目: 成功
    mockedAxios.get
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ data: "<html>retry success</html>" });

    // axios.isAxiosError を正しくモック
    (mockedAxios as any).isAxiosError = vi.fn().mockReturnValue(true);

    const result = await (scraper as any).fetchPage("http://example.com/test");

    expect(result).toBe("<html>retry success</html>");
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it("リトライも失敗した場合はエラーを throw する (TC-014b)", async () => {
    const scraper = new GoogleNewsScraper(fastLimiter);

    const timeoutError = new Error("timeout") as any;
    timeoutError.code = "ECONNABORTED";
    timeoutError.isAxiosError = true;

    mockedAxios.get
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(new Error("retry also failed"));

    (mockedAxios as any).isAxiosError = vi.fn().mockReturnValue(true);

    await expect(
      (scraper as any).fetchPage("http://example.com/test"),
    ).rejects.toThrow("google_news: リクエストがタイムアウトしました");
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});
