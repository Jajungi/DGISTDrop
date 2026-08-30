import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COURT_FLOOR_COLORS,
  COURT_STATUS_LEGEND,
  OCCUPANCY_STATUS_LEGEND,
  COURT_LIGHT_LEGEND,
} from '@/src/constants/court';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface CourtStatusInfoModalProps {
  /** 작은 원형 i 버튼 (헤더용) */
  compact?: boolean;
  occupancyMode?: boolean;
}

export function CourtStatusInfoModal({ compact, occupancyMode = false }: CourtStatusInfoModalProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={[styles.infoBtn, compact && styles.infoBtnCompact]}
        accessibilityRole="button"
        accessibilityLabel="코트 색상과 조명 설명"
        hitSlop={8}
      >
        <Ionicons
          name="information-circle-outline"
          size={compact ? 20 : 22}
          color={colors.textMuted}
        />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>코트 색상 · 조명 안내</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>코트 바닥 색</Text>
              <Text style={styles.sectionDesc}>
                {occupancyMode
                  ? '예약이 꺼진 현황 모드에서 코트 설치·이용 상태를 구분해요.'
                  : '카드 안 바닥 색으로 코트 상태를 구분해요.'}
              </Text>

              {(occupancyMode ? OCCUPANCY_STATUS_LEGEND : COURT_STATUS_LEGEND).map((item) => (
                <View key={item.status} style={styles.legendRow}>
                  <View
                    style={[styles.swatch, { backgroundColor: COURT_FLOOR_COLORS[item.status] }]}
                  />
                  <View style={styles.legendBody}>
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendDesc}>{item.description}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>{COURT_LIGHT_LEGEND.title}</Text>
              <Text style={styles.sectionDesc}>카드 바깥 그림자와 밝기 변화예요.</Text>

              {COURT_LIGHT_LEGEND.items.map((item) => (
                <View key={item.label} style={styles.lightRow}>
                  <View style={styles.lightIcon}>
                    <Ionicons name="sunny-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.legendBody}>
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendDesc}>{item.description}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.tipBox}>
                <Ionicons name="hand-left-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.tipText}>
                  코트 영역 위에서 손가락을 움직이거나 마우스를 올려보면 그림자 변화를 바로 확인할 수
                  있어요.
                </Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  infoBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  infoBtnCompact: {
    width: 28,
    height: 28,
    backgroundColor: 'transparent',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetTitle: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  scroll: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: 4 },
  sectionDesc: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  swatch: {
    width: 36,
    height: 28,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  lightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  lightIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  legendBody: { flex: 1, gap: 2 },
  legendLabel: { ...typography.caption, color: colors.text, fontWeight: '700' },
  legendDesc: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  tipBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tipText: { ...typography.small, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});
