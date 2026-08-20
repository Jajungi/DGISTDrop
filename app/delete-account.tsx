import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { colors, spacing, typography } from '@/src/theme';

export default function DeleteAccountScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '계정 삭제 안내', headerShown: true }} />
      <PageContainer>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.h1}>Drop 계정 삭제 안내</Text>
          <Text style={styles.meta}>서비스명: Drop / DI GIST 배드민턴</Text>

          <Text style={styles.p}>
            이 페이지는 Google Play 스토어의 계정 삭제 요구사항에 따라, 사용자가 Drop 계정 및
            관련 데이터 삭제를 요청하거나 직접 수행하는 방법을 안내하기 위한 공개 페이지입니다.
          </Text>

          <Text style={styles.h2}>1. 계정 삭제 방법</Text>
          <Text style={styles.p}>
            1) Drop 앱에 로그인합니다.{'\n'}
            2) 프로필 또는 설정 화면으로 이동합니다.{'\n'}
            3) 계정 삭제 메뉴를 선택합니다.{'\n'}
            4) 안내 문구를 확인한 뒤 삭제를 확정합니다.
          </Text>

          <Text style={styles.h2}>2. 삭제되는 데이터</Text>
          <Text style={styles.p}>
            계정 삭제 요청 시 다음 데이터가 삭제되거나 더 이상 개인을 직접 식별할 수 없도록
            처리될 수 있습니다.{'\n'}
            • 계정 식별 정보(학번, 이름, 로그인 연동 정보){'\n'}
            • 프로필 정보(프로필 사진, 소개, 일정 등){'\n'}
            • 푸시 토큰 및 개인 알림 설정{'\n'}
            • 서비스 운영상 계정에 연결된 개인 데이터
          </Text>

          <Text style={styles.h2}>3. 보관될 수 있는 데이터</Text>
          <Text style={styles.p}>
            다음 정보는 법적 의무, 보안, 백업 또는 서비스 운영 기록의 정합성 유지를 위해 일정 기간
            보관되거나 비식별화된 형태로 남을 수 있습니다.{'\n'}
            • 출석, 예약, 경기, 포인트, 봉사, 레슨 관련 운영 기록{'\n'}
            • 서버 보안 로그 및 백업 데이터{'\n\n'}
            백업 및 로그에 남은 데이터는 합리적인 기간 내 순환 또는 파기됩니다.
          </Text>

          <Text style={styles.h2}>4. 일부 데이터만 삭제 요청하는 방법</Text>
          <Text style={styles.p}>
            사용자는 계정을 완전히 삭제하지 않고도 프로필 정보 수정, 사진 삭제, 알림 권한 철회,
            기기 푸시 해제 등을 할 수 있습니다. 추가 삭제 요청이 필요하면 동아리 Drop 운영진에게
            문의해 주세요.
          </Text>

          <Text style={styles.h2}>5. 문의</Text>
          <Text style={styles.p}>
            서비스명: Drop / DI GIST 배드민턴{'\n'}
            Android 패키지: kr.ac.dgist.badmin{'\n'}
            문의: 동아리 Drop 운영진
          </Text>

          <Pressable
            onPress={() => Linking.openURL('https://dgistdrop.pages.dev/privacy')}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>개인정보처리방침 보기</Text>
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
