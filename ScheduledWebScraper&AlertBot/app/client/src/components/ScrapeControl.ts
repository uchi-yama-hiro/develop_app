import type {
  Company,
  ScrapeResult,
  ScrapeMode,
} from "../../../shared/types/index.ts";
import { apiClient, ApiError } from "../services/apiClient.ts";

type ScrapeStatus = "idle" | "running" | "done" | "error";

/**
 * スクレイピング実行タブ UI コンポーネント
 */
export class ScrapeControl {
  private container: HTMLElement | null = null;
  private companies: Company[] = [];
  private selectedIds: Set<string> = new Set();
  private scrapeMode: ScrapeMode = "today_only";
  private status: ScrapeStatus = "idle";
  private results: ScrapeResult[] = [];
  private errorMessage: string = "";

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  async refresh(): Promise<void> {
    try {
      this.companies = await apiClient.getCompanies();
      const config = await apiClient.getConfig();
      this.scrapeMode = config.scrapeMode;
      this.errorMessage = "";
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "サーバーに接続できません";
    }
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    const isRunning = this.status === "running";

    this.container.innerHTML = `
      <section class="scrape-control">
        <h2>対象企業選択</h2>
        ${
          this.companies.length === 0
            ? '<p class="empty-message">企業が登録されていません。「企業管理」タブから登録してください。</p>'
            : `
          <div class="company-select-list">
            ${this.companies
              .map(
                (c) => `
              <label class="checkbox-label">
                <input type="checkbox" class="company-checkbox" data-id="${c.id}"
                  ${this.selectedIds.has(c.id) ? "checked" : ""}
                  ${isRunning ? "disabled" : ""} />
                ${this.escapeHtml(c.name)}
              </label>
            `,
              )
              .join("")}
          </div>
          `
        }

        <div class="mode-select">
          <h3>モード</h3>
          <label class="radio-label">
            <input type="radio" name="scrape-mode" value="today_only"
              ${this.scrapeMode === "today_only" ? "checked" : ""}
              ${isRunning ? "disabled" : ""} />
            当日ニュースのみ
          </label>
          <label class="radio-label">
            <input type="radio" name="scrape-mode" value="full"
              ${this.scrapeMode === "full" ? "checked" : ""}
              ${isRunning ? "disabled" : ""} />
            フル取得
          </label>
          <p class="mode-warning">⚠ 利用規約未確認のため「当日ニュースのみ」推奨</p>
        </div>

        <div class="scrape-actions">
          <button class="btn btn-primary" id="scrape-selected-btn"
            ${isRunning || this.selectedIds.size === 0 ? "disabled" : ""}>
            選択企業を取得
          </button>
          <button class="btn btn-secondary" id="scrape-all-btn"
            ${isRunning || this.companies.length === 0 ? "disabled" : ""}>
            全企業を一括取得
          </button>
        </div>

        ${this.errorMessage ? `<p class="error-message">${this.escapeHtml(this.errorMessage)}</p>` : ""}

        ${this.status === "running" ? '<div class="progress-section"><p class="loading">⏳ スクレイピング実行中...</p></div>' : ""}

        ${this.results.length > 0 ? this.renderResults() : ""}
      </section>
    `;

    this.setupEventListeners();
  }

  private renderResults(): string {
    return `
      <div class="results-section">
        <h3>実行結果</h3>
        <ul class="result-list">
          ${this.results
            .map(
              (r) => `
            <li class="result-item">
              <span class="result-status ${r.errors.length > 0 ? "has-errors" : "success"}">
                ${r.errors.length > 0 ? "⚠️" : "✅"}
              </span>
              <span class="result-company">${this.escapeHtml(r.companyName)}</span>:
              <span class="result-detail">
                ${r.totalArticles}件取得 (${r.newArticles} 新規 / ${r.skippedDuplicates} スキップ)
              </span>
              ${r.errors
                .map(
                  (e) => `
                <div class="result-error">⚠️ ${this.escapeHtml(e.source)}: ${this.escapeHtml(e.message)}</div>
              `,
                )
                .join("")}
            </li>
          `,
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // チェックボックス
    this.container
      ?.querySelectorAll<HTMLInputElement>(".company-checkbox")
      .forEach((cb) => {
        cb.addEventListener("change", () => {
          const id = cb.dataset.id!;
          if (cb.checked) {
            this.selectedIds.add(id);
          } else {
            this.selectedIds.delete(id);
          }
          // ボタン状態の更新のみ再描画
          const btn = document.getElementById(
            "scrape-selected-btn",
          ) as HTMLButtonElement | null;
          if (btn) btn.disabled = this.selectedIds.size === 0;
        });
      });

    // モード選択
    this.container
      ?.querySelectorAll<HTMLInputElement>('input[name="scrape-mode"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          this.scrapeMode = radio.value as ScrapeMode;
        });
      });

    // 選択企業を取得
    document
      .getElementById("scrape-selected-btn")
      ?.addEventListener("click", () => {
        this.handleScrapeSelected();
      });

    // 全企業を一括取得
    document.getElementById("scrape-all-btn")?.addEventListener("click", () => {
      this.handleScrapeAll();
    });
  }

  private async handleScrapeSelected(): Promise<void> {
    this.status = "running";
    this.results = [];
    this.errorMessage = "";
    this.render();

    try {
      for (const companyId of this.selectedIds) {
        const result = await apiClient.startScraping(
          companyId,
          this.scrapeMode,
        );
        this.results.push(result);
        this.render(); // 逐次表示
      }
      this.status = "done";
    } catch (err) {
      this.status = "error";
      this.errorMessage =
        err instanceof ApiError ? err.message : "スクレイピングに失敗しました";
    }

    this.render();
  }

  private async handleScrapeAll(): Promise<void> {
    this.status = "running";
    this.results = [];
    this.errorMessage = "";
    this.render();

    try {
      this.results = await apiClient.startScrapingAll(this.scrapeMode);
      this.status = "done";
    } catch (err) {
      this.status = "error";
      this.errorMessage =
        err instanceof ApiError ? err.message : "スクレイピングに失敗しました";
    }

    this.render();
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
