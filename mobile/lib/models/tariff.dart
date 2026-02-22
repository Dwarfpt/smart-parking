// Модель тарифа
class Tariff {
  final String id;
  final String parkingLotId;
  final String name;
  final double pricePerHour;
  final double subscriptionWeek;
  final double subscriptionMonth;
  final double subscription3Months;
  final double subscriptionYear;
  final double peakMultiplier;
  final String peakHoursStart;
  final String peakHoursEnd;
  final bool isActive;

  Tariff({
    required this.id,
    required this.parkingLotId,
    this.name = 'Standard',
    required this.pricePerHour,
    this.subscriptionWeek = 0,
    this.subscriptionMonth = 0,
    this.subscription3Months = 0,
    this.subscriptionYear = 0,
    this.peakMultiplier = 1.5,
    this.peakHoursStart = '08:00',
    this.peakHoursEnd = '18:00',
    this.isActive = true,
  });

  factory Tariff.fromJson(Map<String, dynamic> json) => Tariff(
        id: json['_id'] ?? json['id'] ?? '',
        parkingLotId: json['parkingLotId'] is Map
            ? json['parkingLotId']['_id'] ?? ''
            : json['parkingLotId'] ?? '',
        name: json['name'] ?? 'Standard',
        pricePerHour: (json['pricePerHour'] ?? 0).toDouble(),
        subscriptionWeek: (json['subscriptionWeek'] ?? 0).toDouble(),
        subscriptionMonth: (json['subscriptionMonth'] ?? 0).toDouble(),
        subscription3Months: (json['subscription3Months'] ?? 0).toDouble(),
        subscriptionYear: (json['subscriptionYear'] ?? 0).toDouble(),
        peakMultiplier: (json['peakMultiplier'] ?? 1.5).toDouble(),
        peakHoursStart: json['peakHoursStart'] ?? '08:00',
        peakHoursEnd: json['peakHoursEnd'] ?? '18:00',
        isActive: json['isActive'] ?? true,
      );

  double getSubscriptionPrice(String period) {
    switch (period) {
      case 'week':
        return subscriptionWeek;
      case 'month':
        return subscriptionMonth;
      case '3months':
        return subscription3Months;
      case 'year':
        return subscriptionYear;
      default:
        return 0;
    }
  }
}
