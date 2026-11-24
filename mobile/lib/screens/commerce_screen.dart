// [MARYEM] Profil d'un commerce : logo, infos, carte, note moyenne, avis des étudiants, offres.
// Mode commerçant (owner) : « Mon commerce » affiche ce profil ; le formulaire ne s'ouvre qu'avec « Modifier ».
import 'dart:io';
import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuth;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/cover.dart';
import 'offers_screen.dart';

const commerceTypes = {'restaurant': 'Restaurant', 'cafeteria': 'Cafétéria', 'cafe': 'Café', 'boulangerie': 'Boulangerie', 'fast-food': 'Fast-food'};
const _statusLabels = {'en_attente': 'En attente de validation', 'valide': 'Validé par l’admin', 'refuse': 'Refusé'};

class CommerceScreen extends StatefulWidget {
  final String? commerceId; // null + owner = commerce du commerçant connecté
  final bool owner;
  const CommerceScreen({super.key, this.commerceId, this.owner = false});
  @override
  State<CommerceScreen> createState() => _CommerceScreenState();
}

class _CommerceScreenState extends State<CommerceScreen> {
  Map<String, dynamic>? _c;
  List _reviews = [];
  Map<String, dynamic>? _elig;
  bool _loading = true, _none = false, _sending = false;
  String? _error;
  int _rating = 0;
  final _comment = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      String? id = widget.commerceId;
      if (widget.owner) {
        final mine = await ApiService.get('/commerces/mine');
        if (mine == null) { setState(() { _none = true; _loading = false; }); return; }
        id = mine['id'];
        _c = {...mine as Map<String, dynamic>};
      }
      final full = await ApiService.get('/commerces/$id') as Map<String, dynamic>;
      _c = {...?_c, ...full};
      _reviews = await ApiService.get('/commerces/$id/reviews') as List;
      if (context.mounted && context.read<AuthProvider>().role == 'etudiant') {
        _elig = await ApiService.get('/commerces/$id/reviews/eligibility') as Map<String, dynamic>;
        // le formulaire reste vide (comme sur le web) : l'avis publié s'affiche dans la liste
      }
    } catch (e) {
      _error = '$e';
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _sendReview() async {
    if (_rating == 0) return _snack('Choisis une note de 1 à 5 étoiles.');
    setState(() => _sending = true);
    try {
      final r = await ApiService.post('/commerces/${_c!['id']}/reviews', {'rating': _rating, 'comment': _comment.text.trim()});
      _snack('${r['message']} Nouvelle moyenne : ${r['ratingAvg']}/5');
      _rating = 0;
      _comment.clear(); // la zone de saisie redevient vide après l'envoi
      FocusScope.of(context).unfocus();
      await _load();
    } catch (e) {
      _snack('$e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// Supprimer un avis : l'étudiant supprime le sien, l'admin peut supprimer n'importe lequel
  Future<void> _deleteReview(Map r, bool admin) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer l’avis ?'),
        content: Text(admin ? 'Supprimer l’avis de ${r['studentName']} ? (modération)' : 'Ton avis sera supprimé et la note moyenne recalculée.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: AppColors.cherry), onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.delete(admin ? '/commerces/${_c!['id']}/reviews/${r['id']}' : '/commerces/${_c!['id']}/reviews');
      _snack('Avis supprimé.');
      await _load();
    } catch (e) {
      _snack('$e');
    }
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    final content = _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
            : _none
                ? _EmptyCommerce(onCreate: () => _openForm(null))
                : RefreshIndicator(onRefresh: _load, child: _profile());
    if (widget.owner) return content; // affiché dans un onglet de l'espace commerçant
    return Scaffold(appBar: AppBar(title: Text(_c?['name'] ?? 'Commerce')), body: content);
  }

  Widget _profile() {
    final c = _c!;
    final avg = ((c['ratingAvg'] ?? 0) as num).toDouble();
    final count = ((c['ratingCount'] ?? _reviews.length) as num).toInt();
    final lat = (c['lat'] as num?)?.toDouble(), lng = (c['lng'] as num?)?.toDouble();
    final logo = imgUrl(c['logoUrl']);
    final offers = (c['offers'] as List?) ?? [];
    final role = context.read<AuthProvider>().role;
    final myUid = FirebaseAuth.instance.currentUser?.uid;
    return ListView(padding: const EdgeInsets.only(bottom: 30), children: [
      CoverBanner(url: imgUrl(c['coverUrl']), height: 150),
      Transform.translate(
        offset: const Offset(0, -50),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.cream, width: 5)),
              clipBehavior: Clip.antiAlias,
              child: logo.isEmpty ? const Center(child: Text('🏪', style: TextStyle(fontSize: 40))) : Image.network(logo, fit: BoxFit.cover),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c['name'] ?? '', style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 24)),
                Wrap(spacing: 6, runSpacing: 4, children: [
                  Pill(commerceTypes[c['type']] ?? '${c['type']}'),
                  if (widget.owner && _statusLabels[c['status']] != null)
                    Pill(_statusLabels[c['status']]!, bg: c['status'] == 'valide' ? const Color(0xFFDCEFE2) : const Color(0xFFFBE9C8), fg: c['status'] == 'valide' ? AppColors.ok : const Color(0xFF9A6512)),
                ]),
              ]),
            ),
          ]),
        ),
      ),
      Transform.translate(
        offset: const Offset(0, -36),
        child: Column(children: [
          if (widget.owner)
            Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: OutlinedButton.icon(onPressed: () => _openForm(c), icon: const Icon(Icons.edit), label: const Text('Modifier mes informations'))),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('À propos', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 6),
                Text((c['description'] ?? '').toString().isEmpty ? 'Aucune description pour le moment.' : c['description']),
                const SizedBox(height: 10),
                _info(Icons.place, c['address'] ?? ''),
                _info(Icons.phone, c['phone'] ?? '—'),
                _info(Icons.schedule, (c['openingHours'] ?? '').toString().isEmpty ? '—' : c['openingHours']),
                const SizedBox(height: 10),
                if (lat != null && lng != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: 200,
                      child: FlutterMap(
                        options: MapOptions(initialCenter: LatLng(lat, lng), initialZoom: 16),
                        children: [
                          TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'tn.essect.campussave'),
                          MarkerLayer(markers: [Marker(point: LatLng(lat, lng), width: 40, height: 40, child: const Icon(Icons.location_on, color: AppColors.coffee, size: 40))]),
                        ],
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => launchUrl(Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng'), mode: LaunchMode.externalApplication),
                    icon: const Icon(Icons.directions),
                    label: const Text('Itinéraire'),
                  ),
                ] else
                  const Text('Position non renseignée', style: TextStyle(color: AppColors.muted)),
              ]),
            ),
          ),
          if (!widget.owner && offers.isNotEmpty)
            Card(
              child: ListTile(
                title: Text('${offers.length} offre(s) disponible(s)', style: const TextStyle(fontWeight: FontWeight.w800)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OffersScreen(commerceId: c['id']))),
              ),
            ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Avis des étudiants', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 8),
                Row(children: [
                  Text(count > 0 ? avg.toStringAsFixed(1) : '—', style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 40)),
                  const SizedBox(width: 12),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [StarsRow(avg, size: 20), Text('$count avis', style: const TextStyle(color: AppColors.muted))]),
                ]),
                const Divider(),
                if (_reviews.isEmpty) const Text('Aucun avis pour le moment.', style: TextStyle(color: AppColors.muted)),
                for (final r in _reviews)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: AppColors.beige,
                      backgroundImage: imgUrl(r['studentPhotoUrl']).isEmpty ? null : NetworkImage(imgUrl(r['studentPhotoUrl'])),
                      child: imgUrl(r['studentPhotoUrl']).isEmpty ? Text((r['studentName'] ?? '?').toString().substring(0, 1)) : null,
                    ),
                    title: Row(children: [Flexible(child: Text(r['studentName'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800))), const SizedBox(width: 6), StarsRow(((r['rating'] ?? 0) as num).toDouble(), size: 14)]),
                    subtitle: Text('${fmtDate(r['updatedAt'] ?? r['createdAt'])}${(r['comment'] ?? '').toString().isEmpty ? '' : '\n${r['comment']}'}'),
                    isThreeLine: (r['comment'] ?? '').toString().isNotEmpty,
                    // « Supprimer » : pour l'auteur de l'avis et pour l'administrateur
                    trailing: (r['studentId'] == myUid && role == 'etudiant') || role == 'admin'
                        ? IconButton(
                            tooltip: role == 'admin' && r['studentId'] != myUid ? 'Supprimer (modération)' : 'Supprimer mon avis',
                            icon: const Icon(Icons.delete_outline, color: AppColors.cherry),
                            onPressed: () => _deleteReview(r as Map, role == 'admin'),
                          )
                        : null,
                  ),
                if (_elig != null) ...[
                  const Divider(),
                  if (_elig!['eligible'] == true) ...[
                    Text(_elig!['review'] != null ? 'Modifier mon avis (remplace l’ancien)' : 'Laisser un avis', style: const TextStyle(fontWeight: FontWeight.w800)),
                    Row(children: List.generate(5, (i) => IconButton(
                          onPressed: () => setState(() => _rating = i + 1),
                          icon: Icon(Icons.star_rounded, size: 32, color: i < _rating ? AppColors.gold : const Color(0xFFD9CBB6)),
                        ))),
                    TextField(controller: _comment, maxLines: 2, maxLength: 500, decoration: const InputDecoration(hintText: 'Ton commentaire…')),
                    FilledButton(onPressed: _sending ? null : _sendReview, child: Text(_sending ? 'Envoi…' : 'Publier')),
                  ] else
                    const Text('Tu pourras noter ce commerce après avoir récupéré une commande chez lui.', style: TextStyle(color: AppColors.muted)),
                ],
              ]),
            ),
          ),
        ]),
      ),
    ]);
  }

  Widget _info(IconData i, String t) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(i, size: 18, color: AppColors.caramel), const SizedBox(width: 8), Expanded(child: Text(t))]),
      );

  Future<void> _openForm(Map<String, dynamic>? c) async {
    final saved = await showModalBottomSheet<bool>(context: context, isScrollControlled: true, useSafeArea: true, builder: (_) => _CommerceForm(commerce: c));
    if (saved == true) { _none = false; await _load(); }
  }
}

