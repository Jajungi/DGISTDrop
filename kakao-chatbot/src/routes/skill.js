const express = require('express');
const { supabase } = require('../supabase');
const router = express.Router();

// 채널 링크 (오픈빌더 배포 후 실제 채널 URL로 교체)
const CHANNEL_URL = process.env.KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_YOUR_CHANNEL';

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

// 채널 1:1 채팅에서 보여줄 메뉴 버튼
const CHANNEL_MENU = [
  { action: 'message', label: '참석 ✋', messageText: '참석' },
  { action: 'message', label: '현황 📊', messageText: '현황' },
  { action: 'message', label: '파트너 🙋', messageText: '파트너' },
  { action: 'message', label: '취소 ❌', messageText: '취소' },
];

// ──────────────────────────────────────────────
// 스킬: 참석 등록
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
    .eq('date', today)
    .eq('status', 'attending');

  res.json(simpleText(`✅ ${username}님 참석!\n현재 ${count}명 참석 예정 🏸`, CHANNEL_MENU));
});

// ──────────────────────────────────────────────
// 스킬: 현황 조회 (채널 1:1에서만 사용)
// ──────────────────────────────────────────────
router.post('/status', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: attendees } = await supabase
    .from('kakao_attendance')
    .select('nickname, status')
    .eq('date', today)
    .eq('status', 'attending');

  const { data: seekers } = await supabase
    .from('kakao_attendance')
    .select('nickname')
    .eq('date', today)
    .eq('status', 'seeking_partner');

  const totalCount = attendees?.length || 0;
  const seekerCount = seekers?.length || 0;

  let statusText = `📍 S1 체육관 현황\n━━━━━━━━━━━━━━━\n`;
  statusText += `👥 참석: ${totalCount}명\n`;

  if (totalCount > 0) {
    statusText += attendees.map((a, i) => `  ${i + 1}. ${a.nickname}`).join('\n');
  }

  if (seekerCount > 0) {
    statusText += `\n\n🔍 파트너 구하는 중 (${seekerCount}명)\n`;
    statusText += seekers.map((s, i) => `  ${i + 1}. ${s.nickname}`).join('\n');
  }

  statusText += `\n━━━━━━━━━━━━━━━`;

  res.json(simpleText(statusText, CHANNEL_MENU));
});

// ──────────────────────────────────────────────
// 스킬: 파트너 구하기
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

  res.json(simpleText(`🙋 ${username}님 파트너 구하는 중!\n채널에서 현황을 확인해보세요.`, CHANNEL_MENU));
});

// ──────────────────────────────────────────────
// 스킬: 참석 취소
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
