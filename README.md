# 🅿️ Smart Parking — Интеллектуальная система управления парковкой

> Дипломный проект — Технический Университет Молдовы, TI-227  
> Студент: Димитриу Эдуард | Руководитель: Черней Ирина

---

## 📌 Цель проекта

Разработка интеллектуальной системы управления парковкой, объединяющей:
- **Веб-приложение** для администраторов — мониторинг занятости, управление тарифами, статистика
- **Мобильное приложение** для водителей — просмотр свободных мест, бронирование
- **Физический макет** — ESP32: ИК-датчики, шлагбаум, OLED-дисплей, Wi-Fi/MQTT

---

## 🛠️ Технологии

| Уровень | Технологии |
|---------|-----------|
| Backend | Node.js 22, Express, MongoDB, Socket.io |
| Веб-клиент | React 19, Vite |
| Мобильное | Flutter, Dart |
| IoT | ESP32, PlatformIO, C++, Adafruit SSD1306 |
| Протоколы | REST, WebSocket, MQTT |
| Инфраструктура | Docker Compose, Mosquitto, Nginx |
| Авторизация | JWT, Google OAuth |

---

## 📁 Структура проекта

```
smart-parking/
├── server/              # REST API + WebSocket + MQTT-сервис
├── web/                 # Веб-приложение (React + Vite)
├── mobile/              # Мобильное приложение (Flutter)
├── esp32/
│   ├── Esp32-barrier/   # Контроллер: шлагбаум + ИК-датчики + OLED
│   └── Esp32-cam/       # Камера: HTTP JPEG-сервер для QR-сканирования
├── docker-compose.yml
├── mosquitto.conf
└── .env.docker          # Шаблон переменных окружения
```

---

## 🚀 Быстрый запуск

### Требования
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+
- [Git](https://git-scm.com/)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/Dwarfpt/smart-parking.git
cd smart-parking
```

### 2. Создать файл `.env`

```bash
cp .env.docker .env
```

Заполните `.env` своими данными (см. раздел ниже).

### 3. Запустить все сервисы

```bash
docker compose up -d
```

### 4. Адреса сервисов

| Сервис | URL (localhost) | URL (по сети) |
|--------|----------------|---------------|
| Веб-приложение | http://localhost:3000 | http://ВАШ_IP:3000 |
| Мобильная версия | http://localhost:8081 | http://ВАШ_IP:8081 |
| REST API | http://localhost:5000/api | http://ВАШ_IP:5000/api |
| MQTT | localhost:1883 | — |

### 5. Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@smartparking.md | admin123 |
| Водитель | user@smartparking.md | user123 |

---

## ⚙️ Настройка для своей сети (ВАЖНО)

При смене Wi-Fi сети нужно обновить IP-адреса в трёх местах.

### Шаг 1 — Узнайте IP своего ноутбука/ПК

**Windows:**
```powershell
ipconfig
```
Найдите раздел **Wi-Fi → IPv4-адрес** и **Основной шлюз**.  
Пример: IP ноутбука = `192.168.1.100`, шлюз = `192.168.1.1`

**Linux/macOS:**
```bash
ip route get 1 | awk '{print $7}'
```

---

### Шаг 2 — Обновите `esp32/Esp32-barrier/include/config.h`

```cpp
// WiFi — ваша сеть
#define WIFI_SSID        "ВашWiFi"
#define WIFI_PASSWORD    "ВашПароль"

// Статический IP для макета (выберите свободный IP в вашей сети)
#define STATIC_IP        192,168,1,50     // ← любой свободный IP
#define STATIC_GATEWAY   192,168,1,1      // ← ваш шлюз (роутер)
#define STATIC_SUBNET    255,255,255,0
#define STATIC_DNS       8,8,8,8

// IP ноутбука с Docker (MQTT-брокер)
#define MQTT_BROKER      "192.168.1.100"  // ← ваш IP ноутбука
```

---

### Шаг 3 — Обновите `esp32/Esp32-cam/include/config.h`

```cpp
// WiFi — та же сеть
#define WIFI_SSID        "ВашWiFi"
#define WIFI_PASSWORD    "ВашПароль"

// Статический IP для камеры
#define STATIC_IP        192, 168, 1, 48  // ← свободный IP для камеры
#define STATIC_GATEWAY   192, 168, 1, 1   // ← ваш шлюз
#define STATIC_SUBNET    255, 255, 255, 0
#define STATIC_DNS       8, 8, 8, 8
```

---

### Шаг 4 — Обновите `docker-compose.yml`

Найдите и замените все вхождения старого IP ноутбука на новый:

```yaml
# В блоке server → environment:
- CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://192.168.1.100:3000,http://192.168.1.100:8081
- CAMERA_URL=http://192.168.1.48          # ← IP камеры

# В блоке mobile → args:
- API_BASE_URL=http://192.168.1.100:5000/api   # ← IP ноутбука
- SOCKET_URL=http://192.168.1.100:5000         # ← IP ноутбука
```

---

### Шаг 5 — Пересоберите и перезапустите

```bash
# Пересоберите контейнеры (нужно при смене IP в docker-compose.yml)
docker compose up -d --build server mobile

# Перепрошейте ESP32 в PlatformIO:
# esp32/Esp32-barrier → Upload
# esp32/Esp32-cam     → Upload
```

---

### Шаг 6 — Соберите новый APK (если используете Android)

```bash
cd mobile
flutter build apk --release \
  --dart-define=API_BASE_URL=http://192.168.1.100:5000/api \
  --dart-define=SOCKET_URL=http://192.168.1.100:5000
```

APK будет в `mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## 🔌 Прошивка ESP32

Используется [PlatformIO](https://platformio.org/) (VS Code расширение).

```
esp32/Esp32-barrier/   → COM3 (или ваш порт)
esp32/Esp32-cam/       → COM5 (или ваш порт)
```

> ⚠️ **Питание ESP32-CAM**: используйте отдельный блок питания **5V 1A+**.  
> USB-порт компьютера может не давать достаточно тока, что приводит к перезагрузкам камеры.

### Пины оборудования (Esp32-barrier)

| Компонент | GPIO | Описание |
|-----------|------|----------|
| OLED SDA | 21 | I2C данные |
| OLED SCL | 22 | I2C тактирование |
| Сервопривод SG90 | 13 | Шлагбаум |
| ИК под шлагбаумом | 34 | Безопасность — не закрывать при машине |
| ИК Место 1 | 26 | Датчик занятости |
| ИК Место 2 | 27 | Датчик занятости |
| ИК Место 3 | 14 | Датчик занятости |
| ИК Место 4 | 25 | Датчик занятости |

---

## 🔑 Переменные окружения (`.env`)

```env
# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_client_secret
GOOGLE_CALLBACK_URL=http://ВАШ_IP:5000/api/auth/google/callback

# JWT
JWT_SECRET=длинная_случайная_строка
JWT_EXPIRES_IN=7d

# Email (для 2FA)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш@gmail.com
SMTP_PASS=пароль_приложения
```

> ⚠️ Файл `.env` добавлен в `.gitignore` — никогда не коммитьте секреты!

---

## 🔒 Безопасность

- Секреты хранятся только в `.env`
- Google OAuth redirect URI должен быть добавлен в Google Cloud Console

---

## 📄 Лицензия

Проект разработан в учебных целях  
Технический Университет Молдовы, 2025–2026
