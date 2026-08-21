import React from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SCHOOL_NAME, CLUB_NAME } from '@/src/constants';
import { typography, colors } from '@/src/theme';

const dropLogo = require('../../../assets/images/drop-logo.png');

interface DropBrandProps {
  compact?: boolean;
  scale?: number;
  style?: StyleProp<ViewStyle>;
}

export function DropBrand({ compact, scale = 1, style }: DropBrandProps) {
  const logoSize = Math.round((compact ? 22 : 26) * scale);
  const clubSize = Math.round((compact ? 13 : 15) * scale);
  const clubLine = Math.round((compact ? 16 : 18) * scale);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View style={[styles.logoBox, { width: logoSize, height: logoSize }]}>
        <Image
          source={dropLogo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Drop 로고"
        />
      </View>
      <View style={styles.textCol}>
        <Text
          style={[styles.club, compact && styles.clubCompact, { fontSize: clubSize, lineHeight: clubLine }]}
          numberOfLines={1}
        >
          {CLUB_NAME}
        </Text>
        {!compact && <Text style={styles.school}>{SCHOOL_NAME}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  wrapCompact: {
    marginRight: 0,
    gap: 6,
    flexShrink: 1,
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    justifyContent: 'center',
    gap: 0,
  },
  club: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 15,
    lineHeight: 18,
  },
  clubCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  school: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 11,
  },
});
