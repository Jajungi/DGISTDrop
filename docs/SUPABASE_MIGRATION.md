# Supabase 백엔드 구성

**문서 버전**: 2026-07-08

로컬 저장소·동기화 서버에서 Supabase(Postgres, Auth, Storage, Realtime)로의 이전 절차 및 보안 모델을 기술한다.

보안: `service_role` 키는 클라이언트·공개 저장소에 포함하지 않는다. 포인트·출석·코트 예약 등 민감 쓰기는 RLS 및 Security Definer RPC로 서버에서 검증한다.

시스템 흐름: [ARCHITECTURE.md](./ARCHITECTURE.md)  
푸시: [PUSH_AND_PLAY_STORE.md](./PUSH_AND_PLAY_STORE.md)

---

## 1. 프로젝트 생성

| 항목 | 내용 |
|------|------|
| 콘솔 | [supabase.com](https://supabase.com) → New project |
| 프로젝트명 | `DGISTDrop` |
| Project ref | `xndodghcmedkkaurbnab` (기존 연동) |
| 리전 | Northeast Asia (Seoul) 권장 |
| DB 비밀번호 | 프로젝트 비밀로 보관 |
| GitHub | `Jajungi/DGISTDrop` 연동 가능 |

---

## 2. SQL 스키마

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `supabase/migrations/001_initial_schema.sql` | 테이블·enum·RLS·보존 트리거 |
| 대체 | `supabase/complete_after_enums.sql` | enum만 생성된 뒤 실패한 경우 나머지를 일괄 적용 |
| 2 | `supabase/migrations/002_storage_avatars.sql` | Storage 정책 |

Table Editor에서 `profiles`, `courts` 등 생성 여부를 확인한다.

---

## 3. Storage

| 항목 | 값 |
|------|-----|
| 버킷 | `avatars` |
| Public | ON |
| 크기 제한 | 200 KB |
| MIME | `image/jpeg`, `image/webp` |

이후 `002_storage_avatars.sql`을 적용한다.

---

## 4. 보안·기능 패치 (재실행 가능)

| 파일 | 내용 |
|------|------|
| `005_write_policies.sql` | 알림·관리자 로그 정책, `rpc_adjust_points` 권한, `guard_profile_columns` |
| `006_secure_points.sql` | 일반 사용자의 임의 적립 차단. 출석·청소·예약 환불은 전용 RPC |
| `007_social_tables.sql` | `friend_requests`, `coach_announcements`, `lesson_queue`, `team_rooms` + RLS·Realtime |
| `008_court_security_realtime.sql` | `rpc_reserve_court`, `guard_court_columns`, 추가 Realtime 발행 |
| `009_guest_access.sql` | 게스트 프로필 RPC |
| `010_fix_anonymous_user_trigger.sql` | Anonymous 가입 트리거 수정 |
| `011` / `014` | DB 리셋·안전 삭제 |
| `012_coach_access.sql` | `is_coach`, 공지 쓰기 권한 |
| `013_student_id_auth.sql` | 학번 검증, 신규 준회원 자동 승인 |
| `015_push_tokens.sql` / `.ready.sql` | 푸시 토큰 및 알림 트리거 |
| `033_club_roster.sql` | 가입 명단(학번+실명). **034보다 먼저** |
| `034_roles_occupancy_attendance.sql` | 관리자/운영자 분리, 코트 현황 기본, 참석 의사, 게스트 일일 삭제. 학번 `202662024` 운영자 고정 |
| `035_prune_push_tokens.sql` | 못 쓰는 푸시 기기 정리 RPC (`rpc_prune_push_tokens`). 같은 사람의 여러 기기는 유지 |

라이브 DB에는 SQL Editor에서 **033 → 034 → 035** 순으로 실행한다. 034를 안 넣으면 정회원 변경 시 운영자가 빠지거나 현황 모드 RPC가 없다.

`006` RPC 요약:

| RPC | 역할 |
|-----|------|
| `rpc_check_in(lat,lng)` | 출석, 지오펜스·일 1회·티어별 포인트 |
| `rpc_submit_cleaning(...)` | 청소·네트·콕 (+100 서버 고정) |
| `rpc_refund_court(court_id)` | 예약 취소 환불 |
| `rpc_reserve_court(...)` | 예약 전량 서버 검증·차감 (`008`) |

---

## 5. 환경 변수

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

| 설정 | 값 |
|------|-----|
| Auth → Email Confirm | OFF (학번 로그인) |
| `service_role` | 서버·SQL 트리거 전용. 앱·Git·Expo Extra에 두지 않음 |
| `EXPO_PUBLIC_SYNC_URL` | Supabase 사용 시 불필요 |

---

## 6. 관리자 계정

회원가입 후:

```sql
update public.profiles
set membership_tier = 'admin', member_status = 'approved'
where student_id = '<학번>';
```

참고: `supabase/003_promote_admin.sql`

---

## 7. 용량·보존

| 데이터 | 보존 | 표시 | 구현 |
|--------|------|------|------|
| `match_results` | 최근 50건 | 프로필 20건 | 트리거 + limit |
| 포인트 내역 | 사용자당 40건 | 30건 | 트리거 |
| 알림 | 사용자당 20건 | 20건 | 트리거 |
| 관리자 로그 | 최근 200건 | 50건 | 트리거 |
| 청소 인증 | 90일 | 리더보드 | 트리거 |
| 출석 | 365일 | 전체 | 주기 정리(선택) |
| 프로필 사진 | ≤150KB, 256×256 | Storage URL | 클라이언트 압축 |
| 코트 | 9행 고정 | 실시간 | Realtime |

상수: `src/constants/dataRetention.ts` · 압축: `src/services/avatarImage.ts`

---

## 8. 보안 모델

### 인증

| 방식 | 구현 |
|------|------|
| 학번 | 가상 이메일 `drop-{학번}@example.com` (`studentIdToAuthEmail`) |
| 신규 가입 (`013`) | 준회원 + `approved` |
| 게스트 | Anonymous Auth + `rpc_setup_guest_profile` |
| 비밀번호 | Supabase Auth bcrypt |

### RLS 요약

| 대상 | 규칙 |
|------|------|
| `profiles` | 소유자는 아바타·일정·재실 등만 수정. 포인트·Elo·등급은 트리거로 직접 수정 차단 |
| `point_transactions` | 직접 INSERT 불가 → RPC만. 일반 사용자는 차감만, 적립은 전용 RPC·관리자 |
| `notifications` | 수신자 읽기·읽음. insert는 승인 회원 |
| `friend_requests` / `lesson_queue` / `team_rooms` | 당사자·관리자 범위 (`007`) |
| `coach_announcements` | 읽기: 승인 회원. 쓰기: admin 또는 `is_coach` |
| `courts` | 예약은 `rpc_reserve_court`만. `guard_court_columns`로 상태 탈취 차단 |

### Storage

경로 `avatars/{user_id}/avatar.jpg` — 해당 사용자만 업로드·삭제, 공개 읽기.

클라이언트에 포함하지 않는 항목: `service_role`, 클라이언트만으로 포인트/Elo 갱신, 프로필 base64를 DB 컬럼에 저장.

---

## 9. 클라이언트 구현 상태

| 영역 | 상태 |
|------|------|
| `src/lib/supabase.ts`, `services/supabase/*` | 구현 |
| Auth·프로필·코트 Realtime | 구현 |
| point·match·notification·social 스토어 연동 | 구현 |
| Dashboard SQL 적용 | 운영 환경별로 수행 |

| 환경 변수 | 모드 |
|-----------|------|
| URL + anon 설정 | Supabase |
| 미설정 | AsyncStorage + 선택적 sync-server |

---

## 10. GitHub · 마이그레이션 연동 (선택)

저장소에 `supabase/migrations/`를 두고 Supabase Dashboard → Integrations → GitHub로 연결하면 `main` push 시 마이그레이션을 적용할 수 있다.  
초기 구축에는 SQL Editor에서 `complete_after_enums.sql` 등 수동 실행이 일반적이다.

공개 저장소: https://github.com/Jajungi/DGISTDrop

---

## 11. 장애 대응

| 증상 | 조치 |
|------|------|
| `profiles does not exist` (초기) | `complete_after_enums.sql` 실행 |
| `membership_tier already exists` | enum 존재 — `complete_after_enums`만 실행 |
| 로그인 실패 | Auth Users, 가상 이메일 `drop-{학번}@example.com` |
| RLS 오류 | `member_status = 'approved'`, 관리자 SQL |
| 코트 미표시 | `courts` 9행 seed |
| 아바타 실패 | 버킷·`002` 정책 |
| Realtime 미동작 | Replication / publication |

---

## 참고 경로

| 구분 | 경로 |
|------|------|
| 스키마 | `supabase/migrations/`, `supabase/*.sql` |
| 클라이언트 | `src/lib/supabase.ts`, `src/services/supabase/` |
| 로컬 sync | `server/sync-server.mjs` |
