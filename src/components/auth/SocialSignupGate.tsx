import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { getOAuthProfileName } from '@/src/services/supabase/socialAuth';
import { isIncompleteSocialSignup } from '@/src/utils/socialSignup';

export function SocialSignupGate() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const completeSocialSignup = useAuthStore((s) => s.completeSocialSignup);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useNotificationStore((s) => s.showToast);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const visible = Boolean(currentUser && isIncompleteSocialSignup(currentUser));

  useEffect(() => {
    if (!visible) return;
    void getOAuthProfileName().then((oauthName) => {
      if (oauthName) setName(oauthName);
      else if (currentUser?.name) setName(currentUser.name);
    });
  }, [visible, currentUser?.id, currentUser?.name]);

  const submit = async () => {
    if (password !== passwordConfirm) {
      showToast({ type: 'warning', title: '', message: '비밀번호 확인이 일치하지 않아요.' });
      return;
    }
    setBusy(true);
    try {
      const result = await completeSocialSignup(studentId, name, password);
      showToast({
        type: result.success ? 'success' : 'warning',
        title: '',
        message: result.message,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>간편 회원가입</Text>
          <Text style={styles.body}>
            Google·Apple에서 가져온 이름을 확인하고, 학번과 비밀번호를 설정해 주세요.
          </Text>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="실명"
            autoCapitalize="words"
          />
          <Text style={styles.hint}>소셜 계정 이름이 실명이 아닐 수 있어요. 수정할 수 있습니다.</Text>
          <Text style={styles.label}>학번</Text>
          <TextInput
            style={styles.input}
            value={studentId}
            onChangeText={setStudentId}
            placeholder="202600000"
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <Text style={styles.label}>비밀번호</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상"
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
          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호 다시 입력"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <Button
            title={busy ? '가입 중...' : '가입 완료'}
            onPress={() => void submit()}
            fullWidth
            disabled={busy}
          />
          <Button
            title="취소"
            onPress={() => void logout()}
            fullWidth
            variant="outline"
            disabled={busy}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.h3, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'web' ? 10 : spacing.sm,
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
});
