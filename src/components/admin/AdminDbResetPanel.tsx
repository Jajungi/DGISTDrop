import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import {
  DB_RESET_OPTIONS,
  executeDbResets,
  generateResetConfirmCode,
  type DbResetDanger,
  type DbResetScope,
} from '@/src/services/dbReset';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ResetStep = 'idle' | 'confirm' | 'code';

interface AdminDbResetPanelProps {
  adminId: string;
}

const DANGER_LABEL: Record<DbResetDanger, string> = {
  critical: '치명적',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const DANGER_COLOR: Record<DbResetDanger, string> = {
  critical: colors.error,
  high: '#D64545',
  medium: colors.warning,
  low: colors.textMuted,
};

export function AdminDbResetPanel({ adminId }: AdminDbResetPanelProps) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const showToast = useNotificationStore((s) => s.showToast);

  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<Set<DbResetScope>>(new Set());
  const [step, setStep] = useState<ResetStep>('idle');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [running, setRunning] = useState(false);

  const selectedOptions = useMemo(
    () => DB_RESET_OPTIONS.filter((o) => selected.has(o.scope)),
    [selected]
  );
  const hasFull = selected.has('full');

  const toggleList = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setListOpen((v) => !v);
  };

  const toggleScope = (scope: DbResetScope) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const startReset = () => {
    if (selected.size === 0) return;
    setStep('confirm');
    setConfirmCode('');
    setCodeInput('');
  };

  const closeFlow = () => {
    setStep('idle');
    setConfirmCode('');
    setCodeInput('');
  };

  const proceedToCode = () => {
    setConfirmCode(generateResetConfirmCode());
    setCodeInput('');
    setStep('code');
  };

  const handleExecute = async () => {
    if (selectedOptions.length === 0 || codeInput !== confirmCode) return;

    setRunning(true);
    try {
      const scopes = selectedOptions.map((o) => o.scope);
      const result = await executeDbResets(scopes);
      if (!result.success) {
        showToast({ type: 'warning', title: '초기화 실패', message: result.message });
        return;
      }

      recordAdminLogAsActor(adminId, {
        category: 'system',
        action: 'db_reset',
        message: `DB 초기화: ${selectedOptions.map((o) => o.title).join(', ')}`,
        meta: {
          scopes: scopes.join(','),
          deletedUsers: result.deletedUsers,
        },
      });

      closeFlow();
      setSelected(new Set());

      if (result.requiresLogout) {
        showToast({
          type: 'info',
          title: '완전 초기화 완료',
          message: '세션이 종료되어 로그아웃됩니다. 다시 로그인해 주세요.',
        });
        await logout();
        router.replace('/login');
        return;
      }

      const extra = result.deletedUsers > 0 ? ` (${result.deletedUsers}개 계정 삭제)` : '';
      showToast({
        type: 'success',
        title: hasFull ? '완전 초기화 완료' : '초기화 완료',
        message: hasFull
          ? `관리자 계정은 유지됐어요.${extra}`
          : `${selectedOptions.length}개 작업 완료${extra}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      showToast({ type: 'warning', title: '초기화 실패', message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <Ionicons name="warning" size={18} color={colors.error} />
          <Text style={styles.warningTitle}>데이터베이스 초기화</Text>
        </View>
        <Text style={styles.warningText}>
          초기화할 항목을 선택한 뒤 실행하세요. 되돌릴 수 없으며, 실행 전 10자리 확인
          코드를 정확히 입력해야 합니다.
        </Text>
        {!isSupabaseEnabled() && (
          <Text style={styles.localHint}>현재 로컬 모드 — 로컬 데이터만 변경됩니다.</Text>
        )}
      </Card>

      <Card style={styles.dropdownCard}>
        <Pressable onPress={toggleList} style={styles.dropdownHeader}>
          <View style={styles.dropdownHeaderLeft}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={styles.dropdownTitle}>초기화 항목 선택</Text>
          </View>
          <View style={styles.dropdownHeaderRight}>
            {selected.size > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{selected.size}</Text>
              </View>
            )}
            <Ionicons
              name={listOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        {listOpen && (
          <View style={styles.optionList}>
            {DB_RESET_OPTIONS.map((option) => {
              const checked = selected.has(option.scope);
              return (
                <Pressable
                  key={option.scope}
                  onPress={() => toggleScope(option.scope)}
                  style={[styles.optionRow, checked && styles.optionRowChecked]}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Ionicons name="checkmark" size={13} color={colors.textLight} />}
                  </View>
                  <View style={styles.optionBody}>
                    <View style={styles.optionTitleRow}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <View
                        style={[
                          styles.dangerBadge,
                          { backgroundColor: `${DANGER_COLOR[option.danger]}18` },
                        ]}
                      >
                        <Text style={[styles.dangerBadgeText, { color: DANGER_COLOR[option.danger] }]}>
                          {DANGER_LABEL[option.danger]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>{option.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      {selected.size > 0 && (
        <View style={styles.selectedSummary}>
          <Text style={styles.selectedSummaryText}>
            선택됨: {selectedOptions.map((o) => o.title).join(' · ')}
          </Text>
        </View>
      )}

      <Button
        title={selected.size > 0 ? `선택한 ${selected.size}개 항목 초기화` : '항목을 선택하세요'}
        onPress={startReset}
        variant={hasFull ? 'danger' : 'secondary'}
        disabled={selected.size === 0}
        fullWidth
      />

      <Modal visible={step !== 'idle'} transparent animationType="fade" onRequestClose={closeFlow}>
        <Pressable style={styles.modalBackdrop} onPress={closeFlow}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {step === 'confirm' && (
              <>
                <Text style={styles.modalTitle}>정말 초기화하시겠습니까?</Text>
                <Text style={styles.modalBody}>다음 {selectedOptions.length}개 작업이 실행됩니다.</Text>
                <View style={styles.confirmList}>
                  {selectedOptions.map((o) => (
                    <View key={o.scope} style={styles.confirmItem}>
                      <Text style={styles.confirmItemDot}>·</Text>
                      <Text style={styles.confirmItemText}>{o.title}</Text>
                    </View>
                  ))}
                </View>
                {hasFull && (
                  <Text style={styles.fullWarn}>
                    ⚠️ 완전 초기화가 포함되어 관리자 외 모든 계정이 삭제됩니다. 관리자(owner) 계정은
                    유지됩니다.
                  </Text>
                )}
                <View style={styles.modalActions}>
                  <Button title="취소" onPress={closeFlow} variant="secondary" size="sm" />
                  <Button title="계속" onPress={proceedToCode} variant="danger" size="sm" />
                </View>
              </>
            )}

            {step === 'code' && (
              <>
                <Text style={styles.modalTitle}>확인 코드 입력</Text>
                <Text style={styles.modalBody}>
                  아래 10자리 숫자를 그대로 입력하면 선택한 {selectedOptions.length}개 작업이
                  실행됩니다.
                </Text>
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeDisplayText}>{confirmCode}</Text>
                </View>
                <TextInput
                  style={styles.codeInput}
                  value={codeInput}
                  onChangeText={(v) => setCodeInput(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10자리 숫자 입력"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <Button title="취소" onPress={closeFlow} variant="secondary" size="sm" />
                  <Button
                    title={running ? '실행 중…' : '초기화 실행'}
                    onPress={() => void handleExecute()}
                    variant="danger"
                    size="sm"
                    disabled={running || codeInput !== confirmCode}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  warningCard: { gap: spacing.xs, borderColor: withAlpha(colors.error, 0.25), backgroundColor: withAlpha(colors.error, 0.12) },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warningTitle: { ...typography.bodyBold, color: colors.error },
  warningText: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  localHint: { ...typography.caption, color: colors.warning },
  dropdownCard: { padding: 0, overflow: 'hidden' },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  dropdownHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropdownHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropdownTitle: { ...typography.bodyBold, color: colors.text },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: { ...typography.small, color: colors.textLight, fontWeight: '700' },
  optionList: { borderTopWidth: 1, borderTopColor: colors.border },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  optionRowChecked: { backgroundColor: colors.primaryLight },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionBody: { flex: 1, gap: 2 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  optionTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  dangerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm },
  dangerBadgeText: { ...typography.small, fontWeight: '600', fontSize: 10 },
  optionDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  selectedSummary: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectedSummaryText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.18)' } : {}),
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  confirmList: { gap: 4 },
  confirmItem: { flexDirection: 'row', gap: 6 },
  confirmItemDot: { ...typography.caption, color: colors.textMuted },
  confirmItemText: { ...typography.caption, color: colors.text, flex: 1 },
  fullWarn: { ...typography.caption, color: colors.error, lineHeight: 18 },
  codeDisplay: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  codeDisplayText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    color: colors.text,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
