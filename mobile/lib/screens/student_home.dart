// [MARYEM] Navigation principale de l'étudiant
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import 'offers_screen.dart';
import 'radar_screen.dart';
import 'cart_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

class StudentHome extends StatefulWidget {
  const StudentHome({super.key});
  @override
  State<StudentHome> createState() => _StudentHomeState();
}

class _StudentHomeState extends State<StudentHome> {
  int _index = 0;

  void goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final count = context.watch<CartProvider>().count;
    final pages = [
      const OffersScreen(),
      const RadarScreen(),
      const OrdersScreen(),
      CartScreen(onOrderCreated: () => goTo(2)),
      const ProfileScreen(),
    ];
    return Scaffold(
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: goTo,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.restaurant), label: 'Offres'),
          const NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Campus Radar'),
          const NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Commandes'),
          NavigationDestination(
              icon: Badge(isLabelVisible: count > 0, label: Text('$count'), child: const Icon(Icons.shopping_bag_outlined)),
              label: 'Panier'),
          const NavigationDestination(icon: Icon(Icons.person), label: 'Mon profil'),
        ],
      ),
    );
  }
}
