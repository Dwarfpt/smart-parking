// ============================================================
//  Smart Parking — ESP32-CAM — main.cpp
//  HTTP JPEG-сервер для QR-сканирования на парковке
//
//  Эндпоинты:
//    /cam-hi.jpg   — 800×600 (для QR-декодирования на сервере)
//    /cam-mid.jpg  — 350×530
//    /cam-lo.jpg   — 320×240
//    /             — MJPEG-стрим (живой просмотр)
//
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

// ===================== Состояние =====================

bool cameraOk = false;
int captureFailStreak = 0;
unsigned long lastWifiCheck = 0;
unsigned long lastCameraRetry = 0;

// ===================== Инициализация камеры =====================

bool initCamera() {
    using namespace esp32cam;

    esp_camera_deinit();
    delay(100);

    Config cfg;
    cfg.setPins(pins::AiThinker);
    cfg.setResolution(Resolution::find(800, 600));
    cfg.setBufferCount(CAM_BUFFER_COUNT);
    cfg.setJpeg(CAM_JPEG_QUALITY);

    bool ok = Camera.begin(cfg);
    Serial.println(ok ? "[CAM] OK" : "[CAM] Ошибка инициализации");
    return ok;
}

// ===================== Настройка сенсора =====================

void configureSensor() {
    sensor_t *s = esp_camera_sensor_get();
    if (!s) return;

    s->set_brightness(s, 0);
    s->set_contrast(s, 1);        // Повышенный контраст (для QR)
    s->set_whitebal(s, 1);
    s->set_aec2(s, 1);
    s->set_ae_level(s, 0);
    s->set_gainceiling(s, (gainceiling_t)4);
    s->set_bpc(s, 1);
    s->set_wpc(s, 1);
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
    Serial.printf("\n[WIFI] OK: %s\n", WiFi.localIP().toString().c_str());
}

// ===================== SETUP =====================

void setup() {
    Serial.begin(115200);
    Serial.println("\n========================================");
    Serial.println("  Smart Parking — Camera");
    Serial.printf("  ID: %s\n", DEVICE_ID);
    Serial.println("========================================");

    // Инициализация камеры (до 3 попыток)
    for (int i = 1; i <= 3; i++) {
        Serial.printf("[CAM] Попытка %d/3...\n", i);
        cameraOk = initCamera();
        if (cameraOk) break;
        delay(500);
    }
    if (!cameraOk) {
        Serial.println("[CAM] Все попытки неудачны — повтор в loop()");
    }

    configureSensor();
    connectWiFi();

    camServer.begin();
    Serial.println("[HTTP] Эндпоинты:");
    Serial.println("  /cam-hi.jpg  — 800x600 (QR)");
    Serial.println("  /cam-mid.jpg — 350x530");
    Serial.println("  /cam-lo.jpg  — 320x240");
    Serial.println("  /            — MJPEG стрим");
}

// ===================== LOOP =====================

void loop() {
    camServer.handleClient();

    unsigned long now = millis();

    // Повторная инициализация камеры
    if (!cameraOk && (now - lastCameraRetry >= CAMERA_RETRY_MS)) {
        lastCameraRetry = now;
        cameraOk = initCamera();
        if (cameraOk) captureFailStreak = 0;
    }

    // Авто-рестарт при серии ошибок захвата
    if (captureFailStreak >= CAPTURE_FAIL_LIMIT) {
        Serial.printf("[CAM] %d ошибок подряд — перезагрузка\n", captureFailStreak);
        delay(500);
        ESP.restart();
    }

    // WiFi watchdog
    if (now - lastWifiCheck >= WIFI_CHECK_MS) {
        lastWifiCheck = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WIFI] Обрыв, переподключение...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            unsigned long start = millis();
            while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
                delay(200);
            }
            Serial.println(WiFi.status() == WL_CONNECTED
                ? "[WIFI] Восстановлено" : "[WIFI] Повтор позже");
        }
    }

    delay(1);
}
