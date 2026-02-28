/**
 * リクエスト間隔制御
 * 同一サイトへのリクエスト間隔を最低 intervalMs ミリ秒確保する
 */
export class RateLimiter {
  private intervalMs: number;
  private lastRequestTime: number = 0;

  /**
   * @param intervalMs リクエスト間隔（ミリ秒）。デフォルト: 2000ms
   */
  constructor(intervalMs: number = 2000) {
    this.intervalMs = intervalMs;
  }

  /**
   * 前回のリクエストから十分な間隔が経過するまで待機する
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const remaining = this.intervalMs - elapsed;

    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * テスト用: 最後のリクエスト時刻を返す
   */
  getLastRequestTime(): number {
    return this.lastRequestTime;
  }
}
