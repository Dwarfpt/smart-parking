// ============================================================
//  Smart Parking — ESP32 Barrier Controller — main.cpp
//
//  Логика работы:
//    1. ИК-датчики мест опрашиваются каждые 500 мс (с дебаунсом)
//    2. При изменении → MQTT → сервер → БД → WebSocket → UI
//    3. Сервер отправляет open/close → шлагбаум реагирует
//    4. ИК-датчик ПОД шлагбаумом = безопасность:
//       — если машина под шлагбаумом → НЕ закрывать
//       — после проезда (датчик свободен) → автозакрытие
//    5. OLED-дисплей показывает статус мест и шлагбаума
//    6. Подписка на MQTT для получения информации о бронях
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

// ===================== Объекты =====================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Servo barrierServo;
Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// ===================== Парковочные места =====================

struct SpotSensor {
    uint8_t pin;
    uint8_t spotNumber;
    bool occupied;
    bool rawState;
    unsigned long changeAt;
};

SpotSensor spots[] = {
    { IR_SENSOR_1_PIN, 1, false, false, 0 },
    { IR_SENSOR_2_PIN, 2, false, false, 0 },
    { IR_SENSOR_3_PIN, 3, false, false, 0 },
    { IR_SENSOR_4_PIN, 4, false, false, 0 },
};
const int SPOT_COUNT = sizeof(spots) / sizeof(spots[0]);

// Бронирование (от сервера через MQTT)
bool spotReserved[4] = { false, false, false, false };

// ===================== Шлагбаум =====================

bool barrierOpen = false;
unsigned long barrierOpenedAt = 0;

// ИК-датчик под шлагбаумом (безопасность)
bool carUnderBarrier = false;
bool carUnderBarrierRaw = false;
unsigned long carUnderBarrierChangeAt = 0;

// ===================== Таймеры =====================

unsigned long lastSpotCheck = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastOledUpdate = 0;

// ===================== WiFi =====================

void connectWiFi() {
    Serial.print("[WIFI] Подключение к ");
    Serial.println(WIFI_SSID);

    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);

    IPAddress ip(STATIC_IP);
    IPAddress gw(STATIC_GATEWAY);
    IPAddress sn(STATIC_SUBNET);
    IPAddress dns(STATIC_DNS);
    WiFi.config(ip, gw, sn, dns);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        if (millis() - start > WIFI_TIMEOUT_MS) {
            Serial.println("\n[WIFI] Таймаут! Перезагрузка...");
            ESP.restart();
        }
    }
    Serial.printf("\n[WIFI] OK — %s\n", WiFi.localIP().toString().c_str());
}

// ===================== OLED-дисплей =====================

void initOLED() {
    Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);

    if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
        Serial.println("[OLED] Ошибка инициализации!");
        return;
    }

    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);
    oled.setCursor(16, 4);
    oled.print("SMART PARKING");
    oled.setCursor(24, 28);
    oled.print("Loading...");
    oled.display();
    Serial.println("[OLED] OK");
}

void updateOLED() {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);

    // === Жёлтая зона (верхние 16px) — Заголовок ===
    oled.setCursor(16, 4);
    oled.print("SMART PARKING");
    oled.drawLine(0, 15, 127, 15, SSD1306_WHITE);

    // === Синяя зона (16-63) — Статус мест ===
    int freeCount = 0, occCount = 0, rsvCount = 0;

    for (int i = 0; i < SPOT_COUNT; i++) {
        int col = i % 2;
        int row = i / 2;
        int x = col * 64 + 2;
        int y = 18 + row * 12;

        // Иконка состояния (квадрат 6x6)
        if (spots[i].occupied) {
            oled.fillRect(x, y + 1, 6, 6, SSD1306_WHITE);   // ■ занято
            occCount++;
        } else if (spotReserved[i]) {
            oled.drawRect(x, y + 1, 6, 6, SSD1306_WHITE);   // □ с X
            oled.drawLine(x, y + 1, x + 5, y + 6, SSD1306_WHITE);
            oled.drawLine(x + 5, y + 1, x, y + 6, SSD1306_WHITE);
            rsvCount++;
        } else {
            oled.drawRect(x, y + 1, 6, 6, SSD1306_WHITE);   // □ свободно
            freeCount++;
        }

        // Текст
        oled.setCursor(x + 9, y);
        oled.printf("P%d:", spots[i].spotNumber);
        if (spots[i].occupied)       oled.print("OCC");
        else if (spotReserved[i])    oled.print("RSV");
        else                         oled.print("FREE");
    }

    // === Итого ===
    oled.setCursor(0, 44);
    oled.printf("Free:%d Occ:%d Rsv:%d", freeCount, occCount, rsvCount);

    // === Шлагбаум + статус ===
    oled.setCursor(0, 55);
    if (barrierOpen) {
        oled.print("Bar:OPEN");
        if (carUnderBarrier) oled.print(" [CAR!]");
    } else {
        oled.print("Bar:CLOSED");
    }

    // MQTT индикатор
    oled.setCursor(104, 55);
    oled.print(mqtt.connected() ? "M:+" : "M:-");

    oled.display();
}

