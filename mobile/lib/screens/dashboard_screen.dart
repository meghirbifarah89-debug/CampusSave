// [MARYEM] Tableau de bord (étudiant ou commerçant)
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';

class DashboardScreen extends StatefulWidget {
  final String role; // 'etudiant' | 'commercant'
  const DashboardScreen({super.key, required this.role});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _s;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final s = await ApiService.get(widget.role == 'etudiant' ? '/stats/student' : '/stats/merchant');
      if (mounted) setState(() => _s = s);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  Widget _tile(IconData icon, String label, String value) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: AppColors.yellow),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(fontFamily: kDisplay, fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.coffee)),
            Text(label, style: const TextStyle(color: AppColors.muted)),
          ]),
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Center(child: Text(_error!));
    final s = _s;
    if (s == null) return const Center(child: CircularProgressIndicator());
    final student = widget.role == 'etudiant';
    final impact = s['impact'] as Map<String, dynamic>;
    final serie = (student ? s['depenses7j'] : s['ventes7j']) as List;
    final maxV = serie.fold<double>(1, (m, d) => (d['total'] as num).toDouble() > m ? (d['total'] as num).toDouble() : m);

    final tiles = student
        ? [
            _tile(Icons.receipt_long, 'Commandes', '${s['commandes']}'),
            _tile(Icons.payments, 'Dépensé', fmt(s['totalDepense'])),
            _tile(Icons.savings, 'Économisé', fmt(s['totalEconomise'])),
            _tile(Icons.eco, 'EcoPoints', '${s['ecoPoints']}'),
          ]
        : [
            _tile(Icons.restaurant_menu, 'Offres actives', '${s['offresActives']} / ${s['offres']}'),
            _tile(Icons.receipt_long, 'Commandes', '${s['commandes']}'),
            _tile(Icons.inventory, 'À récupérer', '${s['aRecuperer']}'),
            _tile(Icons.payments, 'Chiffre d’affaires', fmt(s['chiffreAffaires'])),
          ];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(12), children: [
        const Text('Tableau de bord', style: TextStyle(fontFamily: kDisplay, fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -.8, color: AppColors.coffee)),
        const SizedBox(height: 8),
        GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.5, children: tiles),
        Card(
          color: AppColors.impact,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide.none),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('🌍 Impact anti-gaspillage', style: TextStyle(color: Color(0xFFF3C77E), fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 17)),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                _impact('${impact['repasSauves']}', 'repas'),
                _impact('${impact['kgSauves']} kg', 'nourriture'),
                _impact('${impact['co2Evite']} kg', 'CO₂ évité'),
              ]),
            ]),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(student ? 'Dépenses – 7 jours' : 'Ventes – 7 jours', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              SizedBox(
                height: 140,
                child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: serie.map((d) {
                  final v = (d['total'] as num).toDouble();
                  return Expanded(
                    child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                      Container(
                        height: 110 * v / maxV + 2,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [AppColors.yellow, AppColors.orange]),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      Text((d['day'] as String).substring(8), style: const TextStyle(fontSize: 11, color: AppColors.muted)),
                    ]),
                  );
                }).toList()),
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _impact(String v, String l) => Column(children: [
        Text(v, style: const TextStyle(color: Colors.white, fontFamily: kDisplay, fontSize: 22, fontWeight: FontWeight.w800)),
        Text(l, style: const TextStyle(color: Colors.white70)),
      ]);
}
