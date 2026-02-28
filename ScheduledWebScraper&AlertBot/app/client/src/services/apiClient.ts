import type {
  Company,
  Article,
  ScrapeResult,
  ConfigResponse,
  ScrapeMode,
} from "../../../shared/types/index.ts";

const BASE_URL = "/api";

/**
 * バックエンド REST API への HTTP 通信を抽象化する
 */
export class ApiClient {
  // --- 企業管理 ---

  async getCompanies(): Promise<Company[]> {
    return this.get<Company[]>("/companies");
  }

  async addCompany(name: string): Promise<Company> {
    return this.post<Company>("/companies", { name });
  }

  async updateCompany(id: string, name: string): Promise<Company> {
    return this.put<Company>(`/companies/${id}`, { name });
  }

  async deleteCompany(id: string): Promise<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/companies/${id}`);
  }

  // --- スクレイピング ---

  async startScraping(
    companyId: string,
    mode?: ScrapeMode,
  ): Promise<ScrapeResult> {
    return this.post<ScrapeResult>("/scrape", { companyId, mode });
  }

  async startScrapingAll(mode?: ScrapeMode): Promise<ScrapeResult[]> {
    return this.post<ScrapeResult[]>("/scrape/all", { mode });
  }

  // --- 記事 ---

  async getArticles(companyId?: string): Promise<Article[]> {
    const query = companyId ? `?companyId=${companyId}` : "";
    return this.get<Article[]>(`/articles${query}`);
  }

  // --- 設定 ---

  async getConfig(): Promise<ConfigResponse> {
    return this.get<ConfigResponse>("/config");
  }

  async setOutputDir(outputDir: string): Promise<{ outputDir: string }> {
    return this.put<{ outputDir: string }>("/config/output-dir", { outputDir });
  }

  async setScrapeMode(mode: ScrapeMode): Promise<{ scrapeMode: ScrapeMode }> {
    return this.put<{ scrapeMode: ScrapeMode }>("/config/scrape-mode", {
      mode,
    });
  }

  // --- HTTP ヘルパー ---

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    return this.handleResponse<T>(res);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  private async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMessage: string;
      try {
        const body = (await res.json()) as { error?: string };
        errorMessage = body.error ?? `HTTP ${res.status} エラー`;
      } catch {
        errorMessage = `HTTP ${res.status} エラー`;
      }
      throw new ApiError(errorMessage, res.status);
    }
    return res.json() as Promise<T>;
  }
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

/** シングルトンインスタンス */
export const apiClient = new ApiClient();
