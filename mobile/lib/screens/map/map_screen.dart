// Карта — все парковки на карте (flutter_map)
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../providers/parking_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/theme_provider.dart';
import '../../config/theme.dart';
import '../../models/parking_lot.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapCtrl = MapController();
  final _searchCtrl = TextEditingController();
  Timer? _pollTimer;

  // Chișinău center
  static const _defaultCenter = LatLng(47.0245, 28.8322);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ParkingProvider>().loadParkingLots();
    });
    // Polling every 10 seconds for fresh spot counts
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) {
        context.read<ParkingProvider>().loadParkingLots();
      }
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    context.read<ParkingProvider>().loadParkingLots(search: query);
  }

  void _openParkingDetail(ParkingLot lot) {
    Navigator.pushNamed(context, '/parking/${lot.id}');
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ParkingProvider>();
    final loc = context.watch<LocaleProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final lots = provider.parkingLots;
    final isDark = themeProvider.isDark;

    // Стиль карты: светлый/тёмный
    final tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapCtrl,
            options: MapOptions(
              initialCenter: _defaultCenter,
              initialZoom: 13,
            ),
            children: [
              TileLayer(
                urlTemplate: tileUrl,
                subdomains: const ['a', 'b', 'c'],
                userAgentPackageName: 'md.smartparking.smart_parking',
              ),
              MarkerLayer(
                markers: lots.map((lot) {
                  final hasFree = lot.freeSpots > 0;
                  return Marker(
                    point: LatLng(lot.latitude, lot.longitude),
                    width: 160,
                    height: 70,
                    child: GestureDetector(
                      onTap: () => _openParkingDetail(lot),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1F2937) : Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: hasFree ? AppTheme.success : AppTheme.danger,
                                width: 1.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black26,
                                    blurRadius: 6,
                                    offset: const Offset(0, 2)),
                              ],
                            ),
                            child: Column(
                              children: [
                                Text(loc.loc(lot.raw, 'name'),
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white : AppTheme.gray800),
                                    overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 2),
                                Text(
                                  '${lot.freeSpots} ${loc.t('mapFreeSpots')}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: hasFree
                                        ? AppTheme.success
                                        : AppTheme.danger,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.location_on,
                              color: hasFree
                                  ? AppTheme.success
                                  : AppTheme.danger,
                              size: 26),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          // Search bar + settings
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Row(
              children: [
                Expanded(
                  child: Material(
                    elevation: 4,
                    borderRadius: BorderRadius.circular(12),
                    child: TextField(
                      controller: _searchCtrl,
                      onSubmitted: _onSearch,
                      decoration: InputDecoration(
                        hintText: loc.t('mapSearch'),
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _searchCtrl.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  _onSearch('');
                                },
                              )
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1F2937) : Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => themeProvider.toggle(),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1F2937) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        isDark ? '☀️' : '🌙',
                        style: const TextStyle(fontSize: 22),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  color: isDark ? const Color(0xFF1F2937) : Colors.white,
                  child: PopupMenuButton<String>(
                    icon: Text(
                      LocaleProvider.labels[loc.lang] ?? 'RU',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: isDark ? Colors.white : AppTheme.gray800,
                      ),
                    ),
                    onSelected: (l) => loc.setLang(l),
                    color: isDark ? const Color(0xFF1F2937) : Colors.white,
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
                ),
              ],
            ),
          ),
          if (provider.loading)
            const Positioned(
              bottom: 90,
              left: 0,
              right: 0,
              child: Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }
}
