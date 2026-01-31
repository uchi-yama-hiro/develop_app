# Docker + Vite + TypeScript 開発環境 実装プラン

## 目的
- 目的: 学習・開発活動のための Vite + TypeScript 環境を Docker で構築
- 対象: ローカル開発のみ
- ホスト: macOS (arm64) / Windows (amd64)
- パッケージマネージャ: npm
- Node.js: 最新系 (公式イメージの `node:latest` を採用)

---

## 仕様・方針
- **開発専用**の Docker 環境を用意
- **マルチアーキ対応**の公式 Node イメージを利用
- Vite の **ホットリロード**を安定させるため、必要に応じて `CHOKIDAR_USEPOLLING=1` を使用
- 依存関係は **コンテナ内で解決**し、`node_modules` は匿名ボリュームでホストから分離

---

## 予定ディレクトリ構成
```
ScheduledWebScraper&AlertBot/
├─ Docker/
│  ├─ Dockerfile
│  ├─ docker-compose.yml
│  └─ .dockerignore
└─ app/                # Vite + TypeScript プロジェクト
```

---

## 実装ステップ詳細

### 1. Dockerfile を作成
**ファイル:** `Docker/Dockerfile`

**内容のポイント:**
- `node:latest` を使用 (arm64 / amd64 両対応)
- `WORKDIR /workspace`
- `package.json` と `package-lock.json` を先にコピー → 依存解決のキャッシュを有効化
- `npm install` を実行
- 開発サーバ起動のための `CMD` を `npm run dev -- --host` に設定

---

### 2. docker-compose.yml を作成
**ファイル:** `Docker/docker-compose.yml`

**内容のポイント:**
- サービス名: `vite`
- ビルド: `Docker/Dockerfile`
- ボリューム:
  - `../app:/workspace` をマウント
  - `/workspace/node_modules` を匿名ボリュームで分離
- ポート: `5173:5173`
- 環境変数:
  - 必要時に `CHOKIDAR_USEPOLLING=1` を有効化

---

### 3. .dockerignore を作成
**ファイル:** `Docker/.dockerignore`

**内容のポイント:**
- `node_modules`, `dist`, `.git`, `.DS_Store` などを除外
- ビルドコンテキストを最小化

---

### 4. Vite + TypeScript プロジェクトを初期化
**作業場所:** `app/`

**実施内容:**
- コンテナ内で `npm create vite@latest` を実行
- `typescript` テンプレートを選択
- `npm install`

---

### 5. 開発サーバ起動
**作業内容:**
- `docker compose` でサービス起動
- `http://localhost:5173` にアクセスして表示確認
- 変更反映が遅い/止まる場合は `CHOKIDAR_USEPOLLING=1` を有効化

---

## 受け入れ条件 (Done Definition)
- Docker で Vite + TypeScript の開発サーバが起動できる
- macOS (arm64) / Windows (amd64) のどちらでも同一手順で動作する
- `npm install` がコンテナ内で完結し、ホストに依存しない
- `localhost:5173` でViteの初期画面が表示される

---

## 実装後の運用メモ
- 依存更新時はコンテナ内で `npm install` を実行
- `node_modules` は匿名ボリュームのため、必要に応じて `docker compose down -v` で初期化可能
- Vite のホットリロードが不安定なら `CHOKIDAR_USEPOLLING=1` を明示的に設定
