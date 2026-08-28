import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const { tabBarHeight, isDesktop } = useLayoutMode();

  if (toasts.length === 0) return null;

  const toast = toasts[toasts.length - 1];
  const bottomOffset = isDesktop ? 24 : tabBarHeight + 12;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <Pressable style={styles.toast} onPress={() => dismissToast(toast.id)}>
        <Text style={styles.message} numberOfLines={3}>
          {toast.message || toast.title}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
    ...Platform.select({ web: { pointerEvents: 'box-none' as const } }),
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
});
