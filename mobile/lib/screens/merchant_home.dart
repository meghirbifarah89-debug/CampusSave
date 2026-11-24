// [MARYEM] Espace commerçant mobile : Mon commerce, Mes offres, Retraits (scan du QR + colonne « Scanné »), statistiques
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'commerce_screen.dart';
import 'merchant_offers_screen.dart';
import 'dashboard_screen.dart';
import 'orders_screen.dart' show statusColor;
import 'profile_screen.dart';

class MerchantHome extends StatefulWidget {
  const MerchantHome({super.key});
  @override
  State<MerchantHome> createState() => _MerchantHomeState();
}

class _MerchantHomeState extends State<MerchantHome> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const CommerceScreen(owner: true),
      const MerchantOffersScreen(),
      const MerchantOrdersScreen(),
      const DashboardScreen(role: 'commercant'),
      const ProfileScreen(),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text.rich(TextSpan(children: [TextSpan(text: 'Campus'), TextSpan(text: 'Save', style: TextStyle(color: AppColors.caramel))]))),
      body: pages[_index],
      floatingActionButton: _index == 2
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ScanScreen())),
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Scanner'),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.storefront), label: 'Mon commerce'),
          NavigationDestination(icon: Icon(Icons.restaurant_menu), label: 'Mes offres'),
          NavigationDestination(icon: Icon(Icons.qr_code_2), label: 'Retraits'),
          NavigationDestination(icon: Icon(Icons.bar_chart), label: 'Stats'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}

class MerchantOrdersScreen extends StatefulWidget {
  const MerchantOrdersScreen({super.key});
  @override
  State<MerchantOrdersScreen> createState() => _MerchantOrdersScreenState();
}

class _MerchantOrdersScreenState extends State<MerchantOrdersScreen> {
  List<Order> _orders = [];
  String _filter = '';

  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    // rafraîchissement automatique : « Scanné » se met à jour après chaque scan
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final data = await ApiService.get('/orders/merchant') as List;
    if (mounted) setState(() => _orders = data.map((e) => Order.fromJson(e)).toList());
  }

  @override
  Widget build(BuildContext context) {
    final shown = _orders.where((o) => _filter.isEmpty || o.status == _filter).toList();
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(8),
        child: SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: '', label: Text('Toutes')),
            ButtonSegment(value: 'payee', label: Text('À récupérer')),
            ButtonSegment(value: 'recuperee', label: Text('Récupérées')),
          ],
          selected: {_filter},
          onSelectionChanged: (s) => setState(() => _filter = s.first),
        ),
      ),
      Expanded(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            children: shown.isEmpty
                ? [const Padding(padding: EdgeInsets.all(40), child: Center(child: Text('Aucune commande')))]
                : shown.map((o) => Card(
                      child: ListTile(
                        title: Text('${o.code} – ${o.studentName}', style: const TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: Text('${o.resume}\n${statuts[o.status]} · ${fmt(o.total)}', style: TextStyle(color: statusColor(o.status))),
                        isThreeLine: true,
                        // Colonne « Scanné Code » : vraie validation du QR (statut + date de scan)
                        trailing: o.scanned
                            ? const Pill('✓ Scanné', bg: Color(0xFFDCEFE2), fg: AppColors.ok)
                            : const Pill('○ Non scanné', bg: Color(0xFFF1E6D6), fg: Color(0xFF8A6A4A)),
                      ),
                    )).toList(),
          ),
        ),
      ),
    ]);
  }
}

/// Scan du QR code présenté par l'étudiant -> validation du retrait
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});
  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _handled = false;

  Future<void> _onDetect(BarcodeCapture capture) async {
    final value = capture.barcodes.firstOrNull?.rawValue;
    if (_handled || value == null) return;
    _handled = true;
    String title, msg;
    // Repas gratuit ComeEat (EcoPoints) : QR "COMEEAT:..."
    if (value.startsWith('COMEEAT:')) {
      try {
        final r = await ApiService.post('/rewards/redeem', {'code': value});
        title = '🍽️ ComeEat';
        msg = '${r['message']}';
      } catch (e) {
        title = '❌ Refusé';
        msg = '$e';
      }
      if (!mounted) return;
      await showDialog(context: context, builder: (_) => AlertDialog(title: Text(title), content: Text(msg), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]));
      if (mounted) Navigator.pop(context);
      return;
    }
    try {
      final r = await ApiService.post('/orders/verify-qr', {'qr': value});
      final o = r['order'];
      title = '✅ Retrait validé';
      msg = '${o['code']} – ${o['studentName']}\n'
          '${(o['items'] as List).map((i) => '${i['quantity']}× ${i['title']}').join('\n')}\n'
          '+${o['ecoPoints']} EcoPoints pour l’étudiant';
    } catch (e) {
      title = '❌ Refusé';
      msg = '$e';
    }
    if (!mounted) return;
    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(msg),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
      ),
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scanner le QR code')),
      body: MobileScanner(onDetect: _onDetect),
    );
  }
}
