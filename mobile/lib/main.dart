// [MARYEM] Point d'entrée de l'application mobile
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart'; // généré par : flutterfire configure
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'services/push_service.dart';
import 'screens/login_screen.dart';
import 'screens/student_home.dart';
import 'screens/merchant_home.dart';
import 'screens/search_screen.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider(create: (_) => CartProvider()),
    ],
    child: const CampusSaveApp(),
  ));
}

class CampusSaveApp extends StatelessWidget {
  const CampusSaveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CampusSave',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: messengerKey,
      theme: buildTheme(),
      home: const AuthGate(),
    );
  }
}

/// Redirige selon l'état de connexion et le rôle
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    switch (auth.role) {
      case 'etudiant':
        return const StudentHome();
      case 'commercant':
        return const MerchantHome();
      case 'admin':
        return Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Text('Espace administrateur', style: TextStyle(fontFamily: 'Bricolage', fontWeight: FontWeight.w800, fontSize: 24)),
                const SizedBox(height: 6),
                const Text('Supervision, commerces et utilisateurs : sur le site web (aussi utilisable sur téléphone).', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
                  icon: const Icon(Icons.person_search),
                  label: const Text('Rechercher un compte'),
                ),
                TextButton(onPressed: auth.logout, child: const Text('Déconnexion')),
              ]),
            ),
          ),
        );
      default:
        return const LoginScreen();
    }
  }
}
