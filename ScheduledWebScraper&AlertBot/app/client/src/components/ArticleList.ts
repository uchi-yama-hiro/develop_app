import type { Company, Article } from "../../../shared/types/index.ts";
import { SOURCE_LABELS } from "../../../shared/types/index.ts";
import { apiClient, ApiError } from "../services/apiClient.ts";

/**
 * 記事一覧タブ UI コンポーネント
 */
export class ArticleList {
  private container: HTMLElement | null = null;
  private articles: Article[] = [];
  private companies: Company[] = [];
  private filterCompanyId: string = "";
  private errorMessage: string = "";

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  async refresh(): Promise<void> {
    try {
      this.companies = await apiClient.getCompanies();
      this.articles = await apiClient.getArticles(
        this.filterCompanyId || undefined,
      );
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
      <section class="article-list">
        <h2>収集済み記事</h2>

        <div class="filter-row">
          <label for="company-filter">企業フィルター:</label>
          <select id="company-filter">
            <option value="">全企業</option>
            ${this.companies
              .map(
                (c) => `
              <option value="${c.id}" ${this.filterCompanyId === c.id ? "selected" : ""}>
                ${this.escapeHtml(c.name)}
              </option>
            `,
              )
              .join("")}
          </select>
        </div>

        ${this.errorMessage ? `<p class="error-message">${this.escapeHtml(this.errorMessage)}</p>` : ""}

        ${
          this.articles.length === 0
            ? '<p class="empty-message">記事がありません</p>'
            : this.renderTable()
        }

        <p class="article-count">合計: ${this.articles.length}件</p>
      </section>
    `;

    this.setupEventListeners();
  }

  private renderTable(): string {
    return `
      <div class="table-wrapper">
        <table class="article-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>タイトル</th>
              <th>ソース</th>
              <th>企業</th>
            </tr>
          </thead>
          <tbody>
            ${this.articles.map((a) => this.renderRow(a)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderRow(article: Article): string {
    const date = new Date(article.publishedAt).toLocaleDateString("ja-JP");
    const company = this.companies.find((c) => c.id === article.companyId);
    const companyName = company ? company.name : "不明";
    const sourceLabel = SOURCE_LABELS[article.source] ?? article.source;
    const missingClass = article.missing ? "missing" : "";

    return `
      <tr class="${missingClass}">
        <td class="col-date">${date}</td>
        <td class="col-title">
          <a href="${this.escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">
            ${this.escapeHtml(article.title)}
          </a>
          ${article.missing ? '<span class="missing-badge" title="ファイルが見つかりません">⚠</span>' : ""}
        </td>
        <td class="col-source">${this.escapeHtml(sourceLabel)}</td>
        <td class="col-company">${this.escapeHtml(companyName)}</td>
      </tr>
    `;
  }

  private setupEventListeners(): void {
    document
      .getElementById("company-filter")
      ?.addEventListener("change", (e) => {
        this.filterCompanyId = (e.target as HTMLSelectElement).value;
        this.refresh();
      });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
