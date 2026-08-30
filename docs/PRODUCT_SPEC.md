# Drop (DGIST) — 제품 기능 명세

본 문서는 Drop 서비스의 화면·기능·구현 상태를 정의한다.

**문서 버전**: 2026-07-08

---

## 앱 개요

| 항목 | 값 |
|------|-----|
| 앱명 | Drop 배드민턴 |
| 동아리 | Drop |
| 학교 | DGIST |
| 체육관 | S1 체육관 (지오펜스) |
| 활동 | 월·수 18:30–21:40 |

---

## 화면 맵

| 경로 | 탭/사이드바 | 역할 |
|------|-------------|------|
| `/` | 코트 예약 | 9코트 현황·예약·경기·합류 |
| `/friends` | 친구 | 친구 목록·일정·출석 동아리원 |
| `/lobby` | 파트너 모집 | 팀 모집방만 (친구 UI 없음) |
| `/profile` | MY 기록 | 프로필·출석·경기·차트 |
| `/guide` | 이용 안내 | 비활동 안내·규칙 |
| `/admin` | (관리) | 회원·코트·포인트·DB 등 |
| `/coaching` | (스택) | 코칭·레슨·공지 |
| `/privacy` | (공개) | 개인정보처리방침 |
| `/login` | — | 학번·게스트·Google/네이버 간편 로그인 |

---

## 구현 상태 범례

- ✅ 완료
- 🟡 부분 (UI/목업만)
- ⬜ 미구현

---

## 1. 코트 예약 (`/`)

| 기능 | 상태 | 비고 |
|------|------|------|
| 9코트 한 화면 배치 (3×3, 무대/입구) | ✅ | `GYM_COURT_ROWS` |
| 화면 높이에 맞춘 코트 크기 | ✅ | `useLayoutMode` |
| 코트 탭 → 인라인 확대 (모달 아님) | ✅ | `CourtExpandView` |
| **경기 유형 표시 (난타/경기)** | ✅ | `GameModeBadge`, `CourtIllustration` |
| **난타 반코트 시각화** | ✅ | 어두운 미사용 반 + 라벨 |
| 예약 시 경기 유형 선택 | ✅ | `GameModePicker` |
| 빈 영역 탭 시 확대 닫기 | ✅ | side tap |
| 필터: 전체/가능/내꺼 | ✅ | |
| 예약·합류·경기·반납·점수 | ✅ | `courtStore` |
| 지오펜스 (체육관 근처만 액션) | ✅ | |
| 빈 코트 어둡게 / 예약·경기 색 구분 | ✅ | |
| 예약됨 배지 (빨강, 기울임, 코트 위) | ✅ | |
| 마우스 그림자 (코트 카드) | ✅ | `LightShadowView` |
| 마우스 스포트라이트 | ❌ 제거됨 | 의도적 |

### 경기 유형 (`GameMode`)

| 유형 | 코드 | 코트 표시 |
|------|------|-----------|
| 난타 | `nanta` | 반코트만 사용 — 미사용 반 어둡게 + 왼/오른쪽 반 라벨. 친선(Elo 미반영) |
| 경기 | `casual` | 파란 테두리 + `경기` 배지 |
| ~~랭크전~~ | `ranked` | 경기(`casual`)로 통합됨 — 과거 데이터 표시용으로만 유지 |

- `Court.gameMode`, `Court.nantaHalf` (`near` \| `far`) — 네트 가로 상·하 반
- 예약 시 `GameModePicker`로 선택 (난타 / 경기)
- ✅ ELO 반영 규칙: **경기 점수를 입력하면** Elo·전적·포인트가 **즉시** 반영. 점수를 입력하지 않으면 친선경기(Elo 유지). 난타는 항상 친선.
- ✅ 어뷰징 방지: 참가자 중 누군가 하루 `AUTO_RATED_MATCH_DAILY_LIMIT`회(기본 8회)를 넘기면 자동 반영 대신 관리자 승인 대기로 전환.
- ✅ 포인트: 승리 +`MATCH_WIN`(50) / 패배 +`MATCH_LOSS`(20) 팀원당 지급.

