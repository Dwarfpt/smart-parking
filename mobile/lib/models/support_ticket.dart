// Модель тикета поддержки
class SupportTicket {
  final String id;
  final String userId;
  final String? userName;
  final String? userEmail;
  final String subject;
  final String status; // open, in-progress, closed
  final List<TicketMessage> messages;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  SupportTicket({
    required this.id,
    required this.userId,
    this.userName,
    this.userEmail,
    required this.subject,
    this.status = 'open',
    this.messages = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    String uid = '';
    String? uName;
    String? uEmail;

    if (json['userId'] is Map) {
      uid = json['userId']['_id'] ?? '';
      uName = json['userId']['name'];
      uEmail = json['userId']['email'];
    } else {
      uid = json['userId'] ?? '';
    }

    return SupportTicket(
      id: json['_id'] ?? json['id'] ?? '',
      userId: uid,
      userName: uName,
      userEmail: uEmail,
      subject: json['subject'] ?? '',
      status: json['status'] ?? 'open',
      messages: (json['messages'] as List<dynamic>?)
              ?.map((m) => TicketMessage.fromJson(m))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
    );
  }

  bool get isOpen => status == 'open';
  bool get isClosed => status == 'closed';
}

class TicketMessage {
  final String? senderId;
  final String? senderName;
  final String senderRole;
  final String text;
  final DateTime? createdAt;

  TicketMessage({
    this.senderId,
    this.senderName,
    required this.senderRole,
    required this.text,
    this.createdAt,
  });

  factory TicketMessage.fromJson(Map<String, dynamic> json) {
    String? sid;
    String? sName;

    if (json['senderId'] is Map) {
      sid = json['senderId']['_id'];
      sName = json['senderId']['name'];
    } else {
      sid = json['senderId'];
    }

    return TicketMessage(
      senderId: sid,
      senderName: sName,
      senderRole: json['senderRole'] ?? 'user',
      text: json['text'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
    );
  }

  bool get isAdmin => senderRole == 'admin';
}
