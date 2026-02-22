// Провайдер поддержки — тикеты, сообщения
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/support_ticket.dart';
import '../services/api_service.dart';

class SupportProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<SupportTicket> _tickets = [];
  SupportTicket? _currentTicket;
  bool _loading = false;
  String? _error;

  List<SupportTicket> get tickets => _tickets;
  SupportTicket? get currentTicket => _currentTicket;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadMyTickets({String? status}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _tickets = await _api.getMyTickets(status: status);
    } catch (e) {
      _error = 'Не удалось загрузить обращения';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createTicket(String subject, String message) async {
    _error = null;
    _loading = true;
    notifyListeners();
    try {
      final ticket = await _api.createTicket(subject, message);
      _tickets.insert(0, ticket);
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка создания обращения';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> loadTicket(String id) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _currentTicket = await _api.getTicket(id);
    } catch (e) {
      _error = 'Не удалось загрузить обращение';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> sendMessage(String ticketId, String text) async {
    _error = null;
    try {
      _currentTicket = await _api.addMessage(ticketId, text);
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка отправки';
      notifyListeners();
      return false;
    }
  }

  Future<bool> closeTicket(String id) async {
    _error = null;
    try {
      _currentTicket = await _api.closeTicket(id);
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка закрытия';
      notifyListeners();
      return false;
    }
  }
}