---

## 2. 친구 (`/friends`) — **신규**

| 기능 | 상태 | 비고 |
|------|------|------|
| 탭: **친구** / **일정** | ✅ | `FriendsSegmentTabs` |
| 친구 = `User.isFavorite` | ✅ | |
| **온라인(체육관) 위 → 오프라인 아래** | ✅ | `useFriendsPresence` |
| 친구 도착 예정 시각 **굵게·크게** | ✅ | `FriendRow` |
| 일정 탭: 타임라인 바 (두껍게) | ✅ | `FriendSchedulePanel` |
| 친구 아닌 **오늘 출석** 동아리원 → 친구 아래 | ✅ | `attendanceRecords` + `isAtGym` |
| 친구 신청/제거 | ✅ | `friendStore` · 친구 신청/수락/삭제 |
| 체육관 여부 실시간 반영 | ✅ | profiles Realtime + `isAtGym` |
| 원격 푸시(합류·공지 등) | ✅ | 네이티브 + `push_tokens` / `send-push` (웹은 인앱만) |

### 데이터 규칙

```
friends     = users.filter(isFavorite && id !== me)
online      = friends.filter(isAtGym)     // 상단
offline     = friends.filter(!isAtGym)    // 하단
checkedIn   = 오늘 attendanceRecords에 있거나 isAtGym (데모)
others      = checkedIn && !friend && id !== me  // 친구 섹션 아래
```

---

## 3. 파트너 모집 (`/lobby`)

| 기능 | 상태 | 비고 |
|------|------|------|
| 모집방 목록·생성·비밀번호 | ✅ | |
| 참여·탈퇴·팀 코트 예약 | ✅ | |
| 친구 일정 UI | ❌ 제거 | `/friends`로 이전 |

---

## 4. MY 기록 (`/profile`)

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로필·전적·ELO | ✅ | |
| 출석 카드·체크인 | ✅ | `authStore.checkIn` |
| 경기 기록 목록 | ✅ | `MatchHistoryList` |
| 시간대별 인원 차트 (혼잡+내 시간) | ✅ | `HourlyHeadcountChart` |
| 청소 인증 | ✅ | UI + 포인트 + 기여 카운트 |
| **포인트 내역 (받은/쓴)** | ✅ | `PointsHistorySheet`, `pointStore` |

---

## 5. 코치 레슨

| 기능 | 상태 | 비고 |
|------|------|------|
| 레슨 참여 신청 (입금 전) | ✅ | `lessonStore.requestLessonAccess` |
| 관리자 입금 확인·승인/거절 | ✅ | `/admin` |
| 승인 회원만 대기열 등록 | ✅ | `joinQueue` |
| 대기 순서 (next → active → done) | ✅ | 관리자·자동 승격 |
| 코치 코트(3번) 예약 제한 | ✅ | `next`/`active` + 승인만 |
| 사이렌 오더 알림 | ✅ | `notifyIfNext` |
| MY 기록 레슨 카드 | ✅ | `LessonCard` |

### 레슨 플로우

```
신청(pending) → 관리자 입금확인(approved) → 대기열 등록 → next → 코치코트 예약
→ active(레슨중) → complete → 다음 사람 next + 사이렌
```

---

## 6. 이용 안내 (`/guide`)

| 기능 | 상태 | 비고 |
|------|------|------|
| 6개 아코디언 섹션 (규칙·FAQ·회칙·포인트·매너·레슨) | ✅ | `GUIDE_SECTIONS` |
| 코트 규격 (6.1×13.4m·네트·라인) | ✅ | 규칙 섹션 |
| 배드민턴 규칙 FAQ (천장·서브·폴트·일반) | ✅ | `rules-faq` |
| 인터랙티브 코트 (단식/복식/서브 제한) | ✅ | `InteractiveRulesCourt` |
| 포인트 적립·사용 표 | ✅ | `GuidePointsTable` |
| 비활동 시 `InactiveHome`에도 동일 안내 | ✅ | |
| 변경 이력 사이트 (`/history/`, 새 탭) | ✅ | 앱 셸과 분리된 정적 페이지. 이용 안내 하단 링크 |
| 첫 로그인 탭 안내 (5스텝) | ✅ | 학번 계정만. 이용 안내에서 다시 보기 |

