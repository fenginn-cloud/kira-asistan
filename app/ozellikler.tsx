import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { FeaturesPage } from '@/features/landing/FeaturesPage';

/** Herkese açık "Tüm Özellikler" sayfası (web). Native'de uygulamaya yönlendirir. */
export default function OzelliklerRoute() {
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return <FeaturesPage />;
}
