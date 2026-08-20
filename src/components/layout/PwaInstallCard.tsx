import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography } from '@/src/theme';
import {
  canPromptPwaInstall,
  ensurePwaServiceWorker,
  promptPwaInstall,
  shouldShowPwaInstallGuide,
  subscribePwaInstallAvailability,
  type PwaInstallPlacement,
} from '@/src/services/pwaInstall';
import { detectClientDevice, isStandalonePwa } from '@/src/utils/clientDevice';

interface PwaInstallCardProps {
  /** 로그인: 모바일만 추천. 설정: 모바일 + 데스크톱 안내 */
  placement?: PwaInstallPlacement;
  /** 로그인 화면처럼 더 짧게 */
  compact?: boolean;
  onToast?: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function PwaInstallCard({
  placement = 'settings',
  compact = false,
  onToast,
}: PwaInstallCardProps) {
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const device = detectClientDevice();
  const isIos = device === 'ios';
  const isAndroid = device === 'android';
  const isDesktop = device === 'desktop';

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void ensurePwaServiceWorker();
    setVisible(shouldShowPwaInstallGuide(placement));
    setCanPrompt(canPromptPwaInstall());
    return subscribePwaInstallAvailability(() => {
      setCanPrompt(canPromptPwaInstall());
      setVisible(shouldShowPwaInstallGuide(placement));
    });
  }, [placement]);

  if (Platform.OS !== 'web' || !visible || isStandalonePwa()) return null;

  const install = async () => {
    setBusy(true);
    try {
      const result = await promptPwaInstall();
      if (result === 'accepted') {
        onToast?.('success', isDesktop ? 'Drop 앱이 설치됐어요' : '홈 화면에 Drop이 추가됐어요');
        setVisible(false);
      } else if (result === 'unavailable') {
        onToast?.(
          'info',
          isIos
            ? 'Safari 하단 [공유] → [홈 화면에 추가]를 눌러 주세요.'
            : isDesktop
              ? '브라우저 메뉴(⋮) → [캐스팅, 저장, 공유] → [페이지를 앱으로 설치]를 눌러 주세요.'
              : 'Chrome 메뉴(⋮) → [앱 설치] 또는 [홈 화면에 추가]를 눌러 주세요.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  let title = '홈 화면에 앱처럼 설치';
  let body =
    'Android에서는 Chrome으로 이 사이트를 연 뒤 [앱 설치] 또는 [홈 화면에 추가]하면 됩니다.';
  let steps = [
    '1. Chrome으로 https://dgistdrop.pages.dev 열기',
    '2. 메뉴(⋮) → [앱 설치] 또는 [홈 화면에 추가]',
    '3. 생긴 Drop 아이콘으로 열고 알림 허용',
  ];
  let hint = '설치 버튼이 안 보이면 Chrome 메뉴(⋮)에서 [앱 설치] / [홈 화면에 추가]를 직접 누르세요.';

  if (isIos) {
    title = '홈 화면에 추가 (iPhone) · 추천';
    body = compact
      ? 'Safari에서 [공유 → 홈 화면에 추가]한 뒤, 생긴 Drop 아이콘으로 여세요. 알림도 그 아이콘에서만 켤 수 있어요.'
      : 'iPhone은 Safari에서 홈 화면에 추가하는 것을 추천합니다. 앱처럼 쓰고 푸시도 받을 수 있습니다. Safari 탭 안에서는 알림이 오지 않습니다.';
    steps = [
      '1. Safari로 https://dgistdrop.pages.dev 열기',
      '2. 하단 [공유] → [홈 화면에 추가]',
      '3. 생긴 Drop 아이콘으로 열고 알림 허용',
    ];
    hint = 'Safari 하단 [공유] 버튼 → [홈 화면에 추가]를 직접 누르세요. (iPhone은 앱 내 설치 버튼이 없습니다)';
  } else if (isAndroid) {
    title = '홈 화면에 앱처럼 설치 · 추천';
    body = compact
      ? 'Chrome에서 Drop을 홈 화면에 추가해 쓰세요. 알림도 바로가기로 받을 수 있어요.'
      : 'Android에서는 Chrome [앱 설치] 또는 [홈 화면에 추가]를 추천합니다. Play 스토어 앱은 나중에 다시 준비할 예정입니다.';
  } else if (isDesktop) {
    title = 'PC에서도 앱으로 설치할 수 있어요';
    body =
      '필수는 아닙니다. Chrome·Edge에서 원하면 창 앱처럼 설치해 쓸 수 있습니다.';
    steps = [
      '1. 브라우저 오른쪽 위 메뉴(⋮) 열기',
      '2. [캐스팅, 저장, 공유] 선택',
      '3. [페이지를 앱으로 설치…] 누르기',
      '또는 주소창의 설치 아이콘 / [바로가기 만들기]도 가능합니다.',
    ];
    hint =
      '메뉴에 항목이 없으면 주소창 오른쪽 설치 아이콘을 확인하거나, 같은 메뉴의 [바로가기 만들기]를 쓰세요.';
  }

  const showInstallButton = (isAndroid || isDesktop) && canPrompt;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {!compact && (
        <View style={styles.steps}>
          {steps.map((step) => (
            <Text key={step} style={styles.step}>
              {step}
            </Text>
          ))}
        </View>
      )}
      {showInstallButton ? (
        <Button
          title={busy ? '설치 중...' : '앱 설치'}
          onPress={() => void install()}
          disabled={busy}
          fullWidth
          size={compact ? 'md' : 'lg'}
        />
      ) : (
        <Text style={styles.hint}>{hint}</Text>
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
