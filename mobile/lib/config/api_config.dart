/// Конфигурация API — базовый URL, поддержка Docker
class ApiConfig {
  // Поддержка Docker: --dart-define=API_BASE_URL=... --dart-define=SOCKET_URL=...
  // Для Android эмулятора по умолчанию 10.0.2.2, для Docker/Web — localhost
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );
  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  // Timeout durations
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);
}
