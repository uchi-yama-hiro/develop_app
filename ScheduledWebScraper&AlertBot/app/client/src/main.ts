import "./style.css";
import { CompanyManager } from "./components/CompanyManager.ts";
import { ScrapeControl } from "./components/ScrapeControl.ts";
import { ArticleList } from "./components/ArticleList.ts";
import { SettingsPanel } from "./components/SettingsPanel.ts";

type TabId = "companies" | "scraping" | "articles";

class App {
  private currentTab: TabId = "companies";
  private companyManager: CompanyManager;
  private scrapeControl: ScrapeControl;
  private articleList: ArticleList;
  private settingsPanel: SettingsPanel;

  constructor() {
    this.companyManager = new CompanyManager();
    this.scrapeControl = new ScrapeControl();
    this.articleList = new ArticleList();
    this.settingsPanel = new SettingsPanel();

    this.render();
    this.setupEventListeners();
    this.showTab("companies");
  }

  private render(): void {
    const app = document.querySelector<HTMLDivElement>("#app")!;
    app.innerHTML = `
      <header class="app-header">
        <h1 class="app-title">📰 Stock News Scraper</h1>
        <nav class="tab-nav">
          <button class="tab-btn active" data-tab="companies">🏢 企業管理</button>
          <button class="tab-btn" data-tab="scraping">🔍 スクレイピング</button>
          <button class="tab-btn" data-tab="articles">📰 記事一覧</button>
        </nav>
        <button class="settings-btn" id="settings-btn" title="設定">⚙</button>
      </header>

      <main class="app-main">
        <div class="tab-content" id="tab-companies"></div>
        <div class="tab-content hidden" id="tab-scraping"></div>
        <div class="tab-content hidden" id="tab-articles"></div>
      </main>

      <div id="settings-modal"></div>
    `;

    // コンポーネントを各タブにマウント
    this.companyManager.mount(document.getElementById("tab-companies")!);
    this.scrapeControl.mount(document.getElementById("tab-scraping")!);
    this.articleList.mount(document.getElementById("tab-articles")!);
    this.settingsPanel.mount(document.getElementById("settings-modal")!);
  }

  private setupEventListeners(): void {
    // タブ切り替え
    document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab as TabId;
        this.showTab(tab);
      });
    });

    // 設定ボタン
    document.getElementById("settings-btn")!.addEventListener("click", () => {
      this.settingsPanel.open();
    });
  }

  private showTab(tabId: TabId): void {
    this.currentTab = tabId;

    // タブボタンのアクティブ状態
    document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    // タブコンテンツの表示切り替え
    document.querySelectorAll<HTMLDivElement>(".tab-content").forEach((el) => {
      el.classList.toggle("hidden", el.id !== `tab-${tabId}`);
    });

    // タブ表示時にデータをリフレッシュ
    switch (this.currentTab) {
      case "companies":
        this.companyManager.refresh();
        break;
      case "scraping":
        this.scrapeControl.refresh();
        break;
      case "articles":
        this.articleList.refresh();
        break;
    }
  }
}

// アプリケーション起動
new App();
