// ============================================================
//  Smart Parking — ESP32-CAM — Конфигурация
//  HTTP JPEG-сервер для QR-сканирования
//  IP: 10.27.14.48
// ============================================================
#ifndef CONFIG_H
#define CONFIG_H

// ===================== Идентификатор камеры =====================
#define DEVICE_ID        "cam-01"

// ===================== WiFi =====================
#define WIFI_SSID        "Fear"
#define WIFI_PASSWORD    "56567878"
#define WIFI_TIMEOUT_MS  15000

// ===================== Статический IP =====================
#define STATIC_IP        10, 27, 14, 48
#define STATIC_GATEWAY   10, 27, 14, 207
#define STATIC_SUBNET    255, 255, 255, 0
#define STATIC_DNS       8, 8, 8, 8

// ===================== Камера =====================
#define CAM_JPEG_QUALITY    65      // Качество JPEG (снижено для меньшего потребления)
#define CAM_BUFFER_COUNT    1       // 1 буфер — меньше RAM и пиковый ток

// ===================== Watchdog (мс) =====================
#define WIFI_CHECK_MS       10000   // Проверка WiFi каждые 10 сек
#define CAMERA_RETRY_MS     30000   // Повтор инициализации камеры
#define CAPTURE_FAIL_LIMIT  20      // Рестарт после N ошибок подряд

#endif
