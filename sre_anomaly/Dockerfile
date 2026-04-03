FROM oven/bun:1-alpine as base
WORKDIR /app

# Install dependancies depending on package files
COPY package.json bun.lock ./
COPY prisma ./prisma

RUN bun install
RUN bunx prisma generate

# Copy source code
COPY . .

# Expose backend port
EXPOSE 3000

# Entrypoint will be overridden by docker-compose for worker vs backend
CMD ["bun", "run", "src/index.ts"]
