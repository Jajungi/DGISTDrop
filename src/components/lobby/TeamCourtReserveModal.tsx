import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import type { Court } from '@/src/types';
import { COURT_FLOOR_COLORS } from '@/src/constants/court';
import { GameCountPicker } from '@/src/components/courts/GameCountPicker';
import { Button } from '@/src/components/ui/Button';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

interface TeamCourtReserveModalProps {
  visible: boolean;
  courts: Court[];
  onClose: () => void;
  onReserve: (courtId: number, gameCount: number) => void;
}

export function TeamCourtReserveModal({
  visible,
  courts,
  onClose,
  onReserve,
}: TeamCourtReserveModalProps) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [gameCount, setGameCount] = useState(3);

  const emptyCourts = courts.filter((c) => c.status === 'empty');

  const handleReserve = () => {
    if (!selectedId) return;
    onReserve(selectedId, gameCount);
    setSelectedId(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('lobby.pickCourt')}</Text>
          <Text style={styles.subtitle}>{t('lobby.pickCourtHint')}</Text>

          <ScrollView style={styles.list}>
            {emptyCourts.length === 0 && (
              <Text style={styles.empty}>{t('lobby.noEmptyCourts')}</Text>
            )}
            {emptyCourts.map((court) => {
              const selected = selectedId === court.id;
              return (
                <Pressable
                  key={court.id}
                  style={[styles.courtRow, selected && styles.courtRowSelected]}
                  onPress={() => setSelectedId(court.id)}
                >
                  <View style={[styles.swatch, { backgroundColor: COURT_FLOOR_COLORS.empty }]} />
                  <Text style={styles.courtName}>{t('common.courtNumber', { court: court.id })}</Text>
                  {court.isCoachCourt && <Text style={styles.tag}>{t('lobby.coachTag')}</Text>}
                  {court.isCenter && !court.isCoachCourt && <Text style={styles.tag}>{t('lobby.popularTag')}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <GameCountPicker value={gameCount} onChange={setGameCount} />
          <Button
            title={
              selectedId
                ? t('lobby.reserveGames', { court: selectedId, count: gameCount })
                : t('lobby.pickCourtFirst')
            }
            onPress={handleReserve}
            fullWidth
            size="lg"
            disabled={!selectedId}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  list: { maxHeight: 200, marginBottom: spacing.sm },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  courtRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  swatch: { width: 28, height: 14, borderRadius: 2 },
  courtName: { ...typography.bodyBold, color: colors.text, flex: 1 },
  tag: { ...typography.small, color: colors.primary, fontWeight: '600' },
});
