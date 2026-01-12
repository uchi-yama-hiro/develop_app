# チーム開発環境アーキテクチャ

## 概要

VS Code Dev Containers を活用した、複数人での統一開発環境です。全開発者が同じ Docker イメージで開発でき、環境差分による問題を最小化します。

## システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│ Developer's Machine (macOS / Windows)                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Docker Desktop                                           │  │
│  │  └─────────────────────────────────────────────────────┐ │  │
│  │  │ Dev Container (node:20-bullseye)                   │ │  │
│  │  │  ┌──────────────────────────────────────────────┐ │ │  │
│  │  │  │ VS Code (Remote)                            │ │ │  │
│  │  │  │ - Node.js 20                                │ │ │  │
│  │  │  │ - pnpm + npm                                │ │ │  │
│  │  │  │ - TypeScript                                │ │ │  │
│  │  │  │ - ESLint + Prettier                         │ │ │  │
│  │  │  │                                             │ │ │  │
│  │  │  │ /workspace (source mounted)                │ │ │  │
│  │  │  │  ├─ src/                                   │ │ │  │
│  │  │  │  ├─ public/                                │ │ │  │
│  │  │  │  ├─ package.json                           │ │ │  │
│  │  │  │  ├─ vite.config.ts                         │ │ │  │
│  │  │  │  └─ .devcontainer/                         │ │ │  │
│  │  │  │                                             │ │ │  │
│  │  │  │ Processes:                                 │ │ │  │
│  │  │  │  - Vite Dev Server (port 5173)             │ │ │  │
│  │  │  │  - ESLint / Prettier                       │ │ │  │
│  │  │  │  - TypeScript Compiler                     │ │ │  │
│  │  │  └──────────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│              Port Forwards (5173, 3000)                         │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Browser                                                  │  │
│  │ http://localhost:5173 (App Preview)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

        ↓ ↓ ↓

┌─────────────────────────────────────────────────────────────────┐
│ GitHub (or other Git hosting)                                   │
│  - Repository with .devcontainer/ config                        │
│  - Source code shared with team                                 │
└─────────────────────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
Docker/my-app/
├── .devcontainer/           # Dev Container 設定
│   ├── devcontainer.json   # VS Code + Docker 設定
│   └── Dockerfile          # コンテナイメージ定義
│
├── .vscode/                 # VS Code ワークスペース設定
│   ├── settings.json       # エディタ設定（フォーマット、Lint）
│   ├── extensions.json     # 推奨拡張一覧
│   ├── tasks.json          # npm スクリプトのタスク化
│   └── launch.json         # デバッグ設定
│
├── src/
│   ├── App.tsx             # React アプリケーションルート
│   ├── main.tsx            # エントリーポイント
│   ├── index.css           # グローバルスタイル
│   └── components/         # React コンポーネント
│       └── Example.tsx
│
├── public/                  # 静的アセット
│
├── index.html              # HTML テンプレート
├── package.json            # npm パッケージ定義
├── tsconfig.json           # TypeScript コンパイラ設定
├── tsconfig.node.json      # Vite 用 TypeScript 設定
├── vite.config.ts          # Vite ビルドツール設定
│
├── .eslintrc.json          # ESLint ルール定義
├── .prettierrc.json        # Prettier フォーマット設定
├── .env.example            # 環境変数テンプレート
├── .gitignore              # Git 除外ファイル定義
├── .nvmrc                  # Node.js バージョン指定
│
├── docker-compose.yml      # Docker Compose 設定（オプション）
├── README.md               # セットアップ手順
└── ARCHITECTURE.md         # このファイル
```

## 主要な設定ファイルと役割

### .devcontainer/devcontainer.json

**役割**: VS Code から Docker コンテナを統合管理するための設定

```json
{
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20-bullseye",
  "forwardPorts": [5173, 3000],
  "postCreateCommand": "npm ci",
  "postStartCommand": "npm run dev",
  "customizations": {
    "vscode": {
      "extensions": [...],
      "settings": {...}
    }
  }
}
```

**キー機能**:
- `image`: 使用する Docker イメージ（Node.js 20 ベース）
- `forwardPorts`: ホストとコンテナ間のポートマッピング
- `postCreateCommand`: コンテナ作成時に実行（`npm ci` で依存をインストール）
- `postStartCommand`: コンテナ起動時に実行（`npm run dev` で開発サーバー起動）
- `customizations.vscode`: VS Code 固有設定（推奨拡張、エディタ設定）

### .vscode/settings.json

**役割**: 全チーム統一のエディタ設定

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  }
}
```

**効果**: 全開発者がファイル保存時に自動で Prettier フォーマット + ESLint 修正が実行

### package.json

**役割**: npm パッケージ版依存管理と npm スクリプト定義

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "typescript": "^5.3.3",
    "vite": "^5.1.0",
    ...
  }
}
```

### docker-compose.yml（オプション）

**役割**: Docker Compose でコンテナを起動する場合の設定

```yaml
services:
  dev:
    build:
      context: .devcontainer
      dockerfile: Dockerfile
    volumes:
      - .:/workspace          # ソースコードをマウント
      - /workspace/node_modules  # node_modules は分離
    ports:
      - "5173:5173"           # Vite Dev Server
      - "3000:3000"           # アプリケーションポート
    command: npm run dev
```

**用途**: 
- Dev Containers 以外で Docker Compose で直接実行する場合
- CI/CD パイプラインでの自動テスト

## ワークフロー

### 1. セットアップ（初回のみ）

```bash
# リポジトリクローン
git clone <repo>
cd Docker/my-app

# VS Code で開く
code .

