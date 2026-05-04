// Модель парковочного места
class ParkingSpot {
  final String id;
  final String parkingLotId;
  final int spotNumber;
  final String status; // free, occupied, reserved, maintenance
  final String? deviceId;
  final int floor;
  final String zone;
  final bool isSubscription;
  final String? subscribedUserId;

  ParkingSpot({
    required this.id,
    required this.parkingLotId,
    required this.spotNumber,
    this.status = 'free',
    this.deviceId,
    this.floor = 1,
    this.zone = 'A',
    this.isSubscription = false,
    this.subscribedUserId,
  });

  factory ParkingSpot.fromJson(Map<String, dynamic> json) => ParkingSpot(
        id: json['_id'] ?? json['id'] ?? '',
        parkingLotId: json['parkingLotId'] is Map
            ? json['parkingLotId']['_id'] ?? ''
            : json['parkingLotId'] ?? '',
        spotNumber: json['spotNumber'] ?? 0,
        status: json['status'] ?? 'free',
        deviceId: json['deviceId'],
        floor: json['floor'] ?? 1,
        zone: json['zone'] ?? 'A',
        isSubscription: json['isSubscription'] ?? false,
        subscribedUserId: json['subscribedUserId'],
      );

  bool get isFree => status == 'free';
  bool get isOccupied => status == 'occupied';
  bool get isReserved => status == 'reserved';
  bool get isMaintenance => status == 'maintenance';
}
