import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

export const usePushNotification = () => {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener     = useRef<Notifications.EventSubscription | undefined>(undefined);

  const registerAndSaveToken = useCallback(async () => {
    if (!Device.isDevice) {
      console.warn('Push notification cần thiết bị thật');
      return;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('User từ chối quyền thông báo');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:             'Thông báo chung',
        importance:       Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#22C55E',
        sound:            'default',
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'b7a33dab-778f-4399-9224-294ebf1cb359',
    });

    console.log('Expo Push Token:', token);

    if (user?.id) {
      await apiClient.post('/users/push-token', { token });
    }
  }, [user?.id]);

  useEffect(() => {
    registerAndSaveToken();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Nhận thông báo foreground:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data) handleNavigate(data as Record<string, any>);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [registerAndSaveToken]);

  const handleNavigate = (data: Record<string, any>) => {
    if (!data?.screen) return;
    console.log('Navigate đến:', data.screen);
    // TODO: navigationRef.current?.navigate(data.screen)
  };
};