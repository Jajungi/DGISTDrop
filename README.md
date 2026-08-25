# Drop

DGIST 배드민턴 동아리 **Drop**의 현장 운영 사이트입니다.

**사이트:** [https://dgistdrop.com](https://dgistdrop.com)  
개인정보처리방침: [https://dgistdrop.com/privacy](https://dgistdrop.com/privacy)  
변경 이력(앱과 분리된 페이지): [https://dgistdrop.com/history/](https://dgistdrop.com/history/)

브라우저에서 바로 씁니다. 폰에서는 홈 화면에 추가하면 앱처럼 열립니다. Android·iOS 네이티브 앱은 같은 코드(Expo)로 빌드할 수 있으나, 지금은 웹이 기본입니다.

---

## 회원용 안내

정기 활동은 **매주 월·수 18:30–21:40**입니다. 운영진이 요일·시간을 바꿀 수 있고, 달력에 활동일을 더 넣을 수 있습니다. 현장은 **S1 체육관**입니다.

| 하고 싶은 일 | 어디서 · 어떻게 |
|---|---|
| 오늘 올지 | 활동일에만 묻습니다. 알림의 참석·불참, MY 기록의 **오늘 참석**, 또는 앱을 열었을 때 팝업 |
| 몇 시에 올지 | 참석을 고른 뒤에만 시간. **친구 탭**에 보입니다. 홈의 **올 사람**은 참석 인원만 셉니다 |
| 코트 사용 여부 | 홈. 기본은 **현황**(비어 있음 / 사용 중). 누가 쓰는지는 안 나옵니다. 운영진이 바꿉니다 |
| 지금 체육관에 있는 사람 | 홈의 **지금**. 헤더 **출석**으로 위치(지오펜스, 약 500m) 인증한 인원 |
| 친구 도착 시간 | 친구 탭 |
| 팀 모집 | 파트너 모집 탭 |
| 이용 규칙 | 이용 안내 탭. 예약·포인트·Elo 안내는 그 기능이 켜져 있을 때만 나옵니다 |

**회비 등급과 운영 권한은 별개입니다.**

- 회비: 게스트 / 준회원 / 정회원
- 운영 권한: 관리자 / 운영자 (정회원으로 바꿔도 권한이 빠지지 않음)
- 화면 배지: 운영자 > 관리자 > 회비 등급

게스트는 이름만으로 당일 입장합니다. 코트 현황·모집 참여·이용 안내는 볼 수 있습니다. 친구·모집방 생성·포인트·랭크는 없습니다. **서울 날짜가 바뀌면 계정이 삭제**됩니다.

예약 기능(이름·게임 수로 코트 잡기)과 포인트 상점은 기본 꺼져 있습니다. 운영자가 관리 → 개발자에서 켤 수 있습니다.

---

## 이 저장소가 다루는 것

카톡·엑셀로 하던 코트 현황, 누가 오는지, 출석, 레슨 대기, 공지를 한곳으로 모읍니다.

**지금까지 한 일**

1. Expo로 웹·앱 한 코드베이스를 만들고 Cloudflare Pages에 올렸습니다.
2. 백엔드를 Supabase(Postgres · Auth · Realtime)로 옮겨, 코트·프로필이 기기에 바로 맞게 했습니다.
3. 가입은 학번+이름입니다. 동아리 명단과 맞추는 제한은 둘 수 있습니다(기본 꺼짐).
4. 주소는 `dgistdrop.com`입니다. 예전 `*.pages.dev`는 쓰지 마세요.
5. 코트는 **현황 모드가 기본**입니다. 예약은 운영자가 개발자 탭에서 켭니다.
6. 포인트·Elo는 켜고 끌 수 있습니다. 끄면 관련 화면·차감이 숨겨집니다.
7. 참석/불참은 정기 활동일(또는 달력 추가일)에만 묻습니다.
8. 학번 202662024 운영자는 등급 변경으로 운영자가 해제되지 않습니다.

변경 항목은 [docs/CHANGELOG.pdf](docs/CHANGELOG.pdf)에 있습니다. 기능·정책을 바꾸면 `docs/changelog/releases.json`을 고치고 `npm run docs:changelog`로 PDF를 다시 만듭니다.

---

## 기술

| 영역 | 내용 |
|---|---|
| 클라이언트 | Expo SDK 57 · Expo Router · React Native · TypeScript · Zustand |
| 백엔드 | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| 웹 배포 | Cloudflare Pages · 도메인 `dgistdrop.com` |
| 앱 빌드 | EAS (`kr.ac.dgist.badmin`) — 현재는 웹을 기본으로 사용 |

코트·프로필·클럽 설정은 Supabase Realtime으로 반영됩니다.

동작 설명 HTML: [docs/how-drop-works.html](docs/how-drop-works.html)

---

## 배포

1. Cloudflare Pages가 `main` 푸시를 받아 웹을 빌드합니다.
2. Pages 프로젝트 환경 변수에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SITE_URL=https://dgistdrop.com` 을 넣습니다. **anon 키만** 넣습니다.
3. 새 DB 패치가 있으면 Supabase SQL Editor에서 번호 순으로 실행합니다. **라이브에 넣을 것:** `supabase/033_club_roster.sql` → `supabase/034_roles_occupancy_attendance.sql` → `supabase/035_prune_push_tokens.sql` → `supabase/036_attendance_seoul_date.sql` → `supabase/037_web_push_one_per_user.sql` → `supabase/038_friend_request_unique.sql` → `supabase/039_clear_at_gym_after_activity.sql`. 039는 활동이 끝나면 체육관 표시를 전원 해제합니다.
4. 프로필을 SQL로 직접 고칠 때 `guard_profile_columns`에 막히면, 같은 세션에서 먼저 `select set_config('app.allow_sensitive_profile_write', 'on', true);` 를 실행합니다. 이 `on`은 그 문장에만 해당합니다.
5. 자세한 배포: [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md) · SQL 목록: [docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md)

---

## 올리지 말 것 (비밀)

GitHub에는 다음을 넣지 않습니다.

- `.env`, `.env*.local`
- Supabase **service_role** 키
- Firebase Admin / FCM **서비스 계정 JSON** (`*firebase-adminsdk*.json`)
- Google Play / EAS 제출용 서비스 계정 키
- 비밀번호, 개인 명단 원본 스프레드시트

`google-services.json`은 앱 클라이언트용 설정입니다. Admin SDK가 아닙니다. 그래도 새 비밀이 보이면 커밋하지 마세요.

로컬 실행:

```bash
npm install
npm run web
```

브라우저: [http://localhost:8081](http://localhost:8081)

`.env` 예시 (값은 각자 콘솔에서 복사, 저장소에 커밋하지 않음):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SITE_URL=https://dgistdrop.com
```

---

## 개발 문서

| 문서 | 내용 |
|---|---|
| [docs/CHANGELOG.pdf](docs/CHANGELOG.pdf) | 버전별 무엇을 바꿨는지 |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | 기능 명세 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 사이트·백엔드 흐름 |
| [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) | 개인정보처리방침 |
| [docs/OPS_FOLLOWUPS.md](docs/OPS_FOLLOWUPS.md) | 운영 후속 |
