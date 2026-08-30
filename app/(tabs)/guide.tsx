import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuideAccordion } from '@/src/components/guide/GuideAccordion';
import { useGuideSections } from '@/src/hooks/useGuideSections';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { useI18n } from '@/src/i18n/useI18n';
import { CLUB_NAME, GYM_LOCATION, SCHOOL_NAME } from '@/src/constants';
import { colors, spacing, typography } from '@/src/theme';

export default function GuideScreen() {
  const { isDesktop } = useLayoutMode();
  const { t } = useI18n();
  const sections = useGuideSections();

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={styles.title}>{t('guide.title')}</Text>
          <Text style={styles.subtitle}>
            {t('guide.subtitle', { school: SCHOOL_NAME, club: CLUB_NAME, gym: GYM_LOCATION.name })}
          </Text>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <GuideAccordion sections={sections} />
        </ScrollView>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 4,
  },
  headerDesktop: {
    paddingTop: spacing.lg,
  },
  title: { ...typography.h1, color: colors.text, fontSize: 28 },
  subtitle: { ...typography.caption, color: colors.textMuted },
  content: { paddingBottom: spacing.xxl },
});
