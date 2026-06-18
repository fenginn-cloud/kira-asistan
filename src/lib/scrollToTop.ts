import { useEffect, useRef } from 'react';
import type { FlatList, ScrollView } from 'react-native';

/**
 * Registry that lets the tab bar trigger a "scroll to top" on the currently
 * focused screen when its tab is pressed again.
 */
const handlers = new Map<string, () => void>();

export function triggerScrollTop(route: string): void {
  handlers.get(route)?.();
}

/**
 * Returns a ref to attach to a ScrollView/FlatList. When the active tab is
 * re-tapped, the list animates back to the top.
 */
export function useScrollToTop<T extends ScrollView | FlatList>(route: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const scroll = () => {
      const node = ref.current as unknown as
        | { scrollToOffset?: (o: { offset: number; animated: boolean }) => void;
            scrollTo?: (o: { y: number; animated: boolean }) => void }
        | null;
      if (!node) return;
      if (typeof node.scrollToOffset === 'function') {
        node.scrollToOffset({ offset: 0, animated: true });
      } else if (typeof node.scrollTo === 'function') {
        node.scrollTo({ y: 0, animated: true });
      }
    };
    handlers.set(route, scroll);
    return () => {
      if (handlers.get(route) === scroll) handlers.delete(route);
    };
  }, [route]);

  return ref;
}
