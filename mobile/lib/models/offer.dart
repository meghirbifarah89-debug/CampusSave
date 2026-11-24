// [MARYEM] Modèle Offre
import '../services/api_service.dart';

class Offer {
  final String id, title, description, category, commerceId, commerceName, photoUrl, pickupStart, pickupEnd, status;
  final double initialPrice, discountPrice;
  final int quantity;
  // panier surprise
  final String? surpriseKind, allergens, revealContent;

  Offer.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        title = j['title'] ?? '',
        description = j['description'] ?? '',
        category = j['category'] ?? '',
        commerceId = j['commerceId'] ?? '',
        commerceName = j['commerceName'] ?? '',
        photoUrl = imgUrl(j['photoUrl']),
        pickupStart = j['pickupStart'] ?? '',
        pickupEnd = j['pickupEnd'] ?? '',
        status = j['status'] ?? 'active',
        initialPrice = (j['initialPrice'] as num).toDouble(),
        discountPrice = (j['discountPrice'] as num).toDouble(),
        quantity = (j['quantity'] as num).toInt(),
        surpriseKind = j['surpriseKind'],
        allergens = j['allergens'],
        revealContent = j['revealContent'];

  int get discountPercent => ((1 - discountPrice / initialPrice) * 100).round();
  bool get isSurprise => category == 'panier-surprise';
  String get displayTitle => isSurprise ? 'Panier surprise · ${surpriseKinds[surpriseKind] ?? ''}' : title;
}
