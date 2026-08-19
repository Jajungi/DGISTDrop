const express = require('express');
const { supabase } = require('../supabase');
const router = express.Router();
const CHANNEL_1TO1_URL = process.env.KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_YOUR_CHANNEL/chat';

/**
 * 카카오 i 오픈빌더 스킬 응답 포맷 헬퍼
 */
function simpleText(text, quickReplies) {
  const response = {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }]
    }
  };
  if (quickReplies) {
    response.template.quickReplies = quickReplies;
  }
  return response;
}

// 채널 1:1 채팅 메뉴 버튼 (3개)
const CHANNEL_MENU = [
  { action: 'message', label: '참석 ✋', messageText: '참석' },
  { action: 'message', label: '현황 📊', messageText: '현황' },
  { action: 'message', label: '취소 ❌', messageText: '취소' },
];

// 로비(파트너 모집방) 조회 헬퍼
async function getOpenLobbyRooms() {
  const { data } = await supabase
    .from('team_rooms')
    .select('id, host_name, title, members, status')
    .eq('status', 'open');
  return data || [];
}

// ──────────────────────────────────────────────
// 스킬 1: 참석 등록
// ──────────────────────────────────────────────
router.post('/attend', async (req, res) => {
  const userRequest = req.body.userRequest;
  const kakaoUserId = userRequest?.user?.id;
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('kakao_attendance')
    .upsert({
      kakao_user_id: kakaoUserId,
      nickname: username,
      date: today,
      status: 'attending'
    }, { onConflict: 'kakao_user_id,date' });

  if (error) {
    return res.json(simpleText('참석 등록 중 오류가 발생했어요 😢'));
  }

  res.json(simpleText(
    `✅ 참석 등록 완료\n상세 현황/참여자 확인은 1:1 채널에서 해주세요.\n${CHANNEL_1TO1_URL}`,
    CHANNEL_MENU
  ));
});

// ──────────────────────────────────────────────
// 스킬 2: 현황 (참석자 + 파트너 구하는 사람 통합)
// ──────────────────────────────────────────────
router.post('/status', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: all } = await supabase
    .from('kakao_attendance')
    .select('nickname, status')
    .eq('date', today);

  const attendees = all?.filter(a => a.status === 'attending') || [];
  const total = attendees.length;

  // 로비(파트너 모집방) 열린 방 조회
  const lobbyRooms = await getOpenLobbyRooms();

  let text = `📍 S1 체육관 현황\n━━━━━━━━━━━━━━━\n`;
  text += `👥 참석 ${total}명\n`;

  if (total > 0) {
    text += attendees.map(a => `  • ${a.nickname}`).join('\n');
  } else {
    text += `  아직 없어요`;
  }

  if (lobbyRooms.length > 0) {
    text += `\n\n🔍 파트너 모집 중 (${lobbyRooms.length}방)\n`;
    text += lobbyRooms.map(r => `  • ${r.title} (${r.host_name})`).join('\n');
  }

  text += `\n━━━━━━━━━━━━━━━`;
  text += `\n상세 현황: ${SITE_STATUS_URL}`;

  res.json(simpleText(text, CHANNEL_MENU));
});


// ──────────────────────────────────────────────
// 스킬 4: 참석 취소
// ──────────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  const kakaoUserId = req.body.userRequest?.user?.id;
  const today = new Date().toISOString().split('T')[0];

  await supabase
    .from('kakao_attendance')
    .delete()
    .eq('kakao_user_id', kakaoUserId)
    .eq('date', today);

  res.json(simpleText(
    `✅ 참석 취소 완료\n상세 현황/참여자 확인은 1:1 채널에서 해주세요.\n${CHANNEL_1TO1_URL}`,
    CHANNEL_MENU
  ));
});

module.exports = router;
