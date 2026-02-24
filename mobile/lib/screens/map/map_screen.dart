// Карта — все парковки на карте (flutter_map)
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../providers/parking_provider.dart';
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

  // Chișinău center
  static const _defaultCenter = LatLng(47.0245, 28.8322);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ParkingProvider>().loadParkingLots();
    });
  }

  @override
  void dispose() {
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
    final lots = provider.parkingLots;

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
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'md.smartparking.smart_parking',
              ),
              MarkerLayer(
                markers: lots.map((lot) {
                  return Marker(
                    point: LatLng(lot.latitude, lot.longitude),
                    width: 150,
                    height: 60,
                    child: GestureDetector(
                      onTap: () => _openParkingDetail(lot),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black26,
                                    blurRadius: 4,
                                    offset: const Offset(0, 2)),
                              ],
                            ),
                            child: Column(
                              children: [
                                Text(lot.name,
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold),
                                    overflow: TextOverflow.ellipsis),
                                Text(
                                  '${lot.freeSpots} свободных',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: lot.freeSpots > 0
                                        ? AppTheme.success
                                        : AppTheme.danger,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.location_on,
                              color: lot.freeSpots > 0
                                  ? AppTheme.success
                                  : AppTheme.danger,
                              size: 24),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          // Search bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Material(
              elevation: 4,
              borderRadius: BorderRadius.circular(12),
              child: TextField(
                controller: _searchCtrl,
                onSubmitted: _onSearch,
                decoration: InputDecoration(
                  hintText: 'Поиск парковки...',
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
                  fillColor: Colors.white,
                ),
              ),
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
