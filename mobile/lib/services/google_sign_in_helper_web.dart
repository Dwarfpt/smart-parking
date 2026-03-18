// Google Sign-In для Flutter Web через GIS (Google Identity Services)
// Вызывает JS функцию triggerGoogleSignIn из index.html
// ignore: avoid_web_libraries_in_flutter
import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:js_util' as js_util;
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

const _clientId =
    '600607167879-med62qfl9njdnk3r03jl0stm8aabvj91.apps.googleusercontent.com';

Future<String?> getGoogleCredential() async {
  try {
    // Вызываем JS функцию triggerGoogleSignIn(clientId) из index.html
    final promise = js_util.callMethod<Object>(
        html.window, 'triggerGoogleSignIn', [_clientId]);
    final result = await js_util.promiseToFuture<String?>(promise);
    return result;
  } catch (e) {
    return null;
  }
}

Future<void> signOutGoogle() async {
  try {
    js_util.callMethod(html.window, 'eval',
        ['google.accounts.id.disableAutoSelect()']);
  } catch (_) {}
}
