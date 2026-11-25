// [MARYEM] Panier + réservation + lancement du paiement DHMAD
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/key_button.dart';

class CartScreen extends StatefulWidget {
  final VoidCallback onOrderCreated;
  const CartScreen({super.key, required this.onOrderCreated});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool _busy = false;

  Future<void> _checkout() async {
    final cart = context.read<CartProvider>();
    setState(() => _busy = true);
    try {
      // 1) Réservation
      final order = await ApiService.post('/orders', {
        'items': cart.items.map((i) => {'offerId': i.offer.id, 'quantity': i.quantity}).toList(),
      });
      // 2) Paiement en ligne
      final pay = await ApiService.post('/orders/${order['id']}/pay', {'platform': 'mobile'});
      cart.clear();
      await launchUrl(Uri.parse(pay['payUrl']), mode: LaunchMode.externalApplication);
      widget.onOrderCreated(); // -> onglet "Commandes" pour vérifier le paiement au retour
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    if (cart.items.isEmpty) {
      return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.muted),
        Text('Votre panier est vide'),
      ]));
    }
    return Column(children: [
      ListTile(title: Text('Panier – ${cart.items.first.offer.commerceName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
      Expanded(
        child: ListView(
          children: cart.items.map((i) => ListTile(
                title: Text(i.offer.title),
                subtitle: Text('${fmt(i.offer.discountPrice)} × ${i.quantity} = ${fmt(i.offer.discountPrice * i.quantity)}'),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  IconButton(onPressed: () => cart.decrement(i.offer.id), icon: const Icon(Icons.remove_circle_outline)),
                  Text('${i.quantity}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(
                      onPressed: i.quantity < i.offer.quantity ? () => cart.increment(i.offer.id) : null,
                      icon: const Icon(Icons.add_circle_outline)),
                ]),
              )).toList(),
        ),
      ),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.line))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Économie : ${fmt(cart.totalInitial - cart.total)}', style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.w700)),
          Text('Total : ${fmt(cart.total)}', style: const TextStyle(fontFamily: kDisplay, fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.coffee)),
          const SizedBox(height: 10),
          KeyButton.icon(
            onPressed: _busy ? null : _checkout,
            icon: const Icon(Icons.payment),
            label: Text(_busy ? 'Redirection…' : 'Payer en ligne'),
          ),
        ]),
      ),
    ]);
  }
}
