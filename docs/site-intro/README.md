# Drop 기능 정의서 · 스크린샷

랜딩이 아니라 **기능 정의서용 이미지**를 만들 때 쓰는 자료입니다.

| 파일 | 역할 |
|------|------|
| [`FEATURE_SPEC.md`](./FEATURE_SPEC.md) | 기능 ID·목적·UI·원리·이미지 프롬프트 |
| [`screenshots/`](./screenshots/) | 화면 레퍼런스 PNG |

## 스크린샷 (재캡처)

| 파일 | 기능 |
|------|------|
| `F01-login.png` | 로그인·가입·게스트 |
| `F02-courts.png` | 코트 현황 (데스크톱, 빈 코트) |
| `F02-courts-mobile.png` | 코트 현황 (모바일) |
| `F03-friends.png` | 친구 |
| `F03-friends-schedule.png` | 친구·일정 |
| `F04-lobby.png` | 파트너 모집 |
| `F05-profile.png` | MY 기록 |
| `F06-guide.png` | 이용 안내 |
| `F07-coaching.png` | 코칭·레슨 |
| `F08-privacy.png` | 개인정보 |

관리자(F09)는 운영진 전용 → 스크린샷 없음, 정의서 텍스트만.

## 다시 찍기

```powershell
npx expo start --web --port 8083
$env:INTRO_BASE_URL="http://localhost:8083"
node scripts/capture-intro-screenshots.mjs
```

캡처는 게스트「스펙캡처」로 들어갑니다. 끝나면 Supabase에서 해당 게스트를 지우세요.
