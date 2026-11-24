// [MARYEM] Photo de couverture (comme sur le site web) : bannière d'un profil ou d'un commerce
// + sélecteur dans les formulaires (aperçu, changer, retirer).
import 'dart:io';
import 'package:flutter/material.dart';
import '../theme.dart';

/// Bannière en haut d'un profil : photo de couverture si elle existe, sinon dégradé beige/café
class CoverBanner extends StatelessWidget {
  final String url;
  final double height;
  final List<Color> colors;
  final Widget? child;
  const CoverBanner({super.key, required this.url, this.height = 150, this.colors = const [AppColors.coffee, AppColors.brown, AppColors.caramel], this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      margin: const EdgeInsets.all(12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), gradient: LinearGradient(colors: colors)),
      child: Stack(fit: StackFit.expand, children: [
        if (url.isNotEmpty)
          Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
        if (child != null) child!,
      ]),
    );
  }
}

/// Sélecteur de couverture dans un formulaire : aperçu large, « Changer » et « Retirer »
class CoverPicker extends StatelessWidget {
  final File? file;
  final String url; // couverture actuelle ('' si aucune ou retirée)
  final VoidCallback onPick;
  final VoidCallback onRemove;
  const CoverPicker({super.key, required this.file, required this.url, required this.onPick, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final has = file != null || url.isNotEmpty;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Photo de couverture', style: TextStyle(fontWeight: FontWeight.w800)),
      const SizedBox(height: 6),
      InkWell(
        onTap: onPick,
        borderRadius: BorderRadius.circular(16),
        child: AspectRatio(
          aspectRatio: 16 / 6,
          child: Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.sand, width: 2)),
            child: has
                ? (file != null ? Image.file(file!, fit: BoxFit.cover) : Image.network(url, fit: BoxFit.cover))
                : const Center(child: Text('🖼️ Ajouter une couverture\nJPG, JPEG, PNG ou WEBP · 2 Mo max', textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted))),
          ),
        ),
      ),
      if (has)
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          TextButton.icon(onPressed: onPick, icon: const Icon(Icons.photo_library_outlined, size: 18), label: const Text('Changer')),
          TextButton.icon(onPressed: onRemove, icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.cherry), label: const Text('Retirer', style: TextStyle(color: AppColors.cherry))),
        ]),
    ]);
  }
}
