import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

interface GuestProfileCardProps {
  name: string;
  avatarColor: string;
  onLogout: () => void;
}

export function GuestProfileCard({ name, avatarColor, onLogout }: GuestProfileCardProps) {
  const { t } = useI18n();
  const pointsOn = useFeatureFlagsStore((s) => s.pointsFeaturesEnabled);
  const features = useMemo(
    () => [
      { ok: true, label: t('profile.guestFeatureCourts') },
      { ok: true, label: t('lobby.guestFeatureJoin') },
      { ok: true, label: t('profile.guestFeatureGuide') },
      {
        ok: false,
        label: pointsOn ? t('profile.guestFeatureStatsWithPoints') : t('profile.guestFeatureStats'),
      },
      {
        ok: false,
        label: pointsOn
          ? t('profile.guestFeatureSocialWithVolunteer')
          : t('profile.guestFeatureSocial'),
      },
    ],
    [t, pointsOn]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Avatar name={name} color={avatarColor} size={64} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('profile.guestBadge')}</Text>
          </View>
          <Text style={styles.hint}>{t('profile.guestExpiry')}</Text>
        </View>
      </View>

      <Card style={styles.card} padding="md">
        <Text style={styles.sectionTitle}>{t('profile.guestFeaturesTitle')}</Text>
        {features.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={[styles.featureIcon, f.ok ? styles.ok : styles.no]}>{f.ok ? '✓' : '—'}</Text>
            <Text style={[styles.featureLabel, !f.ok && styles.featureMuted]}>{f.label}</Text>
          </View>
        ))}
      </Card>

      <Button
        title={t('profile.guestSignUpCta')}
        onPress={() => {
          onLogout();
          router.replace('/login');
        }}
        fullWidth
        variant="secondary"
        style={styles.cta}
      />
      <Button title={t('common.logout')} onPress={onLogout} fullWidth variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  name: { ...typography.h3, color: colors.text, fontSize: 18 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeText: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 6, lineHeight: 18 },
  card: { marginBottom: 0 },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm, fontSize: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  featureIcon: { width: 18, fontWeight: '800', fontSize: 13 },
  ok: { color: colors.primary },
  no: { color: colors.textMuted },
  featureLabel: { ...typography.body, color: colors.text, fontSize: 13, flex: 1 },
  featureMuted: { color: colors.textMuted },
  cta: { marginTop: spacing.xs },
});
