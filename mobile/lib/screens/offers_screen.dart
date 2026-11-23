// [MARYEM] Offres : recherche + filtres Sucré / Salé / Boisson / Panier surprise (comme le site)
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/offer.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/video_backdrop.dart';
import 'commerce_screen.dart';
import 'search_screen.dart';

class OffersScreen extends StatefulWidget {
  final String initialGroup;
  final String? commerceId;
  const OffersScreen({super.key, this.initialGroup = '', this.commerceId});
  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> {
  List<Offer> _offers = [];
  bool _loading = true;
  String? _error;
  String _q = '', _group = '', _sort = '';
  double? _maxPrice;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _group = widget.initialGroup;
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    final params = {
      if (_q.isNotEmpty) 'q': _q,
      if (_group.isNotEmpty) 'group': _group,
      if (_sort.isNotEmpty) 'sort': _sort,
      if (_maxPrice != null) 'maxPrice': _maxPrice!.toString(),
      if (widget.commerceId != null) 'commerceId': widget.commerceId!,
    };
    try {
      final data = await ApiService.get('/offers?${Uri(queryParameters: params).query}') as List;
      if (mounted) setState(() => _offers = data.map((e) => Offer.fromJson(e)).toList());
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _add(Offer o) {
    final cart = context.read<CartProvider>();
    if (cart.add(o)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ajouté au panier ✓'), duration: Duration(seconds: 1)));
      return;
    }
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Autre commerce'),
        content: const Text('Votre panier contient des produits d’un autre commerce. Le vider ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Non')),
          FilledButton(onPressed: () { cart.replaceWith(o); Navigator.pop(context); }, child: const Text('Oui')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final body = Column(children: [
      if (widget.commerceId == null) _HeroBanner(count: _loading ? null : _offers.length),
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
        child: Row(children: [
          Expanded(
            child: TextField(
              decoration: const InputDecoration(hintText: 'Produit ou commerce…', prefixIcon: Icon(Icons.search), isDense: true),
              onChanged: (v) {
                _q = v;
                _debounce?.cancel();
                _debounce = Timer(const Duration(milliseconds: 400), _load);
              },
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.tune),
            onSelected: (v) {
              if (v.startsWith('max:')) {
                _maxPrice = v == 'max:' ? null : double.parse(v.substring(4));
              } else {
                _sort = v;
              }
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: '', child: Text('Plus récentes')),
              PopupMenuItem(value: 'prix', child: Text('Prix croissant')),
              PopupMenuItem(value: 'reduction', child: Text('Meilleure réduction')),
              PopupMenuDivider(),
              PopupMenuItem(value: 'max:5', child: Text('≤ 5 DT')),
              PopupMenuItem(value: 'max:10', child: Text('≤ 10 DT')),
              PopupMenuItem(value: 'max:', child: Text('Tous les prix')),
            ],
          ),
        ]),
      ),
      SizedBox(
        height: 56,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          children: groups.entries
              .map((g) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ChoiceChip(
                      label: Text(g.value),
                      selected: _group == g.key,
                      showCheckmark: false,
                      labelStyle: TextStyle(fontWeight: FontWeight.w700, color: _group == g.key ? AppColors.cream : AppColors.brown),
                      onSelected: (_) { _group = g.key; _load(); },
                    ),
                  ))
              .toList(),
        ),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: _error != null
                    ? ListView(children: [Padding(padding: const EdgeInsets.all(40), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.cherry)))])
                    : _offers.isEmpty
                        ? ListView(children: [
                            Padding(
                              padding: const EdgeInsets.all(40),
                              child: Column(children: [
                                Text('Aucune offre ${_group.isEmpty ? '' : '« ${groups[_group]} » '}pour l’instant',
                                    textAlign: TextAlign.center, style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                                const SizedBox(height: 6),
                                const Text('Essaie une autre catégorie ou retire les filtres.', style: TextStyle(color: AppColors.muted)),
                                TextButton(onPressed: () { _group = ''; _q = ''; _maxPrice = null; _load(); }, child: const Text('Voir toutes les offres')),
                              ]),
                            ),
                          ])
                        : ListView.builder(
                            itemCount: _offers.length,
                            itemBuilder: (_, i) => _OfferCard(offer: _offers[i], onAdd: () => _add(_offers[i])),
                          ),
              ),
      ),
    ]);
    if (widget.commerceId != null) return Scaffold(appBar: AppBar(title: const Text('Offres du commerce')), body: body);
    return body;
  }
}

class _OfferCard extends StatelessWidget {
  final Offer offer;
  final VoidCallback onAdd;
  const _OfferCard({required this.offer, required this.onAdd});

