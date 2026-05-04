// Провайдер локализации — переключение ru/ro/en, сохранение в SharedPreferences
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_translations.dart';

class LocaleProvider extends ChangeNotifier {
  static const _key = 'app_lang';
  static const langs = ['ru', 'ro', 'en'];
  static const labels = {'ru': 'RU', 'ro': 'RO', 'en': 'EN'};
  static const fullLabels = {
    'ru': 'Русский',
    'ro': 'Română',
    'en': 'English',
  };

  String _lang = 'ru';
  String get lang => _lang;

  LocaleProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved != null && langs.contains(saved)) {
      _lang = saved;
      notifyListeners();
    }
  }

  Future<void> setLang(String l) async {
    if (!langs.contains(l) || l == _lang) return;
    _lang = l;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, l);
  }

  /// Перевод статического ключа
  String t(String key) {
    final entry = translations[key];
    if (entry == null) return key;
    return entry[_lang] ?? entry['ru'] ?? key;
  }

  /// Локализация поля из БД (name → nameRo/nameEn)
  String loc(Map<String, dynamic>? obj, String field) {
    if (obj == null) return '';
    if (_lang == 'ro') {
      return (obj['${field}Ro'] as String?) ?? (obj[field] as String?) ?? '';
    }
    if (_lang == 'en') {
      return (obj['${field}En'] as String?) ?? (obj[field] as String?) ?? '';
    }
    return (obj[field] as String?) ?? '';
  }
}
