// Модель бронирования
class Booking {
  final String id;
  final String userId;
  final String parkingSpotId;
  final String parkingLotId;
  final String type; // reservation, subscription
  final DateTime startTime;
  final DateTime endTime;
  final String? subscriptionPeriod;
  final String status; // active, completed, cancelled, expired
  final double totalPrice;
  final String vehiclePlate;
  final String? qrToken;
  final DateTime? createdAt;

  // Populated fields
  final BookingSpotInfo? spotInfo;
  final BookingLotInfo? lotInfo;

  Booking({
    required this.id,
    required this.userId,
    required this.parkingSpotId,
    required this.parkingLotId,
    required this.type,
    required this.startTime,
    required this.endTime,
    this.subscriptionPeriod,
    this.status = 'active',
    required this.totalPrice,
    this.vehiclePlate = '',
    this.qrToken,
    this.createdAt,
    this.spotInfo,
    this.lotInfo,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    BookingSpotInfo? si;
    if (json['parkingSpotId'] is Map) {
      si = BookingSpotInfo.fromJson(json['parkingSpotId']);
    }
    BookingLotInfo? li;
    if (json['parkingLotId'] is Map) {
      li = BookingLotInfo.fromJson(json['parkingLotId']);
    }

    return Booking(
      id: json['_id'] ?? json['id'] ?? '',
      userId: json['userId'] is Map
          ? json['userId']['_id'] ?? ''
          : json['userId'] ?? '',
      parkingSpotId: json['parkingSpotId'] is Map
          ? json['parkingSpotId']['_id'] ?? ''
          : json['parkingSpotId'] ?? '',
      parkingLotId: json['parkingLotId'] is Map
          ? json['parkingLotId']['_id'] ?? ''
          : json['parkingLotId'] ?? '',
      type: json['type'] ?? 'reservation',
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      subscriptionPeriod: json['subscriptionPeriod'],
      status: json['status'] ?? 'active',
      totalPrice: (json['totalPrice'] ?? 0).toDouble(),
      vehiclePlate: json['vehiclePlate'] ?? '',
      qrToken: json['qrToken'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
      spotInfo: si,
      lotInfo: li,
    );
  }

  bool get isActive => status == 'active';
  bool get isReservation => type == 'reservation';
  bool get isSubscription => type == 'subscription';
}

class BookingSpotInfo {
  final String id;
  final int spotNumber;
  final String zone;
  final int floor;

  BookingSpotInfo({
    required this.id,
    required this.spotNumber,
    this.zone = 'A',
    this.floor = 1,
  });

  factory BookingSpotInfo.fromJson(Map<String, dynamic> json) =>
      BookingSpotInfo(
        id: json['_id'] ?? '',
        spotNumber: json['spotNumber'] ?? 0,
        zone: json['zone'] ?? 'A',
        floor: json['floor'] ?? 1,
      );
}

class BookingLotInfo {
  final String id;
  final String name;
  final String address;
  final Map<String, dynamic> raw;

  BookingLotInfo({
    required this.id,
    required this.name,
    this.address = '',
    this.raw = const {},
  });

  factory BookingLotInfo.fromJson(Map<String, dynamic> json) => BookingLotInfo(
        id: json['_id'] ?? '',
        name: json['name'] ?? '',
        address: json['address'] ?? '',
        raw: json,
      );
}