  @override
  Widget build(BuildContext context) {
    final o = offer;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Stack(children: [
          SizedBox(
            width: 112,
            height: o.isSurprise ? 168 : 132,
            child: o.photoUrl.isEmpty
                ? Container(color: AppColors.beige, alignment: Alignment.center, child: Text(o.isSurprise ? '🎁' : '🍽️', style: const TextStyle(fontSize: 40)))
                : Image.network(o.photoUrl, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(color: AppColors.beige, alignment: Alignment.center, child: const Text('🍽️', style: TextStyle(fontSize: 40)))),
          ),
          Positioned(top: 8, left: 6, child: Pill('-${o.discountPercent} %', bg: AppColors.cherry, fg: Colors.white)),
        ]),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CommerceScreen(commerceId: o.commerceId))),
                child: Text('${o.commerceName} ›', style: const TextStyle(color: AppColors.caramel, fontWeight: FontWeight.w700, decoration: TextDecoration.underline)),
              ),
              Text(o.displayTitle, style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 17)),
              if (o.isSurprise) ...[
                const Text('Contenu révélé au retrait', style: TextStyle(fontSize: 12, color: AppColors.muted)),
                const SizedBox(height: 4),
                Wrap(spacing: 6, runSpacing: 4, children: [
                  Pill('Valeur min. ${fmtShort(o.initialPrice)}', bg: const Color(0xFFFBEBD2), fg: const Color(0xFF8A5A1E)),
                  if ((o.allergens ?? '').isNotEmpty) Pill('⚠️ ${o.allergens}'),
                ]),
                TextButton(
                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 30)),
                  onPressed: () => showSurpriseHow(context, offer: o, onReserve: onAdd),
                  child: const Text('Comment ça marche ?'),
                ),
              ] else
                Text(categoryLabels[o.category] ?? o.category, style: const TextStyle(fontSize: 12, color: AppColors.muted)),
              Text('🕒 ${o.pickupStart} – ${o.pickupEnd} · Reste ${o.quantity}', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
              const SizedBox(height: 4),
              Row(children: [
                Text(fmtShort(o.discountPrice), style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 19)),
                const SizedBox(width: 8),
                Text(fmtShort(o.initialPrice), style: const TextStyle(decoration: TextDecoration.lineThrough, color: AppColors.muted)),
                const Spacer(),
                FilledButton(
                  onPressed: onAdd,
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14), minimumSize: const Size(0, 38)),
                  child: Text(o.isSurprise ? 'Réserver' : 'Ajouter'),
                ),
              ]),
            ]),
          ),
        ),
      ]),
    );
  }
}

/// Explication du panier surprise (+ réservation directe)
void showSurpriseHow(BuildContext context, {Offer? offer, VoidCallback? onReserve}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Pill('PANIER SURPRISE', bg: AppColors.coffee, fg: Color(0xFFF3C77E)),
          const SizedBox(height: 8),
          const Text('Comment ça marche ?', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 26)),
          const SizedBox(height: 10),
          for (final s in const [
            ['1', 'Le commerce prépare', 'En fin de journée, il met ses invendus dans un panier et annonce sa valeur minimum.'],
            ['2', 'Tu réserves', 'Tu vois le prix, la valeur minimum, le type et les allergènes possibles, pas le contenu.'],
            ['3', 'Tu paies et récupères', 'Paiement en ligne, puis tu montres ton QR code pendant le créneau.'],
            ['4', 'Surprise révélée', 'Après le scan, le contenu s’affiche dans « Mes commandes ». Tu gagnes aussi tes EcoPoints.'],
          ])
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(backgroundColor: AppColors.coffee, foregroundColor: AppColors.cream, child: Text(s[0])),
              title: Text(s[1], style: const TextStyle(fontWeight: FontWeight.w800)),
              subtitle: Text(s[2]),
            ),
          const Divider(),
          const Text('• Valeur garantie : le contenu vaut au moins la valeur annoncée.\n• Type annoncé : sucré, salé ou mixte.\n• Allergènes : vérifie avant de réserver en cas d’allergie.\n• Quantité limitée : quelques paniers par soir.'),
          if (offer != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.coffee, borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${offer.commerceName} · ${offer.pickupStart}–${offer.pickupEnd}', style: const TextStyle(color: Color(0xCCF6EFE3), fontSize: 12)),
                    Text(offer.displayTitle, style: const TextStyle(color: AppColors.cream, fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 17)),
                    Text('Valeur min. ${fmtShort(offer.initialPrice)} · ${offer.quantity} restant(s)', style: const TextStyle(color: Color(0xCCF6EFE3), fontSize: 12)),
                  ]),
                ),
                Column(children: [
                  Text(fmtShort(offer.discountPrice), style: const TextStyle(color: Color(0xFFF3C77E), fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 22)),
                  if (onReserve != null)
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: AppColors.cream, foregroundColor: AppColors.coffee),
                      onPressed: () { Navigator.pop(ctx); onReserve(); },
                      child: const Text('Réserver'),
                    ),
                ]),
              ]),
            ),
          ],
        ]),
      ),
    ),
  );
}

/// Bannière d'accueil : animation des 4 univers sur fond beige + slogan
class _HeroBanner extends StatelessWidget {
  final int? count;
  const _HeroBanner({required this.count});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 190,
      child: Stack(fit: StackFit.expand, children: [
        const VideoBackdrop(),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xF5F6EFE3), Color(0xB3F6EFE3), Color(0x00F6EFE3)], stops: [0, .5, .85]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 8, 14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              if (count != null) Pill('● $count offre${count! > 1 ? 's' : ''} ce soir', bg: AppColors.white, fg: AppColors.brown),
              const Spacer(),
              IconButton(
                tooltip: 'Rechercher un compte',
                icon: const Icon(Icons.person_search),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
              ),
            ]),
            const Spacer(),
            const Text.rich(
              TextSpan(children: [
                TextSpan(text: 'Bien manger,\npetit '),
                TextSpan(text: 'budget.', style: TextStyle(color: AppColors.caramel, fontStyle: FontStyle.italic)),
              ]),
              style: TextStyle(fontFamily: kDisplay, fontSize: 30, height: 1, fontWeight: FontWeight.w800, letterSpacing: -1, color: AppColors.coffee),
            ),
          ]),
        ),
      ]),
    );
  }
}
