/* eslint-disable react-native/no-inline-styles */
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  await notifee.displayNotification({
    title: remoteMessage.notification?.title,
    body:  remoteMessage.notification?.body,
    android: { channelId: 'default', importance: AndroidImportance.HIGH },
  });
});

const App = () => {
  useEffect(() => {
    // 1. Xin quyền (iOS + Android 13+)
    messaging().requestPermission();

    // 2. Lấy FCM token gửi lên server
    messaging().getToken().then((token) => {
      console.log('FCM Token:', token);
      // TODO: gửi token lên API của bạn để server biết gửi cho ai
    });

    // 3. Tạo notification channel (Android)
    notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    // 4. Foreground — app đang mở
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
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