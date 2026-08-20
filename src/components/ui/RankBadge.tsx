import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RANK_THRESHOLDS } from '@/src/constants';
import type { RankTier } from '@/src/types';
import { typography, borderRadius } from '@/src/theme';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';

interface RankBadgeProps {
  rank: RankTier;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  if (!eloOn) return null;
  const config = RANK_THRESHOLDS[rank];
  return (
    <View style={[styles.badge, { backgroundColor: config.color + '18' }, styles[`size_${size}`]]}>
      <Text style={[styles.text, { color: config.color }, styles[`text_${size}`]]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
  },
  size_sm: { paddingHorizontal: 5, paddingVertical: 2 },
  size_md: { paddingHorizontal: 7, paddingVertical: 3 },
  size_lg: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { ...typography.small, fontWeight: '700' },
  text_sm: { fontSize: 9 },
  text_md: { fontSize: 11 },
  text_lg: { fontSize: 13 },
});
