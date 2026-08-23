import React from 'react';
import { ScrollView, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { colors, spacing, typography } from '@/src/theme';

/** 공개 개인정보처리방침. 원문: docs/PRIVACY_POLICY.md */
export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '개인정보처리방침', headerShown: true }} />
      <PageContainer>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.h1}>개인정보처리방침</Text>
          <Text style={styles.meta}>시행일: 2026-07-08 · Drop / DI GIST 배드민턴</Text>

          <Text style={styles.p}>
            DGIST 배드민턴 동아리 Drop(이하 “운영진”)은 Drop 앱 서비스 이용과 관련하여
            수집·이용하는 개인정보의 처리 기준을 다음과 같이 안내합니다. 본 서비스는 동아리
            내부 운영 도구이며 상업 광고·외부 판매를 목적으로 하지 않습니다.
          </Text>

          <Text style={styles.h2}>1. 수집 항목</Text>
          <Text style={styles.p}>
            • 회원: 학번, 이름, 비밀번호(해시), (선택) 연락 이메일{'\n'}
            • 게스트: 표시용 이름{'\n'}
            • 선택: 프로필 사진, 오늘 일정{'\n'}
            • 활동: 출석·코트 예약·경기·포인트·Elo·봉사·레슨 기록{'\n'}
            • 앱: 알림 허용 시 푸시 토큰{'\n'}
            • 위치: 현장 기능(예약·출석·봉사) 실행 시의 대략적 위치 (상시 추적 아님)
          </Text>

          <Text style={styles.h2}>2. 이용 목적</Text>
          <Text style={styles.p}>
            회원 식별 및 동아리 활동 제공, 부정 이용 방지(지오펜스·포인트 조작 방지),
            운영 알림, 동아리 통계, 서비스 보안 유지.
          </Text>

          <Text style={styles.h2}>3. 보관·파기</Text>
          <Text style={styles.p}>
            계정 삭제 시 관련 프로필·연동 데이터를 삭제하거나 비식별화합니다. 푸시 토큰은
            로그아웃·폐기 시 삭제합니다.
          </Text>

          <Text style={styles.h2}>4. 제3자·처리 위탁</Text>
          <Text style={styles.p}>
            개인정보를 판매하지 않습니다. 계정·DB는 Supabase, 앱 빌드는 Expo/EAS,
            원격 푸시는 Firebase/Expo Push를 이용할 수 있습니다.
          </Text>

          <Text style={styles.h2}>5. 이용자 권리</Text>
          <Text style={styles.p}>
            프로필 열람·정정, 앱 내 계정 삭제, 기기에서 위치·알림 권한 철회가 가능합니다.
            문의는 동아리 Drop 운영진에게 해 주세요.
          </Text>

          <Text style={styles.h2}>6. 문의</Text>
          <Text style={styles.p}>
            서비스: Drop / DI GIST 배드민턴{'\n'}
            Android 패키지: kr.ac.dgist.badmin
          </Text>

          <Pressable
            onPress={() => Linking.openURL('https://github.com/Jajungi/DGISTDrop')}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>원문·저장소 (GitHub)</Text>
          </Pressable>
        </ScrollView>
      </PageContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  h1: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  h2: { ...typography.bodyBold, color: colors.text, marginTop: spacing.md },
  meta: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  p: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  linkWrap: { marginTop: spacing.lg },
  link: { ...typography.bodyBold, color: colors.primary },
});
