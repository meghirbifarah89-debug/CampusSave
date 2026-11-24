// [MARYEM] Notifications push Firebase Cloud Messaging
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'api_service.dart';

final GlobalKey<ScaffoldMessengerState> messengerKey = GlobalKey<ScaffoldMessengerState>();

class PushService {
  static bool _listening = false;

  static Future<void> init() async {
    try {
      final fcm = FirebaseMessaging.instance;
      await fcm.requestPermission();
      final token = await fcm.getToken();
      if (token != null) await ApiService.put('/auth/me/fcm-token', {'token': token});

      if (_listening) return;
      _listening = true;
      // Notification reçue quand l'application est ouverte -> SnackBar
      FirebaseMessaging.onMessage.listen((msg) {
        final n = msg.notification;
        if (n == null) return;
        messengerKey.currentState?.showSnackBar(
          SnackBar(content: Text('${n.title ?? ''}\n${n.body ?? ''}'), duration: const Duration(seconds: 4)),
        );
      });
    } catch (e) {
      debugPrint('FCM non disponible : $e');
    }
  }
}
