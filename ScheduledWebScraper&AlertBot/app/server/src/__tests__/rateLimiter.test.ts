import { describe, it, expect } from "vitest";
import { RateLimiter } from "../utils/rateLimiter.ts";

describe("RateLimiter", () => {
  it("初回リクエストは即座に完了する", async () => {
    const limiter = new RateLimiter(2000);
    const start = Date.now();
    await limiter.wait();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it("リクエスト間隔が指定ミリ秒以上確保される (TC-015)", async () => {
    const intervalMs = 200; // テスト用に短い間隔
    const limiter = new RateLimiter(intervalMs);

    await limiter.wait();
    const firstTime = Date.now();

    await limiter.wait();
    const secondTime = Date.now();

    const elapsed = secondTime - firstTime;
    expect(elapsed).toBeGreaterThanOrEqual(intervalMs - 10); // 誤差を許容
  });

  it("十分な時間が経過している場合は待機しない", async () => {
    const limiter = new RateLimiter(100);
    await limiter.wait();

    // 間隔以上待機
    await new Promise<void>((r) => setTimeout(r, 150));

    const start = Date.now();
    await limiter.wait();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
