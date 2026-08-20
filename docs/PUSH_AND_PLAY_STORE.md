# 푸시 알림 및 Google Play 배포

**문서 버전**: 2026-07-08

인앱 알림(알림함·토스트·사이렌)과 별도로, 애플리케이션이 백그라운드일 때 전달되는 원격 푸시 및 Google Play 배포 구성을 기술한다.

| 구성요소 | 경로 | 역할 |
|----------|------|------|
| 토큰 등록 | `src/services/pushNotifications.ts` | Expo 푸시 토큰 발급 후 `push_tokens` 저장 |
| 등록 연결 | `app/_layout.tsx` | 비게스트 로그인 시 토큰 등록 |
| DB | `supabase/015_push_tokens.sql`, `015_push_tokens.ready.sql` | 테이블·RLS·알림 트리거 |
| 발송 | `supabase/functions/send-push` | Expo Push API 호출 |
| 빌드 | `eas.json`, `app.json` | preview APK · production AAB |

스토어 문구: [STORE_LISTING.md](./STORE_LISTING.md)  
개인정보처리방침: [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

---

## 1. Expo Application Services (EAS)

```bash
npm install -g eas-cli
eas login
eas init
```

`app.json`의 `extra.eas.projectId`는 유효한 UUID여야 한다.

---

## 2. Firebase Cloud Messaging 및 EAS 자격증명

Firebase 프로젝트 표시명: **DGISTDrop** (Console에서 확인).  
GCP `project_id`는 Console에 표시된 값을 따르며, 루트의 `google-services.json`과 일치해야 한다.

1. Firebase Console에서 Android 앱을 등록한다. 패키지명: `kr.ac.dgist.badmin`
2. `google-services.json`을 프로젝트 루트에 둔다 (`app.json` → `android.googleServicesFile`). 프로젝트 이름을 바꾸거나 앱을 다시 등록했다면 파일을 **다시 받아 교체**한다.
3. Firebase 프로젝트 설정 → 서비스 계정에서 비공개 키(JSON)를 발급한다.  
   `*firebase-adminsdk*.json`은 버전 관리에 포함하지 않는다 (`.gitignore`).
4. EAS에 FCM V1 키를 등록한다. 프로젝트를 바꿨다면 credentials를 다시 업로드한다.

```bash
eas credentials
# Android → production → Google Service Account
# → Push Notifications (FCM V1) → Upload a new service account key
```

원격 푸시에는 `google-services.json`과 별도로 FCM V1용 서비스 계정 키가 필요하다.

---

## 3. Supabase

1. 선행 마이그레이션 `011`–`014` 적용 후 `015_push_tokens.ready.sql`을 SQL Editor에서 실행한다.  
   `{SERVICE_ROLE_KEY}`는 Dashboard의 `service_role` 값으로 치환하며, 해당 키는 공개 저장소에 커밋하지 않는다.
2. Edge Function 배포:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase functions deploy send-push
```

Database Webhooks로 `notifications` INSERT → `send-push`를 연결하는 구성을 사용할 수 있다.

---

## 4. 빌드

```bash
eas build -p android --profile preview
eas build -p android --profile production
```

| 항목 | 내용 |
|------|------|
| 원격 푸시 검증 | Android 실기기 |
| 토큰 확인 | 로그인·알림 허용 후 `push_tokens` 행 생성 |

빌드 목록: https://expo.dev/accounts/go_pro/projects/badmin/builds

---

## 5. Google Play

1. Google Play Console 등록
2. 앱 생성, 패키지 `kr.ac.dgist.badmin`
3. 내부 테스트 트랙에 production AAB 업로드
4. 스토어 등록정보: [STORE_LISTING.md](./STORE_LISTING.md)
5. 개인정보처리방침 URL: `https://<Pages-도메인>/privacy`
6. (선택) `eas submit -p android --latest` — Play 서비스 계정 JSON 필요

---

## 동작 순서

```
이벤트 발생
  → notifications INSERT
  → 트리거 또는 Webhook
  → send-push
  → push_tokens 조회
  → Expo Push API
  → FCM
  → 기기
```

다이어그램: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 6. 활동 알림 (푸시)

관리자 패널 **[알림]** 탭에서 활동일 자동 푸시·메시지 템플릿·수동 발송을 설정합니다.

### Supabase 설정

1. `029_push_notification_settings.sql` 실행
2. Edge Function 배포:

```bash
npx supabase functions deploy broadcast-push
npx supabase functions deploy scheduled-activity-notify
```

3. **Cron 스케줄** (Dashboard → Edge Functions → scheduled-activity-notify → Schedules):
   - `*/5 * * * *` (5분마다 KST 활동일·알림 시간 확인)

4. **웹 푸시 (iOS PWA)** VAPID 키 생성 후 시크릿 등록:

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:drop@dgist.ac.kr
```

`.env`에 `EXPO_PUBLIC_VAPID_PUBLIC_KEY`도 동일한 public key 로 추가합니다.

### 사용자별 등록

| 환경 | 방법 |
|------|------|
| Android 앱 | 로그인 시 Expo 푸시 토큰 자동 등록 |
| iOS / 웹 | Safari/Chrome → 홈 화면 추가 → 프로필 → [알림 켜기] |

---

## 장애 대응

| 증상 | 원인 |
|------|------|
| 토큰 미생성 | EAS projectId 누락, 웹/에뮬레이터 실행, 알림 거부, 게스트 세션 |
| 푸시 미수신 | FCM V1 미연결, 트리거 URL·키 오류, `send-push` 미배포 |
| iOS | APNs 및 Apple Developer 계정 별도 구성 필요 |
