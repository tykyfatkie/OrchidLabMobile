/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Image, 
  Alert, 
  ActivityIndicator, 
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, ChevronUp, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';

import AnimatedInput from '../../components/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '@env';
import { decodeJWT, getGreeting } from '../../utils/authUtils';
import { styles } from './styles';

const { height: SCREEN_H } = Dimensions.get('window');
const SWIPE_LIMIT = 220;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const dragY = useSharedValue(0);
  const isFormVisible = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (isFormVisible.value === 0) {
        dragY.value = Math.min(0, event.translationY);
      } else {
        dragY.value = Math.max(0, event.translationY) - SWIPE_LIMIT;
      }
    })
    .onEnd((event) => {
      if (isFormVisible.value === 0) {
        if (event.translationY < -100 || event.velocityY < -500) {
          dragY.value = withSpring(-SWIPE_LIMIT);
          isFormVisible.value = 1;
        } else {
          dragY.value = withSpring(0);
        }
      } else {
        if (event.translationY > 100 || event.velocityY > 500) {
          dragY.value = withSpring(0);
          isFormVisible.value = 0;
        } else {
          dragY.value = withSpring(-SWIPE_LIMIT);
        }
      }
    });

  // Ảnh nền 2 fade in khi vuốt lên
  const bg2AnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, -SWIPE_LIMIT], [0, 1], Extrapolation.CLAMP),
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [-60, -SWIPE_LIMIT], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          dragY.value,
          [0, -SWIPE_LIMIT],
          [SCREEN_H * 0.6, SCREEN_H * 0.28],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const headerAnim = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, -80], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(dragY.value, [0, -SWIPE_LIMIT], [0, -40], Extrapolation.CLAMP),
      },
    ],
  }));

  const canLogin = useMemo(
    () => !loading && !!email.trim() && !!password.trim(),
    [email, password, loading],
  );

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/authentication/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const rawBody = await response.text();
      const data = rawBody ? JSON.parse(rawBody) : {};
      if (response.ok) {
        const token = String(data.accessToken || data.token || '');
        const decoded = decodeJWT(token);
        await login({
          id: String(decoded?.sub || data.id),
          name: data.name || decoded?.name || '',
          email: data.email || decoded?.email || email,
          roleName: data.roleName || decoded?.role || 'Nhân viên',
        }, token || null);
        navigation.replace('TechnicianReports');
      } else {
        Alert.alert('Lỗi', data?.detail || 'Thông tin không chính xác');
      }
    } catch (error: any) {
      console.log('LOGIN FETCH ERROR:', error);
      const message = String(error?.message || error);
      if (message.includes('Network request failed')) {
        Alert.alert('Lỗi mạng', 'Không thể kết nối API. Kiểm tra API_URL trong .env và khởi động lại Metro bằng --reset-cache.');
      } else {
        Alert.alert('Lỗi', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (!loading) handleLogin();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.root}>

        {/* Background 1 — luôn hiển thị */}
        <View style={styles.bgContainer}>
          <Image
            source={require('../../assets/images/loginBackground.jpg')}
            style={styles.bgImage}
            resizeMode="cover"
          />
        </View>

        {/* Background 2 — fade in khi vuốt lên */}
        <Animated.View style={[styles.bgContainer, bg2AnimStyle]}>
          <Image
            source={require('../../assets/images/loginBackground2.jpg')}
            style={styles.bgImage}
            resizeMode="cover"
          />
        </Animated.View>

        <View style={styles.overlay} />

        <GestureDetector gesture={gesture}>
          <View style={styles.contentContainer}>

            <Animated.View style={[styles.headlineWrap, headerAnim]}>
              <Text style={styles.headlineHello}>{getGreeting()}</Text>
              <Text style={styles.headlineSub}>Orchid Lab System</Text>
            </Animated.View>

            {/* Card với BlurView bên trong */}
            <Animated.View style={[styles.glassCard, formStyle]}>
              <BlurView
                style={styles.blurFill}
                blurType="light"       // "light" | "dark" | "xlight" | "prominent" | "regular"
                blurAmount={18}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.82)"
              />
              {/* Nội dung form đặt trên blur */}
              <View style={styles.cardInner}>
                <Text style={styles.cardTitle}>Chào mừng!</Text>

                <Text style={styles.fieldLabel}>Email</Text>
                <AnimatedInput
                  placeholder="Nhập email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  leftIcon={<Mail size={18} color="#7A9182" />}
                  returnKeyType="next"
                />

                <Text style={styles.fieldLabel}>Mật khẩu</Text>
                <AnimatedInput
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  leftIcon={<Lock size={18} color="#7A9182" />}
                  rightAccessory={
                    <Pressable onPress={() => setShowPassword(prev => !prev)} style={styles.eyeButton} hitSlop={10}>
                      {showPassword ? <EyeOff size={18} color="#1F3D2F" /> : <Eye size={18} color="#1F3D2F" />}
                    </Pressable>
                  }
                  onSubmitEditing={handlePasswordSubmit}
                  returnKeyType="done"
                  blurOnSubmit
                />

                <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} disabled={loading || !canLogin}>
                  <LinearGradient
                    colors={canLogin ? ['#1F3D2F', '#2E5B44'] : ['#9FB0A5', '#B7C4BB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.ctaText}>ĐĂNG NHẬP</Text>
                        <ChevronRight color="#FFFFFF" size={18} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={[styles.swipeHint, headerAnim]}>
              <ChevronUp color="#FFF" size={20} />
              <Text style={styles.swipeText}>VUỐT LÊN ĐỂ ĐĂNG NHẬP</Text>
            </Animated.View>

          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
};

export default LoginScreen;