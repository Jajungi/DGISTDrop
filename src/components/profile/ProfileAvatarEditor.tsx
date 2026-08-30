import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/ui/Avatar';
import { showProfileImagePicker } from '@/src/services/profileImagePicker';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface ProfileAvatarEditorProps {
  name: string;
  color: string;
  imageUri?: string | null;
  size?: number;
  compact?: boolean;
  onChange: (uri: string | null) => void;
}

export function ProfileAvatarEditor({
  name,
  color,
  imageUri,
  size = 88,
  compact = false,
  onChange,
}: ProfileAvatarEditorProps) {
  const { t } = useI18n();

  const openPicker = () => {
    showProfileImagePicker(onChange, !!imageUri);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [styles.avatarBtn, pressed && styles.avatarBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('profile.avatarChange')}
      >
        <Avatar name={name} color={color} size={size} imageUri={imageUri ?? undefined} />
        <View style={[styles.badge, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]}>
          <Ionicons name="camera" size={size * 0.16} color={colors.textLight} />
        </View>
      </Pressable>
      {!compact && (
        <Pressable onPress={openPicker} style={styles.changeLink}>
          <Text style={styles.changeText}>{t('profile.avatarChange')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  avatarBtn: {
    position: 'relative',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  avatarBtnPressed: { opacity: 0.85 },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  changeLink: {
    paddingVertical: 4,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  changeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
