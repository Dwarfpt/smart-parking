// Экран входа — Solid Card + Aurora Background
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/theme_provider.dart';
import '../../config/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    auth.clearError();
    final ok = await auth.login(_emailCtrl.text.trim(), _passwordCtrl.text);
    if (ok && auth.requiresOtp && mounted) {
      Navigator.pushReplacementNamed(context, '/otp');
      return;
    }
    if (!ok && mounted) {
      final loc = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? loc.t('authLoginError')),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  Future<void> _signInWithGoogle() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();
    final ok = await auth.signInWithGoogle();
    if (!ok && mounted && auth.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error!),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final loc = context.watch<LocaleProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isDark;

    return Scaffold(
      body: Stack(
        children: [
          // Aurora gradient background
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        const Color(0xFF0F0C29),
                        const Color(0xFF1A1145),
                        const Color(0xFF24243E),
                      ]
                    : [
                        const Color(0xFF1E1B4B),
                        const Color(0xFF4338CA),
                        const Color(0xFF3730A3),
                      ],
              ),
            ),
          ),

          // Theme & Language in top right
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 8,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(
                    isDark ? Icons.light_mode : Icons.dark_mode,
                    color: Colors.white.withAlpha(200),
                  ),
                  onPressed: () => themeProvider.toggle(),
                ),
                PopupMenuButton<String>(
                  icon: Text(
                    LocaleProvider.labels[loc.lang] ?? 'RU',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Colors.white.withAlpha(200),
                    ),
                  ),
                  onSelected: (l) => loc.setLang(l),
                  itemBuilder: (_) => LocaleProvider.langs.map((l) {
                    return PopupMenuItem(
                      value: l,
                      child: Row(
                        children: [
                          if (l == loc.lang)
                            const Icon(Icons.check, size: 18, color: AppTheme.primary)
                          else
                            const SizedBox(width: 18),
                          const SizedBox(width: 8),
                          Text(LocaleProvider.fullLabels[l] ?? l),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),

          // Main form content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 420),
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkCard : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isDark ? AppTheme.darkBorder : AppTheme.gray200,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(isDark ? 100 : 25),
                          blurRadius: 40,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Logo
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDark ? AppTheme.darkSurface : AppTheme.gray50,
                              border: Border.all(
                                color: isDark ? AppTheme.darkBorder : AppTheme.gray200,
                              ),
                            ),
                            child: SvgPicture.asset('assets/logo.svg',
                                width: 56, height: 56),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Smart Parking',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -1.0,
                              color: isDark ? Colors.white : AppTheme.gray700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            loc.t('authLogin'),
                            style: TextStyle(
                              color: isDark ? AppTheme.gray400 : AppTheme.gray500,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Email
                          TextFormField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            decoration: InputDecoration(
                              labelText: loc.t('authEmail'),
                              prefixIcon: const Icon(Icons.email_outlined),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return loc.t('authEnterEmail');
                              if (!v.contains('@')) return loc.t('authInvalidEmail');
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscure,
                            decoration: InputDecoration(
                              labelText: loc.t('authPassword'),
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscure ? Icons.visibility_off : Icons.visibility,
                                ),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return loc.t('authEnterPassword');
                              if (v.length < 6) return loc.t('authMinChars');
                              return null;
                            },
                          ),
                          const SizedBox(height: 28),

                          // Login button
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: auth.loading ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                              ),
                              child: auth.loading
                                  ? const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(loc.t('authEnter')),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Divider
                          Row(
                            children: [
                              const Expanded(child: Divider()),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Text(
                                  loc.t('or'),
                                  style: TextStyle(
                                    color: isDark ? AppTheme.gray500 : AppTheme.gray400,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              const Expanded(child: Divider()),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Google button
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: auth.loading ? null : _signInWithGoogle,
                              icon: const Icon(Icons.g_mobiledata, size: 24),
                              label: Text(loc.t('authGoogleLogin')),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Register link
                          TextButton(
                            onPressed: () =>
                                Navigator.pushReplacementNamed(context, '/register'),
                            child: Text(
                              loc.t('authNoAccount'),
                              style: const TextStyle(
                                color: AppTheme.primary,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
