# Drop 카카오 비즈니스 채널 챗봇

DGIST 배드민턴 동아리 Drop의 카카오톡 채널 챗봇입니다.

## 기능

1. **활동 알림** — 화/목 18:00에 자동으로 "오늘 활동 있습니다!" 메시지 발송
2. **참석 버튼** — 버튼 클릭으로 참석 등록
3. **실시간 현황** — S1 체육관 인원, 참석자 목록, 파트너 구하는 사람 표시
4. **파트너 모집** — "파트너 구해요" 상태 등록

## 셋업 가이드

### 1단계: 카카오 채널 & 오픈빌더 설정

1. [카카오 비즈니스](https://business.kakao.com/) 접속 → 카카오톡 채널 생성
2. [카카오 i 오픈빌더](https://chatbot.kakao.com/) 접속 → 챗봇 생성
3. 챗봇을 채널에 연결

### 2단계: 오픈빌더 시나리오 설정

오픈빌더에서 아래 블록들을 생성:

| 블록 이름 | 사용자 발화 (키워드) | 스킬 URL |
|-----------|---------------------|----------|
| 참석 | "참석", "갈게", "ㄱ" | `https://your-server.com/api/skill/attend` |
| 현황 | "현황", "몇명", "누구" | `https://your-server.com/api/skill/status` |
| 파트너 구하기 | "파트너", "같이 칠사람" | `https://your-server.com/api/skill/seek-partner` |
| 취소 | "취소", "안갈래" | `https://your-server.com/api/skill/cancel` |

### 3단계: 스킬(Skill) 등록

오픈빌더 > 스킬 메뉴에서:
- 스킬 이름: `참석등록`
- URL: `https://your-server.com/api/skill/attend`
- Method: POST

나머지도 동일하게 등록.

### 4단계: Supabase 테이블 생성

`supabase-migration.sql` 파일의 SQL을 Supabase SQL Editor에서 실행.

### 5단계: 서버 배포

```bash
cd kakao-chatbot
cp .env.example .env
# .env 파일에 실제 키 입력
npm install
npm start
```

배포 추천: **Railway**, **Render**, **Fly.io** (무료 티어 가능)

### 6단계: 메시지 발송 설정 (선택)

화/목 자동 메시지 발송은 두 가지 방식 중 택일:

**A) 카카오 채널 메시지 API (알림톡)**
- 카카오 비즈니스에서 알림톡 템플릿 등록 & 승인 필요
- `KAKAO_ADMIN_KEY` 필요

**B) 오픈빌더 "채널 메시지" (더 간단)**
- 오픈빌더 > 배포 > 채널 메시지에서 예약 발송 설정
- 코드 없이 오픈빌더 UI에서 직접 설정 가능
- **이 방법이 가장 쉬움!**

## 아키텍처

```
카카오톡 사용자
    ↕ (챗봇 대화)
카카오 i 오픈빌더
    ↕ (스킬 호출)
Express 서버 (이 코드)
    ↕ (데이터)
Supabase (PostgreSQL)
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role 키 |
| `KAKAO_ADMIN_KEY` | 카카오 어드민 키 (메시지 발송용) |
| `PORT` | 서버 포트 (기본 3001) |
