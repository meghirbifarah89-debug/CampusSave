// [MARYEM] Panier (quantités incrémentales, un seul commerce par panier)
import 'package:flutter/material.dart';
import '../models/offer.dart';

class CartItem {
  final Offer offer;
  int quantity;
  CartItem(this.offer, this.quantity);
}

class CartProvider extends ChangeNotifier {
  final List<CartItem> items = [];

  /// Renvoie false si le produit vient d'un autre commerce que le panier actuel
  bool add(Offer offer, {int qty = 1}) {
    if (items.isNotEmpty && items.first.offer.commerceId != offer.commerceId) return false;
    final i = items.indexWhere((e) => e.offer.id == offer.id);
    if (i >= 0) {
      items[i].quantity = (items[i].quantity + qty).clamp(1, offer.quantity);
    } else {
      items.add(CartItem(offer, qty.clamp(1, offer.quantity)));
    }
    notifyListeners();
    return true;
  }

  void increment(String id) {
    final it = items.firstWhere((e) => e.offer.id == id);
    if (it.quantity < it.offer.quantity) it.quantity++;
    notifyListeners();
  }

  void decrement(String id) {
    final it = items.firstWhere((e) => e.offer.id == id);
    it.quantity--;
    if (it.quantity <= 0) items.remove(it);
    notifyListeners();
  }

  void replaceWith(Offer offer) {
    items
      ..clear()
      ..add(CartItem(offer, 1));
    notifyListeners();
  }

  void clear() {
    items.clear();
    notifyListeners();
  }

  int get count => items.fold(0, (s, e) => s + e.quantity);
  double get total => items.fold(0, (s, e) => s + e.offer.discountPrice * e.quantity);
  double get totalInitial => items.fold(0, (s, e) => s + e.offer.initialPrice * e.quantity);
}
