// ============================================================
//  Smart Parking — ESP32 Barrier Controller — Конфигурация
//
//  Оборудование:
//    4x ИК-датчик XRY (обнаружение машин на парковочных местах)
//    1x Сервопривод SG90 (шлагбаум)
//
//  Связь:
//    WiFi → MQTT брокер (на сервере)
//    Публикует: статус мест, статус шлагбаума, heartbeat
//    Подписан на: команды шлагбауму (open/close)
//
//  Схема подключения:
//    ИК-датчик → LOW = машина, HIGH = свободно
//    Серво → 0° = закрыт, 90° = открыт
// ============================================================
#ifndef CONFIG_H
#define CONFIG_H

// ===================== WiFi =====================
#define WIFI_SSID        "Bandage"
#define WIFI_PASSWORD    "3AgBqgjd"
#define WIFI_TIMEOUT_MS  15000

// ===================== Статический IP =====================
#define STATIC_IP        192,168,100,50
#define STATIC_GATEWAY   192,168,100,1
#define STATIC_SUBNET    255,255,255,0
#define STATIC_DNS       8,8,8,8

// ===================== MQTT =====================
#define MQTT_BROKER      "192.168.100.2"
#define MQTT_PORT        1883
#define MQTT_CLIENT_ID   "esp32-barrier-01"

// ===================== Идентификаторы =====================
#define DEVICE_ID        "barrier-01"
#define PARKING_LOT_ID   "lot1"

// ===================== MQTT-топики =====================
// Подписка (команды от сервера)
#define TOPIC_BARRIER_CMD   "parking/lot1/barrier/cmd"
// Публикация (статус шлагбаума)
#define TOPIC_BARRIER_STATUS "parking/lot1/barrier/status"
// Публикация (статус парковочных мест)
#define TOPIC_SPOTS_STATUS  "parking/lot1/spots/status"
// Heartbeat
#define TOPIC_HEARTBEAT     "parking/lot1/heartbeat"

// ===================== Пины ИК-датчиков (XRY) =====================
// Плата расширения: D(n) = S(Signal) V(3.3V) G(GND)
// Каждый датчик: LOW = препятствие (машина), HIGH = свободно
//
//  Датчик        Пин платы   GPIO    Подключение
//  ИК #1 (Место 1)  D5 (S)     32     S → GPIO32, V → 3.3V, G → GND
//  ИК #2 (Место 2)  D6 (S)     33     S → GPIO33, V → 3.3V, G → GND
//  ИК #3 (Место 3)  D7 (S)     34     S → GPIO34, V → 3.3V, G → GND
//  ИК #4 (Место 4)  D8 (S)     35     S → GPIO35, V → 3.3V, G → GND
//
#define IR_SENSOR_1_PIN  32   // D5 (S) → Место 1
#define IR_SENSOR_2_PIN  33   // D6 (S) → Место 2
#define IR_SENSOR_3_PIN  34   // D7 (S) → Место 3
#define IR_SENSOR_4_PIN  35   // D8 (S) → Место 4

// ===================== Сервопривод (SG90) =====================
//  Серво          D1 (S)     25     S → GPIO25, V → 5V, G → GND
#define SERVO_PIN        25   // D1 (S) → Шлагбаум

#define SERVO_CLOSED_ANGLE  0    // Шлагбаум закрыт (градусы)
#define SERVO_OPEN_ANGLE    90   // Шлагбаум открыт (градусы)
#define BARRIER_AUTO_CLOSE_MS 7000  // Автозакрытие через 7 сек

// ===================== Таймеры (мс) =====================
#define SPOT_CHECK_INTERVAL_MS  500   // Опрос ИК-датчиков каждые 0.5 сек
#define SPOT_DEBOUNCE_MS        2000  // Дебаунс: изменение статуса через 2 сек
#define HEARTBEAT_INTERVAL_MS   30000 // Heartbeat каждые 30 сек
#define MQTT_RECONNECT_MS       5000  // Переподключение MQTT

#endif
