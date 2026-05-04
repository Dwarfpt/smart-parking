# ===== Smart Parking Server =====
FROM node:22-alpine AS base

WORKDIR /app

# Установка зависимостей
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Копирование исходного кода
COPY src/ ./src/

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

EXPOSE 5000

CMD ["node", "src/server.js"]
