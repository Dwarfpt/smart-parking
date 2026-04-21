// Оболочка — нижняя навигация, вкладки: карта, бронирования, поддержка, профиль
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
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

  List<String> _titles(LocaleProvider loc) => [
    loc.t('navMapTitle'),
    loc.t('navBookingsTitle'),
    loc.t('navSupportTitle'),
    loc.t('navProfileTitle'),
  ];

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<LocaleProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isDark;
    final titles = _titles(loc);

    return Scaffold(
      appBar: _currentIndex == 0
          ? null
          : AppBar(
              title: Text(titles[_currentIndex]),
              actions: [
                // Тема
                IconButton(
                  icon: Icon(themeProvider.isDark ? Icons.light_mode : Icons.dark_mode),
                  tooltip: loc.t(themeProvider.isDark ? 'settingsThemeLight' : 'settingsThemeDark'),
                  onPressed: () => themeProvider.toggle(),
                ),
                // Язык
                PopupMenuButton<String>(
                  icon: Text(
                    LocaleProvider.labels[loc.lang] ?? 'RU',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isDark ? Colors.white : AppTheme.gray700,
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
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).navigationBarTheme.backgroundColor,
          border: Border(
            top: BorderSide(
              color: isDark ? AppTheme.darkBorder : AppTheme.gray200,
              width: 1,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: isDark ? Colors.black.withAlpha(50) : AppTheme.gray300.withAlpha(80),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        // Use SafeArea carefully to only pad the BOTTOM to avoid OS nav bar overlaps
        child: SafeArea(
          bottom: true,
          top: false,
          child: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (i) => setState(() => _currentIndex = i),
            destinations: [
              NavigationDestination(
                icon: const Icon(Icons.map_outlined),
                selectedIcon: const Icon(Icons.map),
                label: loc.t('navMap'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.bookmark_outline),
                selectedIcon: const Icon(Icons.bookmark),
                label: loc.t('navBookings'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.support_agent_outlined),
                selectedIcon: const Icon(Icons.support_agent),
                label: loc.t('navSupport'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.person_outline),
                selectedIcon: const Icon(Icons.person),
                label: loc.t('navProfile'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
