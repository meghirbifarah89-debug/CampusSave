// [MARYEM] Campus Radar – Découvrez les restaurants autour de vous (mobile)
// Partenaires : vraies données de la base. Externes : OpenStreetMap (Overpass), sans note ni offre inventée.
// Position : demandée seulement au clic, jamais enregistrée ; sinon adresse saisie ou ESSECT par défaut.
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'commerce_screen.dart' show currentPosition, CommerceScreen;
import 'offers_screen.dart';

const _essect = LatLng(36.7903, 10.1690);
const _radius = 1500;
const _types = {'restaurant': ['🍽️', 'Restaurant'], 'cafeteria': ['🏫', 'Cafétéria'], 'cafe': ['☕', 'Café'], 'fastfood': ['🍔', 'Fast-food'], 'boulangerie': ['🥖', 'Boulangerie']};
const _fromCommerce = {'restaurant': 'restaurant', 'cafeteria': 'cafeteria', 'cafe': 'cafe', 'fast-food': 'fastfood', 'boulangerie': 'boulangerie'};
const _fromOsm = {'restaurant': 'restaurant', 'cafe': 'cafe', 'fast_food': 'fastfood', 'food_court': 'cafeteria', 'canteen': 'cafeteria'};

class Place {
  final String key, name, type, address;
  final String? commerceId, logoUrl;
  final bool partner;
  final LatLng pos;
  final double rating;
  final int ratingCount, offers;
  double d = 0;
  Place({required this.key, required this.name, required this.type, required this.address, required this.partner, required this.pos,
      this.commerceId, this.logoUrl, this.rating = 0, this.ratingCount = 0, this.offers = 0});
}

/// Distance réelle (formule de Haversine), en mètres
double distanceM(LatLng a, LatLng b) {
  const r = 6371e3, k = math.pi / 180;
  final dLa = (b.latitude - a.latitude) * k, dLo = (b.longitude - a.longitude) * k;
  final h = math.pow(math.sin(dLa / 2), 2) + math.cos(a.latitude * k) * math.cos(b.latitude * k) * math.pow(math.sin(dLo / 2), 2);
  return 2 * r * math.asin(math.sqrt(h));
}

String fmtDistance(double m) => m < 1000 ? '${(m / 10).round() * 10} m' : '${(m / 1000).toStringAsFixed(1).replaceAll('.', ',')} km';
String _norm(String s) => s.toLowerCase();

class RadarScreen extends StatefulWidget {
  const RadarScreen({super.key});
  @override
  State<RadarScreen> createState() => _RadarScreenState();
}

