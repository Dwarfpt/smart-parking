// Google Sign-In для Flutter Web через GIS (Google Identity Services)
// Использует dart:js для вызова уже загруженной GIS библиотеки из index.html
// Получает idToken напрямую через credential callback — без popup, без COOP проблем
// ignore: avoid_web_libraries_in_flutter
import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:js' as js;

const _clientId =
    '600607167879-med62qfl9njdnk3r03jl0stm8aabvj91.apps.googleusercontent.com';

Future<String?> getGoogleCredential() async {
  if (!js.context.hasProperty('google')) return null;

  final google = js.context['google'] as js.JsObject;
  if (!google.hasProperty('accounts')) return null;

  final accounts = google['accounts'] as js.JsObject;
  if (!accounts.hasProperty('id')) return null;

  final gisId = accounts['id'] as js.JsObject;
  final completer = Completer<String?>();

  // Инициализируем GIS с callback — credential это JWT idToken
  gisId.callMethod('initialize', [
    js.JsObject.jsify({
      'client_id': _clientId,
      'callback': js.allowInterop((dynamic response) {
        if (!completer.isCompleted) {
          completer.complete(response['credential'] as String?);
        }
      }),
      'cancel_on_tap_outside': false,
      'use_fedcm_for_prompt': false,
    })
  ]);

  // Показываем One Tap UI (не popup — работает с любым COOP)
  gisId.callMethod('prompt', [
    js.allowInterop((dynamic notification) {
      try {
        final notDisplayed =
            notification.callMethod('isNotDisplayed') == true;
        final skipped =
            notification.callMethod('isSkippedMoment') == true;
        if ((notDisplayed || skipped) && !completer.isCompleted) {
          completer.complete(null);
        }
      } catch (_) {
        if (!completer.isCompleted) completer.complete(null);
      }
    })
  ]);

  return completer.future.timeout(
    const Duration(minutes: 2),
    onTimeout: () => null,
  );
}

Future<void> signOutGoogle() async {
  try {
    if (!js.context.hasProperty('google')) return;
    final gisId = ((js.context['google'] as js.JsObject)['accounts']
        as js.JsObject)['id'] as js.JsObject;
    gisId.callMethod('disableAutoSelect', []);
  } catch (_) {}
}
