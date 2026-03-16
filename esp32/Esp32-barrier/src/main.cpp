// ============================================================
//  Smart Parking — ESP32 Barrier Controller — main.cpp
//
//  Логика работы:
//    1. ИК-датчики опрашиваются каждые 500 мс
//    2. При изменении статуса (с дебаунсом 2 сек) → MQTT
//    3. Сервер получает статус → обновляет БД → WebSocket → сайт/приложение
//    4. Сервер отправляет команду open/close → шлагбаум реагирует
//    5. Шлагбаум автоматически закрывается через 7 сек
//
//  MQTT-топики:
//    parking/lot1/spots/status   — публикация статусов мест
//    parking/lot1/barrier/cmd    — подписка на команды
//    parking/lot1/barrier/status — публикация статуса шлагбаума
//    parking/lot1/heartbeat      — heartbeat каждые 30 сек
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include "config.h"

// ===================== Объекты =====================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Servo barrierServo;

// ===================== Состояние =====================

// ИК-датчики: пины и состояние
struct SpotSensor {
    uint8_t pin;
    uint8_t spotNumber;
    bool occupied;          // текущий подтверждённый статус
    bool rawState;          // сырое значение
    unsigned long changeAt; // когда начал меняться (для дебаунса)
};

SpotSensor spots[] = {
    { IR_SENSOR_1_PIN, 1, false, false, 0 },  // D5 → GPIO32
    { IR_SENSOR_2_PIN, 2, false, false, 0 },  // D6 → GPIO33
    { IR_SENSOR_3_PIN, 3, false, false, 0 },  // D7 → GPIO34
    { IR_SENSOR_4_PIN, 4, false, false, 0 },  // D8 → GPIO35
};
const int SPOT_COUNT = sizeof(spots) / sizeof(spots[0]);

// Шлагбаум
bool barrierOpen = false;
unsigned long barrierOpenedAt = 0;

// Таймеры
unsigned long lastSpotCheck = 0;
unsigned long lastHeartbeat = 0;

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
    char json[64];
    snprintf(json, sizeof(json), "{\"open\":%s,\"deviceId\":\"%s\"}",
             open ? "true" : "false", DEVICE_ID);
    mqtt.publish(TOPIC_BARRIER_STATUS, json, true);
}

// ===================== MQTT =====================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Парсинг JSON
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
            setBarrier(false);
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
        Serial.printf("[MQTT] Подписка: %s\n", TOPIC_BARRIER_CMD);

        // Публикуем начальный статус шлагбаума
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
        // LOW = препятствие (машина), HIGH = свободно
        bool raw = digitalRead(spots[i].pin) == LOW;

        if (raw != spots[i].rawState) {
            // Начало изменения — запускаем дебаунс
            spots[i].rawState = raw;
            spots[i].changeAt = now;
        } else if (raw != spots[i].occupied && (now - spots[i].changeAt) >= SPOT_DEBOUNCE_MS) {
            // Дебаунс прошёл — фиксируем новый статус
            spots[i].occupied = raw;
            changed = true;
            Serial.printf("[SPOT] Место %d: %s\n", spots[i].spotNumber,
                          raw ? "ЗАНЯТО" : "СВОБОДНО");
        }
    }

    // Публикуем через MQTT если есть изменения
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

    char json[128];
    snprintf(json, sizeof(json),
             "{\"deviceId\":\"%s\",\"ip\":\"%s\",\"uptime\":%lu,\"barrier\":%s}",
             DEVICE_ID,
             WiFi.localIP().toString().c_str(),
             millis() / 1000,
             barrierOpen ? "true" : "false");

    mqtt.publish(TOPIC_HEARTBEAT, json);
}

// ===================== SETUP =====================

void setup() {
    Serial.begin(115200);
    Serial.println("\n========================================");
    Serial.println("  Smart Parking — Barrier Controller");
    Serial.println("========================================");

    // ИК-датчики — входы
    for (int i = 0; i < SPOT_COUNT; i++) {
        pinMode(spots[i].pin, INPUT);
    }

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

    // MQTT реконнект
    reconnectMQTT();
    mqtt.loop();

    unsigned long now = millis();

    // Опрос ИК-датчиков
    if (now - lastSpotCheck >= SPOT_CHECK_INTERVAL_MS) {
        lastSpotCheck = now;
        checkSpots();
    }

    // Автозакрытие шлагбаума
    if (barrierOpen && (now - barrierOpenedAt >= BARRIER_AUTO_CLOSE_MS)) {
        Serial.println("[BARRIER] Автозакрытие");
        setBarrier(false);
    }

    // Heartbeat
    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = now;
        sendHeartbeat();
    }
}
