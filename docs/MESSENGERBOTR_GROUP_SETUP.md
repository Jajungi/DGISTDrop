# 단톡 중심 메신저봇R 연동 가이드

이 문서는 `메신저봇R + 기존 Render 서버` 조합으로 단톡방 봇을 운영하는 방법을 설명합니다.

## 1) 아키텍처

- **단톡 메시지 수신/응답**: 안드로이드 폰 + 메신저봇R
- **비즈니스 로직/DB**: `https://dgistdrop.onrender.com` + Supabase
- **명령어**: `참여`, `취소`, `현황`

## 2) 서버 설정

Render 환경변수에 아래를 추가:

- `GROUP_BOT_API_KEY`: 32자 이상 랜덤 문자열
- `SITE_STATUS_URL`: `https://dgistdrop.pages.dev/`

서버 API:

- `POST /api/group-bot/attend`
- `POST /api/group-bot/cancel`
- `POST /api/group-bot/status`

모든 요청은 헤더 `x-group-bot-key` 필요.

## 3) 메신저봇R 스크립트 적용

파일: `kakao-chatbot/messengerbotr/drop-group-bot.js`

수정할 값:

1. `API_BASE` (서버 URL)
2. `GROUP_BOT_API_KEY` (서버와 동일)
3. `TARGET_ROOMS` (실제 단톡방 이름)

## 4) 안드로이드 폰 설정 (중요)

봇이 중간에 멈추지 않도록 아래 필수:

1. 절전 모드 해제
2. 배터리 최적화 제외 (카카오톡, 메신저봇R)
3. 앱 자동 실행 허용
4. 백그라운드 데이터 허용
5. 개발자 옵션의 불필요한 메모리 정리 기능 비활성화
6. 화면 꺼짐 중에도 네트워크 차단되지 않게 설정

가능하면 **서브폰 + 상시 충전 + 안정 Wi-Fi** 권장.

## 5) 보안 체크리스트

1. `GROUP_BOT_API_KEY`는 절대 단톡에 공유 금지
2. 메신저봇R 스크립트 백업 시 키 마스킹
3. Render 로그에 민감 정보 출력 금지
4. 단톡 외 방 반응 방지(`TARGET_ROOMS` 제한)
5. 서버 요청 타임아웃 8초 내 유지

## 6) 운영 팁

- `참여` 응답: 중복이면 `이미 신청했습니다!`
- `현황` 응답: 참석자 + 파트너 모집방
- 장애 시:
  - 폰 앱 살아있는지
  - Render 상태
  - Supabase 연결
  순으로 확인

## 7) 제한/주의

- 이 방식은 카카오 공식 챗봇(채널 1:1)과 다름
- 폰 기반 자동화라 기기/앱 업데이트 영향 받을 수 있음
- 운영 정책 리스크를 감수해야 함

