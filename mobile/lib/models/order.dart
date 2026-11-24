// [MARYEM] Modèle Commande
import 'dart:convert';
import 'dart:typed_data';

class OrderItem {
  final String title;
  final int quantity;
  final double unitPrice, initialPrice;
  // [MARYEM] panier surprise : contenu révélé seulement après le scan du QR code
  final bool surprise;
  final String? surpriseKind, reveal;
  OrderItem.fromJson(Map<String, dynamic> j)
      : title = j['title'],
        quantity = (j['quantity'] as num).toInt(),
        unitPrice = (j['unitPrice'] as num).toDouble(),
        initialPrice = ((j['initialPrice'] ?? j['unitPrice']) as num).toDouble(),
        surprise = j['surprise'] == true,
        surpriseKind = j['surpriseKind'],
        reveal = j['reveal'];
}

class Order {
  final String id, code, commerceId, commerceName, status, pickupStart, pickupEnd, studentName;
  final bool scanned; // QR scanné et validé (statut « recuperee » + pickedUpAt)
  final double total, saved;
  final List<OrderItem> items;
  final String? qrCode;
  final int ecoPoints;

  Order.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        code = j['code'] ?? '',
        commerceId = j['commerceId'] ?? '',
        commerceName = j['commerceName'] ?? '',
        scanned = j['status'] == 'recuperee' || j['pickedUpAt'] != null,
        studentName = j['studentName'] ?? '',
        status = j['status'] ?? '',
        pickupStart = j['pickupStart'] ?? '',
        pickupEnd = j['pickupEnd'] ?? '',
        total = (j['total'] as num).toDouble(),
        saved = ((j['saved'] ?? 0) as num).toDouble(),
        items = (j['items'] as List).map((e) => OrderItem.fromJson(e)).toList(),
        qrCode = j['qrCode'],
        ecoPoints = ((j['ecoPoints'] ?? 0) as num).toInt();

  // Le backend envoie le QR code sous forme "data:image/png;base64,...."
  Uint8List? get qrBytes => qrCode == null ? null : base64Decode(qrCode!.split(',').last);

  String get resume => items.map((i) => '${i.quantity}× ${i.surprise ? 'Panier surprise' : i.title}').join(', ');
}
