FROM oven/bun:1-debian

WORKDIR /app

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Dependencies first (better layer caching)
COPY patcher-rag/package.json patcher-rag/bun.lock patcher-rag/tsconfig.json ./

# Prisma schema needed at generate time
COPY patcher-rag/prisma ./prisma

RUN bun install

# Generate the Prisma MongoDB client into lib/prisma-client
RUN bunx prisma generate --schema=./prisma/schema.prisma

# Copy db.ts after generate so lib/prisma-client is not overwritten
COPY patcher-rag/lib/db.ts ./lib/db.ts

# Source code last
COPY patcher-rag/src ./src

ENV NODE_ENV=production

EXPOSE 4000

CMD ["bun", "run", "src/main.ts"]
