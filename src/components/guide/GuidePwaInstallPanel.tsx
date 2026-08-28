import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  getPwaInstallGuide,
  getPwaInstallVisibility,
} from '@/src/constants/pwaInstallGuide';
import { detectPwaInstallContext } from '@/src/utils/clientDevice';
import { useIsStandalonePwa } from '@/src/hooks/useIsStandalonePwa';
import { PwaInstallSteps } from '@/src/components/guide/PwaInstallSteps';
import { PwaInstallWhenBox } from '@/src/components/guide/PwaInstallWhenBox';
import { spacing } from '@/src/theme';

export function GuidePwaInstallPanel() {
  const standalone = useIsStandalonePwa();
  const context = useMemo(
    () => (standalone ? null : detectPwaInstallContext()),
    [standalone]
  );
  const guide = getPwaInstallGuide(context);
  const visibility = getPwaInstallVisibility(context);

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
