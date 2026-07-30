import type { AuthError } from '@supabase/supabase-js';
import {
  getSupabase,
  studentIdToAuthEmail,
  isSupabaseEnabled,
} from '@/src/lib/supabase';
import { fetchAllProfiles, fetchProfileById } from '@/src/services/supabase/profiles';
import { validateStudentId } from '@/src/utils/studentId';

export type AuthResult = { success: boolean; message: string };

function formatAuthError(error: AuthError): string {
  const m = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';

  if (code === 'email_address_invalid' || (m.includes('invalid') && m.includes('email'))) {
    return '학번 형식이 올바르지 않아요. 숫자 학번만 입력해 주세요.';
  }
  if (
    code === 'user_already_exists' ||
    m.includes('already registered') ||
    m.includes('already been registered')
  ) {
    return '이미 등록된 학번이에요. 다른 학번으로 가입했거나 계정이 있어요.';
  }
  if (code === 'signup_disabled' || (m.includes('signup') && m.includes('disabled'))) {
    return '회원가입이 꺼져 있어요. Supabase → Authentication → Sign In / Providers 에서 확인해 주세요.';
  }
  if (code === 'over_email_send_rate_limit' || m.includes('rate limit')) {
    return '이메일 전송 한도에 걸렸어요. Supabase에서 Confirm email 을 끄거나 1시간 후 다시 시도해 주세요.';
  }
  if (m.includes('captcha')) {
    return '캡차가 켜져 있어요. Supabase → Authentication → Attack Protection → Captcha 를 끄세요.';
  }
  if (m.includes('email not confirmed') || m.includes('confirm your email')) {
    return '이메일 확인이 켜져 있어요. Email 설정에서 Confirm email 을 꺼 주세요.';
  }
  if (m.includes('password') || code === 'weak_password') {
    return '비밀번호가 요구 조건을 만족하지 않아요. 6자 이상으로 설정해 주세요.';
  }
  if (m.includes('invalid student id') || m.includes('student id required')) {
    return '학번은 연도 4자리 + 숫자 5자리 형식이에요. (예: 202410001)';
  }
  if (m.includes('cannot delete last admin')) {
    return '마지막 관리자 계정은 삭제할 수 없어요.';
  }
  if (m.includes('forbidden')) {
    return '권한이 없어요.';
  }

  const suffix = code ? ` (${code})` : '';
  return (error.message || '회원가입에 실패했어요.') + suffix;
}

function memberStatusMessage(status: string, reason?: string): string | null {
  switch (status) {
    case 'pending':
      return '가입 승인 대기 중이에요. 운영진 승인 후 로그인할 수 있어요.';
    case 'rejected':
      return '가입이 거절되었어요. 운영진에게 문의해 주세요.';
    case 'suspended':
      return reason
        ? `계정이 정지되었어요. 사유: ${reason}`
        : '계정이 정지되었어요. 운영진에게 문의해 주세요.';
    default:
      return null;
  }
}

export async function supabaseLogin(
  studentId: string,
  password: string
): Promise<AuthResult & { userId?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, message: 'Supabase가 설정되지 않았어요.' };
  }

  const trimmed = studentId.trim();
  const idCheck = validateStudentId(trimmed);
  if (!idCheck.ok) {
    return { success: false, message: idCheck.message };
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: studentIdToAuthEmail(idCheck.normalized),
    password,
  });

  if (error || !data.user) {
    return { success: false, message: '학번 또는 비밀번호가 올바르지 않아요.' };
  }

  const profile = await fetchProfileById(data.user.id);
  if (!profile) {
    return { success: false, message: '프로필을 불러오지 못했어요.' };
  }

  const blocked = memberStatusMessage(profile.memberStatus, profile.suspendedReason);
  if (blocked) {
    await getSupabase().auth.signOut();
    return { success: false, message: blocked };
  }

  return {
    success: true,
    message: `${profile.name}님, 환영합니다!`,
    userId: profile.id,
  };
}

