// [MARYEM] « Mon profil » : affiche d'abord les informations (base de données).
// Le formulaire ne s'ouvre qu'avec « Modifier mon profil ». Étudiant : EcoPoints, historique, récompense ComeEat.
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/cover.dart';
import 'commerce_screen.dart' show checkImage, ImagePreview;
import 'search_screen.dart';

const comeEatCost = 500;

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _eco;
  bool _claiming = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final auth = context.read<AuthProvider>();
    await auth.refresh().catchError((_) {});
    if (auth.role == 'etudiant') {
      try {
        final e = await ApiService.get('/rewards/me');
        if (mounted) setState(() => _eco = e);
      } catch (_) {}
    }
  }

  Future<void> _claim() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('ComeEat'),
        content: const Text('Utiliser $comeEatCost EcoPoints pour un repas gratuit ?'),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirmer'))],
      ),
    );
    if (ok != true) return;
    setState(() => _claiming = true);
    try {
      final r = await ApiService.post('/rewards/comeeat/claim');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${r['message']} Code ${r['code']}')));
      await _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  /// Supprimer définitivement son compte : confirmation en tapant SUPPRIMER
  Future<void> _deleteAccount(bool student) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setD) => AlertDialog(
        title: const Text('Supprimer mon compte ?'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(student
              ? 'Cette action est définitive. Vos commandes non payées seront annulées, vos avis et vos EcoPoints supprimés.'
              : 'Cette action est définitive. Votre commerce, vos offres et les avis reçus seront supprimés.'),
          const SizedBox(height: 14),
          const Text('Tapez SUPPRIMER pour confirmer', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          TextField(controller: ctrl, autofocus: true, onChanged: (_) => setD(() {})),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.cherry),
            onPressed: ctrl.text.trim() == 'SUPPRIMER' ? () => Navigator.pop(ctx, true) : null,
            child: const Text('Supprimer définitivement'),
          ),
        ],
      )),
    );
    if (ok != true || !mounted) return;
    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ApiService.delete('/auth/me');
      await auth.logout(); // retour automatique à l'écran de connexion
      messenger.showSnackBar(const SnackBar(content: Text('Votre compte a été supprimé.')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.cherry));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final p = auth.profile!;
    final student = p['role'] == 'etudiant';
    final photo = imgUrl(p['photoUrl']);
    final balance = ((_eco?['balance'] ?? p['ecoPoints'] ?? 0) as num).toInt();
    final unlocked = balance >= comeEatCost;
    final info = <List<String>>[
      ['Nom complet', '${p['name']}'], ['E-mail', '${p['email']}'], ['Téléphone', '${p['phone']}'],
      if (student) ...[['Faculté / université', (p['faculty'] ?? '').toString().isEmpty ? '—' : p['faculty']], ['Sexe', genderLabels[p['gender']] ?? '—']],
      ['Localisation', (p['location'] ?? '').toString().isEmpty ? '—' : p['location']],
      ['Rôle', roleLabels[p['role']] ?? '${p['role']}'], ['Membre depuis', fmtDate(p['createdAt']).isEmpty ? '—' : fmtDate(p['createdAt'])],
    ];

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(padding: const EdgeInsets.only(bottom: 30), children: [
        CoverBanner(
          url: imgUrl(p['coverUrl']),
          height: 150,
          colors: const [AppColors.brown, AppColors.caramel, Color(0xFFE0B07A)],
          child: Align(
            alignment: Alignment.topRight,
            child: IconButton(
              tooltip: 'Rechercher un compte',
              style: IconButton.styleFrom(backgroundColor: const Color(0x663B2416)),
              icon: const Icon(Icons.person_search, color: AppColors.cream),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
            ),
          ),
        ),
        Transform.translate(
          offset: const Offset(0, -48),
          child: Column(children: [
            CircleAvatar(
              radius: 50,
              backgroundColor: AppColors.cream,
              child: CircleAvatar(
                radius: 45,
                backgroundColor: AppColors.caramel,
                backgroundImage: photo.isEmpty ? null : NetworkImage(photo),
                child: photo.isEmpty ? Text('${p['name']}'.substring(0, 1), style: const TextStyle(fontFamily: kDisplay, fontSize: 36, color: AppColors.cream, fontWeight: FontWeight.w800)) : null,
              ),
            ),
            const SizedBox(height: 6),
            Text('${p['name']}', style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 24)),
            Wrap(spacing: 6, children: [
              Pill(roleLabels[p['role']] ?? ''),
              if ((p['faculty'] ?? '').toString().isNotEmpty) Pill('${p['faculty']}'),
            ]),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: () async {
                final saved = await showModalBottomSheet<bool>(context: context, isScrollControlled: true, useSafeArea: true, builder: (_) => _EditProfile(profile: p, student: student));
                if (saved == true) _refresh();
              },
              icon: const Icon(Icons.edit),
              label: const Text('Modifier mon profil'),
            ),
          ]),
        ),
        Transform.translate(
          offset: const Offset(0, -36),
          child: Column(children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Mes informations', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 6),
                  for (final r in info)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        SizedBox(width: 130, child: Text(r[0], style: const TextStyle(color: AppColors.muted, fontSize: 13))),
                        Expanded(child: Text(r[1], style: const TextStyle(fontWeight: FontWeight.w600))),
                      ]),
                    ),
                ]),
              ),
            ),
            if (student) ...[
              Card(
                color: AppColors.ok,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('SOLDE ECOPOINTS', style: TextStyle(color: Color(0xDDFFFFFF), fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 1)),
                        Text('$balance', style: const TextStyle(color: Colors.white, fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 40)),
                        Text('🌱 ${_eco?['rule'] ?? '10 EcoPoints par article récupéré'}', style: const TextStyle(color: Color(0xEEFFFFFF), fontSize: 12)),
                      ]),
                    ),
                  ]),
                ),
              ),
              Card(
                color: const Color(0xFFFFF8EC),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Color(0xFFF3D9A8), width: 2)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Pill('RÉCOMPENSE SPÉCIALE', bg: AppColors.coffee, fg: Color(0xFFF3C77E)),
                          SizedBox(height: 6),
                          Text('ComeEat', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 28)),
                          Text('Atteins 500 EcoPoints et profite d’un repas gratuit !'),
                        ]),
                      ),
                      Opacity(opacity: unlocked ? 1 : .55, child: const Text('🍔', style: TextStyle(fontSize: 54))),
                    ]),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(value: (balance / comeEatCost).clamp(0, 1).toDouble(), minHeight: 12, backgroundColor: AppColors.beige, color: AppColors.caramel),
                    ),
                    const SizedBox(height: 6),
                    Row(children: [
                      Expanded(child: Text(unlocked ? '$balance points · débloqué ✓' : '$balance / $comeEatCost · encore ${comeEatCost - balance} points', style: const TextStyle(color: AppColors.muted, fontSize: 13))),
                      const Text('$comeEatCost EcoPoints', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    ]),
                    const SizedBox(height: 10),
                    unlocked
                        ? SizedBox(width: double.infinity, child: FilledButton(onPressed: _claiming ? null : _claim, child: Text(_claiming ? 'Vérification du solde…' : '🍽️ Réclamer mon repas gratuit')))
                        : const Pill('🔒 Verrouillé'),
                  ]),
                ),
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Mes récompenses', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                    if (((_eco?['rewards'] as List?) ?? []).isEmpty) const Text('Aucune récompense réclamée pour l’instant.', style: TextStyle(color: AppColors.muted)),
                    for (final r in (_eco?['rewards'] as List?) ?? [])
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: r['qrCode'] != null && r['status'] == 'active'
                            ? Image.memory(base64Decode('${r['qrCode']}'.split(',').last), width: 56, height: 56)
                            : const Icon(Icons.check_circle, color: AppColors.ok),
                        title: Text('${r['code']}', style: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800)),
                        subtitle: Text(r['status'] == 'active' ? 'À utiliser · montre ce QR code dans un commerce partenaire' : 'Utilisé le ${fmtDate(r['usedAt'])}'),
                        onTap: r['qrCode'] == null || r['status'] != 'active'
                            ? null
                            : () => showDialog(context: context, builder: (_) => AlertDialog(title: Text('${r['code']}'), content: Image.memory(base64Decode('${r['qrCode']}'.split(',').last)))),
                      ),
                  ]),
                ),
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Historique EcoPoints', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 18)),
                    if (((_eco?['history'] as List?) ?? []).isEmpty) const Text('Aucun mouvement pour l’instant.', style: TextStyle(color: AppColors.muted)),
                    for (final h in (_eco?['history'] as List?) ?? [])
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text('${h['label']}'),
                        subtitle: Text(fmtDate(h['date'])),
                        trailing: Text('${(h['points'] as num) > 0 ? '+' : ''}${h['points']}',
                            style: TextStyle(fontWeight: FontWeight.w800, color: (h['points'] as num) > 0 ? AppColors.ok : AppColors.cherry)),
                      ),
                  ]),
                ),
              ),
            ],
            Padding(
              padding: const EdgeInsets.all(12),
              child: OutlinedButton.icon(onPressed: auth.logout, icon: const Icon(Icons.logout), label: const Text('Déconnexion')),
            ),
            // Supprimer son compte (pas pour l'administrateur)
            if (p['role'] != 'admin')
              Card(
                color: const Color(0xFFFFF7F6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Color(0xFFF1C5C0), width: 1.5)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Supprimer mon compte', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.cherry)),
                    const SizedBox(height: 6),
                    Text(student
                        ? 'Action définitive : votre profil, vos avis et vos EcoPoints seront supprimés.'
                        : 'Action définitive : votre profil, votre commerce et vos offres seront supprimés.',
                        style: const TextStyle(color: AppColors.muted)),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(foregroundColor: AppColors.cherry, side: const BorderSide(color: AppColors.cherry)),
                      onPressed: () => _deleteAccount(student),
                      icon: const Icon(Icons.delete_forever_outlined),
                      label: const Text('Supprimer mon compte'),
                    ),
                  ]),
                ),
              ),
          ]),
        ),
      ]),
    );
  }
}

