import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography } from '@/src/theme';
import {
  canPromptPwaInstall,
  ensurePwaServiceWorker,
  promptPwaInstall,
  shouldShowAndroidInstallGuide,
  subscribePwaInstallAvailability,
} from '@/src/services/pwaInstall';
import { isStandalonePwa } from '@/src/utils/clientDevice';

interface PwaInstallCardProps {
  /** 로그인 화면처럼 더 짧게 */
  compact?: boolean;
  onToast?: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function PwaInstallCard({ compact = false, onToast }: PwaInstallCardProps) {
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void ensurePwaServiceWorker();
    setVisible(shouldShowAndroidInstallGuide() || (!isStandalonePwa() && canPromptPwaInstall()));
    setCanPrompt(canPromptPwaInstall());
    return subscribePwaInstallAvailability(() => {
      setCanPrompt(canPromptPwaInstall());
      setVisible(shouldShowAndroidInstallGuide() || canPromptPwaInstall());
      if (isStandalonePwa()) setVisible(false);
    });
  }, []);

  if (Platform.OS !== 'web' || !visible || isStandalonePwa()) return null;

  const install = async () => {
    setBusy(true);
    try {
      const result = await promptPwaInstall();
      if (result === 'accepted') {
        onToast?.('success', '홈 화면에 Drop이 추가됐어요');
        setVisible(false);
      } else if (result === 'unavailable') {
        onToast?.(
          'info',
          'Chrome 메뉴(⋮) → [앱 설치] 또는 [홈 화면에 추가]를 눌러 주세요.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>홈 화면에 앱처럼 설치</Text>
      <Text style={styles.body}>
        {compact
          ? '지금은 Play 스토어 대신 Chrome에서 Drop을 홈 화면에 추가해 쓰세요. 알림도 여기서 켤 수 있어요.'
          : 'Android에서는 Chrome으로 이 사이트를 연 뒤 [앱 설치] 또는 [홈 화면에 추가]하면 됩니다. Play 스토어 앱은 나중에 다시 준비할 예정입니다.'}
      </Text>
      {!compact && (
        <View style={styles.steps}>
          <Text style={styles.step}>1. Chrome으로 https://dgistdrop.pages.dev 열기</Text>
          <Text style={styles.step}>2. 메뉴(⋮) → [앱 설치] 또는 [홈 화면에 추가]</Text>
          <Text style={styles.step}>3. 생긴 Drop 아이콘으로 열고 알림 허용</Text>
        </View>
      )}
      {canPrompt ? (
        <Button
          title={busy ? '설치 중...' : '앱 설치'}
          onPress={() => void install()}
          disabled={busy}
          fullWidth
          size={compact ? 'md' : 'lg'}
        />
      ) : (
        <Text style={styles.hint}>
          설치 버튼이 안 보이면 Chrome 주소창 메뉴(⋮)에서 [앱 설치] / [홈 화면에 추가]를 직접 누르세요.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  body: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  steps: { gap: 4 },
  step: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  hint: { ...typography.caption, color: colors.primary, lineHeight: 18 },
});
