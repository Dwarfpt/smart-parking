// Детали тикета — переписка, отправка сообщений
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/support_provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';

class TicketDetailScreen extends StatefulWidget {
  final String ticketId;
  const TicketDetailScreen({super.key, required this.ticketId});

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SupportProvider>().loadTicket(widget.ticketId);
    });
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();
    final ok =
        await context.read<SupportProvider>().sendMessage(widget.ticketId, text);
    if (ok) _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SupportProvider>();
    final ticket = provider.currentTicket;
    final currentUserId = context.read<AuthProvider>().user?.id;

    if (provider.loading && ticket == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Загрузка...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (ticket == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Обращение')),
        body: const Center(child: Text('Обращение не найдено')),
      );
    }

    _scrollToBottom();

    return Scaffold(
      appBar: AppBar(
        title: Text(ticket.subject, overflow: TextOverflow.ellipsis),
        actions: [
          if (!ticket.isClosed)
            IconButton(
              icon: const Icon(Icons.close),
              tooltip: 'Закрыть обращение',
              onPressed: () async {
                final ok = await provider.closeTicket(ticket.id);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content:
                        Text(ok ? 'Обращение закрыто' : 'Ошибка'),
                    backgroundColor:
                        ok ? AppTheme.success : AppTheme.danger,
                  ));
                }
              },
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(12),
              itemCount: ticket.messages.length,
              itemBuilder: (ctx, i) {
                final msg = ticket.messages[i];
                final isMe = msg.senderId == currentUserId;
                return Align(
                  alignment:
                      isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.75),
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe
                          ? AppTheme.primary
                          : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(14),
                        topRight: const Radius.circular(14),
                        bottomLeft:
                            isMe ? const Radius.circular(14) : Radius.zero,
                        bottomRight:
                            isMe ? Radius.zero : const Radius.circular(14),
                      ),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black12,
                            blurRadius: 3,
                            offset: const Offset(0, 1)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (msg.senderName != null)
                          Text(msg.senderName!,
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color:
                                      isMe ? Colors.white70 : AppTheme.gray500)),
                        Text(msg.text,
                            style: TextStyle(
                                color: isMe ? Colors.white : AppTheme.gray800)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          if (!ticket.isClosed)
            Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                      color: Colors.black12,
                      blurRadius: 4,
                      offset: const Offset(0, -2)),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Сообщение...',
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  IconButton(
                    onPressed: _send,
                    icon: const Icon(Icons.send, color: AppTheme.primary),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