// ===================== Шлагбаум (сервопривод) =====================

void setBarrier(bool open) {
    int angle = open ? SERVO_OPEN_ANGLE : SERVO_CLOSED_ANGLE;
    barrierServo.write(angle);
    barrierOpen = open;

    if (open) {
        barrierOpenedAt = millis();
    }

    Serial.printf("[BARRIER] %s (%d°)\n", open ? "ОТКРЫТ" : "ЗАКРЫТ", angle);

    // Публикация статуса
    char json[96];
    snprintf(json, sizeof(json),
             "{\"open\":%s,\"blocked\":false,\"deviceId\":\"%s\"}",
             open ? "true" : "false", DEVICE_ID);
    mqtt.publish(TOPIC_BARRIER_STATUS, json, true);
}

// ===================== ИК-датчик шлагбаума (безопасность) =====================

void checkBarrierIR() {
    bool raw = digitalRead(IR_BARRIER_PIN) == LOW;  // LOW = машина
    unsigned long now = millis();

    if (raw != carUnderBarrierRaw) {
        carUnderBarrierRaw = raw;
        carUnderBarrierChangeAt = now;
    } else if (raw != carUnderBarrier &&
               (now - carUnderBarrierChangeAt) >= BARRIER_IR_DEBOUNCE_MS) {
        carUnderBarrier = raw;
        Serial.printf("[BARRIER IR] %s\n",
                      raw ? "МАШИНА ПОД ШЛАГБАУМОМ" : "ПРОЕЗД СВОБОДЕН");

        // Если шлагбаум открыт и машина только что проехала — сброс таймера
        if (barrierOpen && !raw) {
            barrierOpenedAt = millis();
        }
    }
}

// ===================== MQTT =====================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
        Serial.printf("[MQTT] JSON ошибка: %s\n", err.c_str());
        return;
    }

    String topicStr(topic);
    Serial.printf("[MQTT] << %s\n", topic);

    // Команда шлагбаума
    if (topicStr == TOPIC_BARRIER_CMD) {
        const char* action = doc["action"];
        if (!action) return;

        if (strcmp(action, "open") == 0) {
            setBarrier(true);
        } else if (strcmp(action, "close") == 0) {
            // Безопасность: не закрывать если машина под шлагбаумом
            if (carUnderBarrier) {
                Serial.println("[BARRIER] Закрытие ЗАБЛОКИРОВАНО — машина!");
                char json[96];
                snprintf(json, sizeof(json),
                         "{\"open\":true,\"blocked\":true,\"deviceId\":\"%s\"}",
                         DEVICE_ID);
                mqtt.publish(TOPIC_BARRIER_STATUS, json, true);
            } else {
                setBarrier(false);
            }
        }
    }

    // Информация о бронях (от сервера)
    if (topicStr == TOPIC_SPOTS_RESERVED) {
        // Сброс
        for (int i = 0; i < SPOT_COUNT; i++) spotReserved[i] = false;

        // Формат: {"spots": [1, 3]}  — номера забронированных мест
        JsonArray arr = doc["spots"];
        for (int spotNum : arr) {
            for (int i = 0; i < SPOT_COUNT; i++) {
                if (spots[i].spotNumber == spotNum) {
                    spotReserved[i] = true;
                    Serial.printf("[RESERVED] Место %d забронировано\n", spotNum);
                }
            }
        }
    }
}

void connectMQTT() {
    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(mqttCallback);
    mqtt.setBufferSize(512);
}

void reconnectMQTT() {
    static unsigned long lastAttempt = 0;
    if (mqtt.connected()) return;
    if (millis() - lastAttempt < MQTT_RECONNECT_MS) return;
    lastAttempt = millis();

    Serial.printf("[MQTT] Подключение к %s:%d...\n", MQTT_BROKER, MQTT_PORT);

    if (mqtt.connect(MQTT_CLIENT_ID)) {
        Serial.println("[MQTT] OK");
        mqtt.subscribe(TOPIC_BARRIER_CMD, 1);
        mqtt.subscribe(TOPIC_SPOTS_RESERVED, 1);
        Serial.printf("[MQTT] Подписка: %s\n", TOPIC_BARRIER_CMD);
        Serial.printf("[MQTT] Подписка: %s\n", TOPIC_SPOTS_RESERVED);

        // Начальный статус
        setBarrier(false);
    } else {
        Serial.printf("[MQTT] Ошибка: %d\n", mqtt.state());
    }
}

