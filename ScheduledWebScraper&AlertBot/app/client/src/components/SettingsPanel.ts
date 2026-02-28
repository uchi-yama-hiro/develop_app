import type { ScrapeMode } from "../../../shared/types/index.ts";
import { apiClient, ApiError } from "../services/apiClient.ts";

/**
 * 設定パネル（モーダル）UI コンポーネント
 */
export class SettingsPanel {
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;
  private outputDir: string = "";
  private scrapeMode: ScrapeMode = "today_only";
  private errorMessage: string = "";
  private successMessage: string = "";

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  async open(): Promise<void> {
    try {
      const config = await apiClient.getConfig();
      this.outputDir = config.outputDir;
      this.scrapeMode = config.scrapeMode;
      this.errorMessage = "";
      this.successMessage = "";
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "設定の読み込みに失敗しました";
    }
    this.isOpen = true;
    this.render();
  }

  private close(): void {
    this.isOpen = false;
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    if (!this.isOpen) {
      this.container.innerHTML = "";
      return;
    }

    this.container.innerHTML = `
      <div class="modal-overlay" id="settings-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>⚙ 設定</h2>
            <button class="modal-close" id="settings-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="output-dir-input">保存先ディレクトリ</label>
              <div class="input-row">
                <input type="text" id="output-dir-input"
                  value="${this.escapeHtml(this.outputDir)}"
                  placeholder="/home/user/scraping-data" />
              </div>
            </div>

            <div class="form-group">
              <label>スクレイピングモード</label>
              <label class="radio-label">
                <input type="radio" name="settings-mode" value="today_only"
                  ${this.scrapeMode === "today_only" ? "checked" : ""} />
                当日ニュースのみ (推奨)
              </label>
              <label class="radio-label">
                <input type="radio" name="settings-mode" value="full"
                  ${this.scrapeMode === "full" ? "checked" : ""} />
                フル取得
              </label>
              <p class="mode-warning">⚠ 利用規約未確認のため「当日ニュースのみ」を推奨します</p>
            </div>

            ${this.errorMessage ? `<p class="error-message">${this.escapeHtml(this.errorMessage)}</p>` : ""}
            ${this.successMessage ? `<p class="success-message">${this.escapeHtml(this.successMessage)}</p>` : ""}
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="settings-save-btn">保存</button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 閉じるボタン
    document
      .getElementById("settings-close")
      ?.addEventListener("click", () => this.close());

    // オーバーレイクリックで閉じる
    document
      .getElementById("settings-overlay")
      ?.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).id === "settings-overlay") {
          this.close();
        }
      });

    // モード選択
    this.container
      ?.querySelectorAll<HTMLInputElement>('input[name="settings-mode"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          this.scrapeMode = radio.value as ScrapeMode;
        });
      });

    // 保存ボタン
    document
      .getElementById("settings-save-btn")
      ?.addEventListener("click", () => this.handleSave());
  }

  private async handleSave(): Promise<void> {
    this.errorMessage = "";
    this.successMessage = "";

    try {
      const outputDirInput = document.getElementById(
        "output-dir-input",
      ) as HTMLInputElement;
      const newOutputDir = outputDirInput.value.trim();

      // 変更があれば保存
      if (newOutputDir && newOutputDir !== this.outputDir) {
        await apiClient.setOutputDir(newOutputDir);
        this.outputDir = newOutputDir;
      }

      await apiClient.setScrapeMode(this.scrapeMode);
      this.successMessage = "設定を保存しました";
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "設定の保存に失敗しました";
    }

    this.render();
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
