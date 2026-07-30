# Drop — 기능 정의서 (이미지 제작용)

**용도:** 랜딩 페이지가 아니라, 기능별로 **스크린샷 + 정의 + 원리**를 보고 AI가 **기능 설명 이미지**를 그리기 위한 문서입니다.  
**제품:** DGIST 배드민턴 동아리 Drop · S1 실내체육관 · 화·목 18:30–21:50  
**스크린샷:** `docs/site-intro/screenshots/` (2026-07-30 재캡처, 코트 mock 없음)

### 이미지 제작 공통 규칙

- 레퍼런스 PNG의 **UI 구조·배치**를 따른다. 없는 기능을 그리지 않는다.
- 톤: 크림/오프화이트, 틸·포레스트 그린. 보라 그라데이션·다크모드 기본·배지 스티커 남발 금지.
- 각 기능 이미지에는 **기능명(한글) + 한 줄 목적** 텍스트 자리를 남긴다.
- 출력: 기능 카드/슬라이드용 **16:9 또는 4:3** (모바일 기능은 9:16 가능).

---

## F00. 제품 목표

| 항목 | 내용 |
|------|------|
| **한 줄** | S1 9코트·출석·합류·모집·레슨·포인트를 한 앱에서 실시간 운영하는 동아리 배드민턴 OS |
| **해결** | 단톡 문의 → 현황 가시화 / 노쇼·독점 → 지오펜스·포인트·게임 수 점유 / 레슨 줄 → ETA·사이렌 |
| **권한** | 게스트 < 회원 < 운영자(`is_operator`) < 관리자(owner) |
| **데이터** | Supabase Auth·RLS·Realtime · 웹 Cloudflare · Android EAS |

---

## F01. 로그인 · 가입 · 게스트

| 항목 | 내용 |
|------|------|
| **화면** | `/login` |
| **스크린샷** | `F01-login.png` |
| **목적** | 학번 회원 인증, 신규 가입, 게스트 체험 입장 |
| **주요 UI** | Drop 로고 · 탭(로그인/회원가입/게스트) · 학번·비밀번호 · 게스트 이름 |
| **동작** | 회원: Auth+프로필. 가입은 오픈가입 또는 승인 대기. 게스트: 임시 세션, 기능 일부만 |
| **원리** | `rpc_setup_guest_profile` / 학번 검증 / 세션 복구·빠른 로그인 |
| **이미지에 넣을 것** | 세 탭이 보이는 인증 카드. 「학번으로 들어가거나, 게스트로 먼저 본다」 |
| **이미지 프롬프트** | `Feature-spec illustration for Drop badminton app login. Reference F01-login.png. Clean card: logo, tabs Login/Sign-up/Guest, student ID field, forest-green button. Soft off-white. Korean label space “로그인·가입·게스트”. No marketing hero collage. 4:3.` |

---

## F02. 코트 현황 · 예약 · 경기 · 합류

| 항목 | 내용 |
|------|------|
| **화면** | `/` |
| **스크린샷** | `F02-courts.png`, `F02-courts-mobile.png` |
| **목적** | S1 9코트를 한눈에 보고 예약·시작·완료·반납·합류 |
| **배치** | 무대↑ 1·4·7 / 2·5·8 / 3·6·9 ↓입구. **3번=코치 코트**. A/B(센터)/C열 |
| **지표** | 지금 N명 · 가능 · 예약 · 경기 · 필터(전체/가능/내꺼) |
| **상태 시각** | empty 어두운 초록 · reserved+「예약됨」 · playing 파랑+인원/경기수 · just_finished「정리 중」 |
| **부가** | 난타(반코트) / 경기(Elo) · 코트 위 아바타 · 웹 마우스 그림자 · 탭 시 인라인 확대 |
| **규칙 원리** | ① 게임 수 점유 ② S1 지오펜스에서만 액션 ③ 포인트 차감(일반20/중앙30, 랭크 할인, 피크 한도) ④ 합류→호스트 알림 원탭 ⑤ 점수 입력 시 Elo·승패P 즉시(난타는 친선, 일일 한도 초과 시 관리자 승인) |
| **이미지에 넣을 것** | 9코트 맵이 주인공. 상태 색 범례. 「톡 대신 한눈에」가 아니라 정의서 톤의 기능명 「코트 현황」 |
| **이미지 프롬프트** | `Feature-definition plate for court overview. Reference F02-courts.png. 3x3 badminton courts, stage top entrance bottom, court 3 coaching mark, status legend empty/reserved/playing. Cream floor, teal UI chrome. Caption area “F02 코트 현황”. Accurate UI, not splash ad. 16:9.` |
| **모바일** | `F02-courts-mobile.png` — 세로 폰 프레임 한 대. `9:16 product UI plate, single phone, court grid readable.` |

---

## F03. 친구 · 체육관 온라인 · 일정

| 항목 | 내용 |
|------|------|
| **화면** | `/friends` |
| **스크린샷** | `F03-friends.png`, `F03-friends-schedule.png` |
| **목적** | 가기 전 친구 도착·일정·오늘 출석 동아리원 파악 |
| **UI** | 탭 친구/일정 · 체육관·온라인 · 오프라인 · 오늘 출석(비친구) |
| **원리** | 친구=`isFavorite`+신청 관계 · `isAtGym` Realtime · 출석 기록 연동 · 헤더 인원 검색 |
| **이미지에 넣을 것** | 온라인/오프라인 구분, 「체육관」 뱃지, 일정 바 |
| **이미지 프롬프트** | `Feature plate Friends presence. Reference F03-friends.png. List with gym-online badge and offline section. Light UI, teal accents. Label “F03 친구·출석 현황”. 4:3.` |
| **일정 탭** | `F03-friends-schedule.png` — 타임라인 바 강조. `schedule timeline bars for friends arrival.` |

