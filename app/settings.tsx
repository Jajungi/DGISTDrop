import React, { useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { Toggle } from '@/src/components/ui/Toggle';
import { PushNotificationCard } from '@/src/components/profile/PushNotificationCard';
import { AccountLinkCard } from '@/src/components/profile/AccountLinkCard';
import { PwaInstallCard } from '@/src/components/layout/PwaInstallCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useFriendPrefsStore } from '@/src/stores/friendPrefsStore';
import { useNotificationPrefsStore } from '@/src/stores/notificationPrefsStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { useAppTheme, type ThemePreference } from '@/src/theme/ThemeProvider';
import type { UserNotificationPrefs } from '@/src/services/supabase/notificationPrefs';
import { useLocaleStore } from '@/src/stores/localeStore';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { LanguageSwitcher } from '@/src/components/layout/LanguageSwitcher';
import { useI18n } from '@/src/i18n/useI18n';
import { consumeSocialAuthFlash } from '@/src/services/supabase/socialAuthIntent';

export default function SettingsScreen() {
  const { t } = useI18n();
  const { isMobile } = useLayoutMode();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const friendships = useFriendStore((s) => s.friendships);
  const arrivalNotify = useFriendPrefsStore((s) => s.arrivalNotify);
  const setArrivalNotify = useFriendPrefsStore((s) => s.setArrivalNotify);
  const hydrateArrival = useFriendPrefsStore((s) => s.hydrateForUser);
  const activityEvening = useNotificationPrefsStore((s) => s.activityEvening);
  const lessonTurn = useNotificationPrefsStore((s) => s.lessonTurn);
  const coachNotice = useNotificationPrefsStore((s) => s.coachNotice);
  const joinAlerts = useNotificationPrefsStore((s) => s.joinAlerts);
  const friendAlerts = useNotificationPrefsStore((s) => s.friendAlerts);
  const systemAlerts = useNotificationPrefsStore((s) => s.systemAlerts);
  const hydratePrefs = useNotificationPrefsStore((s) => s.hydrate);
  const setChannel = useNotificationPrefsStore((s) => s.setChannel);
  const showToast = useNotificationStore((s) => s.showToast);
  const { preference, setPreference } = useAppTheme();

  useEffect(() => {
    if (!currentUser) return;
    void hydratePrefs(currentUser.id);
    void hydrateArrival(currentUser.id);
  }, [currentUser?.id, hydratePrefs, hydrateArrival]);

  useEffect(() => {
    void consumeSocialAuthFlash().then((message) => {
      if (!message) return;
      const ok = /완료|해제/.test(message);
      showToast({ type: ok ? 'success' : 'warning', title: '', message });
    });
  }, [showToast]);

  const showAccountLink =
    currentUser?.membershipTier !== 'guest' && currentUser?.signupComplete !== false;

  const friends = useMemo(() => {
    if (!currentUser) return [];
    const ids = new Set(friendships[currentUser.id] ?? []);
    return users.filter((u) => ids.has(u.id));
  }, [currentUser, friendships, users]);

  const watched = currentUser ? new Set(arrivalNotify[currentUser.id] ?? []) : new Set<string>();

  const toggleChannel = (key: keyof UserNotificationPrefs, value: boolean) => {
    void setChannel(key, value).then((r) =>
      showToast({ type: r.success ? 'info' : 'warning', title: '', message: r.message })
    );
  };

  if (!currentUser) {
    return (
      <>
        <Stack.Screen options={{ title: t('settings.title'), headerShown: true }} />
        <View style={styles.center}>
          <Text style={styles.empty}>{t('settings.loginRequired')}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title'), headerShown: true }} />
      <PageContainer>
        <ScrollView contentContainerStyle={styles.content}>
          {isMobile ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
              <Text style={styles.hint}>{t('settings.languageHint')}</Text>
              <LanguageSwitcher />
            </Card>
          ) : null}

          <PwaInstallCard
            placement="settings"
            onToast={(type, message) => showToast({ type, title: '', message })}
          />

          <PushNotificationCard
            userId={currentUser.id}
            onToast={(type, message) => showToast({ type, title: '', message })}
          />

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{t('settings.display')}</Text>
            <Text style={styles.hint}>{t('settings.displayHint')}</Text>
            <View style={styles.themeChoices}>
              {(
                [
                  { id: 'light', label: t('settings.themeLight') },
                  { id: 'dark', label: t('settings.themeDark') },
                  { id: 'system', label: t('settings.themeSystem') },
                ] as { id: ThemePreference; label: string }[]
              ).map((opt) => {
                const on = preference === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setPreference(opt.id)}
                    style={[styles.themeChoice, on && styles.themeChoiceOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t('settings.themeMode', { label: opt.label })}
                  >
                    <Text style={[styles.themeChoiceText, on && styles.themeChoiceTextOn]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {showAccountLink ? (
            <AccountLinkCard
              onToast={(type, message) => showToast({ type, title: '', message })}
            />
          ) : null}

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{t('settings.notificationsReceive')}</Text>
            <Text style={styles.hint}>{t('settings.notificationsReceiveHint')}</Text>
            <PrefRow
              title={t('settings.activityEvening')}
              hint={t('settings.activityEveningHint')}
              value={activityEvening}
              onChange={(v) => toggleChannel('activityEvening', v)}
            />
            <PrefRow
              title={t('settings.lessonTurn')}
              hint={t('settings.lessonTurnHint')}
              value={lessonTurn}
              onChange={(v) => toggleChannel('lessonTurn', v)}
            />
            <PrefRow
              title={t('settings.coachNotice')}
              hint={t('settings.coachNoticeHint')}
              value={coachNotice}
              onChange={(v) => toggleChannel('coachNotice', v)}
            />
            <PrefRow
              title={t('settings.joinAlerts')}
              hint={t('settings.joinAlertsHint')}
              value={joinAlerts}
              onChange={(v) => toggleChannel('joinAlerts', v)}
            />
            <PrefRow
              title={t('settings.friendAlerts')}
              hint={t('settings.friendAlertsHint')}
              value={friendAlerts}
              onChange={(v) => toggleChannel('friendAlerts', v)}
            />
            <PrefRow
              title={t('settings.systemAlerts')}
              hint={t('settings.systemAlertsHint')}
              value={systemAlerts}
              onChange={(v) => toggleChannel('systemAlerts', v)}
              last
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{t('settings.friendArrival')}</Text>
            <Text style={styles.hint}>{t('settings.friendArrivalHint')}</Text>
            {friends.length === 0 ? (
              <Text style={styles.empty}>{t('settings.noFriends')}</Text>
            ) : (
              friends.map((u, i) => {
                const on = watched.has(u.id);
                return (
                  <View
                    key={u.id}
                    style={[styles.friendRow, i === friends.length - 1 && styles.friendRowLast]}
                  >
                    <Pressable
                      style={styles.friendMain}
                      onPress={() => router.push(`/user/${u.id}`)}
                    >
                      <Avatar
                        name={u.name}
                        color={u.avatarColor}
                        imageUri={u.avatarUri}
                        size={36}
                        showOnline={u.isAtGym}
                      />
                      <Text style={styles.friendName}>{u.name}</Text>
                    </Pressable>
                    <Toggle
                      value={on}
                      accessibilityLabel={t('settings.arrivalNotifyLabel', { name: u.name })}
                      onValueChange={(next) => {
                        void setArrivalNotify(currentUser.id, u.id, next);
                        showToast({
                          type: 'info',
                          title: '',
                          message: next
                            ? t('settings.arrivalNotifyOn', { name: u.name })
                            : t('settings.arrivalNotifyOff', { name: u.name }),
                        });
                      }}
                    />
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>
      </PageContainer>
    </>
  );
}

function PrefRow({
  title,
  hint,
  value,
  onChange,
  last,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.prefRow, last && styles.prefRowLast]}>
      <View style={styles.prefText}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefHint}>{hint}</Text>
      </View>
      <Toggle
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  card: { gap: spacing.sm },
  themeChoices: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  themeChoice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  themeChoiceOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  themeChoiceText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  themeChoiceTextOn: {
    color: colors.primary,
  },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  prefRowLast: { borderBottomWidth: 0 },
  prefText: { flex: 1, gap: 2 },
  prefTitle: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
  prefHint: { ...typography.caption, color: colors.textMuted, lineHeight: 16 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  friendRowLast: { borderBottomWidth: 0 },
  friendMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  friendName: { ...typography.bodyBold, color: colors.text, flex: 1 },
});
