// Модель транзакции
class Transaction {
  final String id;
  final String userId;
  final double amount;
  final String type; // topup, payment, refund
  final String? bookingId;
  final String description;
  final double balanceAfter;
  final DateTime? createdAt;

  Transaction({
    required this.id,
    required this.userId,
    required this.amount,
    required this.type,
    this.bookingId,
    this.description = '',
    this.balanceAfter = 0,
    this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: json['_id'] ?? json['id'] ?? '',
        userId: json['userId'] ?? '',
        amount: (json['amount'] ?? 0).toDouble(),
        type: json['type'] ?? '',
        bookingId: json['bookingId'],
        description: json['description'] ?? '',
        balanceAfter: (json['balanceAfter'] ?? 0).toDouble(),
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'])
            : null,
      );

  bool get isTopup => type == 'topup';
  bool get isPayment => type == 'payment';
  bool get isRefund => type == 'refund';
}