---

## 7. 레이아웃·공통

| 기능 | 상태 | 비고 |
|------|------|------|
| DGIST + Drop 로고 헤더 | ✅ | `AppHeader` |
| 사람 검색 (헤더) | ✅ | |
| 출석 버튼·알림·프로필 링크 | ✅ | |
| 데스크톱 사이드바 호버 확장 | ✅ | `WebShell` |
| 흰색 라운드 패널 (`PageContainer`) | ✅ | |
| 크림/틸 테마 | ✅ | `src/theme` |

---

## 8. 스토어

| 스토어 | 파일 | 역할 |
|--------|------|------|
| `courtStore` | `courtStore.ts` | 코트·예약·경기 |
| `lobbyStore` | `lobbyStore.ts` | 모집방 |
| `lessonStore` | `lessonStore.ts` | 레슨 신청·대기열·코치코트 권한 |
| `authStore` | `authStore.ts` | 유저·출석·로그인·가입 |
| `friendStore` | `friendStore.ts` | 친구 신청·친구 목록 |
| `pointStore` | `pointStore.ts` | 포인트 내역 |
| `notificationStore` | `notificationStore.ts` | 토스트·알림·경기결과 |
| `coachingStore` | `coachingStore.ts` | 코치 공지 |
| `adminLogStore` | `adminLogStore.ts` | 관리자 감사 로그 |
| `adminAlertStore` | `adminAlertStore.ts` | 관리 탭 배지 |
| `searchStore` | `searchStore.ts` | 헤더 사람 검색 |
| `lightSourceStore` | `lightSourceStore.ts` | 마우스 그림자 |
| `shellStore` | `shellStore.ts` | 사이드바 상태 |

---

## 9. 백엔드·동기화

| 기능 | 상태 | 비고 |
|------|------|------|
| 같은 브라우저 탭 간 동기화 | ✅ | `crossTabSync` (로컬/보조) |
| 개발용 동기화 서버 (REST + WS) | ✅ | Supabase 미사용 시 폴백 (`npm run server`) |
| **Supabase Auth·RPC·RLS·Realtime** | ✅ | `src/services/supabase`, SQL `001`~`015` |
| 인앱 알림 (알림함·토스트·사이렌) | ✅ | `notificationStore` |
| 원격 푸시 (합류·코치·공지) | ✅ | FCM + `send-push` — 외부 설정 [PUSH_AND_PLAY_STORE.md](./PUSH_AND_PLAY_STORE.md) |
| 웹 배포 | ✅ | Cloudflare Pages |
| Android 빌드 | ✅ | EAS preview/production |

학번 신규 가입(마이그레이션 `013` 적용 환경): 준회원·승인 상태로 생성된다. 로컬(비-Supabase) 모드 및 구 데이터에는 관리자 승인 UI가 사용될 수 있다.

시스템 구성: [ARCHITECTURE.md](./ARCHITECTURE.md)

### 동기화 서버 (비-Supabase)

- `GET/PUT /api/sync` — 앱 상태·코트·모집방 일괄 동기화
- `WS /ws` — 변경 브로드캐스트
- 데이터: `server/data.json` (로컬 개발용, gitignore)
- 프로덕션 배포는 Supabase Realtime을 사용한다.

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-08 | 아키텍처·개인정보·스토어 문구 문서, Supabase/푸시/EAS 현재 상태 반영 |
| 2026-07-07 | Supabase 마이그레이션 설계·스키마·Auth/코트/아바타 연동 |
| 2026-07-07 | 포인트 정책·관리자 운영/포인트 탭·동기화 서버 |
| 2026-07-07 | 코치 레슨 신청·승인·대기열·코치코트 제한 |
| 2026-07-07 | 친구 화면 분리, PRODUCT_SPEC 최초 작성 |
