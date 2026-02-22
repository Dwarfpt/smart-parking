// Модель пользователя
class User {
  final String id;
  final String email;
  final String name;
  final String phone;
  final String role;
  final double balance;
  final String avatar;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone = '',
    this.role = 'user',
    this.balance = 0,
    this.avatar = '',
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['_id'] ?? json['id'] ?? '',
        email: json['email'] ?? '',
        name: json['name'] ?? '',
        phone: json['phone'] ?? '',
        role: json['role'] ?? 'user',
        balance: (json['balance'] ?? 0).toDouble(),
        avatar: json['avatar'] ?? '',
        isActive: json['isActive'] ?? true,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'])
            : null,
        updatedAt: json['updatedAt'] != null
            ? DateTime.parse(json['updatedAt'])
            : null,
      );

  Map<String, dynamic> toJson() => {
        'email': email,
        'name': name,
        'phone': phone,
        'avatar': avatar,
      };

  bool get isAdmin => role == 'admin';
}
