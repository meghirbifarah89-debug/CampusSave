// [MARYEM] Thème beige CampusSave (même identité que le site) : crème, brun chocolat, accents caramel
import 'package:flutter/material.dart';

class AppColors {
  // nouvelle palette
  static const cream = Color(0xFFF6EFE3);
  static const beige = Color(0xFFEADCC6);
  static const sand = Color(0xFFDCC7A6);
  static const coffee = Color(0xFF3B2416);
  static const brown = Color(0xFF6B4429);
  static const caramel = Color(0xFFB97A3E);
  static const gold = Color(0xFFE0A021);
  static const white = Color(0xFFFFFDF9);
  static const ok = Color(0xFF2F7D4A);
  static const cherry = Color(0xFFB3122E);
  // anciens noms conservés (utilisés par les écrans existants), remappés sur le beige
  static const bg = cream;
  static const surface = white;
  static const surface2 = white;
  static const line = Color(0x243B2416);
  static const text = coffee;
  static const muted = Color(0xFF7A6250);
  static const yellow = caramel; // accent principal
  static const orange = Color(0xFFD9822B);
  static const lime = ok; // éco / économies
  static const sky = Color(0xFF2F7AE5);
  static const red = cherry;
  static const ink = coffee;
  static const impact = Color(0xFF4A2D1B);
}

const kDisplay = 'Bricolage';
const kSans = 'Manrope';

ThemeData buildTheme() {
  const scheme = ColorScheme.light(
    primary: AppColors.coffee,
    onPrimary: AppColors.cream,
    secondary: AppColors.caramel,
    onSecondary: Colors.white,
    surface: AppColors.white,
    onSurface: AppColors.coffee,
    error: AppColors.cherry,
  );
  final radius = BorderRadius.circular(14);
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light, colorScheme: scheme, fontFamily: kSans);

  return base.copyWith(
    scaffoldBackgroundColor: AppColors.cream,
    textTheme: base.textTheme.copyWith(
      headlineLarge: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, letterSpacing: -1),
      headlineMedium: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, letterSpacing: -.8),
      titleLarge: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, letterSpacing: -.4),
    ).apply(bodyColor: AppColors.coffee, displayColor: AppColors.coffee),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.cream,
      foregroundColor: AppColors.coffee,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.coffee, letterSpacing: -.4),
    ),
    cardTheme: CardThemeData(
      color: AppColors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.line)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16), // formulaires moins serrés
      labelStyle: const TextStyle(color: AppColors.muted),
      hintStyle: const TextStyle(color: AppColors.muted),
      prefixIconColor: AppColors.muted,
      border: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: AppColors.line, width: 1.5)),
      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: AppColors.line, width: 1.5)),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: AppColors.caramel, width: 2)),
      errorBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: AppColors.cherry, width: 1.5)),
      focusedErrorBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: AppColors.cherry, width: 2)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.coffee,
        foregroundColor: AppColors.cream,
        textStyle: const TextStyle(fontFamily: kSans, fontWeight: FontWeight.w800, fontSize: 15),
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.coffee,
        side: const BorderSide(color: AppColors.coffee, width: 2),
        textStyle: const TextStyle(fontFamily: kSans, fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.caramel, textStyle: const TextStyle(fontWeight: FontWeight.w700)),
    ),
    iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(foregroundColor: AppColors.coffee)),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.coffee : AppColors.white),
        foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.cream : AppColors.brown),
        side: const WidgetStatePropertyAll(BorderSide(color: AppColors.line, width: 1.5)),
        textStyle: const WidgetStatePropertyAll(TextStyle(fontWeight: FontWeight.w800, fontFamily: kSans)),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.white,
      selectedColor: AppColors.coffee,
      labelStyle: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brown),
      secondaryLabelStyle: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.cream),
      checkmarkColor: AppColors.cream,
      side: const BorderSide(color: AppColors.line, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.white,
      indicatorColor: AppColors.coffee,
      surfaceTintColor: Colors.transparent,
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(color: s.contains(WidgetState.selected) ? AppColors.cream : AppColors.muted)),
      labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w800 : FontWeight.w600,
            color: s.contains(WidgetState.selected) ? AppColors.coffee : AppColors.muted,
          )),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.coffee,
      foregroundColor: AppColors.cream,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      titleTextStyle: const TextStyle(fontFamily: kDisplay, fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.coffee),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.cream,
      showDragHandle: true,
      dragHandleColor: AppColors.sand,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: AppColors.coffee,
      contentTextStyle: TextStyle(color: AppColors.cream, fontWeight: FontWeight.w700),
      behavior: SnackBarBehavior.floating,
    ),
    listTileTheme: const ListTileThemeData(textColor: AppColors.coffee, iconColor: AppColors.caramel),
    dividerTheme: const DividerThemeData(color: AppColors.line),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.caramel),
  );
}

/// Petite étiquette arrondie (statuts, catégories…)
class Pill extends StatelessWidget {
  final String text;
  final Color bg, fg;
  const Pill(this.text, {super.key, this.bg = AppColors.beige, this.fg = AppColors.brown});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
        child: Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 12)),
      );
}

/// Étoiles de notation
class StarsRow extends StatelessWidget {
  final double value;
  final double size;
  const StarsRow(this.value, {super.key, this.size = 16});
  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(5, (i) => Icon(Icons.star_rounded, size: size, color: i < value.round() ? AppColors.gold : const Color(0xFFD9CBB6))),
      );
}
