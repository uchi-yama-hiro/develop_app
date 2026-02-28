import type { Company } from "../../../shared/types/index.ts";
import { apiClient, ApiError } from "../services/apiClient.ts";

const MAX_COMPANIES = 30;

/**
 * 企業管理タブ UI コンポーネント
 * 企業の登録・編集・削除を行う
 */
export class CompanyManager {
  private container: HTMLElement | null = null;
  private companies: Company[] = [];
  private editingId: string | null = null;
  private errorMessage: string = "";

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  async refresh(): Promise<void> {
    try {
      this.companies = await apiClient.getCompanies();
      this.errorMessage = "";
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "サーバーに接続できません";
    }
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <section class="company-manager">
        <h2>企業名登録</h2>
        <div class="input-row">
          <input
            type="text"
            id="company-name-input"
            placeholder="企業名を入力..."
            maxlength="50"
          />
          <button id="add-company-btn" class="btn btn-primary">登録</button>
          <span class="company-count">${this.companies.length} / ${MAX_COMPANIES}社</span>
        </div>

        ${this.errorMessage ? `<p class="error-message">${this.escapeHtml(this.errorMessage)}</p>` : ""}

        <h2>登録企業一覧</h2>
        ${
          this.companies.length === 0
            ? '<p class="empty-message">企業が登録されていません</p>'
            : `<ul class="company-list">${this.companies.map((c, i) => this.renderCompanyItem(c, i)).join("")}</ul>`
        }
      </section>
    `;

    this.setupEventListeners();
  }

  private renderCompanyItem(company: Company, index: number): string {
    const isEditing = this.editingId === company.id;
    const date = new Date(company.createdAt).toLocaleDateString("ja-JP");

    if (isEditing) {
      return `
        <li class="company-item editing" data-id="${company.id}">
          <span class="company-index">${index + 1}.</span>
          <input
            type="text"
            class="edit-input"
            value="${this.escapeHtml(company.name)}"
            data-id="${company.id}"
          />
          <span class="company-date">${date}</span>
          <button class="btn btn-small btn-save" data-id="${company.id}">保存</button>
          <button class="btn btn-small btn-cancel" data-id="${company.id}">キャンセル</button>
        </li>
      `;
    }

    return `
      <li class="company-item" data-id="${company.id}">
        <span class="company-index">${index + 1}.</span>
        <span class="company-name">${this.escapeHtml(company.name)}</span>
        <span class="company-date">${date}</span>
        <button class="btn btn-small btn-edit" data-id="${company.id}">編集</button>
        <button class="btn btn-small btn-danger btn-delete" data-id="${company.id}">削除</button>
      </li>
    `;
  }

  private setupEventListeners(): void {
    // 登録ボタン
    const addBtn = document.getElementById("add-company-btn");
    const input = document.getElementById(
      "company-name-input",
    ) as HTMLInputElement | null;

    addBtn?.addEventListener("click", () => this.handleAdd());
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleAdd();
    });

    // 編集ボタン
    this.container
      ?.querySelectorAll<HTMLButtonElement>(".btn-edit")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          this.editingId = btn.dataset.id!;
          this.render();
        });
      });

    // 保存ボタン
    this.container
      ?.querySelectorAll<HTMLButtonElement>(".btn-save")
      .forEach((btn) => {
        btn.addEventListener("click", () => this.handleSave(btn.dataset.id!));
      });

    // キャンセルボタン
    this.container
      ?.querySelectorAll<HTMLButtonElement>(".btn-cancel")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          this.editingId = null;
          this.render();
        });
      });

    // 削除ボタン
    this.container
      ?.querySelectorAll<HTMLButtonElement>(".btn-delete")
      .forEach((btn) => {
        btn.addEventListener("click", () => this.handleDelete(btn.dataset.id!));
      });

    // 編集入力のEnterキー
    this.container
      ?.querySelectorAll<HTMLInputElement>(".edit-input")
      .forEach((input) => {
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.handleSave(input.dataset.id!);
          if (e.key === "Escape") {
            this.editingId = null;
            this.render();
          }
        });
        // 編集中の入力にフォーカス
        input.focus();
      });
  }

  private async handleAdd(): Promise<void> {
    const input = document.getElementById(
      "company-name-input",
    ) as HTMLInputElement;
    const name = input.value.trim();

    if (!name) {
      this.errorMessage = "企業名を入力してください";
      this.render();
      return;
    }

    try {
      await apiClient.addCompany(name);
      this.errorMessage = "";
      await this.refresh();
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "登録に失敗しました";
      this.render();
    }
  }

  private async handleSave(id: string): Promise<void> {
    const input = this.container?.querySelector<HTMLInputElement>(
      `.edit-input[data-id="${id}"]`,
    );
    const name = input?.value.trim();

    if (!name) {
      this.errorMessage = "企業名を入力してください";
      this.render();
      return;
    }

    try {
      await apiClient.updateCompany(id, name);
      this.editingId = null;
      this.errorMessage = "";
      await this.refresh();
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "更新に失敗しました";
      this.render();
    }
  }

  private async handleDelete(id: string): Promise<void> {
    const company = this.companies.find((c) => c.id === id);
    if (!company) return;

    const confirmed = window.confirm(
      `「${company.name}」を削除しますか？\n関連する記事も削除されます。`,
    );
    if (!confirmed) return;

    try {
      await apiClient.deleteCompany(id);
      this.errorMessage = "";
      await this.refresh();
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError ? err.message : "削除に失敗しました";
      this.render();
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
