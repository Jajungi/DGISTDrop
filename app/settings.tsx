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

export default function SettingsScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const friendships = useFriendStore((s) => s.friendships);
  const arrivalNotify = useFriendPrefsStore((s) => s.arrivalNotify);
  const setArrivalNotify = useFriendPrefsStore((s) => s.setArrivalNotify);
  const hydrateArrival = useFriendPrefsStore((s) => s.hydrateForUser);
  const activityEvening = useNotificationPrefsStore((s) => s.activityEvening);
  const lessonTurn = useNotificationPrefsStore((s) => s.lessonTurn);
  const coachNotice = useNotificationPrefsStore((s) => s.coachNotice);
  const hydratePrefs = useNotificationPrefsStore((s) => s.hydrate);
  const setChannel = useNotificationPrefsStore((s) => s.setChannel);
  const showToast = useNotificationStore((s) => s.showToast);
  const { preference, setPreference } = useAppTheme();

  useEffect(() => {
    if (!currentUser) return;
    void hydratePrefs(currentUser.id);
    void hydrateArrival(currentUser.id);
  }, [currentUser?.id, hydratePrefs, hydrateArrival]);

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
        <Stack.Screen options={{ title: '설정', headerShown: true }} />
        <View style={styles.center}>
          <Text style={styles.empty}>로그인이 필요합니다</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '설정', headerShown: true }} />
      <PageContainer>
        <ScrollView contentContainerStyle={styles.content}>
          <PwaInstallCard
            placement="settings"
            onToast={(type, message) => showToast({ type, title: '', message })}
          />

          <PushNotificationCard
            userId={currentUser.id}
            onToast={(type, message) => showToast({ type, title: '', message })}
          />

          {currentUser.membershipTier !== 'guest' && currentUser.signupComplete !== false ? (
            <AccountLinkCard
              onToast={(type, message) => showToast({ type, title: '', message })}
            />
          ) : null}

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>화면</Text>
            <Text style={styles.hint}>라이트, 다크, 또는 기기 설정을 따릅니다.</Text>
            <View style={styles.themeChoices}>
              {(
                [
                  { id: 'light', label: '라이트' },
                  { id: 'dark', label: '다크' },
                  { id: 'system', label: '시스템' },
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
                    accessibilityLabel={`${opt.label} 모드`}
                  >
                    <Text style={[styles.themeChoiceText, on && styles.themeChoiceTextOn]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>받을 알림</Text>
            <Text style={styles.hint}>
              기기 알림이 켜져 있을 때만 푸시가 갑니다. 끈 항목은 알림함·사이렌에도 뜨지 않습니다.
            </Text>
            <PrefRow
              title="활동일 저녁"
              hint="관리자가 정한 시간에 오늘 활동 안내 (지금 스케줄 푸시)"
              value={activityEvening}
              onChange={(v) => toggleChannel('activityEvening', v)}
            />
            <PrefRow
              title="레슨 차례"
              hint="내가 다음일 때 사이렌·푸시"
              value={lessonTurn}
              onChange={(v) => toggleChannel('lessonTurn', v)}
            />
            <PrefRow
              title="코치 공지"
              hint="코칭 화면에 올라오는 공지 푸시"
              value={coachNotice}
              onChange={(v) => toggleChannel('coachNotice', v)}
              last
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>친구 도착</Text>
            <Text style={styles.hint}>
              켠 친구가 체육관에 도착하면 푸시로 알려 줍니다. 친구 목록의 스위치와 같습니다.
            </Text>
            {friends.length === 0 ? (
              <Text style={styles.empty}>아직 친구가 없어요. 친구 탭에서 추가해 주세요.</Text>
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
                      accessibilityLabel={`${u.name} 도착 알림`}
                      onValueChange={(next) => {
                        void setArrivalNotify(currentUser.id, u.id, next);
                        showToast({
                          type: 'info',
                          title: '',
                          message: next
                            ? `${u.name}님 도착 시 알려드릴게요.`
                            : `${u.name}님 도착 알림을 껐어요.`,
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
