FROM mcr.microsoft.com/devcontainers/typescript-node:20-bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && \
    npm install -g pnpm@latest

WORKDIR /workspace
