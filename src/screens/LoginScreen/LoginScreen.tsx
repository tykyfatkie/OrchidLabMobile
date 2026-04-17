/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Image, 
  Alert, 
  ActivityIndicator, 
  Dimensions, 
  StyleSheet 
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate, 
  Extrapolation 
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronUp } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';

import AnimatedInput from '../../components/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '@env';
import { decodeJWT, getGreeting } from '../../utils/authUtils';
import { styles } from './styles';

const { height: SCREEN_H } = Dimensions.get('window');
const SWIPE_LIMIT = 220; 

// const getBaseUrl = () => {
//   return String(API_URL).trim().replace(/\/+$/, '');
// };

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // 1. Fade hiệu ứng ảnh nền
  const bg1Style = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, -SWIPE_LIMIT], [1, 0], Extrapolation.CLAMP),
  }));

  const bg2Style = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, -SWIPE_LIMIT], [0, 1], Extrapolation.CLAMP),
  }));

  // 2. Chuyển động lời chào
  const greetingStyle = useAnimatedStyle(() => {
    const opacity = interpolate(dragY.value, [0, -80], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(dragY.value, [0, -SWIPE_LIMIT], [0, -40], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  // 3. Hiệu ứng Form Login
  const formStyle = useAnimatedStyle(() => {
    const opacity = interpolate(dragY.value, [-60, -SWIPE_LIMIT], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(dragY.value, [0, -SWIPE_LIMIT], [SCREEN_H * 0.6, SCREEN_H * 0.28], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.root}>
        
        <Animated.View style={[styles.bgContainer, bg1Style]}>
          <Image 
            source={require('../../assets/images/loginBackground.jpg')} 
            style={styles.bgImage} 
            resizeMode="cover" 
          />
        </Animated.View>

        <Animated.View style={[styles.bgContainer, bg2Style]}>
          <Image 
            source={require('../../assets/images/loginBackground2.jpg')} 
            style={styles.bgImage} 
            resizeMode="cover" 
          />
        </Animated.View>

        <View style={styles.overlay} />

        <GestureDetector gesture={gesture}>
          <View style={styles.contentContainer}>
            
            <Animated.View style={[styles.headlineWrap, greetingStyle]}>
              <Text style={styles.headlineHello}>{getGreeting()}</Text>
              <Text style={styles.headlineSub}>Orchid Lab System</Text>
            </Animated.View>

            <Animated.View style={[styles.glassCard, formStyle]}>
              {/* TRICK: Bọc BlurView để ép bo góc Android */}
              <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]}>
                <BlurView
                  style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
                  blurType="light" 
                  blurAmount={20}  
                  reducedTransparencyFallbackColor="black"
                />
              </View>

              <Text style={styles.cardTitle}>Chào mừng!</Text>
              <AnimatedInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
              <AnimatedInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
              
              <TouchableOpacity activeOpacity={0.8} onPress={handleLogin} disabled={loading}>
                <LinearGradient 
                  colors={['#34d978', '#1db85c']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 0 }} 
                  style={styles.ctaGradient}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>ĐĂNG NHẬP</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.swipeHint, greetingStyle]}>
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