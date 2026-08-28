# 운영 후속 작업 메모

배포 후 바로 막히는 일은 아니지만, 나중에 정리하면 좋은 항목들을 모아 둔 문서입니다.

**현재 배포 방식 (2026-08):** Play 내부 테스트 설치는 미뤄 두고, Android·iOS 모두 **브라우저 웹앱(홈 화면 추가 / 앱 설치)** 으로 쓰는 것을 기본으로 합니다. 사이트: `https://dgistdrop.com`

---

## 0. 웹앱 설치 (현재 권장 · Android + iOS)

### Android (Chrome)
1. Chrome으로 `https://dgistdrop.com` 열기
2. 메뉴(⋮) → **앱 설치** 또는 **홈 화면에 추가**
3. 홈 화면 Drop 아이콘으로 실행
4. 설정에서 알림 허용

### iPhone (Safari)
1. Safari로 `https://dgistdrop.com` 열기
2. 하단 **공유** → **홈 화면에 추가**
3. 생긴 Drop 아이콘으로 실행 (탭이 아님)
4. 설정에서 알림 허용 — Safari 탭 안에서는 푸시 불가

앱 UI (브라우저 탭으로 열었을 때만, 홈 화면 웹앱·Play 앱에서는 숨김):

- 로그인 화면: iPhone·Android 설치 안내 카드
- 설정: iPhone·Android·PC 설치 안내 카드 + 알림 설정
- 이용 안내: 「언제 보이는지」 + 기기별 홈 화면 추가 항목

기술:

- `public/manifest.json`
- `public/sw.js` (fetch 핸들러 포함 — Chrome 설치 조건)
- `src/services/pwaInstall.ts` (early SW 등록 + `beforeinstallprompt`)

---

## 푸시 토큰 정리 (결정: 발송 실패분만 삭제)

**결정:** 오래된 토큰 일괄 삭제 / 유저당 1개 제한은 하지 않음.  
여러 기기(PC·폰·PWA) 동시 수신을 허용한다.

**동작:** `send-push` · `broadcast-push` 발송 시
- Expo: `DeviceNotRegistered` 등 fatal 티켓 → 해당 토큰 삭제
- Web Push: HTTP `404` / `410` / `403` → 해당 구독 삭제

공유 코드: `supabase/functions/_shared/pushSend.ts`  
배포 후 적용: `npx supabase functions deploy send-push` / `broadcast-push`

---

## 1. Google Play 경고 후속 처리

> 상태: **보류**. 웹앱으로 먼저 운영하고, Play 설치가 필요할 때 다시 진행.

### 1-1. 내부 테스트 테스터 미지정 경고

경고 문구:

> 아직 테스터가 지정되지 않았기 때문에 어떤 사용자도 이 버전을 이용할 수 없습니다.

의미:

- AAB 업로드는 끝났지만, 내부 테스트 트랙에 설치 가능한 사람 목록이 아직 없음
- 앱 문제는 아니고 Play Console 설정 문제

나중에 할 일:

1. Play Console → `테스트 및 출시` → `내부 테스트`
2. `테스터` 탭 진입
3. 이메일 목록 생성
4. 본인 Gmail 및 필요한 동아리원 계정 추가
5. 저장 후 내부 테스트 링크 재확인

완료 기준:

- 내부 테스트 페이지에서 설치 링크가 활성화됨
- 지정한 Google 계정으로 Play 설치 가능

### 1-2. 가독화 파일(mapping.txt) 없음 경고

경고 문구:

> 이 App Bundle 유형과 연결된 가독화 파일이 없습니다.

의미:

- Play Console에 Proguard/R8 mapping 파일이 없음
- 크래시나 ANR 발생 시 난독화된 스택 트레이스를 읽기 어려워질 수 있음
- 내부 테스트/배포 자체는 막지 않음

현재 우선순위:

- 낮음
- 동아리 내부 테스트 단계에서는 일단 무시 가능

나중에 할 일:

1. Expo Android release 빌드에서 R8/Proguard 산출물 확인
2. `mapping.txt`를 확보할 수 있으면 버전별로 보관
3. Play Console의 해당 릴리스에 mapping 파일 업로드

메모:

- 이 항목은 "앱이 안 된다"가 아니라 "장애 분석이 불편하다" 수준의 경고

---

## 2. 커스텀 도메인으로 바꿀 때 체크리스트

예시:

- 현재: `https://dgistdrop.com`
- 예전: `https://dgistdrop.pages.dev` (안내·홈 화면 추가에 쓰지 않음)

### 2-1. Cloudflare Pages

할 일:

1. Cloudflare Dashboard → Pages 프로젝트 선택
2. `Custom domains`에서 새 도메인 연결
3. DNS 연결 확인
4. HTTPS 인증서 발급 완료 확인
5. 새 도메인으로 실제 접속 테스트

확인 URL:

- `/`
- `/login`
- `/privacy`

### 2-2. Cloudflare Pages 환경 변수

