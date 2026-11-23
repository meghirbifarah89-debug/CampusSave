// [MARYEM] Gestion de l'authentification (Firebase Auth + profil du backend)
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/push_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? profile;
  bool loading = true;
  bool _registering = false; // évite d'écraser le profil pendant l'inscription

  AuthProvider() {
    FirebaseAuth.instance.authStateChanges().listen((user) async {
      if (_registering) return;
      if (user == null) {
        profile = null;
      } else {
        try {
          profile = await ApiService.get('/auth/me');
          PushService.init();
        } catch (_) {
          profile = null;
        }
      }
      loading = false;
      notifyListeners();
    });
  }

  String? get role => profile?['role'];

  Future<void> login(String email, String password) async {
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(email: email, password: password);
    } on FirebaseAuthException {
      throw ApiException('E-mail ou mot de passe incorrect');
    }
    profile = await ApiService.get('/auth/me');
    notifyListeners();
  }

  Future<void> register({required String name, required String email, required String phone,
      required String password, required String role}) async {
    _registering = true;
    try {
      await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email, password: password);
      profile = await ApiService.post('/auth/register', {'name': name, 'phone': phone, 'role': role});
    } on FirebaseAuthException catch (e) {
      throw ApiException(e.code == 'email-already-in-use' ? 'Cet e-mail est déjà utilisé' : (e.message ?? 'Erreur'));
    } finally {
      _registering = false;
      loading = false;
    }
    PushService.init();
    notifyListeners();
  }

  Future<void> refresh() async {
    profile = await ApiService.get('/auth/me');
    notifyListeners();
  }

  Future<void> updateProfile(String name, String phone) async {
    profile = await ApiService.put('/auth/me', {'name': name, 'phone': phone});
    notifyListeners();
  }

  void setProfile(Map<String, dynamic> p) {
    profile = p;
    notifyListeners();
  }

  Future<void> logout() => FirebaseAuth.instance.signOut();
}
