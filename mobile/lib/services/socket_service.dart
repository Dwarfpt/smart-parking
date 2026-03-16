// WebSocket-клиент (Socket.io) — подписка на обновления парковок
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  io.Socket? _socket;
  bool _connected = false;

  SocketService._internal();

  bool get isConnected => _connected;

  void connect() {
    if (_socket != null) return;

    _socket = io.io(ApiConfig.socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    _socket!.onConnect((_) {
      _connected = true;
    });

    _socket!.onDisconnect((_) {
      _connected = false;
    });
  }

  void on(String event, Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  void off(String event) {
    _socket?.off(event);
  }

  void emit(String event, dynamic data) {
    _socket?.emit(event, data);
  }

  // Подписка на обновления конкретной парковки (Socket.io room)
  void subscribeToParking(String parkingId) {
    _socket?.emit('subscribe:parking', parkingId);
  }

  // Отписка от обновлений парковки
  void unsubscribeFromParking(String parkingId) {
    _socket?.emit('unsubscribe:parking', parkingId);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connected = false;
  }
}
