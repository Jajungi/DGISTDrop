import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  const columns = useMemo(() => {
    const n = guide.steps.length;
    if (compact) return n <= 2 ? n : 2;
    if (n === 4) return 2;
    if (n === 3 && width >= 480) return 3;
    return 2;
  }, [compact, guide.steps.length, width]);

  const posterMaxHeight = compact ? 200 : imageSize === 'guide' ? 520 : 400;
  const itemWidth =
    columns === 3 ? '31.5%' : columns === 2 ? '48.5%' : '100%';

  return (
    <View style={styles.wrap}>
      <Text style={styles.guideTitle}>{guide.title}</Text>
      <Text style={styles.intro}>{guide.intro}</Text>

      <View style={styles.posterWrap}>
        <PosterImage src={guide.posterSrc} alt={guide.posterAlt} maxHeight={posterMaxHeight} />
      </View>

      <Text style={styles.stepsHeading}>순서</Text>
      <View style={[styles.grid, { gap: spacing.sm }]}>
        {guide.steps.map((step, index) => (
          <View
            key={`${step.title}-${index}`}
            style={[styles.gridItem, { width: itemWidth as `${number}%` }]}
          >
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.description}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.hint}>{guide.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  guideTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  intro: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  posterWrap: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  stepsHeading: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
    minWidth: 0,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  stepTitle: { ...typography.bodyBold, color: colors.text, fontSize: 12 },
  stepBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, fontSize: 11 },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
