// HTTP-клиент (Dio) — все API-вызовы, перехват 401, токен
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../models/parking_lot.dart';
import '../models/parking_spot.dart';
import '../models/booking.dart';
import '../models/tariff.dart';
import '../models/transaction.dart';
import '../models/support_ticket.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;

  Future<void> setToken(String token) =>
      _storage.write(key: 'token', value: token);

  Future<void> clearToken() => _storage.delete(key: 'token');

  Future<String?> getToken() => _storage.read(key: 'token');

  // ================== AUTH ==================

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return res.data;
  }

  Future<Map<String, dynamic>> register(
      String email, String password, String name,
      {String? phone}) async {
    final res = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'name': name,
      if (phone != null) 'phone': phone,
    });
    return res.data;
  }

  Future<User> getMe() async {
    final res = await _dio.get('/auth/me');
    return User.fromJson(res.data['user']);
  }

  // ================== AUTH - OTP ==================

  Future<Map<String, dynamic>> verifyOtp(String tempToken, String otp) async {
    final res = await _dio.post('/auth/verify-otp', data: {
      'tempToken': tempToken,
      'otp': otp,
    });
    return res.data;
  }

  Future<void> resendOtp(String tempToken) async {
    await _dio.post('/auth/resend-otp', data: {
      'tempToken': tempToken,
    });
  }

  // ================== AUTH - GOOGLE ==================

  Future<Map<String, dynamic>> googleAuth(String credential) async {
    final res = await _dio.post('/auth/google', data: {
      'credential': credential,
    });
    return res.data;
  }

  // ================== QR VALIDATION ==================

  Future<Map<String, dynamic>> validateQr(String qrToken) async {
    final res = await _dio.get('/bookings/validate/$qrToken');
    return res.data;
  }

  // ================== USER ==================

  Future<User> getProfile() async {
    final res = await _dio.get('/users/profile');
    return User.fromJson(res.data['user']);
  }

  Future<User> updateProfile({String? name, String? phone}) async {
    final res = await _dio.put('/users/profile', data: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
    });
    return User.fromJson(res.data['user']);
  }

  Future<void> changePassword(
      String currentPassword, String newPassword) async {
    await _dio.put('/users/password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<double> topUp(double amount) async {
    final res = await _dio.post('/users/topup', data: {'amount': amount});
    return (res.data['balance'] as num).toDouble();
  }

  Future<double> getBalance() async {
    final res = await _dio.get('/users/balance');
    return (res.data['balance'] as num).toDouble();
  }

  Future<Map<String, dynamic>> toggle2FA() async {
    final res = await _dio.put('/users/toggle-2fa');
    return res.data;
  }

  Future<List<Transaction>> getTransactions(
      {int page = 1, int limit = 20}) async {
    final res = await _dio.get('/users/transactions',
        queryParameters: {'page': page, 'limit': limit});
    return (res.data['transactions'] as List)
        .map((j) => Transaction.fromJson(j))
        .toList();
  }

  // ================== PARKING ==================

  Future<List<ParkingLot>> getParkingLots({String? search}) async {
    final res = await _dio.get('/parking', queryParameters: {
      if (search != null && search.isNotEmpty) 'search': search,
    });
    return (res.data['parkingLots'] as List)
        .map((j) => ParkingLot.fromJson(j))
        .toList();
  }

  Future<Map<String, dynamic>> getParkingLot(String id) async {
    final res = await _dio.get('/parking/$id');
    return {
      'parkingLot': ParkingLot.fromJson(res.data['parkingLot']),
      'spots': (res.data['spots'] as List)
          .map((j) => ParkingSpot.fromJson(j))
          .toList(),
      'tariff':
          res.data['tariff'] != null ? Tariff.fromJson(res.data['tariff']) : null,
    };
  }

  // ================== BOOKINGS ==================

  Future<Map<String, dynamic>> createReservation({
    required String parkingSpotId,
    required String startTime,
    required String endTime,
    String? vehiclePlate,
  }) async {
    final res = await _dio.post('/bookings', data: {
      'parkingSpotId': parkingSpotId,
      'startTime': startTime,
      'endTime': endTime,
      if (vehiclePlate != null) 'vehiclePlate': vehiclePlate,
    });
    return res.data;
  }

  Future<Map<String, dynamic>> createSubscription({
    required String parkingSpotId,
    required String period,
    String? vehiclePlate,
  }) async {
    final res = await _dio.post('/bookings/subscription', data: {
      'parkingSpotId': parkingSpotId,
      'period': period,
      if (vehiclePlate != null) 'vehiclePlate': vehiclePlate,
    });
    return res.data;
  }

  Future<List<Booking>> getMyBookings(
      {String? status, String? type, int page = 1}) async {
    final res = await _dio.get('/bookings/my', queryParameters: {
      if (status != null) 'status': status,
      if (type != null) 'type': type,
      'page': page,
    });
    return (res.data['bookings'] as List)
        .map((j) => Booking.fromJson(j))
        .toList();
  }

  Future<Booking> getBooking(String id) async {
    final res = await _dio.get('/bookings/$id');
    return Booking.fromJson(res.data['booking']);
  }

  Future<Map<String, dynamic>> cancelBooking(String id) async {
    final res = await _dio.put('/bookings/$id/cancel');
    return res.data;
  }

  // ================== TARIFFS ==================

  Future<List<Tariff>> getTariffs({String? parkingLotId}) async {
    final res = await _dio.get('/tariffs', queryParameters: {
      if (parkingLotId != null) 'parkingLotId': parkingLotId,
    });
    return (res.data['tariffs'] as List)
        .map((j) => Tariff.fromJson(j))
        .toList();
  }

  // ================== SUPPORT ==================

  Future<SupportTicket> createTicket(String subject, String message) async {
    final res = await _dio.post('/support', data: {
      'subject': subject,
      'message': message,
    });
    return SupportTicket.fromJson(res.data['ticket']);
  }

  Future<List<SupportTicket>> getMyTickets({String? status}) async {
    final res = await _dio.get('/support/my', queryParameters: {
      if (status != null) 'status': status,
    });
    return (res.data['tickets'] as List)
        .map((j) => SupportTicket.fromJson(j))
        .toList();
  }

  Future<SupportTicket> getTicket(String id) async {
    final res = await _dio.get('/support/$id');
    return SupportTicket.fromJson(res.data['ticket']);
  }

  Future<SupportTicket> addMessage(String ticketId, String text) async {
    final res = await _dio.post('/support/$ticketId/message', data: {
      'text': text,
    });
    return SupportTicket.fromJson(res.data['ticket']);
  }

  Future<SupportTicket> closeTicket(String id) async {
    final res = await _dio.put('/support/$id/close');
    return SupportTicket.fromJson(res.data['ticket']);
  }
}
