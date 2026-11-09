import { useEffect, useRef } from 'react';
import type { HowItWorksVideoProps } from './HowItWorksVideo';

export const HOW_VIDEO_SRC = '/videos/nasil-calisir.mp4';
export const HOW_VIDEO_POSTER = '/videos/nasil-calisir-poster.jpg';

/**
 * "Nasıl Çalışır?" tanıtım videosunu tam ekran bir pencerede oynatır.
 * Kullanıcı tıklamasıyla açıldığı için sesli otomatik oynatma tarayıcılarca izinlidir.
 * Kapatma: X butonu, arka plana tıklama veya Esc.
 */
export function HowItWorksVideo({ open, onClose }: HowItWorksVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    videoRef.current?.play().catch(() => {
      // Otomatik oynatma engellenirse kullanıcı kontrollerden başlatır.
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kira Asistan nasıl çalışır? Tanıtım videosu"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(2, 6, 23, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: 1120 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Videoyu kapat"
          style={{
            position: 'absolute',
            top: -52,
            right: 0,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255,255,255,0.14)',
            color: '#fff',
            fontSize: 22,
            lineHeight: '40px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
        <video
          ref={videoRef}
          src={HOW_VIDEO_SRC}
          poster={HOW_VIDEO_POSTER}
          controls
          autoPlay
          playsInline
          preload="metadata"
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 18,
            background: '#000',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          }}
        />
      </div>
    </div>
  );
}
