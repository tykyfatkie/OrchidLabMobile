/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import {
  getMessaging,
  getToken,
  onMessage,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

LogBox.ignoreLogs([
  'Encountered two children with the same key',
]);

// ── Xử lý khi app bị kill hoàn toàn ──────────────────────────────────────────
const fcmMessaging = getMessaging();

setBackgroundMessageHandler(fcmMessaging, async (remoteMessage) => {
  await notifee.displayNotification({
    title: remoteMessage.notification?.title,
    body:  remoteMessage.notification?.body,
    android: { channelId: 'default', importance: AndroidImportance.HIGH },
  });
});

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  useEffect(() => {
    // 1. Xin quyền thông báo (Android 13+ / iOS)
    fcmMessaging.requestPermission();

    // 2. Lấy FCM token — gửi lên server để server biết push cho ai
    getToken(fcmMessaging).then((token) => {
      console.log('FCM Token:', token);
      // TODO: gọi API lưu token theo userId
      // apiClient.post('/api/device-token', { token, userId: user.id });
    });

    // 3. Tạo notification channel (Android)
    notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    // 4. Foreground — nhận notification khi app đang mở
    const unsubscribeForeground = onMessage(fcmMessaging, async (remoteMessage) => {
      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body:  remoteMessage.notification?.body,
        android: { channelId: 'default', importance: AndroidImportance.HIGH },
      });
    });

    return () => unsubscribeForeground();
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;