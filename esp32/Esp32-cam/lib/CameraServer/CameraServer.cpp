// ============================================================
//  CameraServer — HTTP-сервер JPEG-снимков для ESP32-CAM
//  Обработка захвата кадров с отслеживанием ошибок
// ============================================================
#include "CameraServer.h"

// Глобальные переменные из main.cpp для отслеживания состояния
extern int captureFailStreak;
extern bool cameraOk;

CameraServer::CameraServer(uint16_t port)
    : _server(port),
      _loRes(esp32cam::Resolution::find(320, 240)),
      _midRes(esp32cam::Resolution::find(350, 530)),
      _hiRes(esp32cam::Resolution::find(800, 600))
{
}

// Захват кадра и отправка JPEG клиенту
void CameraServer::serveJpg() {
    // Камера не инициализирована — 503
    if (!cameraOk) {
        _server.send(503, "text/plain", "Camera not initialized");
        return;
    }

    auto frame = esp32cam::capture();
    if (frame == nullptr) {
        captureFailStreak++;
        Serial.printf("[CAM] CAPTURE FAIL (серия: %d)\n", captureFailStreak);
        _server.send(503, "", "");
        return;
    }

    // Успешный захват — сбрасываем счётчик ошибок
    captureFailStreak = 0;
    Serial.printf("[CAM] OK %dx%d %d байт\n",
                  frame->getWidth(), frame->getHeight(),
                  static_cast<int>(frame->size()));

    _server.setContentLength(frame->size());
    _server.send(200, "image/jpeg");
    WiFiClient client = _server.client();
    frame->writeTo(client);
}

void CameraServer::handleJpgLo() {
    if (!esp32cam::Camera.changeResolution(_loRes))
        Serial.println("[CAM] Ошибка смены разрешения: LOW");
    serveJpg();
}

void CameraServer::handleJpgHi() {
    if (!esp32cam::Camera.changeResolution(_hiRes))
        Serial.println("[CAM] Ошибка смены разрешения: HIGH");
    serveJpg();
}

void CameraServer::handleJpgMid() {
    if (!esp32cam::Camera.changeResolution(_midRes))
        Serial.println("[CAM] Ошибка смены разрешения: MID");
    serveJpg();
}

// MJPEG-стрим — непрерывная отправка кадров
void CameraServer::handleMjpeg() {
    Serial.println("[MJPEG] Стрим начат");
    WiFiClient client = _server.client();

    esp32cam::MjpegConfig mjCfg;
    mjCfg.minInterval  = 0;
    mjCfg.maxFrames    = -1;       // Бесконечный стрим
    mjCfg.frameTimeout = 10000;

    auto sent = esp32cam::Camera.streamMjpeg(client, mjCfg);
    Serial.printf("[MJPEG] Стрим завершён, %d кадров\n", sent);
}

// Регистрация маршрутов и запуск HTTP-сервера
void CameraServer::begin() {
    _server.on("/cam-lo.jpg",  [this]() { handleJpgLo();  });
    _server.on("/cam-hi.jpg",  [this]() { handleJpgHi();  });
    _server.on("/cam-mid.jpg", [this]() { handleJpgMid(); });
    _server.on("/stream",      [this]() { handleMjpeg();  });
    _server.on("/",            [this]() { handleMjpeg();  });
    _server.begin();
}

void CameraServer::handleClient() {
    _server.handleClient();
}
