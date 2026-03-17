# 🅿️ Smart Parking — Разработка интеллектуальной системы для частной парковки

> Дипломный проект — Технический Университет Молдовы, TI-227  
> Студент: Димитриу Эдуард | Руководитель: Черней Ирина

---

## 📌 Цель проекта

Разработка интеллектуальной системы управления парковкой, объединяющей:
- **Веб-приложение** для администраторов — мониторинг занятости мест, управление тарифами, статистика
- **Мобильное приложение** для водителей — просмотр свободных мест, бронирование, онлайн-оплата
- **Физический макет** парковки — ESP32 с датчиками занятости, шлагбаум, светодиодная индикация, передача данных в реальном времени по Wi-Fi/MQTT

---

## 🛠️ Технологии и инструменты

| Уровень | Технологии |
|---------|-----------|
| Backend | Node.js 22, Express, MongoDB, Mongoose, Socket.io |
| Веб-клиент | React 19, Vite, React Router |
| Мобильное приложение | Flutter, Dart |
| IoT / Прошивки | ESP32, Arduino (PlatformIO), C++ |
| Протоколы | REST API, WebSocket, MQTT |
| Инфраструктура | Docker, Docker Compose, Eclipse Mosquitto, Nginx |
| Авторизация | JWT, bcrypt |

---

## 📁 Структура проекта

```
smart-parking/
├── server/              # REST API + WebSocket + MQTT-сервис
│   ├── src/
│   │   ├── routes/      # API-маршруты (auth, bookings, parking, ...)
│   │   ├── models/      # Mongoose-модели
│   │   ├── services/    # mqttService, bookingScheduler, cameraScanner
│   │   └── server.js    # Точка входа
│   └── Dockerfile
├── web/                 # Веб-приложение (React + Vite)
│   ├── src/
│   │   ├── pages/       # Страницы (admin, user, auth)
│   │   ├── components/  # Переиспользуемые компоненты
│   │   └── services/    # wsService, api
│   └── Dockerfile
├── mobile/              # Мобильное приложение (Flutter)
│   ├── lib/
│   │   ├── screens/     # Экраны приложения
│   │   ├── providers/   # State management (Provider)
│   │   └── services/    # socketService, apiService
│   └── Dockerfile
├── esp32/               # Прошивки ESP32-устройств
│   ├── Esp32-barrier/   # Контроллер шлагбаума + ИК-датчики мест
│   ├── Esp32-cam-entry/ # Камера въезда (IP 192.168.x.48)
│   └── Esp32-cam-exit/  # Камера выезда (IP 192.168.x.49)
├── docker-compose.yml
├── mosquitto.conf       # Конфигурация MQTT-брокера
└── .env.docker          # Шаблон переменных окружения
```

---

## 🚀 Запуск проекта

### Предварительные требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (версия 24+)
- [Git](https://git-scm.com/)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/Dwarfpt/smart-parking.git
cd smart-parking
```

### 2. Настроить переменные окружения

```bash
cp .env.docker .env
```

Открыть `.env` и заполнить секреты:

```env
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=mongodb://mongo:27017/smartparking
MQTT_URL=mqtt://mqtt:1883
```


### 3. Запустить все сервисы

```bash
docker compose up --build -d
```

### 4. Доступ к приложениям

| Сервис | URL |
|--------|-----|
| Веб-приложение (React) | http://localhost:3000 |
| Мобильное приложение (Flutter) | http://localhost:8080 |
| REST API | http://localhost:5000/api |
| MQTT-брокер | localhost:1883 |

### 5. Тестовые аккаунты (после запуска seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@smartparking.md | admin123 |
| Водитель | user@smartparking.md | user123 |

---

## 🔌 Прошивки ESP32

Прошивки находятся в папке `esp32/`. Для сборки и загрузки используется [PlatformIO](https://platformio.org/).

```bash
cd esp32/Esp32-barrier
pio run --target upload --upload-port COM3

cd esp32/Esp32-cam-entry
pio run --target upload --upload-port COM4
```

Перед загрузкой настроить `include/config.h` в каждой прошивке:

```cpp
#define WIFI_SSID     "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"
#define MQTT_HOST     "192.168.x.x"   // IP хоста с Docker
```

---

## 🔒 Безопасность и правила использования

- Секреты (JWT, пароли, API-ключи) хранятся **только** в `.env`, который добавлен в `.gitignore`
- Не используйте `git push --force` без согласования с координатором
- Не загружайте бинарные файлы, архивы, дампы БД или скомпилированные артефакты

---

## 📄 Лицензия

Проект разработан в учебных целях в рамках дипломной работы  
Технический Университет Молдовы, 2025–2026
