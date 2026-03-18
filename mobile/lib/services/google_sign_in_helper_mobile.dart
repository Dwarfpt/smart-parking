// Google Sign-In для Android/iOS через google_sign_in пакет
import 'package:google_sign_in/google_sign_in.dart';

final _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
  // Web Client ID — нужен Android чтобы authentication.idToken был не null
  serverClientId:
      '600607167879-med62qfl9njdnk3r03jl0stm8aabvj91.apps.googleusercontent.com',
);

Future<String?> getGoogleCredential() async {
  final account = await _googleSignIn.signIn();
  if (account == null) return null;
  final auth = await account.authentication;
  return auth.idToken;
}

Future<void> signOutGoogle() async {
  try {
    await _googleSignIn.signOut();
  } catch (_) {}
}
