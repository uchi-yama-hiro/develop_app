# Team Development Environment with VS Code Dev Containers

複数人での開発を想定した、Docker + VS Code Dev Containers の統一開発環境です。

## システム要件

- **Docker Desktop** (Mac/Windows: 4.10.0 以上推奨)
- **VS Code** (最新版)
- **VS Code Remote Containers 拡張** (自動インストール)

## 環境セットアップ

### 1. リポジトリのクローン

```bash
git clone <your-repo-url>
cd Docker/my-app
```

### 2. Docker Desktop 起動

Mac/Windows のアプリケーションフォルダから「Docker Desktop」を起動してください。

### 3. VS Code で開く

```bash
code .
```

### 4. Dev Container で開く

VS Code を開くと、通知が表示されます：

```
Folder contains a Dev Container configuration file. Reopen folder to develop in a container.
```

- **「Reopen in Container」ボタン** をクリック、または
- コマンドパレット (`Cmd+Shift+P`) → `Dev Containers: Reopen in Container` を選択

### 5. 初回セットアップ（自動実行）

Dev Container が起動する際に以下が自動実行されます：

- `npm install` - 依存パッケージのインストール
- `npm run dev` - Vite 開発サーバーの起動

ターミナルで以下が表示されたら準備完了です：

```
➜  Local:   http://localhost:5173/
```

### 6. ブラウザで確認

[http://localhost:5173](http://localhost:5173) を開いてアプリケーションを確認できます。

## よく使うコマンド

Dev Container 内のターミナルで実行：

```bash
# 開発サーバー起動（既に起動済み）
npm run dev

# ビルド
npm run build

# Lint チェック
npm run lint

# Lint + 自動修正
npm run lint:fix

# 型チェック
npm run type-check

# フォーマット
npm run format

# プレビュー（ビルド後）
npm run preview
```

## VS Code ショートカット

- **Ctrl+Shift+B** (またはコマンドパレット) → `npm: dev` で開発サーバー起動
- **Ctrl+Shift+P** → `npm: lint` で Lint 実行
- **Ctrl+Shift+P** → `npm: build` でビルド実行

## トラブルシューティング

### 「Cannot connect to Docker daemon」エラー

**解決:**
1. Docker Desktop が起動しているか確認
2. VS Code を再起動
3. コマンドパレット → `Dev Containers: Rebuild Container` を実行

### ポート 5173 がすでに使用中

**解決:**
```bash
# 既存プロセスを確認
lsof -i :5173

# Dev Container 内で別のポートで起動
VITE_PORT=5174 npm run dev
```

### パッケージが見つからない

**解決:**
```bash
# Dev Container 内で再インストール
npm install
```

### SSH キーが見つからない

Dev Container はホストの `~/.ssh` を自動にマウントしています。必要に応じて設定を確認してください。

```bash
# コンテナ内で SSH キーを確認
ls -la ~/.ssh
```

## 構成ファイル説明

| ファイル | 用途 |
|---------|------|
| `.devcontainer/devcontainer.json` | Dev Container の設定（VS Code 拡張、ポート、自動実行コマンド） |
| `.devcontainer/Dockerfile` | Docker イメージ定義（Node.js 20 ベース） |
| `package.json` | npm 依存パッケージ定義 |
| `.vscode/settings.json` | VS Code ワークスペース設定（Prettier、ESLint 連携） |
| `.vscode/tasks.json` | npm スクリプトの VS Code タスク化 |
| `.env.example` | 環境変数テンプレート（`.env` を新規作成して使用） |
| `.eslintrc.json` | ESLint ルール定義 |
| `.prettierrc.json` | Prettier フォーマット設定 |

## 環境変数の設定

```bash
# .env.example をコピー
cp .env.example .env

# .env を編集
vi .env
```

`.env` は Git 管理外（`.gitignore`）なので、秘密情報を記入しても安全です。

## チームでの運用

### ブランチ作成

```bash
git checkout -b feature/your-feature-name
```

### コミット前のチェック

```bash
# Lint と型チェック
npm run lint:fix && npm run type-check
```

### プルリクエスト

1. フォーマット・Lint が通っているか確認
2. ローカルで `npm run build` が成功しているか確認
3. PR を作成

### 依存パッケージの更新

```bash
# 新しいパッケージ追加
npm install <package-name>

# ロックファイル（package-lock.json）も一緒にコミット
git add package.json package-lock.json
git commit -m "add: <package-name>"
```

## 更新・メンテナンス

### Dev Container イメージ更新

```bash
# コマンドパレット → Dev Containers: Rebuild Container
```

### Node.js バージョン変更

1. `.nvmrc` ファイルを編集
2. `.devcontainer/devcontainer.json` の `image` も更新
3. Dev Container を再ビルド

## Docker Compose での直接実行（オプション）

VS Code Dev Containers の代わりに、Docker Compose で直接実行することもできます：

```bash
cd Docker/my-app
docker compose up -d --build

# ブラウザで確認
open http://localhost:5173

# ログ確認
docker logs team-dev-app-container --tail 100

# 停止
docker compose down
```

**注**: 本開発環境は **VS Code Dev Containers を必須** としているため、通常は上記の Dev Containers フロー（手順 1-6）を使用してください。

## その他

- **GitHub Copilot**: 有効になっています（推奨拡張）
- **GitLens**: コミット履歴を簡単に確認（推奨拡張）
- **Node.js バージョン**: `.nvmrc` に `20` を固定（Node.js 20.x）

---

**問題報告**: このドキュメントで不明な点やセットアップが上手くいかない場合は、チームリーダーに報告してください。
