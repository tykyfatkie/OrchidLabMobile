import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#DFE7DF',
  },
  bgContainer: {
    ...StyleSheet.absoluteFill,
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bgImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  contentContainer: {
    flex: 1,
  },
  headlineWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.38,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  headlineHello: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.34)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  headlineSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // --- Glass card: bỏ backgroundColor, dùng overflow hidden để blur không tràn ---
  glassCard: {
    position: 'absolute',
    alignSelf: 'center',
    width: SCREEN_W * 0.88,
    borderRadius: 30,
    overflow: 'hidden',          // bắt buộc để BlurView bị clip theo borderRadius
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#1F3D2F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },
  // BlurView trải full card
  blurFill: {
    ...StyleSheet.absoluteFill,
  },
  // Nội dung form đặt trên blur
  cardInner: {
    padding: 22,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F3D2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaGradient: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    alignItems: 'center',
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.72,
    letterSpacing: 3,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6658',
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243,247,243,0.6)',
  },
});