# Dev Container で再度開く
# (VS Code の通知から「Reopen in Container」をクリック)
```

### 2. 開発ループ

```bash
# 開発サーバーはすでに起動（自動）
# http://localhost:5173 でアプリ確認

# コード編集
vim src/App.tsx

# ファイル保存時に自動で Prettier + ESLint が実行される

# 必要に応じてコマンド実行
npm run lint          # Lint チェック
npm run type-check    # 型チェック
npm run build         # ビルド
```

### 3. コミット・プッシュ

```bash
git add .
git commit -m "feature: add new component"
git push origin feature/xxx
```

## 技術スタック

| レイヤー | 使用技術 | 理由 |
|---------|---------|------|
| **ランタイム** | Node.js 20 | LTS バージョン、安定性重視 |
| **言語** | TypeScript | 型安全性、大規模開発に対応 |
| **フレームワーク** | React 18 | 標準的な UI フレームワーク |
| **ビルドツール** | Vite | 高速開発サーバー、モダン設定 |
| **パッケージマネージャ** | npm | Node.js の標準ツール |
| **Linter** | ESLint 8 | コード品質管理 |
| **フォーマッター** | Prettier 3 | コード統一 |
| **コンテナ化** | Docker | 開発環境の統一 |
| **エディタ統合** | VS Code Dev Containers | シームレスな開発体験 |

## 環境差分の排除

### 問題：ローカル開発での環境差分

```
❌ Developer A: Node 18, npm 9, macOS
❌ Developer B: Node 20, npm 10, Ubuntu
❌ Developer C: Node 19, npm 11, Windows

→ 「A のローカルでは動くが、B のローカルでは動かない」問題発生
```

### 解決：Dev Containers

```
✅ Developer A, B, C 全員: Node 20 + npm 10 + Docker
   （OS 関係なく同じ環境）

→ 「全員同じ環境なので動く・動かないが統一」
```

## 品質ゲートの自動化

### ローカル開発時

```
ファイル保存
  ↓
Prettier が自動フォーマット（.vscode/settings.json）
  ↓
ESLint が自動修正（.vscode/settings.json + eslintrc.json）
  ↓
コミット可能状態に
```

### CI/CD パイプライン（GitHub Actions など）

```
git push
  ↓
CI サーバーで自動実行:
  ├─ npm ci
  ├─ npm run lint
  ├─ npm run type-check
  ├─ npm run build
  ↓
失敗 → 開発者に通知（ローカルでも同じ失敗になるはず）
成功 → マージ可能
```

## パフォーマンス最適化

### 1. ホットモジュール置換（HMR）

Vite のデフォルト機能で、ファイル保存時にブラウザが自動リロード

```typescript
// vite.config.ts
server: {
  watch: {
    usePolling: true,  // Docker 内での監視対応
  },
}
```

### 2. node_modules の分離

```yaml
# docker-compose.yml
volumes:
  - .:/workspace
  - /workspace/node_modules  # コンテナ内に保持
```

ホスト OS の `node_modules` を汚染しない

### 3. マルチステージビルド（本番環境）

```dockerfile
# 開発用 Stage
FROM node:20 AS dev

# ビルド Stage（本番向け）
FROM node:20 AS build
COPY --from=dev /app /app
RUN npm run build

# 本番 Stage
FROM node:20-alpine AS prod
COPY --from=build /app/dist /app/dist
```

現在は開発環境なので単一 Stage（シンプル性重視）

## チーム運用のベストプラクティス

### 1. 環境変数の管理

```bash
# チーム共有: .env.example
VITE_API_URL=http://localhost:3000

# 個別管理: .env（git 除外）
VITE_API_URL=http://my-staging-api.example.com
```

### 2. 依存パッケージの更新

```bash
# 定期的な更新（月 1 回推奨）
npm update

# セキュリティ更新（即座に対応）
npm audit fix

# パッケージ追加時は package-lock.json も一緒にコミット
npm install <package-name>
git add package.json package-lock.json
```

### 3. Node.js バージョン更新

1. `.nvmrc` を更新
2. `.devcontainer/devcontainer.json` の `image` も更新
3. GitHub で `node-version` ワークフロー変数も更新（CI 用）

```bash
# ローカルで更新確認
nvm use  # .nvmrc を読み込み
npm ci   # 再インストール
npm test
```

## トラブルシューティング

### Dev Container が起動しない

**症状**: `Cannot connect to Docker daemon`

**原因**: Docker Desktop が起動していない

**解決**:
```bash
# Docker Desktop を起動
# または、コマンドラインから：
docker ps  # 接続確認

# 再ビルド
# VS Code: Dev Containers: Rebuild Container
```

### ポートが競合している

**症状**: `bind: address already in use`

**原因**: 別のアプリケーションがポート 5173 を使用

**解決**:
```bash
# 占有しているプロセスを確認
lsof -i :5173

# ポート変更（開発サーバー起動時）
VITE_PORT=5174 npm run dev
```

### npm パッケージが見つからない

**症状**: `npm ERR! code E404`

**原因**: package-lock.json が古い、またはレジストリ問題

**解決**:
```bash
# 再インストール
npm ci

# キャッシュクリア + フルインストール
npm cache clean --force
npm install
```

## 拡張性

### 新しい npm パッケージの追加

```bash
npm install <package-name> --save
npm install <package-name> --save-dev
git add package.json package-lock.json
```

### 新しい VS Code 拡張の推奨

```json
// .vscode/extensions.json に追加
{
  "recommendations": [
    "existing-extension",
    "new-extension-publisher.new-extension"  // 追加
  ]
}
```

### 新しいポートを追加

```json
// .devcontainer/devcontainer.json
"forwardPorts": [5173, 3000, 8000],
```

---

**更新日**: 2026-01-10  
**メンテナンス責任者**: チーム開発リーダー
