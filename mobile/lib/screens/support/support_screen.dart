// Поддержка — список тикетов, создание
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/support_provider.dart';

import '../../config/theme.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SupportProvider>().loadMyTickets();
    });
  }

  void _showCreateDialog() {
    final subjectCtrl = TextEditingController();
    final messageCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Новое обращение'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: subjectCtrl,
              decoration: const InputDecoration(labelText: 'Тема'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: messageCtrl,
              decoration: const InputDecoration(labelText: 'Сообщение'),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (subjectCtrl.text.trim().isEmpty ||
                  messageCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              final ok = await context.read<SupportProvider>().createTicket(
                    subjectCtrl.text.trim(),
                    messageCtrl.text.trim(),
                  );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(ok ? 'Обращение создано' : 'Ошибка'),
                  backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                ));
              }
            },
            child: const Text('Создать'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SupportProvider>();
    final tickets = provider.tickets;
    final fmt = DateFormat('dd.MM.yy HH:mm');

    return Scaffold(
      body: provider.loading
          ? const Center(child: CircularProgressIndicator())
          : tickets.isEmpty
              ? const Center(
                  child: Text('Нет обращений',
                      style:
                          TextStyle(fontSize: 16, color: AppTheme.gray500)))
              : RefreshIndicator(
                  onRefresh: () => provider.loadMyTickets(),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: tickets.length,
                    itemBuilder: (ctx, i) {
                      final t = tickets[i];
                      return Card(
                        child: ListTile(
                          onTap: () => Navigator.pushNamed(
                              context, '/support/${t.id}'),
                          leading: Icon(
                            t.isClosed
                                ? Icons.check_circle
                                : Icons.support_agent,
                            color: t.isClosed
                                ? AppTheme.gray400
                                : AppTheme.primary,
                          ),
                          title: Text(t.subject,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                          subtitle: Text(
                            t.updatedAt != null
                                ? fmt.format(t.updatedAt!)
                                : '',
                            style:
                                const TextStyle(fontSize: 12),
                          ),
                          trailing: _StatusBadge(status: t.status),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateDialog,
        icon: const Icon(Icons.add),
        label: const Text('Обращение'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case 'open':
        color = AppTheme.success;
        label = 'Открыт';
        break;
      case 'in-progress':
        color = AppTheme.warning;
        label = 'В работе';
        break;
      case 'closed':
        color = AppTheme.gray500;
        label = 'Закрыт';
        break;
      default:
        color = AppTheme.gray500;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
