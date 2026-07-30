import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { AdminDashboard } from '@/src/components/admin/AdminDashboard';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { isStaffUser } from '@/src/utils/staffAccess';
import { colors, spacing, typography } from '@/src/theme';

export default function AdminTabScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { isDesktop } = useLayoutMode();

  if (!isStaffUser(currentUser)) {
    return <Redirect href="/(tabs)" />;
  }

  const roleLabel =
    currentUser!.membershipTier === 'admin' ? '관리자' : '운영자';

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>{roleLabel}</Text>
          <Text style={styles.subtitle}>{currentUser!.name} · 운영 패널</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <AdminDashboard adminId={currentUser!.id} />
        </ScrollView>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: 4 },
  headerDesktop: { paddingTop: spacing.lg },
  title: { ...typography.h1, color: colors.text, fontSize: 28 },
  titleDesktop: { fontSize: 32 },
  subtitle: { ...typography.caption, color: colors.textMuted },
  scroll: { flexGrow: 1 },
});
