// [MARYEM] Bouton « touche » beige : brun chocolat + tranche caramel en dessous, s'enfonce au toucher
import 'package:flutter/material.dart';
import '../theme.dart';

class KeyButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final Widget? icon;
  final bool outline;

  const KeyButton({super.key, required this.onPressed, required this.child, this.outline = false}) : icon = null;
  const KeyButton.icon({super.key, required this.onPressed, required Widget icon, required Widget label, this.outline = false})
      : icon = icon,
        child = label;

  @override
  State<KeyButton> createState() => _KeyButtonState();
}

class _KeyButtonState extends State<KeyButton> {
  static const _depth = 6.0;
  bool _down = false;

  void _set(bool v) {
    if (_down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    final bg = widget.outline ? Colors.transparent : AppColors.coffee;
    final fg = widget.outline ? AppColors.coffee : AppColors.cream;
    final edge = widget.outline ? AppColors.sand : AppColors.caramel;
    final pressed = _down && enabled;

    return Semantics(
      button: true,
      enabled: enabled,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _set(true) : null,
        onTapUp: enabled
            ? (_) {
                _set(false);
                widget.onPressed!();
              }
            : null,
        onTapCancel: () => _set(false),
        child: Opacity(
          opacity: enabled ? 1 : .5,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 90),
            curve: Curves.easeOut,
            margin: EdgeInsets.only(top: pressed ? _depth : 0, bottom: pressed ? 0 : _depth),
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.coffee, width: 2),
              boxShadow: [BoxShadow(color: edge, offset: Offset(0, pressed ? 0 : _depth))],
            ),
            child: DefaultTextStyle.merge(
              style: TextStyle(color: fg, fontFamily: kSans, fontWeight: FontWeight.w800, fontSize: 15),
              child: IconTheme.merge(
                data: IconThemeData(color: fg, size: 20),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (widget.icon != null) ...[widget.icon!, const SizedBox(width: 8)],
                    Flexible(child: widget.child),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
