import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Platform } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { useAuthStore } from '@/src/stores/authStore';
import { isPushOptedOut, setPushOptedOut } from '@/src/services/pushPreference';
import { getWebPushAvailability, registerWebPushForUser } from '@/src/services/webPush';
import { registerPushTokenForUser } from '@/src/services/pushNotifications';
import { getPushGuideCopy } from '@/src/utils/clientDevice';
import { useTabTourStore } from '@/src/stores/tabTourStore';

export function PushPermissionGate() {
  const userId = useAuthStore((s) => s.currentUser?.id ?? null);
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const tourOpen = useTabTourStore((s) => s.activeIndex !== null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const trySilentRegister = useCallback(async (id: string) => {
    if (Platform.OS === 'web') {
      const avail = getWebPushAvailability();
      if (!avail.supported) return false;
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        return false;
      }
      return registerWebPushForUser(id);
    }
    await registerPushTokenForUser(id);
    return true;
  }, []);

  useEffect(() => {
    if (!userId || isGuest || tourOpen) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      if (await isPushOptedOut(userId)) return;
      const silent = await trySilentRegister(userId);
      if (cancelled || silent) return;

      if (Platform.OS === 'web') {
        const guide = getPushGuideCopy();
        if (!guide.canRequestPermission) return;
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;
      }
      setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isGuest, tourOpen, trySilentRegister]);

  const allow = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await setPushOptedOut(userId, false);
      if (Platform.OS === 'web') {
        await registerWebPushForUser(userId);
      } else {
        await registerPushTokenForUser(userId);
      }
    } finally {
      setBusy(false);
      setVisible(false);
    }
  };

  const later = () => {
    setVisible(false);
  };

  const guide = getPushGuideCopy();

  if (tourOpen) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{guide.gateTitle}</Text>
          <Text style={styles.message}>{guide.gateBody}</Text>
          {guide.canRequestPermission ? (
            <>
              <Button
                title={busy ? '설정 중...' : '알림 허용'}
                onPress={() => void allow()}
                disabled={busy}
                fullWidth
              />
              <View style={styles.gap} />
              <Button title="나중에" onPress={later} variant="outline" fullWidth disabled={busy} />
            </>
          ) : (
            <>
              {guide.steps.map((step, i) => (
                <Text key={step} style={styles.step}>
                  {i + 1}. {step}
                </Text>
              ))}
              <View style={styles.gap} />
              <Button title="확인" onPress={later} variant="secondary" fullWidth />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    gap: spacing.sm,
  },
  title: { ...typography.h3, color: colors.text, fontSize: 20 },
  message: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm },
  step: { ...typography.caption, color: colors.text, lineHeight: 18 },
  gap: { height: 4 },
});
