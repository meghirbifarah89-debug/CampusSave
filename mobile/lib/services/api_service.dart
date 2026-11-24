// [MARYEM] Appels à l'API REST commune (même backend que l'application Web)
import 'dart:convert';
import 'dart:io';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ApiService {
  static Future<Map<String, String>> _headers() async {
    final h = {'Content-Type': 'application/json'};
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) h['Authorization'] = 'Bearer ${await user.getIdToken()}';
    return h;
  }

  static dynamic _handle(http.Response res) {
    final body = res.body.isEmpty ? {} : jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) {
      throw ApiException(body is Map && body['message'] != null ? body['message'] : 'Erreur ${res.statusCode}');
    }
    return body;
  }

  static Future<dynamic> get(String path) async =>
      _handle(await http.get(Uri.parse('$apiBaseUrl$path'), headers: await _headers()));

  static Future<dynamic> post(String path, [Object? body]) async =>
      _handle(await http.post(Uri.parse('$apiBaseUrl$path'), headers: await _headers(), body: jsonEncode(body ?? {})));

  static Future<dynamic> put(String path, [Object? body]) async =>
      _handle(await http.put(Uri.parse('$apiBaseUrl$path'), headers: await _headers(), body: jsonEncode(body ?? {})));

  static Future<dynamic> delete(String path) async =>
      _handle(await http.delete(Uri.parse('$apiBaseUrl$path'), headers: await _headers()));

  /// Envoi multipart (formulaire + image optionnelle) : offres, logo du commerce, photo de profil
  static Future<dynamic> multipart(String method, String path, Map<String, String> fields,
      {String fileField = 'photo', File? file, Map<String, File?> files = const {}}) async {
    final req = http.MultipartRequest(method, Uri.parse('$apiBaseUrl$path'));
    final h = await _headers();
    h.remove('Content-Type');
    req.headers.addAll(h);
    req.fields.addAll(fields);
    // plusieurs images possibles (ex. logo + couverture, photo + couverture)
    final all = <String, File?>{if (file != null) fileField: file, ...files};
    for (final e in all.entries) {
      if (e.value == null) continue;
      final ext = e.value!.path.split('.').last.toLowerCase();
      final type = ext == 'png' ? 'png' : ext == 'webp' ? 'webp' : 'jpeg';
      req.files.add(await http.MultipartFile.fromPath(e.key, e.value!.path, contentType: MediaType('image', type)));
    }
    return _handle(await http.Response.fromStream(await req.send()));
  }
}

/// Adresse complète d'une image du backend (chemins relatifs "/uploads/..." ;
/// accepte aussi les anciennes valeurs "undefined/uploads/..." ou "http://localhost:5000/uploads/...")
String imgUrl(dynamic url) {
  final u = (url ?? '').toString();
  if (u.isEmpty || u.startsWith('data:')) return u;
  final i = u.indexOf('/uploads/');
  if (i >= 0) return apiBaseUrl.replaceAll(RegExp(r'/api/?$'), '') + u.substring(i);
  return u;
}

const groups = {'': 'Tout', 'sucre': 'Sucré', 'sale': 'Salé', 'boisson': 'Boisson', 'surprise': 'Panier surprise'};
const surpriseKinds = {'sucre': 'Sucré', 'sale': 'Salé', 'mixte': 'Mixte'};
const categoryLabels = {'plat': 'Plat', 'sandwich': 'Sandwich', 'patisserie': 'Pâtisserie', 'boisson': 'Boisson', 'boulangerie': 'Boulangerie', 'panier-surprise': 'Panier surprise'};
const roleLabels = {'etudiant': 'Étudiant', 'commercant': 'Commerçant', 'admin': 'Administrateur'};
const genderLabels = {'femme': 'Femme', 'homme': 'Homme', 'non_precise': 'Non précisé'};
String fmtShort(num? v) => '${(v ?? 0).toStringAsFixed(1).replaceAll('.0', '')} DT';
String fmtDate(dynamic t) {
  final s = t is Map ? (t['_seconds'] ?? t['seconds']) : null;
  if (s == null) return '';
  final d = DateTime.fromMillisecondsSinceEpoch((s as num).toInt() * 1000);
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

String fmt(num? v) => '${(v ?? 0).toStringAsFixed(3)} DT';

const statuts = {
  'en_attente_paiement': 'En attente de paiement',
  'payee': 'Payée – à récupérer',
  'recuperee': 'Récupérée',
  'annulee': 'Annulée',
};
