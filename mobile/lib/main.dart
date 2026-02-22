// Точка входа — провайдеры, темы, маршрутизация
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/parking_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/support_provider.dart';
import 'services/socket_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/otp_screen.dart';
import 'screens/home_shell.dart';
import 'screens/parking/parking_detail_screen.dart';
import 'screens/support/ticket_detail_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SocketService().connect();
  runApp(const SmartParkingApp());
}

class SmartParkingApp extends StatelessWidget {
  const SmartParkingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ParkingProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
        ChangeNotifierProvider(create: (_) => SupportProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'Smart Parking',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            home: auth.loading
                ? const _SplashScreen()
                : auth.isAuthenticated
                    ? const HomeShell()
                    : const LoginScreen(),
            onGenerateRoute: (settings) {
              // /parking/:id
              final parkingMatch = RegExp(r'^/parking/(.+)$')
                  .firstMatch(settings.name ?? '');
              if (parkingMatch != null) {
                return MaterialPageRoute(
                  builder: (_) => ParkingDetailScreen(
                      parkingId: parkingMatch.group(1)!),
                );
              }

              // /support/:id
              final supportMatch = RegExp(r'^/support/(.+)$')
                  .firstMatch(settings.name ?? '');
              if (supportMatch != null) {
                return MaterialPageRoute(
                  builder: (_) => TicketDetailScreen(
                      ticketId: supportMatch.group(1)!),
                );
              }

              switch (settings.name) {
                case '/login':
                  return MaterialPageRoute(
                      builder: (_) => const LoginScreen());
                case '/register':
                  return MaterialPageRoute(
                      builder: (_) => const RegisterScreen());
                case '/otp':
                  return MaterialPageRoute(
                      builder: (_) => const OtpScreen());
                case '/home':
                  return MaterialPageRoute(
                      builder: (_) => const HomeShell());
                default:
                  return MaterialPageRoute(
                    builder: (_) => const Scaffold(
                        body: Center(child: Text('Страница не найдена'))),
                  );
              }
            },
          );
        },
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.local_parking_rounded,
                size: 80, color: AppTheme.primary),
            const SizedBox(height: 16),
            const Text('Smart Parking',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
