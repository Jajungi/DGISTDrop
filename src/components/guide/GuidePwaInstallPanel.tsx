import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  getPwaInstallGuide,
  getPwaInstallVisibility,
} from '@/src/constants/pwaInstallGuide';
import { detectPwaInstallContext } from '@/src/utils/clientDevice';
import { useIsStandalonePwa } from '@/src/hooks/useIsStandalonePwa';
import { useI18n } from '@/src/i18n/useI18n';
import { PwaInstallSteps } from '@/src/components/guide/PwaInstallSteps';
import { PwaInstallWhenBox } from '@/src/components/guide/PwaInstallWhenBox';
import { spacing } from '@/src/theme';

export function GuidePwaInstallPanel() {
  const standalone = useIsStandalonePwa();
  const { locale } = useI18n();
  const context = useMemo(
    () => (standalone ? null : detectPwaInstallContext()),
    [standalone]
  );
  const guide = getPwaInstallGuide(context, locale);
  const visibility = getPwaInstallVisibility(context, locale);

  return (
    <View style={styles.wrap}>
      <PwaInstallWhenBox info={visibility} />
      {guide ? <PwaInstallSteps guide={guide} imageSize="guide" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginTop: spacing.sm },
});
