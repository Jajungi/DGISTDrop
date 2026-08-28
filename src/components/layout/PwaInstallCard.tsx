import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { PwaInstallSteps } from '@/src/components/guide/PwaInstallSteps';
import { PwaInstallWhenBox } from '@/src/components/guide/PwaInstallWhenBox';
import {
  getPwaInstallGuide,
  getPwaInstallVisibility,
} from '@/src/constants/pwaInstallGuide';
import {
  canPromptPwaInstall,
  ensurePwaServiceWorker,
  promptPwaInstall,
  shouldShowPwaInstallGuide,
  subscribePwaInstallAvailability,
  type PwaInstallPlacement,
} from '@/src/services/pwaInstall';
import { detectPwaInstallContext } from '@/src/utils/clientDevice';
import { useIsStandalonePwa } from '@/src/hooks/useIsStandalonePwa';
import { colors, typography } from '@/src/theme';

interface PwaInstallCardProps {
  placement?: PwaInstallPlacement;
  compact?: boolean;
  onToast?: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function PwaInstallCard({
  placement = 'settings',
  compact = false,
  onToast,
}: PwaInstallCardProps) {
  const standalone = useIsStandalonePwa();
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

  const context = useMemo(
    () => (standalone ? null : detectPwaInstallContext()),
    [standalone]
  );
  const guide = getPwaInstallGuide(context);
  const visibility = getPwaInstallVisibility(context);
  const canOneTapInstall =
    context === 'android-chrome' || context === 'desktop-chrome' || context === 'desktop-edge';

  useEffect(() => {
    if (Platform.OS !== 'web' || standalone) {
      setVisible(false);
      return;
    }
    void ensurePwaServiceWorker();
    const sync = () => {
      setVisible(shouldShowPwaInstallGuide(placement));
      setCanPrompt(canPromptPwaInstall());
    };
    sync();
    const unsub = subscribePwaInstallAvailability(sync);
    return unsub;
  }, [placement, standalone]);

  if (Platform.OS !== 'web' || standalone || !visible || !guide) return null;

  const install = async () => {
    setBusy(true);
    try {
      const result = await promptPwaInstall();
      if (result === 'accepted') {
        onToast?.(
          'success',
          context?.startsWith('desktop') ? 'Drop 앱이 설치됐어요' : '홈 화면에 Drop이 추가됐어요'
        );
        setVisible(false);
      } else if (result === 'unavailable') {
        onToast?.('info', guide.hint);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      {!compact ? <Text style={styles.sectionTitle}>홈 화면에 앱처럼 설치</Text> : null}
      {!compact && placement === 'settings' ? <PwaInstallWhenBox info={visibility} /> : null}
      <PwaInstallSteps guide={guide} compact={compact} imageSize="card" />
      {canOneTapInstall && canPrompt ? (
        <Button
          title={busy ? '설치 중...' : '앱 설치'}
          onPress={() => void install()}
          variant="secondary"
          fullWidth
          disabled={busy}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  sectionTitle: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
});