현재 꼭 확인할 변수:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_VAPID_PUBLIC_KEY`

메모:

- 도메인만 바뀌고 VAPID public key 는 유지할 수도 있음
- 하지만 운영 중에는 새 도메인 배포 후 웹 푸시 권한을 다시 받아야 할 수 있으므로 같이 검증

### 2-3. Supabase Auth 설정

위치:

- Supabase Dashboard → `Authentication` → `URL Configuration`

바꿀 것:

1. `Site URL`을 새 도메인으로 변경
2. `Redirect URLs`에 새 도메인 추가
3. 기존 `pages.dev` URL을 유지할지 결정

권장:

- 전환 직후에는 기존 `pages.dev` URL도 잠시 남겨 두는 편이 안전
- 새 도메인 동작이 확인되면 정리

예시:

- `https://drop.dgist.ac.kr`
- `https://drop.dgist.ac.kr/login`

### 2-4. 앱/웹 코드에서 확인할 파일

#### `app/+html.tsx`

현재 이 파일은 사이트 URL 기본값으로 `https://dgistdrop.com` 을 사용함.

나중에 할 일:

- `EXPO_PUBLIC_SITE_URL` 환경 변수를 새 도메인으로 설정
- 기본값 하드코딩도 새 도메인으로 바꾸는지 확인

체크 포인트:

- 웹 메타 태그 canonical/og:url 성격의 URL이 새 도메인을 가리키는지 확인

#### `src/services/webPush.ts`

확인할 것:

- `EXPO_PUBLIC_VAPID_PUBLIC_KEY`가 웹 배포 환경에 설정돼 있는지
- 새 도메인에서 브라우저 푸시 구독이 정상 생성되는지

메모:

- 웹 푸시는 origin(도메인) 기준이라, 도메인이 바뀌면 기존 구독을 그대로 못 쓰는 경우가 많음
- 사용자가 새 도메인에서 다시 알림 허용을 해야 할 수 있음

### 2-5. 문서에서 바꿔야 할 곳

다음 문서의 URL 표기를 새 도메인 기준으로 바꾸기:

- `docs/STORE_LISTING.md`
- `docs/PUSH_AND_PLAY_STORE.md`
- `docs/DEPLOY_CLOUDFLARE.md`
- 필요 시 `docs/PRIVACY_POLICY.md` 내 공개 URL 설명

핵심 교체 항목:

- `https://<배포-도메인>/privacy`
- `https://<Pages-도메인>/privacy`
- `https://<도메인>/privacy`

### 2-6. Google Play Console

바꿀 가능성이 큰 항목:

1. `앱 콘텐츠` → 개인정보처리방침 URL
2. `스토어 등록정보` → 웹사이트 URL
3. 앱 설명 본문에 직접 적은 URL

현재 반영 대상:

- 개인정보처리방침 URL: `https://<새-도메인>/privacy`
- 스토어 웹사이트: `https://<새-도메인>`

### 2-7. PWA / 브라우저 동작 확인

도메인 변경 후 확인:

1. Android Chrome에서 접속
2. 홈 화면 추가 가능 여부
3. 로그인 유지 여부
4. 알림 권한 재요청 여부
5. 푸시 수신 여부

메모:

- 도메인이 바뀌면 기존 PWA 아이콘/권한/캐시가 새 앱처럼 동작할 수 있음
- 예전 `pages.dev`로 홈 화면 추가한 사용자는 새 도메인 기준으로 다시 설치하는 편이 안전

### 2-8. 실제 검증 순서

권장 순서:

1. 새 도메인을 Cloudflare에 연결
2. Cloudflare 환경 변수 확인
3. Supabase Auth URL 갱신
4. 새 도메인으로 웹 접속 테스트
5. `/privacy` 확인
6. 로그인 테스트
7. 웹 푸시 테스트
8. Play Console URL 수정
9. 안내 문서 수정

---

## 3. 도메인 변경 때 특히 놓치기 쉬운 것

- Supabase `Site URL`만 바꾸고 `Redirect URLs`를 안 바꾸는 것
- Play Console 개인정보처리방침 URL을 예전 주소로 두는 것
- 새 도메인에서 웹 푸시가 다시 권한을 요구한다는 점을 놓치는 것
- 사용자가 예전 `pages.dev` PWA를 홈 화면에 그대로 둔 상태
- `EXPO_PUBLIC_SITE_URL` 또는 하드코딩된 기본 URL을 안 바꿔 메타 태그가 예전 주소를 가리키는 것

---

## 4. 전환 완료 기준

아래가 모두 되면 도메인 전환 완료로 봐도 됩니다.

- 새 도메인 `/` 접속 성공
- 새 도메인 `/privacy` 접속 성공
- 로그인 성공
- 예약/조회 주요 화면 정상
- 웹 푸시 재등록 및 수신 성공
- Play Console의 개인정보처리방침 URL 수정 완료
- 문서 내 대표 URL 수정 완료
