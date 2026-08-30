import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { ACTIVE_SOCIAL_PROVIDERS, SOCIAL_PROVIDER_LABELS, type SocialProvider } from '@/src/constants/socialAuth';
import { isSocialAuthAvailable } from '@/src/services/supabase/socialAuth';
import { GoogleBrandIcon } from '@/src/components/auth/SocialBrandIcons';

interface SocialLoginButtonsProps {
  onPress: (provider: SocialProvider) => void;
  busy?: boolean;
  busyProvider?: SocialProvider | null;
}

const ICON_SIZE = 56;
const WIDE_ICON_SIZE = 22;
const LOGO_SIZE = 26;
const WIDE_LOGO_SIZE = 18;

/** 좁은 세로 화면은 원형 아이콘, 넓은 화면·PC는 가로 전체 버튼 */
const WIDE_LAYOUT_MIN_WIDTH = 420;

function SocialProviderIcon({ size = ICON_SIZE, logoSize = LOGO_SIZE }: { size?: number; logoSize?: number }) {
  return (
    <View style={[styles.iconCircle, styles.googleCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <GoogleBrandIcon size={logoSize} />
    </View>
  );
}

export function SocialLoginButtons({
  onPress,
  busy = false,
  busyProvider = null,
}: SocialLoginButtonsProps) {
  const { width: windowWidth } = useWindowDimensions();
  const wideLayout = windowWidth >= WIDE_LAYOUT_MIN_WIDTH;

  if (!isSocialAuthAvailable()) return null;

  const providers = ACTIVE_SOCIAL_PROVIDERS;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>간편 로그인</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={[styles.iconRow, wideLayout && styles.iconRowWide]}>
        {providers.map((provider) => {
          const loading = busy && busyProvider === provider;
          const label = `${SOCIAL_PROVIDER_LABELS[provider]}로 로그인`;

          if (wideLayout) {
            return (
              <Pressable
                key={provider}
                onPress={() => onPress(provider)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.wideButton,
                  pressed && !busy && styles.iconPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <SocialProviderIcon size={WIDE_ICON_SIZE} logoSize={WIDE_LOGO_SIZE} />
                    <Text style={styles.wideLabel}>{label}</Text>
                  </>
                )}
              </Pressable>
            );
          }

          return (
            <Pressable
              key={provider}
              onPress={() => onPress(provider)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={label}
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

      <Text style={[styles.hint, wideLayout && styles.hintWide]}>
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
  iconRowWide: {
    alignSelf: 'stretch',
    width: '100%',
  },
  iconPressable: {
    position: 'relative',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  wideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  wideLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  iconPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
  hintWide: {
    maxWidth: undefined,
    width: '100%',
  },
});
