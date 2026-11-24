// [MARYEM] « Mes offres » (commerçant) : la liste s'affiche d'abord ;
// le formulaire ne s'ouvre qu'avec le bouton « + Ajouter une offre » ou « Modifier ».
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/offer.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'commerce_screen.dart' show checkImage, ImagePreview;

class MerchantOffersScreen extends StatefulWidget {
  const MerchantOffersScreen({super.key});
  @override
  State<MerchantOffersScreen> createState() => _MerchantOffersScreenState();
}

class _MerchantOffersScreenState extends State<MerchantOffersScreen> {
  List<Offer>? _offers;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/offers/mine') as List;
      if (mounted) setState(() { _offers = data.map((e) => Offer.fromJson(e)).toList(); _error = null; });
    } catch (e) {
      if (mounted) setState(() { _offers = []; _error = '$e'; });
    }
  }

  Future<void> _open([Offer? o]) async {
    final saved = await Navigator.push<Offer>(context, MaterialPageRoute(builder: (_) => OfferFormScreen(offer: o)));
    if (saved == null) return;
    setState(() {
      final l = _offers ?? [];
      final i = l.indexWhere((x) => x.id == saved.id);
      if (i >= 0) { l[i] = saved; } else { l.insert(0, saved); } // la nouvelle offre apparaît tout de suite
    });
  }

  Future<void> _delete(Offer o) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer l’offre ?'),
        content: Text(o.title),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer'))],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.delete('/offers/${o.id}');
      setState(() => _offers!.removeWhere((x) => x.id == o.id));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = _offers;
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _open(), icon: const Icon(Icons.add), label: const Text('Ajouter une offre')),
      body: l == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(padding: const EdgeInsets.only(bottom: 90), children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: Text('Mes offres', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 28)),
                ),
                if (_error != null) Padding(padding: const EdgeInsets.all(16), child: Text(_error!, style: const TextStyle(color: AppColors.cherry))),
                if (l.isEmpty && _error == null)
                  const Padding(padding: EdgeInsets.all(40), child: Text('Aucune offre pour le moment. Appuie sur « Ajouter une offre ».', textAlign: TextAlign.center)),
                for (final o in l)
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      SizedBox(
                        height: 150, width: double.infinity,
                        child: Stack(fit: StackFit.expand, children: [
                          o.photoUrl.isEmpty
                              ? Container(color: AppColors.beige, alignment: Alignment.center, child: Text(o.isSurprise ? '🎁' : '🍽️', style: const TextStyle(fontSize: 44)))
                              : Image.network(o.photoUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: AppColors.beige)),
                          Positioned(
                            left: 10, top: 10,
                            child: Pill(o.status != 'active' ? 'Inactive' : o.quantity > 0 ? 'En ligne' : 'Épuisée',
                                bg: o.status == 'active' && o.quantity > 0 ? const Color(0xFFDCEFE2) : const Color(0xFFF8DDE2),
                                fg: o.status == 'active' && o.quantity > 0 ? AppColors.ok : AppColors.cherry),
                          ),
                        ]),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(o.title, style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                          Text(o.isSurprise ? 'Contenu caché : ${o.revealContent ?? ''}' : (o.description.isEmpty ? 'Pas de description' : o.description), style: const TextStyle(color: AppColors.muted)),
                          const SizedBox(height: 6),
                          Wrap(spacing: 6, runSpacing: 4, children: [
                            Pill('${categoryLabels[o.category] ?? o.category}${o.isSurprise ? ' · ${surpriseKinds[o.surpriseKind] ?? ''}' : ''}'),
                            Pill('${o.quantity} restant(s)'),
                            Pill('🕒 ${o.pickupStart}–${o.pickupEnd}'),
                          ]),
                          const SizedBox(height: 6),
                          Row(children: [
                            Text(fmtShort(o.discountPrice), style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 20)),
                            const SizedBox(width: 8),
                            Text(o.isSurprise ? 'valeur min. ${fmtShort(o.initialPrice)}' : fmtShort(o.initialPrice),
                                style: TextStyle(color: AppColors.muted, decoration: o.isSurprise ? null : TextDecoration.lineThrough)),
                            const Spacer(),
                            IconButton(onPressed: () => _open(o), icon: const Icon(Icons.edit), tooltip: 'Modifier'),
                            IconButton(onPressed: () => _delete(o), icon: const Icon(Icons.delete_outline, color: AppColors.cherry), tooltip: 'Supprimer'),
                          ]),
                        ]),
                      ),
                    ]),
                  ),
              ]),
            ),
    );
  }
}

