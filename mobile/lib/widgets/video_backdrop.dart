// [MARYEM] Fond vidéo en boucle (assets/hero.mp4) : les 4 univers du site (boissons, coffee, burger, cheesecake) sur fond beige
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class VideoBackdrop extends StatefulWidget {
  const VideoBackdrop({super.key});
  @override
  State<VideoBackdrop> createState() => _VideoBackdropState();
}

class _VideoBackdropState extends State<VideoBackdrop> {
  late final VideoPlayerController _c;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _c = VideoPlayerController.asset('assets/hero.mp4', videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true));
    _c.setLooping(true);
    _c.setVolume(0);
    _c.initialize().then((_) {
      if (!mounted) return;
      setState(() => _ready = true);
      // pas d'animation si l'utilisateur a demandé à réduire les mouvements
      if (!MediaQuery.of(context).disableAnimations) {
        _c.setPlaybackSpeed(1.6); // même vitesse que le site web
        _c.play();
      }
    }).catchError((_) {});
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(fit: StackFit.expand, children: [
      Image.asset('assets/hero-poster.jpg', fit: BoxFit.cover, alignment: const Alignment(0.3, 0)),
      if (_ready)
        FittedBox(
          fit: BoxFit.cover,
          alignment: const Alignment(0.3, 0), // les plats sont à droite de l'image
          clipBehavior: Clip.hardEdge,
          child: SizedBox(width: _c.value.size.width, height: _c.value.size.height, child: VideoPlayer(_c)),
        ),
    ]);
  }
}