class _RadarScreenState extends State<RadarScreen> {
  final _map = MapController();
  LatLng _origin = _essect;
  String _originLabel = 'ESSECT, Montfleury (point par défaut)';
  List<Place> _partners = [], _externals = [];
  String _q = '', _type = '', _sort = 'd', _msg = '';
  bool _onlyPartners = false, _extError = false, _locating = false;
  final _loc = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadPartners();
    _loadExternals();
  }

  Future<void> _loadPartners() async {
    try {
      final list = await ApiService.get('/commerces') as List;
      setState(() => _partners = list.where((c) => c['lat'] != null && c['lng'] != null).map((c) => Place(
            key: 'p${c['id']}', commerceId: c['id'], partner: true, name: c['name'] ?? '', address: c['address'] ?? '',
            type: _fromCommerce[c['type']] ?? 'restaurant', pos: LatLng((c['lat'] as num).toDouble(), (c['lng'] as num).toDouble()),
            logoUrl: imgUrl(c['logoUrl']), rating: ((c['ratingAvg'] ?? 0) as num).toDouble(), ratingCount: ((c['ratingCount'] ?? 0) as num).toInt(),
            offers: ((c['offersCount'] ?? 0) as num).toInt(),
          )).toList());
    } catch (e) {
      setState(() => _msg = 'Partenaires indisponibles : $e');
    }
  }

  Future<void> _loadExternals() async {
    final q = '[out:json][timeout:20];(nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|canteen)\$"](around:$_radius,${_origin.latitude},${_origin.longitude}););out center 80;';
    try {
      final r = await http.post(Uri.parse('https://overpass-api.de/api/interpreter'), body: {'data': q});
      final j = jsonDecode(utf8.decode(r.bodyBytes));
      final list = <Place>[];
      for (final x in j['elements'] as List) {
        final tags = x['tags'] ?? {};
        final lat = x['lat'] ?? x['center']?['lat'], lon = x['lon'] ?? x['center']?['lon'];
        if (tags['name'] == null || lat == null) continue;
        list.add(Place(
          key: 'e${x['id']}', partner: false, name: tags['name'], type: _fromOsm[tags['amenity']] ?? 'restaurant',
          address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].where((e) => e != null).join(' '),
          pos: LatLng((lat as num).toDouble(), (lon as num).toDouble()),
        ));
      }
      if (mounted) setState(() { _externals = list; _extError = false; });
    } catch (_) {
      if (mounted) setState(() { _externals = []; _extError = true; });
    }
  }

  List<Place> get _places {
    final names = _partners.map((p) => _norm(p.name)).toSet();
    final ext = _onlyPartners ? <Place>[] : _externals.where((e) => !names.contains(_norm(e.name)));
    final q = _norm(_q);
    final l = [..._partners, ...ext].where((p) => (_type.isEmpty || p.type == _type) && (q.isEmpty || _norm('${p.name} ${p.address}').contains(q))).toList();
    for (final p in l) {
      p.d = distanceM(_origin, p.pos);
    }
    l.sort((a, b) {
      if (_sort == 'r') { final c = b.rating.compareTo(a.rating); if (c != 0) return c; }
      else {
        final pa = a.partner && a.d <= _radius ? 1 : 0, pb = b.partner && b.d <= _radius ? 1 : 0;
        if (pa != pb) return pb - pa;
      }
      return a.d.compareTo(b.d);
    });
    return l;
  }

  void _setOrigin(LatLng p, String label) {
    setState(() { _origin = p; _originLabel = label; _msg = ''; });
    _map.move(p, 15);
    _loadExternals();
  }

  Future<void> _locate() async {
    setState(() { _locating = true; _msg = 'Demande d’autorisation de localisation…'; });
    try {
      final p = await currentPosition();
      _setOrigin(LatLng(p.latitude, p.longitude), 'ta position actuelle (non enregistrée)');
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _searchPlace() async {
    final v = _loc.text.trim();
    if (v.isEmpty) return;
    try {
      final r = await http.get(Uri.parse('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tn&q=${Uri.encodeQueryComponent(v)}'),
          headers: {'User-Agent': 'CampusSave (projet ESSECT)', 'Accept-Language': 'fr'});
      final j = jsonDecode(utf8.decode(r.bodyBytes)) as List;
      if (j.isEmpty) return setState(() => _msg = 'Adresse « $v » introuvable. Essaie le nom de la faculté ou du quartier.');
      _setOrigin(LatLng(double.parse(j[0]['lat']), double.parse(j[0]['lon'])), '${j[0]['display_name']}'.split(',').take(2).join(','));
    } catch (_) {
      setState(() => _msg = 'Recherche d’adresse indisponible (connexion).');
    }
  }

  void _details(Place p) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 22)),
            Text('${_types[p.type]?[1]} · ${fmtDistance(p.d)}', style: const TextStyle(color: AppColors.muted)),
            Text(p.address.isEmpty ? 'Adresse non renseignée' : p.address),
            const SizedBox(height: 6),
            p.partner
                ? Row(children: [StarsRow(p.rating), Text(' ${p.ratingCount > 0 ? p.rating.toStringAsFixed(1) : '—'} · ${p.offers} offre(s)')])
                : const Text('Non partenaire · données OpenStreetMap', style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (p.partner) ...[
                FilledButton(onPressed: () { Navigator.pop(ctx); Navigator.push(context, MaterialPageRoute(builder: (_) => CommerceScreen(commerceId: p.commerceId))); }, child: const Text('Voir le profil')),
                OutlinedButton(onPressed: () { Navigator.pop(ctx); Navigator.push(context, MaterialPageRoute(builder: (_) => OffersScreen(commerceId: p.commerceId))); }, child: const Text('Offres')),
              ],
              OutlinedButton.icon(
                onPressed: () => launchUrl(Uri.parse('https://www.google.com/maps/dir/?api=1&origin=${_origin.latitude},${_origin.longitude}&destination=${p.pos.latitude},${p.pos.longitude}'), mode: LaunchMode.externalApplication),
                icon: const Icon(Icons.directions),
                label: const Text('Itinéraire'),
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final places = _places;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Campus Radar', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 28)),
          const Text('Découvrez les restaurants autour de vous.', style: TextStyle(color: AppColors.muted)),
          const SizedBox(height: 8),
          TextField(decoration: const InputDecoration(hintText: 'Rechercher un restaurant ou une cafétéria…', prefixIcon: Icon(Icons.search), isDense: true), onChanged: (v) => setState(() => _q = v)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: TextField(controller: _loc, decoration: const InputDecoration(hintText: 'Adresse, faculté…', isDense: true), onSubmitted: (_) => _searchPlace())),
            IconButton(onPressed: _searchPlace, icon: const Icon(Icons.travel_explore), tooltip: 'Chercher ici'),
            FilledButton.icon(onPressed: _locating ? null : _locate, icon: const Icon(Icons.my_location, size: 18), label: const Text('Me localiser')),
          ]),
        ]),
      ),
      SizedBox(
        height: 52,
        child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.all(8), children: [
          for (final e in {'': 'Tout', 'restaurant': 'Restaurants', 'cafeteria': 'Cafétérias', 'cafe': 'Cafés', 'fastfood': 'Fast-food'}.entries)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: ChoiceChip(label: Text(e.value), selected: _type == e.key, showCheckmark: false,
                  labelStyle: TextStyle(fontWeight: FontWeight.w700, color: _type == e.key ? AppColors.cream : AppColors.brown),
                  onSelected: (_) => setState(() => _type = e.key)),
            ),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 3), child: FilterChip(label: const Text('Partenaires'), selected: _onlyPartners, onSelected: (v) => setState(() => _onlyPartners = v))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: ChoiceChip(label: Text(_sort == 'd' ? 'Tri : distance' : 'Tri : note'), selected: false, onSelected: (_) => setState(() => _sort = _sort == 'd' ? 'r' : 'd')),
          ),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Text(_msg.isNotEmpty ? _msg : '📍 Autour de : $_originLabel · ${_partners.length} partenaire(s) · ${_extError ? 'établissements externes indisponibles' : '${_externals.length} établissement(s) dans 1,5 km'}',
            style: TextStyle(fontSize: 12, color: _msg.isNotEmpty ? AppColors.cherry : AppColors.brown)),
      ),
      SizedBox(
        height: 240,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: FlutterMap(
              mapController: _map,
              options: const MapOptions(initialCenter: _essect, initialZoom: 15),
              children: [
                TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'tn.essect.campussave'),
                MarkerLayer(markers: [
                  Marker(point: _origin, width: 22, height: 22, child: Container(decoration: BoxDecoration(color: AppColors.sky, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3)))),
                  for (final p in places)
                    Marker(
                      point: p.pos, width: 38, height: 38,
                      child: GestureDetector(
                        onTap: () => _details(p),
                        child: Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: p.partner ? AppColors.coffee : Colors.white, shape: BoxShape.circle,
                              border: Border.all(color: p.partner ? const Color(0xFFF3C77E) : AppColors.muted, width: p.partner ? 3 : 2)),
                          child: Text(_types[p.type]?[0] ?? '🍽️', style: const TextStyle(fontSize: 16)),
                        ),
                      ),
                    ),
                ]),
              ],
            ),
          ),
        ),
      ),
      Expanded(
        child: places.isEmpty
            ? const Center(child: Text('Aucun établissement trouvé'))
            : ListView(children: [
                for (final p in places)
                  Card(
                    child: ListTile(
                      onTap: () { _map.move(p.pos, 17); _details(p); },
                      leading: CircleAvatar(
                        backgroundColor: p.partner ? AppColors.coffee : AppColors.beige,
                        backgroundImage: (p.logoUrl ?? '').isEmpty ? null : NetworkImage(p.logoUrl!),
                        child: (p.logoUrl ?? '').isEmpty ? Text(_types[p.type]?[0] ?? '🍽️') : null,
                      ),
                      title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                      subtitle: Text('${p.partner ? 'Partenaire CampusSave' : 'Externe'} · ${_types[p.type]?[1]}${p.partner ? ' · ★ ${p.ratingCount > 0 ? p.rating.toStringAsFixed(1) : '—'} · ${p.offers} offre(s)' : ''}'),
                      trailing: Text(fmtDistance(p.d), style: const TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
              ]),
      ),
    ]);
  }
}