class _EmptyCommerce extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyCommerce({required this.onCreate});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(30),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Tu n’as pas encore inscrit ton commerce', textAlign: TextAlign.center, style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 20)),
            const SizedBox(height: 8),
            const Text('Inscris-le pour publier tes offres. Il sera visible après validation par l’administrateur.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            FilledButton(onPressed: onCreate, child: const Text('Inscrire mon commerce')),
          ]),
        ),
      );
}

/// Formulaire du commerce (ouvert seulement au clic) : infos, logo, position
class _CommerceForm extends StatefulWidget {
  final Map<String, dynamic>? commerce;
  const _CommerceForm({this.commerce});
  @override
  State<_CommerceForm> createState() => _CommerceFormState();
}

class _CommerceFormState extends State<_CommerceForm> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.commerce?['name'] ?? '');
  late final _address = TextEditingController(text: widget.commerce?['address'] ?? '');
  late final _phone = TextEditingController(text: widget.commerce?['phone'] ?? '');
  late final _hours = TextEditingController(text: widget.commerce?['openingHours'] ?? '');
  late final _desc = TextEditingController(text: widget.commerce?['description'] ?? '');
  late String _type = widget.commerce?['type'] ?? 'restaurant';
  late double? _lat = (widget.commerce?['lat'] as num?)?.toDouble();
  late double? _lng = (widget.commerce?['lng'] as num?)?.toDouble();
  File? _logo, _cover;
  late String _coverUrl = imgUrl(widget.commerce?['coverUrl']);
  bool _removeCover = false, _busy = false;
  String? _error;

  Future<void> _pick() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200, imageQuality: 85);
    if (x == null) return;
    final f = File(x.path);
    final err = checkImage(f);
    setState(() { _error = err; _logo = err == null ? f : null; });
  }

  Future<void> _pickCover() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 85);
    if (x == null) return;
    final f = File(x.path);
    final err = checkImage(f);
    setState(() { _error = err; if (err == null) { _cover = f; _removeCover = false; } });
  }

  Future<void> _here() async {
    try {
      final p = await currentPosition();
      setState(() { _lat = p.latitude; _lng = p.longitude; _error = null; });
    } catch (e) {
      setState(() => _error = '$e');
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    final fields = {
      'name': _name.text.trim(), 'type': _type, 'address': _address.text.trim(), 'phone': _phone.text.trim(),
      'openingHours': _hours.text.trim(), 'description': _desc.text.trim(),
      if (_lat != null) 'lat': '$_lat', if (_lng != null) 'lng': '$_lng',
      if (_removeCover && _cover == null) 'removeCover': 'true',
    };
    try {
      final id = widget.commerce?['id'];
      await ApiService.multipart(id == null ? 'POST' : 'PUT', id == null ? '/commerces' : '/commerces/$id', fields, files: {'logo': _logo, 'cover': _cover});
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() { _error = '$e'; _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = imgUrl(widget.commerce?['logoUrl']);
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(widget.commerce == null ? 'Inscrire mon commerce' : 'Modifier mon commerce', style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 22)),
            const SizedBox(height: 12),
            CoverPicker(file: _cover, url: _coverUrl, onPick: _pickCover, onRemove: () => setState(() { _cover = null; _coverUrl = ''; _removeCover = true; })),
            const SizedBox(height: 14),
            ImagePreview(file: _logo, url: current, onPick: _pick, label: 'Logo du commerce'),
            const SizedBox(height: 16),
            TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Nom'), validator: (v) => (v ?? '').trim().length >= 2 ? null : 'Nom obligatoire'),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: commerceTypes.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 14),
            TextFormField(controller: _address, decoration: const InputDecoration(labelText: 'Adresse'), validator: (v) => (v ?? '').trim().length >= 5 ? null : 'Adresse obligatoire'),
            const SizedBox(height: 14),
            TextFormField(controller: _phone, decoration: const InputDecoration(labelText: 'Téléphone'), keyboardType: TextInputType.phone,
                validator: (v) => RegExp(r'^[2-9]\d{7}$').hasMatch((v ?? '').replaceAll(' ', '')) ? null : '8 chiffres'),
            const SizedBox(height: 14),
            TextFormField(controller: _hours, decoration: const InputDecoration(labelText: 'Horaires', hintText: '08:00 - 18:00')),
            const SizedBox(height: 14),
            TextFormField(controller: _desc, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
            const SizedBox(height: 14),
            OutlinedButton.icon(onPressed: _here, icon: const Icon(Icons.my_location), label: Text(_lat == null ? 'Utiliser ma position actuelle (Campus Radar)' : 'Position : ${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)}')),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.cherry, fontWeight: FontWeight.w700))),
            const SizedBox(height: 12),
            FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Enregistrement…' : widget.commerce == null ? 'Envoyer pour validation' : 'Enregistrer')),
          ]),
        ),
      ),
    );
  }
}

