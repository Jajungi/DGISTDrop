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
import { spacing, typography, borderRadius } from '@/src/theme';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { ACTIVE_SOCIAL_PROVIDERS, SOCIAL_PROVIDER_LABELS, type SocialProvider } from '@/src/constants/socialAuth';
import { isSocialAuthAvailable } from '@/src/services/supabase/socialAuth';
import { GoogleBrandIcon } from '@/src/components/auth/SocialBrandIcons';
import { googleAuthButtonStyles } from '@/src/components/auth/googleButtonStyles';

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

export function SocialLoginButtons({
  onPress,
  busy = false,
  busyProvider = null,
}: SocialLoginButtonsProps) {
  const { colors: theme } = useAppTheme();
  const googleStyles = googleAuthButtonStyles(theme);
  const { width: windowWidth } = useWindowDimensions();
  const wideLayout = windowWidth >= WIDE_LAYOUT_MIN_WIDTH;

  if (!isSocialAuthAvailable()) return null;

  const providers = ACTIVE_SOCIAL_PROVIDERS;

  const renderIconCircle = (size: number, logoSize: number) => (
    <View
      style={[
        styles.iconCircle,
        googleStyles.iconCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <GoogleBrandIcon size={logoSize} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textMuted }]}>간편 로그인</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
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
                  googleStyles.wide,
                  pressed && !busy && styles.iconPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    {renderIconCircle(WIDE_ICON_SIZE, WIDE_LOGO_SIZE)}
                    <Text style={[styles.wideLabel, googleStyles.label]}>{label}</Text>
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
                <View style={[styles.iconCircle, googleStyles.loadingCircle]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                renderIconCircle(ICON_SIZE, LOGO_SIZE)
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.hint, wideLayout && styles.hintWide, { color: theme.textMuted }]}>
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
  },
  dividerText: {
    ...typography.caption,
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
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  wideLabel: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  iconPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
  hintWide: {
    maxWidth: undefined,
    width: '100%',
  },
});
