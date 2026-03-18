// Условный экспорт: web использует dart:js + GIS, mobile — google_sign_in пакет
export 'google_sign_in_helper_mobile.dart'
    if (dart.library.html) 'google_sign_in_helper_web.dart';
