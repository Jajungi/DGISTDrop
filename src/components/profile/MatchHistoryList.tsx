import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { useI18n } from '@/src/i18n/useI18n';
import type { MatchResult } from '@/src/types';
import { colors, spacing, typography } from '@/src/theme';

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  const timeLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
  if (locale === 'ko') {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return d.toLocaleString(timeLocale, {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getOpponents(match: MatchResult, myId: string, users: ReturnType<typeof useAuthStore.getState>['users']) {
  const inA = match.teamA.includes(myId);
  const myTeam = inA ? match.teamA : match.teamB;
  const oppTeam = inA ? match.teamB : match.teamA;
  const won = (inA && match.winner === 'A') || (!inA && match.winner === 'B');
  const myScore = inA ? match.scoreA : match.scoreB;
  const oppScore = inA ? match.scoreB : match.scoreA;
  const opponents = oppTeam
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => u!.name)
    .join(', ');
  const partners = myTeam
    .filter((id) => id !== myId)
    .map((id) => users.find((u) => u.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  return { opponents, partners, won, myScore, oppScore };
}

export function MatchHistoryList({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const users = useAuthStore((s) => s.users);
  const matches = useNotificationStore((s) => s.matchHistory);

  const mine = matches.filter((m) => m.teamA.includes(userId) || m.teamB.includes(userId));

  if (mine.length === 0) {
    return <Text style={styles.empty}>{t('common.noRecords')}</Text>;
  }

  return (
    <View style={styles.list}>
      {mine.map((match) => {
        const { opponents, partners, won, myScore, oppScore } = getOpponents(match, userId, users);
        const oppUsers = (match.teamA.includes(userId) ? match.teamB : match.teamA)
          .map((id) => users.find((u) => u.id === id))
          .filter(Boolean);

        return (
          <View key={match.id} style={styles.row}>
            <View style={styles.avatars}>
              {oppUsers.slice(0, 2).map((u) => (
                <Avatar key={u!.id} name={u!.name} color={u!.avatarColor} size={28} />
              ))}
            </View>
            <View style={styles.info}>
              <View style={styles.topLine}>
                <Text style={[styles.result, won ? styles.win : styles.loss]}>
                  {won ? t('common.win') : t('common.loss')}
                </Text>
                <Text style={styles.score}>
                  {myScore} : {oppScore}
                </Text>
              </View>
              <Text style={styles.opponents}>
                {t('common.vs', { opponents: opponents || t('common.unknownOpponent') })}
              </Text>
              {partners ? (
                <Text style={styles.partners}>{t('common.partner', { name: partners })}</Text>
              ) : null}
              <Text style={styles.meta}>
                {t('profile.matchHistoryCourtMeta', {
                  court: match.courtId,
                  datetime: formatDate(match.playedAt, locale),
                })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { ...typography.caption, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatars: { flexDirection: 'row', gap: -4, paddingTop: 2 },
  info: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  result: { ...typography.bodyBold, fontSize: 14 },
  win: { color: colors.success },
  loss: { color: colors.error },
  score: { ...typography.bodyBold, color: colors.text },
  opponents: { ...typography.body, color: colors.text, fontSize: 14 },
  partners: { ...typography.caption, color: colors.textSecondary },
  meta: { ...typography.small, color: colors.textMuted },
});