export async function supabaseRegister(input: {
  studentId: string;
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  if (!isSupabaseEnabled()) {
    return { success: false, message: 'Supabase가 설정되지 않았어요.' };
  }

  const trimmedId = input.studentId.trim();
  const trimmedName = input.name.trim();
  const idCheck = validateStudentId(trimmedId);
  if (!idCheck.ok) {
    return { success: false, message: idCheck.message };
  }
  if (!trimmedName) {
    return { success: false, message: '이름을 입력해 주세요.' };
  }
  if (input.password.trim().length < 6) {
    return { success: false, message: '비밀번호는 6자 이상이어야 해요.' };
  }

  const normalizedId = idCheck.normalized;
  const authEmail = studentIdToAuthEmail(normalizedId);
  const { data, error } = await getSupabase().auth.signUp({
    email: authEmail,
    password: input.password,
    options: {
      data: {
        student_id: normalizedId,
        name: trimmedName,
        contact_email: input.email.trim() || `${normalizedId}@dgist.ac.kr`,
      },
    },
  });

  if (error) {
    if (__DEV__) {
      console.warn('[supabase signup]', { email: authEmail, code: error.code, message: error.message });
    }
    return { success: false, message: formatAuthError(error) };
  }

  if (data.user) {
    const profile = await fetchProfileById(data.user.id).catch(() => null);
    await getSupabase().auth.signOut();
    if (profile?.memberStatus === 'pending') {
      return {
        success: true,
        message: '회원가입이 접수됐어요. 운영진 승인 후 로그인할 수 있어요.',
      };
    }
  }

  return {
    success: true,
    message: '회원가입이 완료됐어요. 바로 로그인할 수 있어요.',
  };
}

/** 본인 또는 관리자가 계정 삭제 (학번 재가입 가능) */
export async function supabaseDeleteAccount(targetUserId?: string): Promise<AuthResult> {
  if (!isSupabaseEnabled()) {
    return { success: false, message: 'Supabase가 설정되지 않았어요.' };
  }

  const { error } = await getSupabase().rpc('rpc_delete_account', {
    p_target_id: targetUserId ?? null,
  });

  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (__DEV__) console.warn('[supabase delete account]', error.message);
    if (msg.includes('cannot delete last admin')) {
      return { success: false, message: '마지막 관리자 계정은 삭제할 수 없어요.' };
    }
    if (msg.includes('forbidden')) {
      return { success: false, message: '권한이 없어요.' };
    }
    if (msg.includes('user not found')) {
      return { success: false, message: '회원을 찾을 수 없어요.' };
    }
    return { success: false, message: error.message || '계정 삭제에 실패했어요.' };
  }

  return { success: true, message: '계정이 삭제되었어요.' };
}

export async function supabaseLogout(): Promise<void> {
  if (!isSupabaseEnabled()) return;
  await getSupabase().auth.signOut();
}

/** 익명 로그인 + 게스트 프로필 설정 (이름만 입력) */
export async function supabaseGuestLogin(
  name: string
): Promise<AuthResult & { userId?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, message: 'Supabase가 설정되지 않았어요.' };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 12) {
    return { success: false, message: '이름은 2~12자로 입력해 주세요.' };
  }

  const { data, error } = await getSupabase().auth.signInAnonymously();
  if (error || !data.user) {
    if (__DEV__) console.warn('[supabase guest]', error?.message);
    const msg = (error?.message ?? '').toLowerCase();
    if (msg.includes('anonymous') || msg.includes('database error')) {
      return {
        success: false,
        message:
          '게스트 로그인 DB 오류예요. Supabase SQL Editor에서 010_fix_anonymous_user_trigger.sql 을 실행하고, Authentication → Anonymous sign-ins 를 켜 주세요.',
      };
    }
    return {
      success: false,
      message:
        '게스트 로그인에 실패했어요. Supabase → Authentication → Anonymous sign-ins 를 켜 주세요.',
    };
  }

  const { error: setupError } = await getSupabase().rpc('rpc_setup_guest_profile', {
    p_name: trimmed,
  });

  if (setupError) {
    await getSupabase().auth.signOut();
    if (__DEV__) console.warn('[rpc_setup_guest_profile]', setupError.message, setupError);
    const detail = setupError.message?.includes('invalid guest name')
      ? '이름은 2~12자로 입력해 주세요.'
      : '게스트 프로필 설정에 실패했어요. 010_fix_anonymous_user_trigger.sql 적용 여부를 확인해 주세요.';
    return { success: false, message: detail };
  }

  const profile = await fetchProfileById(data.user.id);
  if (!profile) {
    await getSupabase().auth.signOut();
    return { success: false, message: '게스트 프로필을 불러오지 못했어요.' };
  }

  return {
    success: true,
    message: `${profile.name}님, 게스트로 입장했어요.`,
    userId: profile.id,
  };
}

export async function supabaseRestoreSession(): Promise<string | null> {
  if (!isSupabaseEnabled()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function loadSupabaseAuthBundle(userId: string | null) {
  const users = await fetchAllProfiles();
  return { users, sessionUserId: userId };
}
