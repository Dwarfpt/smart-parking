// Модель парковки
class ParkingLot {
  final String id;
  final String name;
  final String nameRo;
  final String nameEn;
  final String address;
  final String addressRo;
  final String addressEn;
  final String description;
  final double longitude;
  final double latitude;
  final int totalSpots;
  final String image;
  final String workingHoursOpen;
  final String workingHoursClose;
  final bool isActive;
  final int freeSpots;
  final Map<String, int> spotCounts;
  final ParkingLotTariffSummary? tariff;
  /// Raw JSON for localization via loc()
  final Map<String, dynamic> raw;

  ParkingLot({
    required this.id,
    required this.name,
    this.nameRo = '',
    this.nameEn = '',
    required this.address,
    this.addressRo = '',
    this.addressEn = '',
    this.description = '',
    required this.longitude,
    required this.latitude,
    required this.totalSpots,
    this.image = '',
    this.workingHoursOpen = '00:00',
    this.workingHoursClose = '23:59',
    this.isActive = true,
    this.freeSpots = 0,
    this.spotCounts = const {},
    this.tariff,
    this.raw = const {},
  });

  factory ParkingLot.fromJson(Map<String, dynamic> json) {
    final loc = json['location'] ?? {};
    final coords = loc['coordinates'] as List<dynamic>? ?? [0, 0];
    final wh = json['workingHours'] ?? {};
    final sc = json['spotCounts'] as Map<String, dynamic>? ?? {};

    return ParkingLot(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      nameRo: json['nameRo'] ?? '',
      nameEn: json['nameEn'] ?? '',
      address: json['address'] ?? '',
      addressRo: json['addressRo'] ?? '',
      addressEn: json['addressEn'] ?? '',
      description: json['description'] ?? '',
      longitude: (coords[0] as num).toDouble(),
      latitude: (coords[1] as num).toDouble(),
      totalSpots: json['totalSpots'] ?? 0,
      image: json['image'] ?? '',
      workingHoursOpen: wh['open'] ?? '00:00',
      workingHoursClose: wh['close'] ?? '23:59',
      isActive: json['isActive'] ?? true,
      freeSpots: json['freeSpots'] ?? 0,
      spotCounts: sc.map((k, v) => MapEntry(k, v as int)),
      tariff: json['tariff'] != null
          ? ParkingLotTariffSummary.fromJson(json['tariff'])
          : null,
      raw: json,
    );
  }
}

class ParkingLotTariffSummary {
  final double pricePerHour;
  final String name;

  ParkingLotTariffSummary({required this.pricePerHour, required this.name});

  factory ParkingLotTariffSummary.fromJson(Map<String, dynamic> json) =>
      ParkingLotTariffSummary(
        pricePerHour: (json['pricePerHour'] ?? 0).toDouble(),
        name: json['name'] ?? '',
      );
}
