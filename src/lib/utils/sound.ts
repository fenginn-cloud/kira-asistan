import { Platform } from 'react-native';

/**
 * Uygulama açıkken (ön planda) bildirim sesini çalar.
 * Not: Tarayıcılar, kullanıcı sayfayla en az bir kez etkileşene kadar
 * otomatik ses çalmayı engeller. Bu yüzden ilk dokunuşta sesi "kilit açar"
 * gibi sessizce hazırlarız; sonraki bildirimlerde sorunsuz çalar.
 */

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') return null;
  if (!audio) {
    audio = new Audio('/notification.mp3');
    audio.preload = 'auto';
  }
  return audio;
}

/** İlk kullanıcı etkileşiminde çağrılır: sesi tarayıcıda kullanmaya izin verdirir. */
export function unlockNotificationSound() {
  if (unlocked) return;
  const a = getAudio();
  if (!a) return;
  const prev = a.volume;
  a.volume = 0;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = prev;
      unlocked = true;
    })
    .catch(() => {
      a.volume = prev;
    });
}

/** Bildirim sesini çalar (uygulama açıkken). */
export function playNotificationSound() {
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* yok say */
  }
}