/// Vérifie une image avant l'envoi : JPG, JPEG, PNG ou WEBP, 2 Mo maximum
String? checkImage(File f) {
  final ext = f.path.split('.').last.toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].contains(ext)) return 'Format non accepté : utilise JPG, JPEG, PNG ou WEBP.';
  if (f.lengthSync() > 2 * 1024 * 1024) return 'Image trop lourde (${(f.lengthSync() / 1048576).toStringAsFixed(1)} Mo). Maximum 2 Mo.';
  return null;
}

/// Aperçu de l'image avant l'enregistrement
class ImagePreview extends StatelessWidget {
  final File? file;
  final String url;
  final VoidCallback onPick;
  final String label;
  const ImagePreview({super.key, required this.file, required this.url, required this.onPick, required this.label});
  @override
  Widget build(BuildContext context) {
    final has = file != null || url.isNotEmpty;
    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: has ? 170 : 90,
        decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.sand, width: 2)),
        clipBehavior: Clip.antiAlias,
        child: has
            ? Stack(fit: StackFit.expand, children: [
                file != null ? Image.file(file!, fit: BoxFit.cover) : Image.network(url, fit: BoxFit.cover),
                const Positioned(right: 8, top: 8, child: Pill('Changer', bg: AppColors.coffee, fg: AppColors.cream)),
              ])
            : Center(child: Text('📷 $label\nJPG, JPEG, PNG ou WEBP · 2 Mo max', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted))),
      ),
    );
  }
}

/// Position actuelle (demandée seulement quand l'utilisateur clique, jamais enregistrée pour l'étudiant)
Future<Position> currentPosition() async {
  if (!await Geolocator.isLocationServiceEnabled()) throw ApiException('Active la localisation de ton téléphone.');
  var perm = await Geolocator.checkPermission();
  if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
  if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
    throw ApiException('Localisation refusée. Tu peux saisir une adresse ou rester sur l’ESSECT.');
  }
  return Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 12)));
}
