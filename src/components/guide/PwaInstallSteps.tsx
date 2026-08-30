import React, { useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { PwaInstallGuide } from '@/src/constants/pwaInstallGuide';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

interface PwaInstallStepsProps {
  guide: PwaInstallGuide;
  /** 로그인: 그림 축소 + 단계만 간단히 */
  compact?: boolean;
  imageSize?: 'guide' | 'card';
}

function resolvePublicUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

function PosterImage({
  src,
  alt,
  maxHeight,
}: {
  src: string;
  alt: string;
  maxHeight: number;
}) {
  const [failed, setFailed] = useState(false);
  const uri = resolvePublicUrl(src);

  if (!uri || failed) return null;

  if (Platform.OS === 'web') {
    return (
      <img
        src={uri}
        alt={alt}
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          maxHeight,
          objectFit: 'contain',
          display: 'block',
          borderRadius: 8,
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', maxHeight }}
      accessibilityLabel={alt}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

export function PwaInstallSteps({
  guide,
  compact = false,
  imageSize = 'card',
}: PwaInstallStepsProps) {
  const { width } = useWindowDimensions();
  const stepCount = guide.steps.length;
  /** 2단계 이상이면 항상 2열(4단계 → 2×2). 좁은 화면에서도 1×N으로 떨어지지 않게 함 */
  const twoColumns = stepCount >= 2;
  const tight = compact || width < 360;

  const posterMaxHeight = compact ? 200 : imageSize === 'guide' ? 520 : 400;

  return (
    <View style={styles.wrap}>
      <Text style={styles.guideTitle}>{guide.title}</Text>
      <Text style={styles.intro}>{guide.intro}</Text>

      <View style={styles.posterWrap}>
        <PosterImage src={guide.posterSrc} alt={guide.posterAlt} maxHeight={posterMaxHeight} />
      </View>

      <Text style={styles.stepsHeading}>순서</Text>
      <View
        style={[
          styles.grid,
          twoColumns && Platform.OS === 'web'
            ? ({ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } as object)
            : null,
        ]}
      >
        {guide.steps.map((step, index) => (
          <View
            key={`${step.title}-${index}`}
            style={[
              styles.gridItem,
              tight && styles.gridItemTight,
              twoColumns
                ? Platform.OS === 'web'
                  ? styles.gridItemWebCol
                  : styles.gridItemTwoCol
                : styles.gridItemFull,
            ]}
          >
            <View style={[styles.stepBadge, tight && styles.stepBadgeTight]}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepTitle, tight && styles.stepTitleTight]}>{step.title}</Text>
            <Text style={[styles.stepBody, tight && styles.stepBodyTight]}>{step.description}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.hint}>{guide.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm } as ViewStyle,
  guideTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 } as TextStyle,
  intro: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 } as TextStyle,
  posterWrap: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    padding: spacing.xs,
    marginTop: spacing.xs,
  } as ViewStyle,
  stepsHeading: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: spacing.xs,
  } as TextStyle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    columnGap: spacing.xs,
    width: '100%',
  } as ViewStyle,
  gridItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
    minWidth: 0,
  } as ViewStyle,
  gridItemTight: {
    padding: spacing.xs,
    gap: 2,
  } as ViewStyle,
  gridItemTwoCol: {
    width: '49%',
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '49%',
  } as ViewStyle,
  gridItemWebCol: {
    width: 'auto',
  } as ViewStyle,
  gridItemFull: {
    width: '100%',
  } as ViewStyle,
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stepBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' } as TextStyle,
  stepBadgeTight: { width: 20, height: 20, borderRadius: 10 } as ViewStyle,
  stepTitle: { ...typography.bodyBold, color: colors.text, fontSize: 12 } as TextStyle,
  stepTitleTight: { fontSize: 11 } as TextStyle,
  stepBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, fontSize: 11 } as TextStyle,
  stepBodyTight: { fontSize: 10, lineHeight: 15 } as TextStyle,
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  } as TextStyle,
});