// ===================== ИК-датчики (мониторинг мест) =====================

void checkSpots() {
    bool changed = false;
    unsigned long now = millis();

    for (int i = 0; i < SPOT_COUNT; i++) {
        bool raw = digitalRead(spots[i].pin) == LOW;  // LOW = машина

        if (raw != spots[i].rawState) {
            spots[i].rawState = raw;
            spots[i].changeAt = now;
        } else if (raw != spots[i].occupied &&
                   (now - spots[i].changeAt) >= SPOT_DEBOUNCE_MS) {
            spots[i].occupied = raw;
            changed = true;
            Serial.printf("[SPOT] Место %d: %s\n", spots[i].spotNumber,
                          raw ? "ЗАНЯТО" : "СВОБОДНО");
        }
    }

    if (changed && mqtt.connected()) {
        JsonDocument doc;
        JsonArray arr = doc["spots"].to<JsonArray>();

        for (int i = 0; i < SPOT_COUNT; i++) {
            JsonObject spot = arr.add<JsonObject>();
            spot["spotNumber"] = spots[i].spotNumber;
            spot["occupied"] = spots[i].occupied;
        }

        char buffer[256];
        serializeJson(doc, buffer, sizeof(buffer));
        mqtt.publish(TOPIC_SPOTS_STATUS, buffer);
        Serial.printf("[MQTT] >> spots/status: %s\n", buffer);
    }
}

// ===================== Heartbeat =====================

void sendHeartbeat() {
    if (!mqtt.connected()) return;

    char json[160];
    snprintf(json, sizeof(json),
             "{\"deviceId\":\"%s\",\"ip\":\"%s\",\"uptime\":%lu,"
             "\"barrier\":%s,\"carUnder\":%s}",
             DEVICE_ID,
             WiFi.localIP().toString().c_str(),
             millis() / 1000,
             barrierOpen ? "true" : "false",
             carUnderBarrier ? "true" : "false");

    mqtt.publish(TOPIC_HEARTBEAT, json);
}

// ===================== SETUP =====================

void setup() {
    Serial.begin(115200);
    Serial.println("\n========================================");
    Serial.println("  Smart Parking — Barrier Controller");
    Serial.println("  OLED + IR Safety + 4 Spots");
    Serial.println("========================================");

    // OLED
    initOLED();

    // ИК-датчики мест — входы
    for (int i = 0; i < SPOT_COUNT; i++) {
        pinMode(spots[i].pin, INPUT);
    }

    // ИК-датчик под шлагбаумом — вход
    pinMode(IR_BARRIER_PIN, INPUT);
    Serial.printf("[IR] Датчик шлагбаума: GPIO%d\n", IR_BARRIER_PIN);

    // Сервопривод
    barrierServo.attach(SERVO_PIN);
    barrierServo.write(SERVO_CLOSED_ANGLE);
    Serial.printf("[SERVO] Пин %d, закрыт (%d°)\n", SERVO_PIN, SERVO_CLOSED_ANGLE);

    // WiFi
    connectWiFi();

    // MQTT
    connectMQTT();
}

// ===================== LOOP =====================

void loop() {
    // WiFi реконнект
    if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
    }

    // MQTT
    reconnectMQTT();
    mqtt.loop();

    unsigned long now = millis();

    // Опрос ИК-датчика шлагбаума (каждый цикл — безопасность!)
    checkBarrierIR();

    // Опрос ИК-датчиков мест
    if (now - lastSpotCheck >= SPOT_CHECK_INTERVAL_MS) {
        lastSpotCheck = now;
        checkSpots();
    }

    // Автозакрытие шлагбаума (с проверкой безопасности)
    if (barrierOpen) {
        if (carUnderBarrier) {
            // Машина под шлагбаумом — сбрасываем таймер, НЕ закрываем
            barrierOpenedAt = now;
        } else if (now - barrierOpenedAt >= BARRIER_AUTO_CLOSE_MS) {
            Serial.println("[BARRIER] Автозакрытие — проезд свободен");
            setBarrier(false);
        }
    }

    // Обновление OLED
    if (now - lastOledUpdate >= OLED_UPDATE_MS) {
        lastOledUpdate = now;
        updateOLED();
    }

    // Heartbeat
    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = now;
        sendHeartbeat();
    }
}
