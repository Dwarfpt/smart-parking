# ===== Smart Parking Mobile (Flutter Web) — Build Stage =====
FROM ghcr.io/cirruslabs/flutter:3.29.2 AS build

WORKDIR /app

# Копируем pubspec файлы и скачиваем зависимости
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Копируем весь проект
COPY . .

# API URL можно передать через --dart-define
ARG API_BASE_URL=http://localhost:5000/api
ARG SOCKET_URL=http://localhost:5000

# Собираем веб-версию мобильного приложения
RUN flutter build web --release \
    --dart-define=API_BASE_URL=$API_BASE_URL \
    --dart-define=SOCKET_URL=$SOCKET_URL

# ===== Production — Nginx =====
FROM nginx:1.27-alpine

COPY --from=build /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
