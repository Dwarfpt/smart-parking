// ============================================================
//  Smart Parking — ESP32 Barrier Controller — Конфигурация
//
//  Оборудование:
//    1x OLED 0.96" I2C 128x64 (SSD1306, жёлто-синий)
//    4x ИК-датчик (парковочные места)
//    1x ИК-датчик (под шлагбаумом — безопасность)
//    1x Сервопривод SG90 (шлагбаум)
//
//  Связь:
//    WiFi → MQTT брокер (на сервере)
//    Публикует: статус мест, статус шлагбаума, heartbeat
//    Подписан на: команды шлагбауму, информация о бронях
//
//  Схема подключения:
//    OLED SDA → GPIO21, SCL → GPIO22
//    ИК-датчик → LOW = машина, HIGH = свободно
//    Серво → 0° = закрыт, 90° = открыт
// ============================================================
#ifndef CONFIG_H
#define CONFIG_H

// ===================== WiFi =====================
#define WIFI_SSID        "Fear"
#define WIFI_PASSWORD    "56567878"
#define WIFI_TIMEOUT_MS  15000

// ===================== Статический IP =====================
#define STATIC_IP        10,84,197,50
#define STATIC_GATEWAY   10,84,197,107
#define STATIC_SUBNET    255,255,255,0
#define STATIC_DNS       8,8,8,8

// ===================== MQTT =====================
#define MQTT_BROKER      "10.84.197.123"
#define MQTT_PORT        1883
#define MQTT_CLIENT_ID   "esp32-barrier-01"

// ===================== Идентификаторы =====================
#define DEVICE_ID        "barrier-01"
#define PARKING_LOT_ID   "lot1"

// ===================== MQTT-топики =====================
#define TOPIC_BARRIER_CMD      "parking/lot1/barrier/cmd"
#define TOPIC_BARRIER_STATUS   "parking/lot1/barrier/status"
#define TOPIC_SPOTS_STATUS     "parking/lot1/spots/status"
#define TOPIC_SPOTS_RESERVED   "parking/lot1/spots/reserved"
#define TOPIC_HEARTBEAT        "parking/lot1/heartbeat"

// ===================== OLED SSD1306 (I2C) =====================
#define OLED_SDA_PIN     21
#define OLED_SCL_PIN     22
#define OLED_WIDTH       128
#define OLED_HEIGHT      64
#define OLED_ADDR        0x3C

// ===================== ИК-датчик под шлагбаумом =====================
//  Безопасность: если машина под шлагбаумом → не закрывать
#define IR_BARRIER_PIN   34

// ===================== ИК-датчики парковочных мест =====================
//  LOW = машина, HIGH = свободно
#define IR_SENSOR_1_PIN  26   // Место 1
#define IR_SENSOR_2_PIN  27   // Место 2
#define IR_SENSOR_3_PIN  14   // Место 3
#define IR_SENSOR_4_PIN  12   // Место 4

// ===================== Сервопривод SG90 =====================
#define SERVO_PIN            13
#define SERVO_CLOSED_ANGLE   0     // Шлагбаум закрыт (градусы)
#define SERVO_OPEN_ANGLE     90    // Шлагбаум открыт (градусы)
#define BARRIER_AUTO_CLOSE_MS 5000 // Автозакрытие через 5 сек после проезда

// ===================== Таймеры (мс) =====================
#define SPOT_CHECK_INTERVAL_MS   500    // Опрос ИК-датчиков мест
#define SPOT_DEBOUNCE_MS         2000   // Дебаунс мест
#define BARRIER_IR_DEBOUNCE_MS   300    // Дебаунс датчика шлагбаума (быстрый)
#define OLED_UPDATE_MS           500    // Обновление OLED
#define HEARTBEAT_INTERVAL_MS    30000  // Heartbeat
#define MQTT_RECONNECT_MS        5000   // Переподключение MQTT

#endif
