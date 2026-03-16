// ============================================================
//  Smart Parking — ESP32-CAM (ВЫЕЗД) — Конфигурация
//  HTTP JPEG-сервер для QR-сканирования на выезде
//  IP: 192.168.100.49
// ============================================================
#ifndef CONFIG_H
#define CONFIG_H

// ===================== Идентификатор камеры =====================
#define DEVICE_ID        "cam-exit-01"
#define CAM_ROLE         "exit"

// ===================== WiFi =====================
#define WIFI_SSID        "Bandage"
#define WIFI_PASSWORD    "3AgBqgjd"
#define WIFI_TIMEOUT_MS  15000

// ===================== Статический IP (выезд .49) =====================
#define STATIC_IP        192, 168, 100, 49
#define STATIC_GATEWAY   192, 168, 100, 1
#define STATIC_SUBNET    255, 255, 255, 0
#define STATIC_DNS       8, 8, 8, 8

// ===================== Камера =====================
#define CAM_JPEG_QUALITY    80      // Качество JPEG (0-100)
#define CAM_BUFFER_COUNT    2       // Буферов камеры (2 = лучше для стрима)

// ===================== Watchdog (мс) =====================
#define WIFI_CHECK_MS       10000   // Проверка WiFi каждые 10 сек
#define CAMERA_RETRY_MS     30000   // Повтор инициализации камеры каждые 30 сек
#define CAPTURE_FAIL_LIMIT  20      // Рестарт после 20 последовательных ошибок

#endif
