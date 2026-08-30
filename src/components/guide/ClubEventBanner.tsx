import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { clubEventKindLabel, getActiveClubEvents } from '@/src/utils/siteOps';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';
import { useI18n } from '@/src/i18n/useI18n';
import { localizedBody, localizedTitle } from '@/src/i18n/localizedContent';

/** 오늘 휴관·추가 활동일·배너 공지 안내 */
export function ClubEventBanner() {
  const { t, locale } = useI18n();
  const events = useClubEventStore((s) => s.events);
  const active = useMemo(() => getActiveClubEvents(events), [events]);

  if (!active.length) return null;

  return (
    <View style={styles.wrap}>
      {active.map((ev) => {
        const tone =
          ev.kind === 'closure' ? 'closure' : ev.kind === 'extra' ? 'extra' : 'special';
        const kindLabel = clubEventKindLabel(ev.kind, locale);
        const title = localizedTitle(ev, locale);
        const body = localizedBody(ev, locale);
        return (
          <View
            key={ev.id}
            style={[
              styles.banner,
              tone === 'closure' && styles.closure,
              tone === 'extra' && styles.extra,
              tone === 'special' && styles.special,
            ]}
          >
            <Ionicons
              name={
                tone === 'closure'
                  ? 'close-circle-outline'
                  : tone === 'extra'
                    ? 'calendar-outline'
                    : 'megaphone-outline'
              }
              size={18}
              color={
                tone === 'closure'
                  ? colors.error
                  : tone === 'extra'
                    ? colors.primary
                    : colors.primary
              }
            />
            <View style={styles.body}>
              <Text style={styles.title}>
                {tone === 'special'
                  ? `${t('guide.noticePrefix')} · ${title}`
                  : `${t('guide.clubEventToday', { kind: kindLabel })} · ${title}`}
              </Text>
              {!!body && <Text style={styles.sub}>{body}</Text>}
              <Text style={styles.range}>
                {ev.dateStart === ev.dateEnd ? ev.dateStart : `${ev.dateStart} ~ ${ev.dateEnd}`}
              </Text>
            </View>
          </View>
        );
      })}
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
    backgroundColor: withAlpha(colors.error, 0.14),
    borderColor: withAlpha(colors.error, 0.35),
  },
  extra: {
    backgroundColor: withAlpha(colors.primary, 0.16),
    borderColor: withAlpha(colors.primary, 0.35),
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
