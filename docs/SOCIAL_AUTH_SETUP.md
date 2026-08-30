# 소셜 로그인 설정 (Google · 네이버)

Drop은 **학번+비밀번호** 가입과 **Google·네이버 간편 로그인**을 함께 지원합니다.

---

## 0. 순서 (한 번만 하면 됨)

1. Supabase SQL Editor → `043` → `044` 실행
2. Supabase Dashboard → URL / Providers 설정
3. GCP → Google OAuth 클라이언트 생성
4. 네이버 개발자센터 → 로그인 앱 등록
5. Cloudflare 배포 후 실제 로그인 테스트

---

## 1. Supabase SQL Editor

프로젝트 → **SQL Editor** → New query

```text
1. supabase/043_drop_contact_email.sql  붙여넣기 → Run
2. supabase/044_social_auth.sql         붙여넣기 → Run
```

---

## 2. Supabase Dashboard — URL

**Authentication** → **URL Configuration**

| 항목 | 값 |
|------|-----|
| Site URL | `https://dgistdrop.com` |
| Redirect URLs | 아래를 한 줄씩 추가 |

```text
https://dgistdrop.com/**
https://dgistdrop.com/auth/callback
http://localhost:8081/**
http://localhost:19006/**
badmin://auth/callback
```

로컬에서 `expo start --web` 포트가 다르면 그 주소도 추가하세요.

---

## 3. Supabase Dashboard — Google

**Authentication** → **Providers** → **Google**

1. **Enable Google** 켜기
2. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**
3. **Create Credentials** → **OAuth client ID** (Web)
   - Authorized redirect URIs: Supabase Callback URL  
     (`https://<프로젝트-ref>.supabase.co/auth/v1/callback`)
4. Client ID / Secret을 Supabase에 붙여넣기

Android 앱에서도 Google을 쓰려면 GCP에 **Android** OAuth 클라이언트를 추가합니다.

### 설정 → Google 연동 (필수)

**Authentication** → **Settings** (또는 **Configuration**)

| 항목 | 값 |
|------|-----|
| **Enable Manual Linking** | **ON** |

이 옵션이 꺼져 있으면 로그인한 뒤 설정에서 Google 연동이 되지 않습니다.

---

## 4. Supabase Dashboard — 네이버 (Custom OIDC, 검수 후)

네이버는 앱 검수 통과 후 `src/constants/socialAuth.ts`의 `ACTIVE_SOCIAL_PROVIDERS`에 `naver`를 추가하세요.

Supabase에 **네이버 기본 버튼이 없어서** Custom OIDC로 등록합니다.

**Authentication** → **Providers** → **Add provider** (또는 Custom OIDC)

| 항목 | 값 |
|------|-----|
| Provider name (slug) | `naver` ← 코드와 **반드시 동일** |
| Client ID | 네이버 앱 Client ID |
| Client Secret | 네이버 앱 Client Secret |
| Authorization URL | `https://nid.naver.com/oauth2.0/authorize` |
| Token URL | `https://nid.naver.com/oauth2.0/token` |
| User Info URL | `https://openapi.naver.com/v1/nid/me` |
| Scopes | `name email` (필요 시 조정) |

**Callback URL** (Supabase가 보여 주는 값)을 복사해 네이버 앱 **Callback URL**에 그대로 넣습니다.

---

## 5. 네이버 개발자센터

[developers.naver.com](https://developers.naver.com/apps/) → 애플리케이션 등록

| 항목 | 예시 |
|------|------|
| 서비스 URL | `https://dgistdrop.com` |
| Callback URL | `https://<프로젝트-ref>.supabase.co/auth/v1/callback` |
| 로고 | Drop 로고 업로드 |

**API 설정**에서 **네이버 로그인** 사용 API를 켭니다.

---

## 6. 기타 Auth 설정 (이미 되어 있어야 함)

**Authentication** → **Providers** / **Settings**

| 항목 | 값 |
|------|-----|
| Confirm email | **OFF** (학번 가상 이메일 사용) |
| Anonymous sign-ins | **ON** (게스트) |

---

## 7. 배포 후 확인

1. `https://dgistdrop.com/login` → 로그인 탭 하단 Google 아이콘 표시
2. 학번 가입 → 로그인 → 설정 → 간편 로그인 → Google 연동
3. 로그아웃 후 로그인 탭에서 Google 간편 로그인

오류가 나면 브라우저 개발자 도구 Network에서 `/auth/v1/callback` 응답과 Supabase **Authentication → Logs**를 확인하세요.

---

## 이용 흐름

| 경우 | 동작 |
|------|------|
| 학번 가입 | 학번·비밀번호·이름 (이메일 입력 없음) |
| 간편 로그인 | **학번 가입 후** 설정에서 Google 연동 → 로그인 탭에서 Google 사용 |
| 연동 안 된 Google | 로그인 거부 (학번 가입 후 설정에서 연동) |