/// Formulaire de modification (ouvert seulement au clic)
class _EditProfile extends StatefulWidget {
  final Map<String, dynamic> profile;
  final bool student;
  const _EditProfile({required this.profile, required this.student});
  @override
  State<_EditProfile> createState() => _EditProfileState();
}

class _EditProfileState extends State<_EditProfile> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: '${widget.profile['name'] ?? ''}');
  late final _phone = TextEditingController(text: '${widget.profile['phone'] ?? ''}');
  late final _faculty = TextEditingController(text: '${widget.profile['faculty'] ?? ''}');
  late final _location = TextEditingController(text: '${widget.profile['location'] ?? ''}');
  late String _gender = '${widget.profile['gender'] ?? ''}';
  File? _photo, _cover;
  late String _coverUrl = imgUrl(widget.profile['coverUrl']);
  bool _removeCover = false;
  String? _error;
  bool _busy = false;

  Future<void> _pickCover() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 85);
    if (x == null) return;
    final f = File(x.path);
    final err = checkImage(f);
    setState(() { _error = err; if (err == null) { _cover = f; _removeCover = false; } });
  }

  Future<void> _pick() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 900, imageQuality: 85);
    if (x == null) return;
    final f = File(x.path);
    final err = checkImage(f);
    setState(() { _error = err; _photo = err == null ? f : null; });
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    try {
      final fields = {
        'name': _name.text.trim(), 'phone': _phone.text.trim(), 'location': _location.text.trim(),
        if (widget.student) ...{'faculty': _faculty.text.trim(), 'gender': _gender},
        if (_removeCover && _cover == null) 'removeCover': 'true',
      };
      final p = await ApiService.multipart('PUT', '/auth/me', fields, files: {'photo': _photo, 'cover': _cover});
      if (!mounted) return;
      context.read<AuthProvider>().setProfile(Map<String, dynamic>.from(p));
      Navigator.pop(context, true);
    } catch (e) {
      setState(() { _error = '$e'; _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Modifier mon profil', style: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 22)),
            const SizedBox(height: 12),
            CoverPicker(file: _cover, url: _coverUrl, onPick: _pickCover, onRemove: () => setState(() { _cover = null; _coverUrl = ''; _removeCover = true; })),
            const SizedBox(height: 14),
            ImagePreview(file: _photo, url: imgUrl(widget.profile['photoUrl']), onPick: _pick, label: 'Photo de profil'),
            const SizedBox(height: 16),
            TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Nom complet'), validator: (v) => (v ?? '').trim().length >= 3 ? null : 'Nom trop court'),
            const SizedBox(height: 14),
            TextFormField(controller: _phone, decoration: const InputDecoration(labelText: 'Téléphone'), keyboardType: TextInputType.phone,
                validator: (v) => RegExp(r'^[2-9]\d{7}$').hasMatch((v ?? '').replaceAll(' ', '')) ? null : '8 chiffres'),
            const SizedBox(height: 14),
            TextFormField(controller: _location, decoration: const InputDecoration(labelText: 'Localisation', hintText: 'Tunis, Ariana…')),
            if (widget.student) ...[
              const SizedBox(height: 14),
              TextFormField(controller: _faculty, decoration: const InputDecoration(labelText: 'Faculté / université', hintText: 'ESSECT · E-Business L3')),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: _gender.isEmpty ? null : _gender,
                decoration: const InputDecoration(labelText: 'Sexe'),
                items: genderLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                onChanged: (v) => setState(() => _gender = v ?? ''),
              ),
            ],
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.cherry, fontWeight: FontWeight.w700))),
            const SizedBox(height: 14),
            FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Enregistrement…' : 'Enregistrer')),
          ]),
        ),
      ),
    );
  }
}
