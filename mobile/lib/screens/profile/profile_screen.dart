// Профиль — данные пользователя, баланс, выход
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/transaction.dart';
import '../../config/theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          labelColor: AppTheme.primary,
          tabs: const [
            Tab(text: 'Профиль'),
            Tab(text: 'Пароль'),
            Tab(text: 'Безопасность'),
            Tab(text: 'Баланс'),
            Tab(text: 'Транзакции'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: const [
              _ProfileTab(),
              _PasswordTab(),
              _SecurityTab(),
              _BalanceTab(),
              _TransactionsTab(),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProfileTab extends StatefulWidget {
  const _ProfileTab();

  @override
  State<_ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<_ProfileTab> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _init = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_init) {
      final user = context.read<AuthProvider>().user;
      if (user != null) {
        _nameCtrl.text = user.name;
        _phoneCtrl.text = user.phone;
      }
      _init = true;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          CircleAvatar(
            radius: 48,
            backgroundColor: AppTheme.primary.withAlpha(40),
            child: Text(user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                style: const TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary)),
          ),
          const SizedBox(height: 8),
          Text(user.email, style: const TextStyle(color: AppTheme.gray500)),
          const SizedBox(height: 24),
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Имя',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Телефон',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final ok = await auth.updateProfile(
                  name: _nameCtrl.text.trim(),
                  phone: _phoneCtrl.text.trim(),
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content:
                        Text(ok ? 'Профиль обновлён' : auth.error ?? 'Ошибка'),
                    backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                  ));
                }
              },
              child: const Text('Сохранить'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PasswordTab extends StatefulWidget {
  const _PasswordTab();

  @override
  State<_PasswordTab> createState() => _PasswordTabState();
}

class _PasswordTabState extends State<_PasswordTab> {
  final _curCtrl = TextEditingController();
  final _newCtrl = TextEditingController();

  @override
  void dispose() {
    _curCtrl.dispose();
    _newCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          TextField(
            controller: _curCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Текущий пароль',
              prefixIcon: Icon(Icons.lock_outline),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _newCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Новый пароль',
              prefixIcon: Icon(Icons.lock_reset),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final auth = context.read<AuthProvider>();
                final ok = await auth.changePassword(
                    _curCtrl.text, _newCtrl.text);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(
                        ok ? 'Пароль изменён' : auth.error ?? 'Ошибка'),
                    backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                  ));
                  if (ok) {
                    _curCtrl.clear();
                    _newCtrl.clear();
                  }
                }
              },
              child: const Text('Сменить пароль'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BalanceTab extends StatefulWidget {
  const _BalanceTab();

  @override
  State<_BalanceTab> createState() => _BalanceTabState();
}

class _SecurityTab extends StatelessWidget {
  const _SecurityTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Двухфакторная аутентификация',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'При включении 2FA для входа потребуется ввести код, отправленный на ваш email.',
            style: TextStyle(color: AppTheme.gray500),
          ),
          const SizedBox(height: 24),
          Card(
            margin: EdgeInsets.zero,
            child: SwitchListTile(
              title: const Text('2FA по email'),
              subtitle: Text(user.twoFactorEnabled ? 'Включена' : 'Выключена'),
              value: user.twoFactorEnabled,
              activeColor: AppTheme.primary,
              onChanged: (_) async {
                final ok = await auth.toggle2FA();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(ok
                        ? (user.twoFactorEnabled ? '2FA выключена' : '2FA включена')
                        : auth.error ?? 'Ошибка'),
                    backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                  ));
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BalanceTabState extends State<_BalanceTab> {
  final _amountCtrl = TextEditingController();

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Text('Текущий баланс',
                      style: TextStyle(fontSize: 14, color: AppTheme.gray500)),
                  const SizedBox(height: 8),
                  Text('${user?.balance.toStringAsFixed(2) ?? '0.00'} MDL',
                      style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Сумма пополнения',
              prefixIcon: Icon(Icons.payment),
              suffixText: 'MDL',
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [50, 100, 200, 500].map((a) {
              return ActionChip(
                label: Text('$a MDL'),
                onPressed: () => _amountCtrl.text = a.toString(),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () async {
                final amount = double.tryParse(_amountCtrl.text);
                if (amount == null || amount < 1) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Введите сумму от 1 MDL')),
                  );
                  return;
                }
                final ok = await auth.topUp(amount);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(ok
                        ? 'Баланс пополнен!'
                        : auth.error ?? 'Ошибка пополнения'),
                    backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                  ));
                  if (ok) _amountCtrl.clear();
                }
              },
              icon: const Icon(Icons.add_circle_outline),
              label: const Text('Пополнить'),
            ),
          ),
        ],
      ),
    );
  }
}

class _TransactionsTab extends StatefulWidget {
  const _TransactionsTab();

  @override
  State<_TransactionsTab> createState() => _TransactionsTabState();
}

class _TransactionsTabState extends State<_TransactionsTab> {
  List<Transaction> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _transactions = await ApiService().getTransactions();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    if (_transactions.isEmpty) {
      return const Center(
        child: Text('Нет транзакций', style: TextStyle(color: AppTheme.gray500)),
      );
    }

    final fmt = DateFormat('dd.MM.yy HH:mm');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _transactions.length,
        itemBuilder: (ctx, i) {
          final t = _transactions[i];
          Color color;
          IconData icon;
          switch (t.type) {
            case 'topup':
              color = AppTheme.success;
              icon = Icons.arrow_downward;
              break;
            case 'payment':
              color = AppTheme.danger;
              icon = Icons.arrow_upward;
              break;
            case 'refund':
              color = AppTheme.warning;
              icon = Icons.replay;
              break;
            default:
              color = AppTheme.gray500;
              icon = Icons.swap_horiz;
          }
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: color.withAlpha(25),
                child: Icon(icon, color: color, size: 20),
              ),
              title: Text(t.description.isNotEmpty
                  ? t.description
                  : t.type.toUpperCase()),
              subtitle: Text(
                  t.createdAt != null ? fmt.format(t.createdAt!) : ''),
              trailing: Text(
                '${t.amount > 0 ? '+' : ''}${t.amount.toStringAsFixed(2)} MDL',
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                    fontSize: 14),
              ),
            ),
          );
        },
      ),
    );
  }
}
