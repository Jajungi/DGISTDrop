/**
 * MessengerBot R script (단톡 중심)
 *
 * 명령어
 * - 참여
 * - 취소
 * - 현황
 *
 * 보안:
 * - GROUP_BOT_API_KEY 를 서버와 동일하게 설정
 */

const API_BASE = 'https://dgistdrop.onrender.com/api/group-bot';
const GROUP_BOT_API_KEY = 'REPLACE_WITH_STRONG_SECRET';
const TARGET_ROOMS = ['드랍 단톡방']; // 실제 단톡방 이름으로 바꿔주세요.

function requestJson(method, url, body) {
  const conn = org.jsoup.Jsoup.connect(url)
    .ignoreContentType(true)
    .method(org.jsoup.Connection.Method[method])
    .header('Content-Type', 'application/json')
    .header('x-group-bot-key', GROUP_BOT_API_KEY)
    .requestBody(JSON.stringify(body))
    .timeout(8000);

  const res = conn.execute();
  return JSON.parse(res.body());
}

function isTargetRoom(room) {
  for (let i = 0; i < TARGET_ROOMS.length; i += 1) {
    if (TARGET_ROOMS[i] === room) return true;
  }
  return false;
}

function response(room, msg, sender, isGroupChat, replier, imageDB) {
  if (!isGroupChat) return;
  if (!isTargetRoom(room)) return;

  const trimmed = (msg || '').trim();
  if (trimmed !== '참여' && trimmed !== '취소' && trimmed !== '현황') return;

  try {
    const payload = {
      room: room,
      sender: sender,
      profileHash: imageDB && imageDB.getProfileHash ? String(imageDB.getProfileHash()) : '',
    };

    if (trimmed === '참여') {
      const result = requestJson('POST', API_BASE + '/attend', payload);
      replier.reply(result.message || '처리 완료');
      return;
    }
    if (trimmed === '취소') {
      const result = requestJson('POST', API_BASE + '/cancel', payload);
      replier.reply(result.message || '처리 완료');
      return;
    }
    if (trimmed === '현황') {
      const result = requestJson('POST', API_BASE + '/status', payload);
      replier.reply(result.message || '현황 조회 실패');
      return;
    }
  } catch (e) {
    replier.reply('봇 서버 연결 실패. 잠시 후 다시 시도해 주세요.');
  }
}