/// Formulaire d'offre avec photo (aperçu avant l'envoi) et champs du panier surprise
class OfferFormScreen extends StatefulWidget {
  final Offer? offer;
  const OfferFormScreen({super.key, this.offer});
  @override
  State<OfferFormScreen> createState() => _OfferFormScreenState();
}

class _OfferFormScreenState extends State<OfferFormScreen> {
  final _form = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.offer?.title ?? '');
  late final _desc = TextEditingController(text: widget.offer?.description ?? '');
  late final _initial = TextEditingController(text: widget.offer == null ? '' : '${widget.offer!.initialPrice}');
  late final _price = TextEditingController(text: widget.offer == null ? '' : '${widget.offer!.discountPrice}');
  late final _qty = TextEditingController(text: widget.offer == null ? '' : '${widget.offer!.quantity}');
  late final _start = TextEditingController(text: widget.offer?.pickupStart ?? '17:00');
  late final _end = TextEditingController(text: widget.offer?.pickupEnd ?? '19:00');
  late final _allergens = TextEditingController(text: widget.offer?.allergens ?? '');
  late final _reveal = TextEditingController(text: widget.offer?.revealContent ?? '');
  late String _category = widget.offer?.category ?? 'plat';
  late String _kind = widget.offer?.surpriseKind ?? 'sucre';
  late String _status = widget.offer?.status ?? 'active';
  File? _photo;
  String? _error;
  bool _busy = false;
  bool get _surprise => _category == 'panier-surprise';

  Future<void> _pick(ImageSource src) async {
    final x = await ImagePicker().pickImage(source: src, maxWidth: 1600, imageQuality: 85);
    if (x == null) return;
    final f = File(x.path);
    final err = checkImage(f);
    setState(() { _error = err; _photo = err == null ? f : null; });
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    if (double.parse(_price.text.replaceAll(',', '.')) >= double.parse(_initial.text.replaceAll(',', '.'))) {
      return setState(() => _error = _surprise ? 'Le prix doit être inférieur à la valeur du panier' : 'Le prix réduit doit être inférieur au prix initial');
    }
    if (_start.text.compareTo(_end.text) >= 0) return setState(() => _error = 'Horaire de récupération invalide');
    setState(() { _busy = true; _error = null; });
    final fields = {
      'title': _title.text.trim(), 'description': _desc.text.trim(), 'category': _category,
      'initialPrice': _initial.text.replaceAll(',', '.'), 'discountPrice': _price.text.replaceAll(',', '.'), 'quantity': _qty.text.trim(),
      'pickupStart': _start.text.trim(), 'pickupEnd': _end.text.trim(), 'status': _status, 'allergens': _allergens.text.trim(),
      if (_surprise) ...{'surpriseKind': _kind, 'revealContent': _reveal.text.trim()},
    };
    try {
      final r = widget.offer == null
          ? await ApiService.multipart('POST', '/offers', fields, file: _photo)
          : await ApiService.multipart('PUT', '/offers/${widget.offer!.id}', fields, file: _photo);
      if (mounted) Navigator.pop(context, Offer.fromJson(Map<String, dynamic>.from(r)));
    } catch (e) {
      setState(() { _error = '$e'; _busy = false; });
    }
  }

  String? _num(String? v) => double.tryParse((v ?? '').replaceAll(',', '.')) != null && double.parse((v ?? '').replaceAll(',', '.')) > 0 ? null : 'Montant invalide';
  String? _hhmm(String? v) => RegExp(r'^([01]\d|2[0-3]):[0-5]\d$').hasMatch(v ?? '') ? null : 'HH:MM';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.offer == null ? 'Nouvelle offre' : 'Modifier l’offre')),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          ImagePreview(file: _photo, url: widget.offer?.photoUrl ?? '', onPick: () => _pick(ImageSource.gallery), label: 'Photo de l’offre'),
          TextButton.icon(onPressed: () => _pick(ImageSource.camera), icon: const Icon(Icons.photo_camera), label: const Text('Prendre une photo')),
          DropdownButtonFormField<String>(
            value: _category,
            decoration: const InputDecoration(labelText: 'Catégorie'),
            items: categoryLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
            onChanged: (v) => setState(() { _category = v ?? _category; if (_surprise && _title.text.isEmpty) _title.text = 'Panier surprise du soir'; }),
          ),
          const SizedBox(height: 10),
          TextFormField(controller: _title, decoration: const InputDecoration(labelText: 'Titre'), validator: (v) => (v ?? '').trim().length >= 3 ? null : '3 caractères minimum'),
          const SizedBox(height: 10),
          TextFormField(controller: _desc, maxLines: 2, decoration: InputDecoration(labelText: 'Description', hintText: _surprise ? 'Ex : viennoiseries et pâtisseries du jour (sans détailler)' : null)),
          if (_surprise) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFFBEBD2), borderRadius: BorderRadius.circular(14)),
              child: Column(children: [
                const Text('Panier surprise : l’étudiant ne voit pas le contenu avant le retrait.', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _kind,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: surpriseKinds.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: (v) => setState(() => _kind = v ?? _kind),
                ),
                const SizedBox(height: 8),
                TextFormField(controller: _allergens, decoration: const InputDecoration(labelText: 'Allergènes possibles', hintText: 'gluten, lait, œufs…')),
                const SizedBox(height: 8),
                TextFormField(controller: _reveal, maxLines: 2, decoration: const InputDecoration(labelText: 'Contenu prévu (privé, révélé au retrait)'),
                    validator: (v) => _surprise && (v ?? '').trim().length < 3 ? 'Indique le contenu prévu' : null),
              ]),
            ),
          ],
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextFormField(controller: _initial, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: _surprise ? 'Valeur minimum (DT)' : 'Prix initial (DT)'), validator: _num)),
            const SizedBox(width: 10),
            Expanded(child: TextFormField(controller: _price, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Prix CampusSave (DT)'), validator: _num)),
          ]),
          const SizedBox(height: 10),
          TextFormField(controller: _qty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantité'),
              validator: (v) => int.tryParse(v ?? '') != null && int.parse(v!) >= 0 ? null : 'Quantité invalide'),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextFormField(controller: _start, decoration: const InputDecoration(labelText: 'Retrait de'), validator: _hhmm)),
            const SizedBox(width: 10),
            Expanded(child: TextFormField(controller: _end, decoration: const InputDecoration(labelText: 'à'), validator: _hhmm)),
          ]),
          if (widget.offer != null) ...[
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Statut'),
              items: const [DropdownMenuItem(value: 'active', child: Text('Active')), DropdownMenuItem(value: 'inactive', child: Text('Inactive'))],
              onChanged: (v) => setState(() => _status = v ?? _status),
            ),
          ],
          if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: AppColors.cherry, fontWeight: FontWeight.w700))),
          const SizedBox(height: 16),
          FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Envoi de l’offre…' : widget.offer == null ? 'Publier l’offre' : 'Enregistrer')),
        ]),
      ),
    );
  }
}