---

## F04. 파트너 모집

| 항목 | 내용 |
|------|------|
| **화면** | `/lobby` |
| **스크린샷** | `F04-lobby.png` |
| **목적** | 실력대 맞는 파트너를 모집방으로 모은 뒤 코트로 연결 |
| **UI** | 방 카드(제목·호스트·랭크·인원 슬롯·HOT·참여) |
| **원리** | 생성은 회원, 게스트는 참여만 · 비밀번호·min/max 인원·랭크 조건 · 친구 UI는 본 화면에 없음 |
| **이미지 프롬프트** | `Feature plate partner lobby rooms. Reference F04-lobby.png. Rank tags, avatar slots, Join. Label “F04 파트너 모집”. 4:3.` |

---

## F05. MY 기록 · 포인트 · 권한

| 항목 | 내용 |
|------|------|
| **화면** | `/profile` |
| **스크린샷** | `F05-profile.png` |
| **목적** | 전적·Elo·포인트·출석·봉사·혼잡 차트·레슨 신청 (회원). 게스트는 이용 가능 기능 요약 |
| **게스트(캡처)** | 가능: 코트 예약·모집 참여·안내 / 불가: 포인트·전적·친구·출석·봉사 |
| **원리** | 포인트는 결제 없이 활동 적립(출석·청소·네트·승패) · 예약·셔틀콕 사용 · 시간대 혼잡 차트 |
| **이미지 프롬프트** | `Feature plate MY profile. Reference F05-profile.png. Avatar, membership, capability checklist for guest vs member. Label “F05 MY 기록”. 4:3.` |

---

## F06. 이용 안내

| 항목 | 내용 |
|------|------|
| **화면** | `/guide` |
| **스크린샷** | `F06-guide.png` |
| **목적** | 규칙·FAQ·회칙·포인트표·매너·레슨을 앱 내 아코디언으로 제공 |
| **원리** | 비활동 시간에도 동일 가이드 노출 · 인터랙티브 코트 다이어그램 |
| **이미지 프롬프트** | `Feature plate in-app guide accordion. Reference F06-guide.png. Sections rules/FAQ/points. Label “F06 이용 안내”. 4:3.` |

---

## F07. 코칭 · 레슨 · ETA · 사이렌

| 항목 | 내용 |
|------|------|
| **화면** | `/coaching` (3번 코트와 연동) |
| **스크린샷** | `F07-coaching.png` |
| **목적** | 코치 공지 + 레슨 권한·대기열·차례 알림 |
| **플로우** | 신청(pending) → 입금확인 승인 → 대기열 → next(+사이렌) → 3번 예약 → active → complete → 다음 next |
| **ETA** | 앞선 인원 × 약 15분, 종료마다 재계산 (대략) |
| **원리** | 3번은 next/active+승인만 예약 · 일반 난타와 분리 |
| **이미지 프롬프트** | `Feature plate coaching queue. Reference F07-coaching.png. Announcements + queue ETA “약 20분 후” + siren-before-ready concept. Court 3. Label “F07 레슨 대기열”. 16:9.` |

---

## F08. 개인정보처리방침

| 항목 | 내용 |
|------|------|
| **화면** | `/privacy` |
| **스크린샷** | `F08-privacy.png` |
| **목적** | 공개 개인정보 고지 (신뢰·법무) |
| **이미지** | 필요 시 문서형 정적 플레이트만. 마케팅 비주얼 우선순위 낮음. |

---

## F09. 관리 · 운영 (스크린샷 없음 — 운영진 전용)

| 항목 | 내용 |
|------|------|
| **화면** | `/admin` |
| **목적** | 회원 승인·코트 강제·레슨·포인트·공지·DB 리셋·감사 로그 |
| **역할** | 관리자=owner 전체(+개발자 탭) · 운영자=일상 운영 |
| **이미지 프롬프트** | `Feature plate admin console (no screenshot). Light theme tabs members/courts/lessons/points, approval checks, teal. Label “F09 운영 콘솔”. Not purple SaaS. 16:9.` |

---

## F10. 공통 크롬 · 알림

| 항목 | 내용 |
|------|------|
| **UI** | 사이드바 · 인원 검색 · 출석 · 알림벨 · 프로필 칩 |
| **알림** | 합류 원탭 수락/거절 · 레슨 · 시스템 · 친구. 웹: 호버 유지, 더보기는 패널 내 확장 스크롤 |
| **푸시** | 네이티브 Expo Push → `send-push` (웹은 인앱) |
| **이미지** | 헤더+알림 패널 클로즈업. `notification panel with Accept/Reject on join request. Label “알림·합류 원탭”.` |

---

## 포인트·예약 수치 (이미지 표용)

| 구분 | 값 |
|------|-----|
| 적립 예 | 출석 100~150 · 청소/네트 100 · 승 50 / 패 20 |
| 사용 예 | 일반 코트 20 · 중앙 30 · 셔틀콕 20 |
| 최소 잔고 | 30P |
| 피크 예약 | 19–20시 하루 2회 |
| Elo 자동 반영 한도 | 하루 8회 초과 시 관리자 승인 |

---

## AI 작업 지시 (복붙)

```
역할: Drop 기능 정의서 기반 일러스트 디렉터
입력: docs/site-intro/FEATURE_SPEC.md + screenshots/F*.png
출력: 기능 ID별(F01–F10) 설명 이미지용 영문 프롬프트 확정본 + 한글 캡션(기능명·한 줄 목적)
금지: 랜딩 히어로 광고 톤, 없는 기능, 보라 네온, mock 예약 데이터가 있는 것처럼 그리기(코트는 정의서/스크린샷 기준)
형식: 각 이미지에 “F0x 기능명” 라벨
```
