import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { registerPushTokenForUser, unregisterPushToken } from '@/src/services/pushNotifications';
import { getWebPushAvailability, registerWebPushForUser, unregisterWebPush } from '@/src/services/webPush';
import { isPushOptedOut, setPushOptedOut } from '@/src/services/pushPreference';
import { getPushGuideCopy } from '@/src/utils/clientDevice';

interface PushNotificationCardProps {
  userId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function PushNotificationCard({ userId, onToast }: PushNotificationCardProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(() => getPushGuideCopy().needsHomeScreen);
  const [busy, setBusy] = useState(false);
  const isWeb = Platform.OS === 'web';
  const guide = getPushGuideCopy();

  const checkStatus = useCallback(async () => {
    if (await isPushOptedOut(userId)) {
      setEnabled(false);
      return;
    }
    if (isWeb) {
      const avail = getWebPushAvailability();
      if (!avail.supported) {
        setEnabled(false);
        return;
      }
      setEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted');
      return;
    }
    try {
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      setEnabled(status === 'granted');
    } catch {
      setEnabled(false);
    }
  }, [isWeb, userId]);

  useEffect(() => { void checkStatus(); }, [checkStatus]);

  const enablePush = async () => {
    setBusy(true);
    try {
      await setPushOptedOut(userId, false);
      if (isWeb) {
        const ok = await registerWebPushForUser(userId);
        if (ok) {
          onToast('success', '기기 알림이 켜졌어요');
          setEnabled(true);
        } else {
          const avail = getWebPushAvailability();
          onToast('warning', avail.reason ?? '알림 등록에 실패했어요');
        }
        return;
      }
      await registerPushTokenForUser(userId);
      await checkStatus();
      onToast('success', '기기 알림이 켜졌어요');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    try {
      await setPushOptedOut(userId, true);
      if (isWeb) await unregisterWebPush();
      else await unregisterPushToken();
      setEnabled(false);
      onToast('info', '기기 알림을 껐어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        <Text style={styles.title}>기기 알림</Text>
        {enabled === true && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ON</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>{guide.summary}</Text>

      {guide.canRequestPermission ? (
        enabled === true ? (
          <Button
            title="알림 끄기"
            onPress={() => void disablePush()}
            variant="outline"
            fullWidth
            disabled={busy}
          />
        ) : (
          <Button
            title="알림 켜기"
            onPress={() => void enablePush()}
            variant="secondary"
            fullWidth
            disabled={busy}
          />
        )
      ) : null}

      <Pressable
        style={styles.guideToggle}
        onPress={() => setShowGuide(!showGuide)}
      >
        <Text style={styles.guideToggleText}>{guide.howToTitle}</Text>
        <Ionicons name={showGuide ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      </Pressable>

      {showGuide && (
        <View style={styles.guideBox}>
          {guide.steps.map((text, i) => (
            <GuideStep key={text} n={i + 1} text={text} />
          ))}
        </View>
      )}
    </Card>
  );
}

function GuideStep({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.guideStep}>
      <View style={styles.guideNum}>
        <Text style={styles.guideNumText}>{n}</Text>
      </View>
      <Text style={styles.guideText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: spacing.sm, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  badge: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  guideToggleText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  guideBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  guideStep: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  guideNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideNumText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  guideText: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 18 },
});
