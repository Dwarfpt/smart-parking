// Мои бронирования — список, QR-коды, отмена
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/booking_provider.dart';
import '../../config/theme.dart';
import '../../models/booking.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _tabCtrl.addListener(_onTab);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _onTab() {
    if (!_tabCtrl.indexIsChanging) _load();
  }

  void _load() {
    final statuses = [null, 'active', 'completed'];
    context
        .read<BookingProvider>()
        .loadMyBookings(status: statuses[_tabCtrl.index]);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();
    final bookings = provider.bookings;
    return Column(
      children: [
        TabBar(
          controller: _tabCtrl,
          labelColor: AppTheme.primary,
          tabs: const [
            Tab(text: 'Все'),
            Tab(text: 'Активные'),
            Tab(text: 'Завершённые'),
          ],
        ),
        Expanded(
          child: provider.loading
              ? const Center(child: CircularProgressIndicator())
              : bookings.isEmpty
                  ? const Center(
                      child: Text('Нет бронирований',
                          style: TextStyle(fontSize: 16, color: AppTheme.gray500)))
                  : RefreshIndicator(
                      onRefresh: () async => _load(),
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: bookings.length,
                        itemBuilder: (ctx, i) =>
                            _BookingCard(booking: bookings[i], onCancel: () async {
                              final ok = await provider.cancelBooking(bookings[i].id);
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(ok
                                      ? provider.successMessage ?? 'Отменено'
                                      : provider.error ?? 'Ошибка'),
                                  backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                                ));
                              }
                            }),
                      ),
                    ),
        ),
      ],
    );
  }
}

class _BookingCard extends StatelessWidget {
  final Booking booking;
  final VoidCallback onCancel;

  const _BookingCard({required this.booking, required this.onCancel});

  Color _statusColor() {
    switch (booking.status) {
      case 'active':
        return AppTheme.success;
      case 'completed':
        return AppTheme.primary;
      case 'cancelled':
        return AppTheme.danger;
      case 'expired':
        return AppTheme.gray500;
      default:
        return AppTheme.gray500;
    }
  }

  String _statusLabel() {
    switch (booking.status) {
      case 'active':
        return 'Активно';
      case 'completed':
        return 'Завершено';
      case 'cancelled':
        return 'Отменено';
      case 'expired':
        return 'Истекло';
      default:
        return booking.status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd.MM.yy HH:mm');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  booking.isReservation
                      ? Icons.calendar_today
                      : Icons.autorenew,
                  size: 18,
                  color: AppTheme.primary,
                ),
                const SizedBox(width: 6),
                Text(
                  booking.isReservation ? 'Разовое' : 'Подписка',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _statusColor().withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _statusColor()),
                  ),
                  child: Text(_statusLabel(),
                      style: TextStyle(
                          fontSize: 12,
                          color: _statusColor(),
                          fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (booking.lotInfo != null)
              Text(booking.lotInfo!.name,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            if (booking.spotInfo != null)
              Text(
                  'Место #${booking.spotInfo!.spotNumber}, зона ${booking.spotInfo!.zone}, этаж ${booking.spotInfo!.floor}',
                  style: const TextStyle(fontSize: 13, color: AppTheme.gray500)),
            const SizedBox(height: 6),
            Text(
              '${fmt.format(booking.startTime)} — ${fmt.format(booking.endTime)}',
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 4),
            Text('${booking.totalPrice} MDL',
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary)),
            if (booking.isActive) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onCancel,
                  icon: const Icon(Icons.cancel_outlined, size: 18),
                  label: const Text('Отменить'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.danger,
                    side: const BorderSide(color: AppTheme.danger),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
