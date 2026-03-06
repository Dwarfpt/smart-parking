// Детали парковки — места, бронирование, абонемент
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/parking_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../models/parking_spot.dart';
import '../../config/theme.dart';

class ParkingDetailScreen extends StatefulWidget {
  final String parkingId;
  const ParkingDetailScreen({super.key, required this.parkingId});

  @override
  State<ParkingDetailScreen> createState() => _ParkingDetailScreenState();
}

class _ParkingDetailScreenState extends State<ParkingDetailScreen> {
  ParkingSpot? _selectedSpot;
  String _bookingType = 'reservation';
  DateTime _startTime = DateTime.now().add(const Duration(minutes: 30));
  DateTime _endTime = DateTime.now().add(const Duration(hours: 2));
  String _subPeriod = 'month';
  final _plateCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ParkingProvider>().loadParkingDetail(widget.parkingId);
    });
  }

  @override
  void dispose() {
    _plateCtrl.dispose();
    context.read<ParkingProvider>().clearDetail();
    super.dispose();
  }

  Color _spotColor(ParkingSpot s) {
    switch (s.status) {
      case 'free':
        return AppTheme.success;
      case 'occupied':
        return AppTheme.danger;
      case 'reserved':
        return AppTheme.warning;
      case 'maintenance':
        return AppTheme.gray400;
      default:
        return AppTheme.gray400;
    }
  }

  IconData _spotIcon(ParkingSpot s) {
    switch (s.status) {
      case 'free':
        return Icons.check_circle_outline;
      case 'occupied':
        return Icons.cancel_outlined;
      case 'reserved':
        return Icons.access_time;
      case 'maintenance':
        return Icons.build_outlined;
      default:
        return Icons.help_outline;
    }
  }

  Future<void> _pickDateTime(bool isStart) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isStart ? _startTime : _endTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime:
          TimeOfDay.fromDateTime(isStart ? _startTime : _endTime),
    );
    if (time == null) return;

    setState(() {
      final dt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
      if (isStart) {
        _startTime = dt;
        if (_endTime.isBefore(_startTime)) {
          _endTime = _startTime.add(const Duration(hours: 1));
        }
      } else {
        _endTime = dt;
      }
    });
  }

  Future<void> _book() async {
    if (_selectedSpot == null) return;
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      final loc = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(loc.t('parkingLoginRequired'))),
      );
      return;
    }

    final booking = context.read<BookingProvider>();
    bool ok;

    if (_bookingType == 'reservation') {
      ok = await booking.createReservation(
        parkingSpotId: _selectedSpot!.id,
        startTime: _startTime,
        endTime: _endTime,
        vehiclePlate: _plateCtrl.text.trim(),
      );
    } else {
      ok = await booking.createSubscription(
        parkingSpotId: _selectedSpot!.id,
        period: _subPeriod,
        vehiclePlate: _plateCtrl.text.trim(),
      );
    }

    if (mounted) {
      final loc = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok
            ? booking.successMessage ?? loc.t('success')
            : booking.error ?? loc.t('error')),
        backgroundColor: ok ? AppTheme.success : AppTheme.danger,
      ));
      if (ok) {
        auth.refreshUser();
        context.read<ParkingProvider>().loadParkingDetail(widget.parkingId);
        setState(() => _selectedSpot = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final parking = context.watch<ParkingProvider>();
    final loc = context.watch<LocaleProvider>();
    final lot = parking.currentLot;
    final spots = parking.spots;
    final tariff = parking.currentTariff;
    final fmt = DateFormat('dd.MM.yyyy HH:mm');

    if (parking.loading && lot == null) {
      return Scaffold(
        appBar: AppBar(title: Text(loc.t('parkingLoading'))),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (lot == null) {
      return Scaffold(
        appBar: AppBar(title: Text(loc.t('parkingTitle'))),
        body: Center(child: Text(loc.t('parkingNotFound'))),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(loc.loc(lot.raw, 'name'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info card
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.location_on, size: 18, color: AppTheme.primary),
                      const SizedBox(width: 6),
                      Expanded(child: Text(loc.loc(lot.raw, 'address'),
                          style: const TextStyle(fontSize: 14))),
                    ]),
                    const SizedBox(height: 8),
                    Row(children: [
                      const Icon(Icons.access_time, size: 18, color: AppTheme.primary),
                      const SizedBox(width: 6),
                      Text('${lot.workingHoursOpen} – ${lot.workingHoursClose}'),
                    ]),
                    if (tariff != null) ...[
                      const SizedBox(height: 8),
                      Row(children: [
                        const Icon(Icons.attach_money, size: 18, color: AppTheme.primary),
                        const SizedBox(width: 6),
                        Text('${tariff.pricePerHour} MDL/час'),
                      ]),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Legend
            Row(
              children: [
                _legend(AppTheme.success, loc.t('parkingFree')),
                _legend(AppTheme.danger, loc.t('parkingOccupied')),
                _legend(AppTheme.warning, loc.t('parkingReserved')),
                _legend(AppTheme.gray400, loc.t('parkingMaintenance')),
              ],
            ),
            const SizedBox(height: 12),

            // Spots grid
            Text('${loc.t('parkingSpots')} (${spots.where((s) => s.isFree).length} ${loc.t('parkingSpotsCount')} ${spots.length})',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
              ),
              itemCount: spots.length,
              itemBuilder: (ctx, i) {
                final spot = spots[i];
                final selected = _selectedSpot?.id == spot.id;
                return GestureDetector(
                  onTap: spot.isFree ? () => setState(() => _selectedSpot = spot) : null,
                  child: Container(
                    decoration: BoxDecoration(
                      color: selected
                          ? AppTheme.primary
                          : _spotColor(spot).withAlpha(40),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: selected ? AppTheme.primary : _spotColor(spot),
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(_spotIcon(spot),
                            size: 20,
                            color: selected ? Colors.white : _spotColor(spot)),
                        Text('#${spot.spotNumber}',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: selected ? Colors.white : AppTheme.gray800)),
                      ],
                    ),
                  ),
                );
              },
            ),

            // Booking form
            if (_selectedSpot != null) ...[
              const SizedBox(height: 20),
              const Divider(),
              Text('${loc.t('parkingBookSpot')} #${_selectedSpot!.spotNumber}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              // Type toggle
              SegmentedButton<String>(
                segments: [
                  ButtonSegment(value: 'reservation', label: Text(loc.t('parkingOneTime'))),
                  ButtonSegment(value: 'subscription', label: Text(loc.t('parkingSubscription'))),
                ],
                selected: {_bookingType},
                onSelectionChanged: (s) =>
                    setState(() => _bookingType = s.first),
              ),
              const SizedBox(height: 16),

              if (_bookingType == 'reservation') ...[
                ListTile(
                  title: Text(loc.t('parkingStart')),
                  subtitle: Text(fmt.format(_startTime)),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () => _pickDateTime(true),
                ),
                ListTile(
                  title: Text(loc.t('parkingEnd')),
                  subtitle: Text(fmt.format(_endTime)),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () => _pickDateTime(false),
                ),
              ] else ...[
                DropdownButtonFormField<String>(
                  value: _subPeriod,
                  decoration: InputDecoration(labelText: loc.t('parkingSubPeriod')),
                  items: [
                    DropdownMenuItem(value: 'week', child: Text(loc.t('parkingWeek'))),
                    DropdownMenuItem(value: 'month', child: Text(loc.t('parkingMonth'))),
                    DropdownMenuItem(value: '3months', child: Text(loc.t('parking3Months'))),
                    DropdownMenuItem(value: 'year', child: Text(loc.t('parkingYear'))),
                  ],
                  onChanged: (v) => setState(() => _subPeriod = v!),
                ),
                if (tariff != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    '${loc.t('parkingCost')}: ${tariff.getSubscriptionPrice(_subPeriod)} MDL',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ],
              ],
              const SizedBox(height: 12),
              TextField(
                controller: _plateCtrl,
                decoration: InputDecoration(
                  labelText: loc.t('parkingVehiclePlate'),
                  prefixIcon: const Icon(Icons.directions_car_outlined),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _book,
                  icon: const Icon(Icons.bookmark_add),
                  label: Text(loc.t('parkingBook'), style: const TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _legend(Color color, String label) => Expanded(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                    color: color, borderRadius: BorderRadius.circular(3))),
            const SizedBox(width: 4),
            Flexible(
                child:
                    Text(label, style: const TextStyle(fontSize: 10), overflow: TextOverflow.ellipsis)),
          ],
        ),
      );
}
