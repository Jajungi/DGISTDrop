import React, { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PwaInstallGuide } from '@/src/constants/pwaInstallGuide';
import { useI18n } from '@/src/i18n/useI18n';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { borderRadius, spacing, typography } from '@/src/theme';

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
  onPress,
}: {
  src: string;
  alt: string;
  maxHeight: number;
  onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const { colors: theme } = useAppTheme();
  const uri = resolvePublicUrl(src);

  if (!uri || failed) return null;

  const content =
    Platform.OS === 'web' ? (
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
          cursor: 'zoom-in',
        }}
      />
    ) : (
      <Image
        source={{ uri }}
        style={{ width: '100%', maxHeight }}
        accessibilityLabel={alt}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={alt}
      style={({ pressed }) => [pressed && styles.posterPressed]}
    >
      {content}
    </Pressable>
  );
}

export function PwaInstallSteps({
  guide,
  compact = false,
  imageSize = 'card',
}: PwaInstallStepsProps) {
  const { width, height } = useWindowDimensions();
  const { t } = useI18n();
  const { colors: theme } = useAppTheme();
  const [zoomOpen, setZoomOpen] = useState(false);
  const stepCount = guide.steps.length;
  const twoColumns = stepCount >= 2;
  const tight = compact || width < 360;

  const posterMaxHeight = compact ? 200 : imageSize === 'guide' ? 520 : 400;
  const zoomMaxHeight = Math.round(Math.min(height * 0.82, width * 0.92));
  const uri = resolvePublicUrl(guide.posterSrc);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.guideTitle, { color: theme.text }]}>{guide.title}</Text>
      <Text style={[styles.intro, { color: theme.textSecondary }]}>{guide.intro}</Text>

      <View style={[styles.posterWrap, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <PosterImage
          src={guide.posterSrc}
          alt={guide.posterAlt}
          maxHeight={posterMaxHeight}
          onPress={() => setZoomOpen(true)}
        />
        <Text style={[styles.tapHint, { color: theme.textMuted }]}>{t('pwa.tapToEnlarge')}</Text>
      </View>

      <Text style={[styles.stepsHeading, { color: theme.textMuted }]}>{t('pwa.stepsHeading')}</Text>
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
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              tight && styles.gridItemTight,
              twoColumns
                ? Platform.OS === 'web'
                  ? styles.gridItemWebCol
                  : styles.gridItemTwoCol
                : styles.gridItemFull,
            ]}
          >
            <View style={[styles.stepBadge, { backgroundColor: theme.primary }, tight && styles.stepBadgeTight]}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }, tight && styles.stepTitleTight]}>
              {step.title}
            </Text>
            <Text
              style={[styles.stepBody, { color: theme.textSecondary }, tight && styles.stepBodyTight]}
            >
              {step.description}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: theme.textMuted }]}>{guide.hint}</Text>

      <Modal visible={zoomOpen} transparent animationType="fade" onRequestClose={() => setZoomOpen(false)}>
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomOpen(false)}>
          <Pressable style={styles.zoomPanel} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={styles.zoomClose}
              onPress={() => setZoomOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('pwa.closeImage')}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </Pressable>
            {Platform.OS === 'web' ? (
              <img
                src={uri}
                alt={guide.posterAlt}
                style={{
                  width: '100%',
                  maxWidth: Math.min(width * 0.94, 720),
                  maxHeight: zoomMaxHeight,
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: 12,
                }}
              />
            ) : (
              <Image
                source={{ uri }}
                style={{ width: '100%', maxHeight: zoomMaxHeight }}
                resizeMode="contain"
                accessibilityLabel={guide.posterAlt}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm } as ViewStyle,
  guideTitle: { ...typography.bodyBold, fontSize: 14 } as TextStyle,
  intro: { ...typography.caption, lineHeight: 20 } as TextStyle,
  posterWrap: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.xs,
    marginTop: spacing.xs,
    gap: 4,
  } as ViewStyle,
  posterPressed: { opacity: 0.92 },
  tapHint: { ...typography.caption, fontSize: 10, textAlign: 'center' } as TextStyle,
  stepsHeading: { ...typography.small, fontWeight: '700', marginTop: spacing.xs } as TextStyle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    columnGap: spacing.xs,
    width: '100%',
  } as ViewStyle,
  gridItem: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
    minWidth: 0,
  } as ViewStyle,
  gridItemTight: { padding: spacing.xs, gap: 2 } as ViewStyle,
  gridItemTwoCol: { width: '49%', flexGrow: 0, flexShrink: 1, maxWidth: '49%' } as ViewStyle,
  gridItemWebCol: { width: 'auto' } as ViewStyle,
  gridItemFull: { width: '100%' } as ViewStyle,
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stepBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' } as TextStyle,
  stepBadgeTight: { width: 20, height: 20, borderRadius: 10 } as ViewStyle,
  stepTitle: { ...typography.bodyBold, fontSize: 12 } as TextStyle,
  stepTitleTight: { fontSize: 11 } as TextStyle,
  stepBody: { ...typography.caption, lineHeight: 17, fontSize: 11 } as TextStyle,
  stepBodyTight: { fontSize: 10, lineHeight: 15 } as TextStyle,
  hint: { ...typography.caption, lineHeight: 18, marginTop: spacing.xs } as TextStyle,
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  } as ViewStyle,
  zoomPanel: {
    width: '100%',
    maxWidth: 760,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  zoomClose: {
    position: 'absolute',
    top: -4,
    right: 0,
    zIndex: 2,
    padding: 8,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  } as ViewStyle,
});
