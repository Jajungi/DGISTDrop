const express = require('express');
const { supabase } = require('../supabase');
const router = express.Router();

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

// ──────────────────────────────────────────────
// 스킬 1: 참석 등록
// ──────────────────────────────────────────────
router.post('/attend', async (req, res) => {
  const userRequest = req.body.userRequest;
  const kakaoUserId = userRequest?.user?.id;
  const username = userRequest?.user?.properties?.nickname || '익명';
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

  const { count } = await supabase
    .from('kakao_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);

  res.json(simpleText(`✅ ${username}님 참석!\n현재 ${count}명 등록 🏸`, CHANNEL_MENU));
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
  const seekers = all?.filter(a => a.status === 'seeking_partner') || [];
  const total = all?.length || 0;

  let text = `📍 S1 체육관 현황\n━━━━━━━━━━━━━━━\n`;
  text += `👥 총 ${total}명\n\n`;

  if (attendees.length > 0) {
    text += `✅ 참석 (${attendees.length}명)\n`;
    text += attendees.map(a => `  • ${a.nickname}`).join('\n');
  }

  if (seekers.length > 0) {
    text += `\n\n🔍 파트너 구하는 중 (${seekers.length}명)\n`;
    text += seekers.map(s => `  • ${s.nickname}`).join('\n');
  }

  if (total === 0) {
    text += `아직 등록한 사람이 없어요.`;
  }

  text += `\n━━━━━━━━━━━━━━━`;

  // 현황에서는 파트너 구하기 버튼도 추가
  const statusMenu = [
    { action: 'message', label: '참석 ✋', messageText: '참석' },
    { action: 'message', label: '파트너 구해요 🙋', messageText: '파트너' },
    { action: 'message', label: '취소 ❌', messageText: '취소' },
  ];

  res.json(simpleText(text, statusMenu));
});

// ──────────────────────────────────────────────
// 스킬 3: 파트너 구하기 (현황에서 접근)
// ──────────────────────────────────────────────
router.post('/seek-partner', async (req, res) => {
  const kakaoUserId = req.body.userRequest?.user?.id;
  const username = req.body.userRequest?.user?.properties?.nickname || '익명';
  const today = new Date().toISOString().split('T')[0];

  await supabase
    .from('kakao_attendance')
    .upsert({
      kakao_user_id: kakaoUserId,
      nickname: username,
      date: today,
      status: 'seeking_partner'
    }, { onConflict: 'kakao_user_id,date' });

  res.json(simpleText(`🙋 ${username}님 파트너 구하는 중!\n현황에서 확인할 수 있어요.`, CHANNEL_MENU));
});

// ──────────────────────────────────────────────
// 스킬 4: 참석 취소
// ──────────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  const kakaoUserId = req.body.userRequest?.user?.id;
  const username = req.body.userRequest?.user?.properties?.nickname || '익명';
  const today = new Date().toISOString().split('T')[0];

  await supabase
    .from('kakao_attendance')
    .delete()
    .eq('kakao_user_id', kakaoUserId)
    .eq('date', today);

  res.json(simpleText(`❌ ${username}님 참석 취소됨`, CHANNEL_MENU));
});

module.exports = router;
