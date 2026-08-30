import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import type { AppLocale } from '@/src/i18n/types';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export interface AdminBilingualFieldsProps {
  writeLocale: AppLocale;
  onWriteLocaleChange: (locale: AppLocale) => void;
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  titlePlaceholder?: string;
  bodyPlaceholder?: string;
}

export function AdminBilingualFields({
  writeLocale,
  onWriteLocaleChange,
  title,
  body,
  onTitleChange,
  onBodyChange,
  titlePlaceholder,
  bodyPlaceholder,
}: AdminBilingualFieldsProps) {
  const titlePh = titlePlaceholder ?? (writeLocale === 'ko' ? '제목' : 'Title');
  const bodyPh = bodyPlaceholder ?? (writeLocale === 'ko' ? '내용' : 'Message');

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>작성 언어</Text>
      <View style={styles.chipRow}>
        {(
          [
            { id: 'ko' as const, label: '한국어' },
            { id: 'en' as const, label: 'English' },
          ] as const
        ).map((opt) => {
          const on = writeLocale === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onWriteLocaleChange(opt.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        발송·저장 시 다른 언어로 자동 번역해 함께 보냅니다. 회원은 앱 언어 설정에 맞는 문구를 봅니다.
      </Text>
      <TextInput
        style={styles.input}
        placeholder={titlePh}
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={onTitleChange}
      />
      <TextInput
        style={[styles.input, styles.inputMulti]}
        placeholder={bodyPh}
        placeholderTextColor={colors.textMuted}
        value={body}
        onChangeText={onBodyChange}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  hint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: colors.textLight },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
});
