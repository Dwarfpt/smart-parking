// Провайдер авторизации — вход, регистрация, OTP, Google OAuth
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  // Ленивая инициализация — serverClientId нужен на Android для получения idToken
  GoogleSignIn? _googleSignIn;
  GoogleSignIn get googleSignIn =>
      _googleSignIn ??= GoogleSignIn(
        scopes: ['email', 'profile'],
        // Web Client ID — нужен на Android чтобы idToken был не null
        serverClientId: '600607167879-med62qfl9njdnk3r03jl0stm8aabvj91.apps.googleusercontent.com',
      );

  User? _user;
  bool _loading = true;
  String? _error;
  String? _pendingTempToken;
  String? _pendingEmail;

  User? get user => _user;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;
  String? get error => _error;
  bool get requiresOtp => _pendingTempToken != null;
  String? get pendingEmail => _pendingEmail;

  AuthProvider() {
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    try {
      final token = await _api.getToken();
      if (token != null) {
        _user = await _api.getMe();
      }
    } catch (_) {
      await _api.clearToken();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _error = null;
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.login(email, password);
      if (data['requireOtp'] == true) {
        _pendingTempToken = data['tempToken'];
        _pendingEmail = email;
        _loading = false;
        notifyListeners();
        return true; // caller checks requiresOtp
      }
      await _api.setToken(data['token']);
      _user = User.fromJson(data['user']);
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка входа';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(
      String email, String password, String name, String? phone) async {
    _error = null;
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.register(email, password, name, phone: phone);
      if (data['requireOtp'] == true) {
        _pendingTempToken = data['tempToken'];
        _pendingEmail = email;
        _loading = false;
        notifyListeners();
        return true;
      }
      await _api.setToken(data['token']);
      _user = User.fromJson(data['user']);
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка регистрации';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String otp) async {
    if (_pendingTempToken == null) return false;
    _error = null;
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.verifyOtp(_pendingTempToken!, otp);
      await _api.setToken(data['token']);
      _user = User.fromJson(data['user']);
      _pendingTempToken = null;
      _pendingEmail = null;
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Неверный код';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> resendOtp() async {
    if (_pendingTempToken == null) return false;
    try {
      await _api.resendOtp(_pendingTempToken!);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> signInWithGoogle() async {
    _error = null;
    _loading = true;
    notifyListeners();
    try {
      final account = await googleSignIn.signIn();
      if (account == null) {
        _loading = false;
        notifyListeners();
        return false; // cancelled
      }
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) {
        _error = 'Не удалось получить Google токен';
        _loading = false;
        notifyListeners();
        return false;
      }
      final data = await _api.googleAuth(idToken);
      await _api.setToken(data['token']);
      _user = User.fromJson(data['user']);
      _loading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка входа через Google';
      _loading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Ошибка Google Sign-In: ${e.toString()}';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    _user = null;
    _pendingTempToken = null;
    _pendingEmail = null;
    try {
      await googleSignIn.signOut();
    } catch (_) {}
    notifyListeners();
  }

  Future<void> refreshUser() async {
    try {
      _user = await _api.getMe();
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> updateProfile({String? name, String? phone}) async {
    _error = null;
    try {
      _user = await _api.updateProfile(name: name, phone: phone);
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка обновления';
      notifyListeners();
      return false;
    }
  }

  Future<bool> changePassword(
      String currentPassword, String newPassword) async {
    _error = null;
    try {
      await _api.changePassword(currentPassword, newPassword);
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка смены пароля';
      notifyListeners();
      return false;
    }
  }

  Future<bool> topUp(double amount) async {
    _error = null;
    try {
      final balance = await _api.topUp(amount);
      _user = User(
        id: _user!.id,
        email: _user!.email,
        name: _user!.name,
        phone: _user!.phone,
        role: _user!.role,
        balance: balance,
        avatar: _user!.avatar,
        isActive: _user!.isActive,
        twoFactorEnabled: _user!.twoFactorEnabled,
      );
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка пополнения';
      notifyListeners();
      return false;
    }
  }

  Future<bool> toggle2FA() async {
    _error = null;
    try {
      final data = await _api.toggle2FA();
      _user = User.fromJson(data['user']);
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _error = e.response?.data?['message'] ?? 'Ошибка переключения 2FA';
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
