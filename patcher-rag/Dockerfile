FROM oven/bun:1.1-debian

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY patcher-rag/package.json patcher-rag/bun.lockb patcher-rag/tsconfig.json ./
COPY patcher-rag/src ./src

RUN bun install --frozen-lockfile

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "src/main.ts"]