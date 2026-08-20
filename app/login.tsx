import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { DropBrand } from '@/src/components/layout/DropBrand';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import {
  loadSavedLogin,
  saveSavedLogin,
  type SavedLoginAccount,
} from '@/src/services/quickLogin';
import { SCHOOL_NAME, CLUB_NAME } from '@/src/constants';
import { validateStudentId } from '@/src/utils/studentId';
import { isSupabaseEnvConfigured, getSupabaseSetupHint } from '@/src/lib/supabaseEnv';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { SiteOverlayHost } from '@/src/components/site/SiteOverlayHost';
import { markPostLoginOverlay } from '@/src/components/site/SiteOverlayHost';
import { PwaInstallCard } from '@/src/components/layout/PwaInstallCard';

type Mode = 'login' | 'register' | 'guest';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const register = useAuthStore((s) => s.register);
  const showToast = useNotificationStore((s) => s.showToast);

  const [mode, setMode] = useState<Mode>('login');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedAccount, setSavedAccount] = useState<SavedLoginAccount | null>(null);
  const [showSavedPrompt, setShowSavedPrompt] = useState(false);

  const refreshSavedLogin = useCallback(async () => {
    const account = await loadSavedLogin();
    setSavedAccount(account);
    setShowSavedPrompt(account != null);
  }, []);

  useEffect(() => {
    void refreshSavedLogin();
  }, [refreshSavedLogin]);

  const completeLogin = async (id: string, pw: string, displayName?: string) => {
    const result = await login(id, pw);
    if (result.success) {
      const user = useAuthStore.getState().currentUser;
      await saveSavedLogin({
        studentId: id.trim(),
        name: displayName ?? user?.name ?? id,
      });
      markPostLoginOverlay();
      router.replace('/(tabs)');
    } else {
      showToast({ type: 'warning', title: '', message: result.message });
    }
  };

  const handleLogin = () => {
    const idCheck = validateStudentId(studentId);
    if (!idCheck.ok) {
      showToast({ type: 'warning', title: '', message: idCheck.message });
      return;
    }
    void completeLogin(idCheck.normalized, password);
  };

  const handleSavedLogin = () => {
    if (!savedAccount) return;
    setStudentId(savedAccount.studentId);
    setPassword('');
    setShowSavedPrompt(false);
    if (!password.trim()) {
      showToast({ type: 'info', title: '', message: '비밀번호를 입력한 뒤 로그인해 주세요.' });
    }
  };

  const handleUseOtherAccount = () => {
    setShowSavedPrompt(false);
    if (savedAccount) {
      setStudentId(savedAccount.studentId);
    }
    setPassword('');
  };

  const handleRegister = () => {
    const idCheck = validateStudentId(studentId);
    if (!idCheck.ok) {
      showToast({ type: 'warning', title: '', message: idCheck.message });
      return;
    }
    if (password !== passwordConfirm) {
      showToast({ type: 'warning', title: '', message: '비밀번호 확인이 일치하지 않아요.' });
      return;
    }
    void (async () => {
      const result = await register({
        studentId: idCheck.normalized,
        name,
        email,
        password,
      });
      showToast({
        type: result.success ? 'success' : 'warning',
        title: '',
        message: result.message,
      });
      if (result.success) {
        setMode('login');
        setStudentId(idCheck.normalized);
        setPassword('');
        setPasswordConfirm('');
        setShowSavedPrompt(false);
      }
    })();
  };

  const handleGuestLogin = () => {
    void (async () => {
      const result = await loginAsGuest(guestName);
      if (result.success) {
        markPostLoginOverlay();
        router.replace('/(tabs)');
      } else {
        showToast({ type: 'warning', title: '', message: result.message });
      }
    })();
  };

  const supabaseReady = isSupabaseEnvConfigured();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!supabaseReady && (
            <View style={styles.setupBanner}>
              <Text style={styles.setupBannerTitle}>Supabase 연결 필요</Text>
              <Text style={styles.setupBannerText}>{getSupabaseSetupHint()}</Text>
            </View>
          )}
          <View style={styles.brandWrap}>
            <DropBrand />
            <Text style={styles.subtitle}>
              {SCHOOL_NAME} {CLUB_NAME} · S1 체육관
            </Text>
          </View>

          <PwaInstallCard
            placement="login"
            compact
            onToast={(type, message) => showToast({ type, title: '', message })}
          />

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode('login')}
              style={[styles.tab, mode === 'login' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('register');
                setShowSavedPrompt(false);
              }}
              style={[styles.tab, mode === 'register' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>회원가입</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('guest');
                setShowSavedPrompt(false);
              }}
              style={[styles.tab, mode === 'guest' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'guest' && styles.tabTextActive]}>게스트</Text>
            </Pressable>
          </View>

          {mode === 'login' && showSavedPrompt && savedAccount && (
            <View style={styles.savedCard}>
              <View style={styles.savedHeader}>
                <Avatar name={savedAccount.name} color={colors.primary} size={48} />
                <View style={styles.savedMeta}>
                  <Text style={styles.savedName}>{savedAccount.name}</Text>
                  <Text style={styles.savedId}>{savedAccount.studentId}</Text>
                </View>
              </View>
              <Text style={styles.savedQuestion}>기존 계정으로 로그인하시겠습니까?</Text>
              <View style={styles.savedActions}>
                <Button title="선택" onPress={handleSavedLogin} size="sm" style={styles.savedBtn} />
                <Button
                  title="다른 계정"
                  onPress={handleUseOtherAccount}
                  size="sm"
                  variant="outline"
                  style={styles.savedBtn}
                />
              </View>
            </View>
          )}

          <View style={styles.form}>
            {mode === 'guest' ? (
              <>
                <Text style={styles.guestIntro}>
                  이름만 입력해 임시로 입장해요. 코트 예약·모집방 참여·이용 안내는 볼 수 있지만, 포인트·친구·랭크·기록은 사용할 수 없어요.
                </Text>
                <Text style={styles.label}>이름</Text>
                <TextInput
                  style={styles.input}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="예: 홍길동"
                  maxLength={12}
                  autoCapitalize="words"
                />
                <Button
                  title="게스트로 입장"
                  onPress={handleGuestLogin}
                  fullWidth
                  size="lg"
                  variant="outline"
                  style={styles.submit}
                />
                <Text style={styles.hint}>
                  정식 회원이 되면 포인트·전적·친구 기능을 모두 이용할 수 있어요.
                </Text>
              </>
            ) : (
              <>
            <Text style={styles.label}>학번</Text>
            <TextInput
              style={styles.input}
              value={studentId}
              onChangeText={setStudentId}
              placeholder="예: 202410001"
              keyboardType="number-pad"
              maxLength={9}
              autoCapitalize="none"
            />

            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'login' ? '비밀번호' : '6자 이상'}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {mode === 'register' && (
              <>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder="비밀번호 다시 입력"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Text style={styles.label}>이름</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="실명" />
                <Text style={styles.label}>이메일 (선택)</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@dgist.ac.kr"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}

            {mode === 'login' ? (
              <Button title="로그인" onPress={handleLogin} fullWidth size="lg" style={styles.submit} />
            ) : (
              <Button
                title="회원가입"
                onPress={handleRegister}
                fullWidth
                size="lg"
                variant="secondary"
                style={styles.submit}
              />
            )}

            {mode === 'register' && (
              <Text style={styles.hint}>
                학번당 계정 1개만 만들 수 있어요. 가입 후 바로 로그인할 수 있습니다.
              </Text>
            )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SiteOverlayHost surface="login" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  setupBanner: {
    backgroundColor: '#FFF4E5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFD8A8',
  },
  setupBannerTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  setupBannerText: {
    ...typography.caption,
    color: '#92400E',
    lineHeight: 18,
  },
  brandWrap: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textMuted },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as object }),
  },
  tabText: { ...typography.bodyBold, color: colors.textMuted, fontSize: 13 },
  tabTextActive: { color: colors.primary },
  guestIntro: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  savedCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    gap: spacing.md,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  savedMeta: { flex: 1, gap: 2 },
  savedName: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  savedId: { ...typography.caption, color: colors.textMuted },
  savedQuestion: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  savedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  savedBtn: { flex: 1 },
  form: { gap: spacing.xs },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  submit: { marginTop: spacing.lg },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
