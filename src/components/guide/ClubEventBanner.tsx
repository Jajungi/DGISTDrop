import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { clubEventKindLabel, getActiveClubEvents } from '@/src/utils/siteOps';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

/** 오늘 휴관·특강 안내 배너 */
export function ClubEventBanner() {
  const events = useClubEventStore((s) => s.events);
  const active = useMemo(() => getActiveClubEvents(events), [events]);

  if (!active.length) return null;

  return (
    <View style={styles.wrap}>
      {active.map((ev) => (
        <View
          key={ev.id}
          style={[styles.banner, ev.kind === 'closure' ? styles.closure : styles.special]}
        >
          <Ionicons
            name={ev.kind === 'closure' ? 'close-circle-outline' : 'school-outline'}
            size={18}
            color={ev.kind === 'closure' ? colors.error : colors.primary}
          />
          <View style={styles.body}>
            <Text style={styles.title}>
              오늘 {clubEventKindLabel(ev.kind)} · {ev.title}
            </Text>
            {!!ev.body && <Text style={styles.sub}>{ev.body}</Text>}
            <Text style={styles.range}>
              {ev.dateStart === ev.dateEnd ? ev.dateStart : `${ev.dateStart} ~ ${ev.dateEnd}`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  closure: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  special: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.border,
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.caption, fontWeight: '700', color: colors.text },
  sub: { ...typography.small, color: colors.textSecondary, lineHeight: 16 },
  range: { ...typography.small, color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
