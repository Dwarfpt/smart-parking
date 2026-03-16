// ============================================================
//  CameraServer — HTTP-сервер JPEG-снимков для ESP32-CAM
//  Эндпоинты: /cam-lo.jpg, /cam-mid.jpg, /cam-hi.jpg, /stream
// ============================================================
#ifndef CAMERA_SERVER_H
#define CAMERA_SERVER_H

#include <WebServer.h>
#include <esp32cam.h>

class CameraServer {
public:
    CameraServer(uint16_t port = 80);

    void begin();          // Запуск сервера и регистрация маршрутов
    void handleClient();   // Обработка входящих HTTP-запросов (вызывать в loop)

private:
    WebServer _server;

    esp32cam::Resolution _loRes;   // 320×240
    esp32cam::Resolution _midRes;  // 350×530
    esp32cam::Resolution _hiRes;   // 800×600

    void serveJpg();        // Захват кадра и отправка клиенту
    void handleJpgLo();     // Обработчик /cam-lo.jpg
    void handleJpgHi();     // Обработчик /cam-hi.jpg
    void handleJpgMid();    // Обработчик /cam-mid.jpg
    void handleMjpeg();     // Обработчик /stream и / (MJPEG-стрим)
};

#endif
