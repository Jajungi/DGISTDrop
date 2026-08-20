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
            ? 'Safari 하단 [공유] → [홈 화면에 추가] → [추가]를 눌러 주세요.'
            : isDesktop
              ? '메뉴(⋮) → [캐스팅, 저장, 공유] → [Drop 설치하기](또는 페이지를 앱으로 설치)를 눌러 주세요.'
              : 'Chrome이면 [설치] / [바로가기 만들기], 다른 브라우저는 [현재 페이지 추가] → [웹앱]을 눌러 주세요.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  let title = '홈 화면에 앱처럼 설치';
  let body = '기기·브라우저마다 메뉴 이름이 조금 다릅니다. 아래 순서를 따라 주세요.';
  let steps: string[] = [];
  let hint = '';

  if (isIos) {
    title = '홈 화면에 추가 (iPhone · Safari) · 추천';
    body = compact
      ? '반드시 Safari로 연 뒤, 공유 → 홈 화면에 추가 → 웹앱/추가 순서로 진행하세요. 생긴 Drop 아이콘으로 열어야 알림이 됩니다.'
      : 'iPhone/iPad는 Safari에서만 홈 화면 추가가 됩니다(Chrome 앱이 아님). Safari 탭 안에서는 푸시가 오지 않으니, 추가된 Drop 아이콘으로 여세요.';
    steps = [
      '1. Safari 앱으로 https://dgistdrop.pages.dev 열기 (다른 브라우저 X)',
      '2. 화면 하단(또는 상단) [공유] 버튼(□↑) 누르기',
      '3. 목록에서 [홈 화면에 추가] 선택 (안 보이면 목록을 아래로 스크롤)',
      '4. [웹앱] / Drop 미리보기가 보이면 확인하고 [추가] 누르기',
      '5. 홈 화면에 생긴 Drop 아이콘으로 다시 연 뒤, 설정에서 [알림 켜기]',
    ];
    hint =
      '공유 시트에 [홈 화면에 추가]가 없으면 Safari인지 확인하세요. 추가 후에는 반드시 홈 화면 아이콘으로 열어야 알림이 옵니다.';
  } else if (isAndroid) {
    title = '홈 화면에 앱처럼 설치 (Android) · 추천';
    body = compact
      ? 'Chrome은 [설치]/[바로가기 만들기], 다른 브라우저는 [현재 페이지 추가] → [웹앱]으로 설치하세요.'
      : 'Play 스토어 앱 대신 웹앱을 씁니다. 쓰는 브라우저에 따라 메뉴 이름이 다릅니다.';
    steps = [
      '【Chrome】',
      '1. Chrome으로 https://dgistdrop.pages.dev 열기',
      '2. 오른쪽 위 메뉴(⋮) → [앱 설치] 또는 [홈 화면에 추가] / [바로가기 만들기]',
      '3. 확인 후 홈 화면 Drop 아이콘으로 열고 알림 허용',
      '',
      '【Chrome이 아닌 브라우저 (삼성·네이버 등)】',
      '1. 메뉴에서 [현재 페이지 추가](또는 비슷 이름) 누르기',
      '2. [웹앱] / [앱으로 설치] / [홈 화면에 추가] 중 선택',
      '3. 생긴 아이콘으로 다시 열고 알림 허용',
    ];
    hint =
      '설치·바로가기 항목이 안 보이면 주소창 옆 설치 아이콘을 확인하거나, 메뉴에서 “추가/바로가기/웹앱” 단어를 찾아 보세요.';
  } else if (isDesktop) {
    title = 'PC에서 앱으로 설치 (Chrome · Edge)';
    body =
      '필수는 아닙니다. 창 앱처럼 쓰려면 Chrome/Edge에서 아래처럼 [Drop 설치하기]를 누르면 됩니다.';
    steps = [
      '1. Chrome(또는 Edge)으로 https://dgistdrop.pages.dev 열기',
      '2. 오른쪽 위 메뉴(⋮) 열기',
      '3. [캐스팅, 저장, 공유](또는 Cast, save, and share) 선택',
      '4. [Drop 설치하기] / [페이지를 앱으로 설치…] 누르기',
      '5. 설치 확인 → 작업 표시줄·시작 메뉴에서 Drop 실행',
      '또는 주소창 오른쪽 모니터/설치 아이콘을 눌러도 됩니다.',
    ];
    hint =
      '메뉴에 [캐스팅, 저장, 공유]가 보이면 그 안을 펼치세요. [Drop 설치하기]가 그 아래에 있습니다. 없으면 주소창 설치 아이콘 또는 [바로가기 만들기]를 쓰세요.';
  }

  const showInstallButton = (isAndroid || isDesktop) && canPrompt;
  const showSteps = !compact || isDesktop;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {showSteps && (
        <View style={styles.steps}>
          {steps.map((step, i) =>
            step === '' ? (
              <View key={`gap-${i}`} style={styles.stepGap} />
            ) : (
              <Text
                key={`${i}-${step}`}
                style={[styles.step, step.startsWith('【') && styles.stepHead]}
              >
                {step}
              </Text>
            )
          )}
        </View>
      )}
      {showInstallButton ? (
        <Button
          title={busy ? '설치 중...' : isDesktop ? 'Drop 설치하기' : '앱 설치'}
          onPress={() => void install()}
          disabled={busy}
          fullWidth
          size={compact ? 'md' : 'lg'}
        />
      ) : null}
      <Text style={styles.hint}>{hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  body: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  steps: { gap: 4 },
  stepGap: { height: 6 },
  step: { ...typography.caption, color: colors.textMuted, lineHeight: 19 },
  stepHead: { color: colors.text, fontWeight: '700', marginTop: 2 },
  hint: { ...typography.caption, color: colors.primary, lineHeight: 18 },
});
