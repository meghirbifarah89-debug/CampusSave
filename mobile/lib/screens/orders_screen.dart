// [MARYEM] Mes commandes + détail (QR code, vérification du paiement)
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/key_button.dart';

Color statusColor(String s) => switch (s) {
      'payee' => AppColors.ok,
      'recuperee' => AppColors.ok,
      'annulee' => AppColors.red,
      _ => AppColors.yellow,
    };

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> with WidgetsBindingObserver {
  List<Order> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Au retour de la page de paiement, on vérifie le statut des commandes en attente
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load(verify: true);
  }

  Future<void> _load({bool verify = false}) async {
    try {
      var data = (await ApiService.get('/orders/mine') as List).map((e) => Order.fromJson(e)).toList();
      if (verify) {
        for (final o in data.where((o) => o.status == 'en_attente_paiement')) {
          await ApiService.get('/payments/status/${o.id}');
        }
        data = (await ApiService.get('/orders/mine') as List).map((e) => Order.fromJson(e)).toList();
      }
      if (mounted) setState(() => _orders = data);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: () => _load(verify: true),
      child: _orders.isEmpty
          ? ListView(children: const [Padding(padding: EdgeInsets.all(40), child: Center(child: Text('Aucune commande')))])
          : ListView.builder(
              itemCount: _orders.length,
              itemBuilder: (_, i) {
                final o = _orders[i];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: ListTile(
                    leading: Icon(o.status == 'payee' ? Icons.qr_code_2 : Icons.receipt, color: statusColor(o.status), size: 36),
                    title: Text('${o.code} – ${o.commerceName}'),
                    subtitle: Text('${o.resume}\n${statuts[o.status]}', style: TextStyle(color: statusColor(o.status))),
                    isThreeLine: true,
                    trailing: Text(fmt(o.total), style: const TextStyle(fontWeight: FontWeight.bold)),
                    onTap: () async {
                      await Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)));
                      _load();
                    },
                  ),
                );
              },
            ),
    );
  }
}

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});
  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> with WidgetsBindingObserver {
  Order? _order;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    final data = await ApiService.get('/payments/status/${widget.orderId}');
    if (mounted) setState(() => _order = Order.fromJson(data));
  }

  Future<void> _pay() async {
    try {
      final pay = await ApiService.post('/orders/${widget.orderId}/pay', {'platform': 'mobile'});
      await launchUrl(Uri.parse(pay['payUrl']), mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _cancel() async {
    try {
      await ApiService.put('/orders/${widget.orderId}/cancel');
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _order;
    return Scaffold(
      appBar: AppBar(title: Text(o?.code ?? 'Commande')),
      body: o == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(padding: const EdgeInsets.all(20), children: [
              Text(o.commerceName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Chip(label: Text(statuts[o.status] ?? o.status), backgroundColor: statusColor(o.status).withOpacity(.15)),
              ...o.items.map((i) => ListTile(dense: true, title: Text('${i.quantity}× ${i.surprise ? 'Panier surprise' : i.title}'), trailing: Text(fmt(i.unitPrice * i.quantity)))),
              // [MARYEM] panier surprise : contenu caché jusqu'au scan, puis révélé
              ...o.items.where((i) => i.surprise).map((i) => Container(
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFBEBD2), borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.caramel)),
                    child: Text(o.status == 'recuperee'
                        ? '🎁 Il y avait : ${i.reveal ?? '—'}\nValeur annoncée ${fmt(i.initialPrice * i.quantity)} · payé ${fmt(i.unitPrice * i.quantity)}'
                        : '🎁 Contenu caché jusqu’au scan du QR code.'),
                  )),
              const Divider(),
              ListTile(title: const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)), trailing: Text(fmt(o.total), style: const TextStyle(fontWeight: FontWeight.bold))),
              Text('Économie : ${fmt(o.saved)}', style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.w700)),
              Text('Retrait entre ${o.pickupStart} et ${o.pickupEnd}'),
              const SizedBox(height: 20),
              if (o.status == 'payee' && o.qrBytes != null) ...[
                const Text('Présentez ce QR code au commerçant', textAlign: TextAlign.center),
                Center(child: Image.memory(o.qrBytes!, width: 240, height: 240)),
              ],
              if (o.status == 'recuperee') Center(child: Text('🌱 +${o.ecoPoints} EcoPoints gagnés', style: const TextStyle(fontSize: 18))),
              if (o.status == 'en_attente_paiement') ...[
                KeyButton.icon(onPressed: _pay, icon: const Icon(Icons.payment), label: const Text('Payer en ligne')),
                const SizedBox(height: 8),
                KeyButton.icon(onPressed: _refresh, outline: true, icon: const Icon(Icons.refresh), label: const Text('J’ai payé – vérifier')),
                TextButton(onPressed: _cancel, child: const Text('Annuler la commande', style: TextStyle(color: AppColors.red))),
              ],
            ]),
    );
  }
}
