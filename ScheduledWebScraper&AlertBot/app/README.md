# 📰 Stock News Scraper

企業ニュースを収集し、株価傾向分析の入力データを生成する Web スクレイピングツールです。

## 機能

- **企業管理** — 最大30社の企業名を登録・編集・削除
- **ニュース収集** — Google News / Yahoo!ファイナンス / 日経電子版 / Yahoo!ニュースから記事を自動取得
- **記事一覧** — 収集済み記事を日付順で表示・企業別フィルター
- **2つの動作モード**
  - **当日ニュースのみ（推奨）** — 検索結果ページのみ取得、リクエスト最小化
  - **フル取得** — 記事本文 HTML も取得・保存

## 技術スタック

| レイヤー       | 技術                                   |
| -------------- | -------------------------------------- |
| フロントエンド | Vite + TypeScript (Vanilla TS)         |
| バックエンド   | Node.js + Express + TypeScript         |
| スクレイピング | axios + cheerio                        |
| データ保存     | ローカルファイルシステム (JSON + HTML) |
| テスト         | Vitest + supertest                     |

## セットアップ

### 前提条件

- Node.js 20+
- npm

### インストール

```bash
npm install
cd shared && npm install && cd ..
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## 起動

### 開発モード（フロント + バックエンド同時起動）

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:3000

### 個別起動

```bash
# バックエンドのみ
npm run dev:server

# フロントエンドのみ
npm run dev:client
```

## テスト

```bash
# テスト実行
npm test

# ウォッチモード
npm run test:watch
```

## 使い方

1. `npm run dev` でアプリを起動
2. ブラウザで http://localhost:5173 を開く
3. **企業管理タブ** で分析対象の企業名を登録（例: "トヨタ自動車"）
4. **⚙ 設定** から保存先ディレクトリを指定
5. **スクレイピングタブ** で対象企業を選択し「選択企業を取得」を実行
6. **記事一覧タブ** で収集結果を確認

## プロジェクト構成

```
/
├── package.json          # ルート（共通スクリプト）
├── shared/               # フロント・バック共有の型定義
│   └── types/
├── client/               # フロントエンド (Vite + TS SPA)
│   └── src/
│       ├── components/   # UI コンポーネント
│       ├── services/     # API クライアント
│       └── main.ts
└── server/               # バックエンド (Express + TS)
    └── src/
        ├── routes/       # REST API ルート
        ├── scrapers/     # サイト別スクレイパー
        ├── services/     # ビジネスロジック
        ├── utils/        # ユーティリティ
        └── __tests__/    # テスト
```

## API エンドポイント

| メソッド | パス                    | 説明                     |
| -------- | ----------------------- | ------------------------ |
| GET      | /api/companies          | 企業一覧取得             |
| POST     | /api/companies          | 企業登録                 |
| PUT      | /api/companies/:id      | 企業名更新               |
| DELETE   | /api/companies/:id      | 企業削除                 |
| POST     | /api/scrape             | 単一企業スクレイピング   |
| POST     | /api/scrape/all         | 全企業一括スクレイピング |
| GET      | /api/articles           | 記事一覧取得             |
| GET      | /api/config             | 設定取得                 |
| PUT      | /api/config/output-dir  | 保存先変更               |
| PUT      | /api/config/scrape-mode | モード変更               |

## 注意事項

- スクレイピング対象サイトの利用規約は未確認のため、動作確認時は **「当日ニュースのみ」モード** を使用してください
- 同一サイトへのリクエスト間隔は最低 2 秒確保されます
- 個人利用を想定しています

## ライセンス

Private
