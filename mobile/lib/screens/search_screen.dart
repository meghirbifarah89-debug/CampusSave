// [MARYEM] Recherche globale de comptes (étudiants, commerçants, administrateurs) + profil public
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'commerce_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String _q = '', _type = '';
  List _results = [];
  String _state = 'idle';
  Timer? _debounce;

  void _search() {
    _debounce?.cancel();
    if (_q.trim().length < 2) { setState(() { _results = []; _state = 'idle'; }); return; }
    setState(() => _state = 'loading');
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final r = await ApiService.get('/users/search?q=${Uri.encodeQueryComponent(_q.trim())}${_type.isEmpty ? '' : '&type=$_type'}') as List;
        if (mounted) setState(() { _results = r; _state = 'done'; });
      } catch (_) {
        if (mounted) setState(() => _state = 'error');
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _open(Map r) {
    final me = context.read<AuthProvider>().profile;
    if (r['role'] == 'commercant' && r['commerceId'] != null && me?['role'] != 'admin') {
      Navigator.push(context, MaterialPageRoute(builder: (_) => CommerceScreen(commerceId: r['commerceId'])));
    } else {
      Navigator.push(context, MaterialPageRoute(builder: (_) => UserProfileScreen(userId: r['id'])));
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AuthProvider>().role == 'admin';
    return Scaffold(
      appBar: AppBar(title: const Text('Rechercher un compte')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
          child: TextField(
            autofocus: true,
            decoration: const InputDecoration(hintText: 'Rechercher un compte par nom, mot-clé…', prefixIcon: Icon(Icons.search)),
            onChanged: (v) { _q = v; _search(); },
          ),
        ),
        SizedBox(
          height: 54,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(8),
            children: {'': 'Tous', 'etudiant': 'Étudiants', 'commercant': 'Commerçants', 'admin': 'Administrateurs'}.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text(e.value), selected: _type == e.key, showCheckmark: false,
                    labelStyle: TextStyle(fontWeight: FontWeight.w700, color: _type == e.key ? AppColors.cream : AppColors.brown),
                    onSelected: (_) { _type = e.key; _search(); },
                  ),
                )).toList(),
          ),
        ),
        Expanded(
          child: switch (_state) {
            'idle' => const Center(child: Text('Tape au moins 2 lettres : prénom, nom, commerce, faculté…', style: TextStyle(color: AppColors.muted))),
            'loading' => const Center(child: CircularProgressIndicator()),
            'error' => const Center(child: Text('La recherche a échoué. Réessaie.')),
            _ => _results.isEmpty
                ? Center(child: Text('Aucun compte ne correspond à « $_q »', style: const TextStyle(fontWeight: FontWeight.w700)))
                : ListView(children: [
                    for (final r in _results)
                      Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.beige,
                            backgroundImage: imgUrl(r['photoUrl']).isEmpty ? null : NetworkImage(imgUrl(r['photoUrl'])),
                            child: imgUrl(r['photoUrl']).isEmpty ? Text(r['role'] == 'commercant' ? '🏪' : '${r['name']}'.substring(0, 1)) : null,
                          ),
                          title: Text('${(r['commerceName'] ?? '').toString().isNotEmpty ? r['commerceName'] : r['name']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                          subtitle: Text([if ((r['commerceName'] ?? '').toString().isNotEmpty) r['name'], r['faculty'], r['location']].where((x) => x != null && '$x'.isNotEmpty).join(' · ')),
                          trailing: Pill(roleLabels[r['role']] ?? ''),
                          onTap: () => _open(r),
                        ),
                      ),
                  ]),
          },
        ),
        Padding(
          padding: const EdgeInsets.all(10),
          child: Text(admin ? 'Administrateur : coordonnées complètes visibles dans les profils.' : 'Les e-mails et téléphones restent privés.', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        ),
      ]),
    );
  }
}

/// Profil d'un compte (champs privés visibles par l'administrateur seulement)
class UserProfileScreen extends StatefulWidget {
  final String userId;
  const UserProfileScreen({super.key, required this.userId});
  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  Map<String, dynamic>? _u;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final u = await ApiService.get('/users/${widget.userId}');
      if (mounted) setState(() => _u = Map<String, dynamic>.from(u));
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  Future<void> _toggle() async {
    try {
      await ApiService.put('/admin/users/${_u!['id']}/status', {'status': _u!['status'] == 'bloque' ? 'actif' : 'bloque'});
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AuthProvider>().role == 'admin';
    final u = _u;
    return Scaffold(
      appBar: AppBar(title: Text(u?['name'] ?? 'Profil')),
      body: _error != null
          ? Center(child: Text(_error!))
          : u == null
              ? const Center(child: CircularProgressIndicator())
              : ListView(padding: const EdgeInsets.all(16), children: [
                  // photo de couverture du compte (si elle existe)
                  if (imgUrl(u['coverUrl']).isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: AspectRatio(aspectRatio: 16 / 6, child: Image.network(imgUrl(u['coverUrl']), fit: BoxFit.cover)),
                    ),
                  const SizedBox(height: 10),
                  Center(
                    child: CircleAvatar(
                      radius: 46,
                      backgroundColor: AppColors.caramel,
                      backgroundImage: imgUrl(u['photoUrl']).isEmpty ? null : NetworkImage(imgUrl(u['photoUrl'])),
                      child: imgUrl(u['photoUrl']).isEmpty ? Text('${u['name']}'.substring(0, 1), style: const TextStyle(fontSize: 34, color: AppColors.cream)) : null,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(child: Text('${u['name']}', style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 24))),
                  Center(child: Pill(roleLabels[u['role']] ?? '')),
                  Card(
                    child: Column(children: [
                      if ((u['faculty'] ?? '').toString().isNotEmpty) ListTile(title: const Text('Faculté / structure'), subtitle: Text('${u['faculty']}')),
                      if ((u['location'] ?? '').toString().isNotEmpty) ListTile(title: const Text('Localisation'), subtitle: Text('${u['location']}')),
                      if (u['role'] == 'etudiant') ListTile(title: const Text('Sexe'), subtitle: Text(genderLabels[u['gender']] ?? '—')),
                      if (u['role'] == 'etudiant') ListTile(title: const Text('EcoPoints'), subtitle: Text('🌱 ${u['ecoPoints'] ?? 0}')),
                      if (admin) ...[
                        ListTile(title: const Text('E-mail'), subtitle: Text('${u['email']}')),
                        ListTile(title: const Text('Téléphone'), subtitle: Text('${u['phone']}')),
                        ListTile(title: const Text('Statut'), subtitle: Text('${u['status']}')),
                      ],
                    ]),
                  ),
                  if (u['commerceId'] != null)
                    FilledButton(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CommerceScreen(commerceId: u['commerceId']))),
                      child: Text('Voir le profil de ${u['commerceName']}'),
                    ),
                  if (admin && u['role'] != 'admin')
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: OutlinedButton(onPressed: _toggle, child: Text(u['status'] == 'bloque' ? 'Débloquer ce compte' : 'Bloquer ce compte')),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(admin ? 'Vue administrateur : informations complètes.' : 'Les informations privées sont masquées.', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                  ),
                ]),
    );
  }
}
