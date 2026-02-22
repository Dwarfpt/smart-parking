// Провайдер парковок — список, детали, места
import 'package:flutter/material.dart';
import '../models/parking_lot.dart';
import '../models/parking_spot.dart';
import '../models/tariff.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class ParkingProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socket = SocketService();

  List<ParkingLot> _parkingLots = [];
  ParkingLot? _currentLot;
  List<ParkingSpot> _spots = [];
  Tariff? _currentTariff;
  bool _loading = false;
  String? _error;

  List<ParkingLot> get parkingLots => _parkingLots;
  ParkingLot? get currentLot => _currentLot;
  List<ParkingSpot> get spots => _spots;
  Tariff? get currentTariff => _currentTariff;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadParkingLots({String? search}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _parkingLots = await _api.getParkingLots(search: search);
    } catch (e) {
      _error = 'Не удалось загрузить парковки';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadParkingDetail(String id) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final data = await _api.getParkingLot(id);
      _currentLot = data['parkingLot'] as ParkingLot;
      _spots = data['spots'] as List<ParkingSpot>;
      _currentTariff = data['tariff'] as Tariff?;

      // Subscribe to real-time updates
      _socket.off('spots:update');
      _socket.on('spots:update', (data) {
        if (data['parkingLotId'] == id) {
          final updatedSpots = (data['spots'] as List)
              .map((s) => ParkingSpot.fromJson(s))
              .toList();
          for (var updated in updatedSpots) {
            final index =
                _spots.indexWhere((s) => s.id == updated.id);
            if (index != -1) {
              _spots[index] = ParkingSpot(
                id: _spots[index].id,
                parkingLotId: _spots[index].parkingLotId,
                spotNumber: updated.spotNumber,
                status: updated.status,
                deviceId: _spots[index].deviceId,
                floor: _spots[index].floor,
                zone: _spots[index].zone,
                isSubscription: _spots[index].isSubscription,
                subscribedUserId: _spots[index].subscribedUserId,
              );
            }
          }
          notifyListeners();
        }
      });
    } catch (e) {
      _error = 'Не удалось загрузить парковку';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clearDetail() {
    _socket.off('spots:update');
    _currentLot = null;
    _spots = [];
    _currentTariff = null;
  }
}
