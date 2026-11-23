// [MARYEM] (design beige) Écran de connexion
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'register_screen.dart';
import '../theme.dart';
import '../widgets/key_button.dart';
import '../widgets/video_backdrop.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(_email.text.trim(), _pass.text);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(children: [
        const Positioned.fill(child: VideoBackdrop()),
        const Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
                  colors: [Color(0x00F6EFE3), Color(0xCCF6EFE3), Color(0xFFF6EFE3)], stops: [0, .42, .62]),
            ),
          ),
        ),
        SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _form,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const SizedBox(height: 230),
                const Text.rich(
                  TextSpan(children: [
                    TextSpan(text: 'Campus'),
                    TextSpan(text: 'Save', style: TextStyle(color: AppColors.caramel)),
                  ]),
                  style: TextStyle(fontFamily: kDisplay, fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.coffee),
                ),
                const SizedBox(height: 14),
                const Text('Bien manger,\npetit budget.',
                    style: TextStyle(fontFamily: kDisplay, fontSize: 44, height: 1, fontWeight: FontWeight.w800, letterSpacing: -1.5, color: AppColors.coffee)),
                const SizedBox(height: 10),
                const Text('Les invendus du soir autour de l’ESSECT, à prix réduits.', style: TextStyle(color: AppColors.muted)),
                const SizedBox(height: 28),
                if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w700))),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.email)),
                  validator: (v) => RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v ?? '') ? null : 'E-mail invalide',
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _pass,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Mot de passe', prefixIcon: Icon(Icons.lock)),
                  validator: (v) => (v ?? '').length >= 6 ? null : '6 caractères minimum',
                ),
                const SizedBox(height: 20),
                KeyButton(
                  onPressed: _busy ? null : _submit,
                  child: Text(_busy ? 'Connexion…' : 'Se connecter'),
                ),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text('Pas de compte ? Inscrivez-vous'),
                ),
              ]),
            ),
          ),
        ),
      ),
      ]),
    );
  }
}
