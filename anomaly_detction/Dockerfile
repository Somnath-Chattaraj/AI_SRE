FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install
RUN npm install -g tsx

COPY src/ ./src/
COPY tsconfig.json ./

# ✅ copy .env file into container
COPY .env .env

ENV REPORTS_DIR=/app/reports

CMD ["npx", "tsx", "src/main.ts"]