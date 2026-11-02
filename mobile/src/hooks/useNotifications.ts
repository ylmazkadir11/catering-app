// =============================================
// Bildirim Hook - Expo Notifications entegrasyonu
// =============================================

import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { useUpdateFCMTokenMutation } from '../services/api';
import { incrementUnread } from '../store';

// Bildirim davranış yapılandırması
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const dispatch = useDispatch();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [updateFCMToken] = useUpdateFCMTokenMutation();
  
  // Listener referansları
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Push token kayıt işlemi
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Token'ı backend'e gönder
        updateFCMToken({ fcm_token: token }).catch(console.error);
      }
    });

    // Bildirim geldiğinde
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      // Okunmamış sayısını artır
      dispatch(incrementUnread());
    });

    // Bildirime tıklandığında
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Bildirime tıklandı:', response);
    });

    // Temizlik
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [dispatch, updateFCMToken]);

  return {
    expoPushToken,
    notification,
  };
};

// Push bildirim izni ve token alma
async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Sadece fiziksel cihazlarda çalışır
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // İzin yoksa iste
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Bildirim izni reddedildi!');
      return null;
    }

    // Expo push token al
    try {
      const expoPushTokenData = await Notifications.getExpoPushTokenAsync();
      token = expoPushTokenData.data;
    } catch (error) {
      console.error('Token alınamadı:', error);
    }
  } else {
    console.log('Fiziksel cihaz gerekli - simülatörde bildirimler çalışmaz');
  }

  // Android için bildirim kanalı oluştur
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Varsayılan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  return token;
}
