import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '@/src/theme';
import { ACTIVE_SOCIAL_PROVIDERS, SOCIAL_PROVIDER_LABELS, type SocialProvider } from '@/src/constants/socialAuth';
import { isSocialAuthAvailable } from '@/src/services/supabase/socialAuth';
import { GoogleBrandIcon } from '@/src/components/auth/SocialBrandIcons';

interface SocialLoginButtonsProps {
  onPress: (provider: SocialProvider) => void;
  busy?: boolean;
  busyProvider?: SocialProvider | null;
}

const ICON_SIZE = 56;
const LOGO_SIZE = 26;

function SocialProviderIcon() {
  return (
    <View style={[styles.iconCircle, styles.googleCircle]}>
      <GoogleBrandIcon size={LOGO_SIZE} />
    </View>
  );
}

export function SocialLoginButtons({
  onPress,
  busy = false,
  busyProvider = null,
}: SocialLoginButtonsProps) {
  if (!isSocialAuthAvailable()) return null;

  const providers = ACTIVE_SOCIAL_PROVIDERS;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>간편 로그인</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.iconRow}>
        {providers.map((provider) => {
          const loading = busy && busyProvider === provider;
          return (
            <Pressable
              key={provider}
              onPress={() => onPress(provider)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${SOCIAL_PROVIDER_LABELS[provider]}로 로그인`}
              style={({ pressed }) => [
                styles.iconPressable,
                pressed && !busy && styles.iconPressed,
              ]}
            >
              {loading ? (
                <View style={[styles.iconCircle, styles.loadingCircle]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <SocialProviderIcon />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>
        설정에서 Google을 연동한 계정만 간편 로그인할 수 있어요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    gap: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.xl,
  },
  iconPressable: {
    position: 'relative',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  iconPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  googleCircle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingCircle: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
});
