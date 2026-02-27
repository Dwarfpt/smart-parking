# Smart Parking

Система умной парковки с веб-интерфейсом и мобильным приложением.

## Стек технологий

- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Web:** React 19, Vite, React Router
- **Mobile:** Flutter, Dart
- **Инфраструктура:** Docker Compose, Mosquitto (MQTT), Nginx

## Структура проекта

```
├── server/          # REST API сервер
├── web/             # Веб-приложение (React + Vite)
├── mobile/          # Мобильное приложение (Flutter)
├── docker-compose.yml
├── mosquitto.conf
└── .env.docker      # Шаблон переменных окружения
```

## Запуск через Docker

```bash
cp .env.docker .env
# Заполните секреты в .env
docker compose up --build -d
```

Доступ:
- Веб: http://localhost:3000
- API: http://localhost:5000/api
- Mobile: http://localhost:8080

## Локальный запуск

### Сервер
```bash
cd server
npm install
npm run dev
```

### Веб
```bash
cd web
npm install
npm run dev
```

## Тестирование

```bash
# Серверные тесты
cd server && npm test

# Веб-тесты
cd web && npx vitest run
```

## Тестовые аккаунты

| Роль   | Email                   | Пароль   |
|--------|-------------------------|----------|
| Админ  | admin@smartparking.md   | admin123 |
| Юзер   | user@smartparking.md    | user123  |
| Юзер 2 | maria@example.com       | maria123 |
