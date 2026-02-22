// Провайдер бронирований — создание, отмена, список
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/booking.dart';
import '../services/api_service.dart';

class BookingProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Booking> _bookings = [];
  bool _loading = false;
  String? _error;
  String? _successMessage;

  List<Booking> get bookings => _bookings;
  bool get loading => _loading;
  String? get error => _error;
  String? get successMessage => _successMessage;

  Future<void> loadMyBookings({String? status, String? type}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _bookings = await _api.getMyBookings(status: status, type: type);
    } catch (e) {
      _error = 'Не удалось загрузить бронирования';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createReservation({
    required String parkingSpotId,
    required DateTime startTime,
    required DateTime endTime,
    String? vehiclePlate,
  }) async {
    _error = null;
    _successMessage = null;
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.createReservation(
        parkingSpotId: parkingSpotId,
        startTime: startTime.toIso8601String(),
        endTime: endTime.toIso8601String(),
        vehiclePlate: vehiclePlate,
      );
      _successMessage = data['message'];
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка бронирования';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> createSubscription({
    required String parkingSpotId,
    required String period,
    String? vehiclePlate,
  }) async {
    _error = null;
    _successMessage = null;
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.createSubscription(
        parkingSpotId: parkingSpotId,
        period: period,
        vehiclePlate: vehiclePlate,
      );
      _successMessage = data['message'];
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка подписки';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelBooking(String id) async {
    _error = null;
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.cancelBooking(id);
      _successMessage =
          '${data['message']}. Возврат: ${data['refundAmount']} MDL';
      await loadMyBookings();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка отмены';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  void clearMessages() {
    _error = null;
    _successMessage = null;
  }
}
