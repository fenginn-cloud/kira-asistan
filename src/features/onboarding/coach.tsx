import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { palette } from '@/lib/theme/colors';

/**
 * Bağımlılıksız "coach marks" (ekran üstü rehber). Bir öğeyi <CoachTarget id>
 * ile sarmalarsın; <CoachOverlay> aktifken o öğeyi karartılmış zeminde
 * spotlight'a alır ve yanında bir baloncuk gösterir. Türkçe, tek seferlik.
 */

type Rect = { x: number; y: number; width: number; height: number };

// Modül düzeyi kayıt: id → ölçüm fonksiyonu (tek uygulama, provider gerekmez).
const targets = new Map<string, (cb: (r: Rect) => void) => void>();

export function CoachTarget({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<View>(null);
  useEffect(() => {
    targets.set(id, (cb) => {
      ref.current?.measureInWindow((x, y, width, height) => cb({ x, y, width, height }));
    });
    return () => {
      targets.delete(id);
    };
  }, [id]);
  return (
    <View ref={ref} collapsable={false} className={className}>
      {children}
    </View>
  );
}

export interface CoachStep {
  /** Sarmalanmış öğe id'si; yoksa baloncuk ortada gösterilir. */
  targetId?: string;
  title: string;
  description: string;
}

const DIM = 'rgba(0,0,0,0.62)';

export function CoachOverlay({
  steps,
  visible,
  onDone,
}: {
  steps: CoachStep[];
  visible: boolean;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (visible) setI(0);
  }, [visible]);

  // Aktif adımın hedefini ölç (yerleşim oturana kadar birkaç kez dene).
  useEffect(() => {
    if (!visible) return;
    const step = steps[i];
    if (!step?.targetId) {
      setRect(null);
      return;
    }
    const measure = targets.get(step.targetId);
    if (!measure) {
      setRect(null);
      return;
    }
    let tries = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      measure((r) => {
        if (!alive) return;
        if (r.width > 0 && r.height > 0) setRect(r);
        else if (tries++ < 12) setTimeout(tick, 60);
        else setRect(null);
      });
    };
    const t = setTimeout(tick, 40);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [i, visible, steps]);

  if (!visible || steps.length === 0) return null;

  const step = steps[i]!;
  const last = i >= steps.length - 1;
  const { width: SW, height: SH } = Dimensions.get('window');
  const P = 8;
  const hole = rect
    ? {
        x: Math.max(rect.x - P, 0),
        y: Math.max(rect.y - P, 0),
        w: Math.min(rect.width + P * 2, SW),
        h: rect.height + P * 2,
      }
    : null;

  const holeBelowHalf = hole ? hole.y > SH * 0.5 : false;
  const cardPos = !hole
    ? { top: SH * 0.36 }
    : holeBelowHalf
      ? { bottom: SH - hole.y + 12 }
      : { top: hole.y + hole.h + 12 };

  const next = () => (last ? onDone() : setI(i + 1));

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDone}>
      {/* Karartma: spotlight varsa deliğin etrafına 4 dikdörtgen, yoksa tam ekran. */}
      {hole ? (
        <>
          <View style={{ position: 'absolute', left: 0, top: 0, width: SW, height: hole.y, backgroundColor: DIM }} />
          <View style={{ position: 'absolute', left: 0, top: hole.y + hole.h, width: SW, bottom: 0, backgroundColor: DIM }} />
          <View style={{ position: 'absolute', left: 0, top: hole.y, width: hole.x, height: hole.h, backgroundColor: DIM }} />
          <View style={{ position: 'absolute', left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h, backgroundColor: DIM }} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              borderRadius: 14,
            }}
          />
        </>
      ) : (
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: DIM }} />
      )}

      {/* Baloncuk */}
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          backgroundColor: palette.white,
          borderRadius: 20,
          padding: 18,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          ...cardPos,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: palette.primary, letterSpacing: 0.4 }}>
          {i + 1} / {steps.length}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 18, fontWeight: '800', color: palette.black }}>
          {step.title}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: palette.muted }}>
          {step.description}
        </Text>

        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={onDone} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: palette.muted }}>Atla</Text>
          </Pressable>
          <Pressable
            onPress={next}
            style={{ backgroundColor: palette.primary, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
              {last ? 'Başla' : 'İleri'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
