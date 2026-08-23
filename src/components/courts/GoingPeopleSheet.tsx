import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/ui/Avatar';
import type { User } from '@/src/types';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';
import { colors, spacing, typography, borderRadius, glass, shadows } from '@/src/theme';

const SCROLL_AFTER = 6;
const SHEET_MS = 220;

export function GoingPeopleSheet({
  visible,
  onClose,
  people,
}: {
  visible: boolean;
  onClose: () => void;
  people: User[];
}) {
  const today = getSeoulTodayKey();
  const scroll = people.length > SCROLL_AFTER;
  const { height } = useWindowDimensions();
  const overlayOp = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(height)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      overlayOp.setValue(0);
      sheetY.setValue(Math.min(height, 520));
      Animated.parallel([
        Animated.timing(overlayOp, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: SHEET_MS, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(overlayOp, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: Math.min(height, 520), duration: SHEET_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // mounted는 닫힘 애니메이션 중에만 읽음. deps에 넣으면 열릴 때 애니메이션이 한 번 더 재생됨.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visible 전환만 처리
  }, [visible, height, overlayOp, sheetY]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOp }]} pointerEvents="none">
          {Platform.OS === 'web' ? (
            <View style={styles.blurWeb} />
          ) : (
            <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.dim} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>오늘 올 사람 {people.length}명</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {people.length === 0 ? (
            <Text style={styles.empty}>아직 참석을 고른 사람이 없어요.</Text>
          ) : (
            <ScrollView
              style={scroll ? styles.listScroll : undefined}
              contentContainerStyle={styles.listInner}
              nestedScrollEnabled
            >
              {people.map((u) => {
                const time =
                  u.scheduleDate === today && u.scheduledStart
                    ? u.scheduledEnd
                      ? `${u.scheduledStart}–${u.scheduledEnd}`
                      : u.scheduledStart
                    : null;
                return (
                  <View key={u.id} style={styles.row}>
                    <Avatar name={u.nickname || u.name} color={u.avatarColor} size={32} imageUri={u.avatarUri} />
                    <View style={styles.meta}>
                      <Text style={styles.name}>{u.nickname || u.name}</Text>
                      {time ? <Text style={styles.time}>{time}</Text> : <Text style={styles.time}>시간 없음</Text>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  blurWeb: {
    ...StyleSheet.absoluteFillObject,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as object,
      default: {},
    }),
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  sheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '50%',
    ...shadows.md,
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  empty: { ...typography.caption, color: colors.textSecondary, paddingVertical: spacing.sm, paddingBottom: spacing.md },
  listScroll: { maxHeight: 240 },
  listInner: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1 },
  name: { ...typography.body, color: colors.text },
  time: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
