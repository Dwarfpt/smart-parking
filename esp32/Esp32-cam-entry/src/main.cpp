// ============================================================
//  Smart Parking — ESP32-CAM (ВЪЕЗД) — main.cpp
//  HTTP JPEG-сервер для QR-сканирования при въезде на парковку
//
//  Эндпоинты:
//    /cam-hi.jpg   — 800×600 (для QR-декодирования на сервере)
//    /cam-mid.jpg  — 350×530
//    /cam-lo.jpg   — 320×240
//    /             — MJPEG-стрим
//
//  IP: 192.168.100.48 (статический)
//  Сервер опрашивает /cam-hi.jpg каждые 2 сек для QR-сканирования
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <esp32cam.h>
#include "esp_camera.h"
#include "CameraServer.h"
#include "config.h"

// ===================== Объекты =====================

CameraServer camServer(80);

// Разрешение для QR-сканирования (800×600)
static auto hiRes = esp32cam::Resolution::find(800, 600);

// ===================== Состояние =====================

bool cameraOk = false;                     // Камера инициализирована
int captureFailStreak = 0;                 // Счётчик последовательных ошибок захвата
unsigned long lastWifiCheck = 0;           // Таймер проверки WiFi
unsigned long lastCameraRetry = 0;         // Таймер повторной инициализации камеры

// ===================== Инициализация камеры =====================

bool initCamera() {
    using namespace esp32cam;

    // Освобождаем ресурсы перед повторной инициализацией
    esp_camera_deinit();
    delay(100);

    Config cfg;
    cfg.setPins(pins::AiThinker);
    cfg.setResolution(hiRes);
    cfg.setBufferCount(CAM_BUFFER_COUNT);
    cfg.setJpeg(CAM_JPEG_QUALITY);

    bool ok = Camera.begin(cfg);
    Serial.println(ok ? "[CAM] Камера ОК" : "[CAM] Ошибка инициализации");
    return ok;
}

// ===================== Настройка сенсора =====================

void configureSensor() {
    sensor_t *s = esp_camera_sensor_get();
    if (!s) return;

    s->set_brightness(s, 0);                        // Нормальная яркость
    s->set_contrast(s, 1);                           // Повышенный контраст (для QR)
    s->set_whitebal(s, 1);                           // Авто-баланс белого
    s->set_aec2(s, 1);                               // Авто-экспозиция
    s->set_ae_level(s, 0);                           // Нейтральный уровень AE
    s->set_gainceiling(s, (gainceiling_t)4);         // Предел усиления
    s->set_bpc(s, 1);                                // Коррекция битых пикселей
    s->set_wpc(s, 1);                                // Коррекция белых пикселей
}

// ===================== WiFi =====================

void connectWiFi() {
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.config(
        IPAddress(STATIC_IP),
        IPAddress(STATIC_GATEWAY),
        IPAddress(STATIC_SUBNET),
        IPAddress(STATIC_DNS)
    );
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.printf("[WIFI] Подключение к %s...\n", WIFI_SSID);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        if (millis() - start > WIFI_TIMEOUT_MS) {
            Serial.println("\n[WIFI] Таймаут — перезагрузка");
            ESP.restart();
        }
    }
    Serial.printf("\n[WIFI] Подключено: %s\n", WiFi.localIP().toString().c_str());
}

// ===================== SETUP =====================

void setup() {
    Serial.begin(115200);
    Serial.println("\n========================================");
    Serial.println("  Smart Parking — Камера ВЪЕЗДА");
    Serial.printf("  ID: %s | IP: 192.168.100.48\n", DEVICE_ID);
    Serial.println("========================================");

    // 1. Инициализация камеры (до 3 попыток)
    for (int attempt = 1; attempt <= 3; attempt++) {
        Serial.printf("[CAM] Попытка %d/3...\n", attempt);
        cameraOk = initCamera();
        if (cameraOk) break;
        delay(500);
    }
    if (!cameraOk) {
        Serial.println("[CAM] Все 3 попытки неудачны — повтор в loop()");
    }

    // 2. Настройки сенсора
    configureSensor();

    // 3. WiFi
    connectWiFi();

    // 4. HTTP-сервер
    camServer.begin();

    Serial.println("[HTTP] Эндпоинты:");
    Serial.println("  /cam-hi.jpg  — 800x600 (QR)");
    Serial.println("  /cam-mid.jpg — 350x530");
    Serial.println("  /cam-lo.jpg  — 320x240");
    Serial.println("  /            — MJPEG стрим");
}

// ===================== LOOP =====================

void loop() {
    // Обработка HTTP-запросов
    camServer.handleClient();

    unsigned long now = millis();

    // Повторная инициализация камеры если не удалась при старте
    if (!cameraOk && (now - lastCameraRetry >= CAMERA_RETRY_MS)) {
        lastCameraRetry = now;
        Serial.println("[CAM] Повторная инициализация...");
        cameraOk = initCamera();
        if (cameraOk) captureFailStreak = 0;
    }

    // Авто-рестарт при серии ошибок захвата
    if (captureFailStreak >= CAPTURE_FAIL_LIMIT) {
        Serial.printf("[CAM] %d ошибок подряд — перезагрузка\n", captureFailStreak);
        delay(500);
        ESP.restart();
    }

    // WiFi watchdog — переподключение при обрыве
    if (now - lastWifiCheck >= WIFI_CHECK_MS) {
        lastWifiCheck = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WIFI] Обрыв связи, переподключение...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            unsigned long start = millis();
            while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
                delay(200);
            }
            Serial.println(WiFi.status() == WL_CONNECTED
                ? "[WIFI] Восстановлено" : "[WIFI] Не удалось, повтор в следующем цикле");
        }
    }

    delay(1);  // Yield — даём WiFi-стеку время
}
