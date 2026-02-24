// Оболочка — нижняя навигация, вкладки: парковки, карта, бронирования, профиль
import 'package:flutter/material.dart';
import '../config/theme.dart';
import 'map/map_screen.dart';
import 'bookings/my_bookings_screen.dart';
import 'profile/profile_screen.dart';
import 'support/support_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;

  static const _screens = [
    MapScreen(),
    MyBookingsScreen(),
    SupportScreen(),
    ProfileScreen(),
  ];

  static const _titles = [
    'Карта парковок',
    'Мои бронирования',
    'Поддержка',
    'Профиль',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _currentIndex == 0
          ? null
          : AppBar(title: Text(_titles[_currentIndex])),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        indicatorColor: AppTheme.primary.withAlpha(30),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map, color: AppTheme.primary),
            label: 'Карта',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_outline),
            selectedIcon: Icon(Icons.bookmark, color: AppTheme.primary),
            label: 'Брони',
          ),
          NavigationDestination(
            icon: Icon(Icons.support_agent_outlined),
            selectedIcon: Icon(Icons.support_agent, color: AppTheme.primary),
            label: 'Поддержка',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppTheme.primary),
            label: 'Профиль',
          ),
        ],
      ),
    );
  }
}
