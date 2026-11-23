// [MARYEM] Écran d'inscription (étudiant / commerçant)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import '../widgets/key_button.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _pass = TextEditingController();
  final _confirm = TextEditingController();
  String _role = 'etudiant';
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    try {
      await context.read<AuthProvider>().register(
            name: _name.text.trim(), email: _email.text.trim(), phone: _phone.text.trim(),
            password: _pass.text, role: _role);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field(TextEditingController c, String label, String? Function(String?) v,
          {bool obscure = false, TextInputType? type}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextFormField(controller: c, obscureText: obscure, keyboardType: type,
            decoration: InputDecoration(labelText: label), validator: v),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Créer un compte')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _form,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'etudiant', label: Text('Étudiant'), icon: Icon(Icons.school)),
                ButtonSegment(value: 'commercant', label: Text('Commerçant'), icon: Icon(Icons.store)),
              ],
              selected: {_role},
              onSelectionChanged: (s) => setState(() => _role = s.first),
            ),
            const SizedBox(height: 16),
            if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w700))),
            _field(_name, 'Nom complet', (v) => (v ?? '').trim().length >= 3 ? null : '3 caractères minimum'),
            _field(_email, 'E-mail', (v) => RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v ?? '') ? null : 'E-mail invalide',
                type: TextInputType.emailAddress),
            _field(_phone, 'Téléphone', (v) => RegExp(r'^[2-9]\d{7}$').hasMatch(v ?? '') ? null : '8 chiffres',
                type: TextInputType.phone),
            _field(_pass, 'Mot de passe', (v) => (v ?? '').length >= 6 ? null : '6 caractères minimum', obscure: true),
            _field(_confirm, 'Confirmer le mot de passe', (v) => v == _pass.text ? null : 'Mots de passe différents', obscure: true),
            const SizedBox(height: 6),
            KeyButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Création…' : 'S’inscrire'),
            ),
          ]),
        ),
      ),
    );
  }
}
