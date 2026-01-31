# 開発用 Dockerfile for Vite + TypeScript
# マルチアーキ対応 (arm64 / amd64)

FROM node:latest

# 作業ディレクトリを設定
WORKDIR /workspace

# 依存関係ファイルを先にコピー（キャッシュ最適化）
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# 開発サーバを起動（--host で外部からアクセス可能に）
CMD ["npm", "run", "dev", "--", "--host"]
