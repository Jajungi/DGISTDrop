import { useEffect, useRef, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

export type TourRect = { x: number; y: number; width: number; height: number };

const nodes = new Map<string, View>();

export function registerTourAnchor(href: string, node: View | null) {
  if (!node) {
    nodes.delete(href);
    return;
  }
  nodes.set(href, node);
}

export function measureTourAnchor(href: string): Promise<TourRect | null> {
  const node = nodes.get(href);
  if (!node) return Promise.resolve(null);
  return new Promise((resolve) => {
    node.measureInWindow((x, y, width, height) => {
      if (!width || !height) {
        resolve(null);
        return;
      }
      resolve({ x, y, width, height });
    });
  });
}

export function TourAnchor({
  href,
  children,
  style,
}: {
  href: string;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ref = useRef<View>(null);

  useEffect(() => {
    registerTourAnchor(href, ref.current);
    return () => registerTourAnchor(href, null);
  }, [href]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={style}
      onLayout={() => registerTourAnchor(href, ref.current)}
    >
      {children}
    </View>
  );
}
