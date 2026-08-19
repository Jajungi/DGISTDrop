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

const DEFAULT_QUICK_REPLIES = [
  { action: 'block', label: '참석 ✋', blockId: 'ATTEND_BLOCK_ID' },
  { action: 'block', label: '현황 📊', blockId: 'STATUS_BLOCK_ID' },
  { action: 'block', label: '파트너 🙋', blockId: 'SEEK_BLOCK_ID' },
  { action: 'block', label: '취소 ❌', blockId: 'CANCEL_BLOCK_ID' },
];

const MENU_QUICK_REPLIES = [
  { action: 'message', label: '참석 ✋', messageText: '참석' },
  { action: 'message', label: '현황 📊', messageText: '현황' },
  { action: 'message', label: '파트너 🙋', messageText: '파트너' },
  { action: 'message', label: '취소 ❌', messageText: '취소' },
];

function cardWithButtons(title, description, buttons) {
  return {
    version: '2.0',
    template: {
      outputs: [{
        basicCard: {
          title,
          description,
          buttons
        }
      }]
    }
  };
}

// ──────────────────────────────────────────────
// 스킬 1: 참석 버튼 (오픈빌더 블록에서 호출)
// ──────────────────────────────────────────────
router.post('/attend', async (req, res) => {
  const userRequest = req.body.userRequest;
  const kakaoUserId = userRequest?.user?.id;
  const username = userRequest?.user?.properties?.nickname || '익명';

  const today = new Date().toISOString().split('T')[0];

  // Supabase에 참석 기록
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

  // 현재 참석자 수 조회
  const { count } = await supabase
    .from('kakao_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)
    .eq('status', 'attending');

  res.json(simpleText(`✅ ${username}님 참석 등록 완료!\n현재 참석 예정: ${count}명 🏸`, MENU_QUICK_REPLIES));
});

// ──────────────────────────────────────────────
// 스킬 2: 현재 현황 조회 (실시간 상태)
// ──────────────────────────────────────────────
router.post('/status', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // 참석자 목록
  const { data: attendees } = await supabase
    .from('kakao_attendance')
    .select('nickname, status')
    .eq('date', today)
    .eq('status', 'attending');

  // 파트너 구하는 사람
  const { data: seekers } = await supabase
    .from('kakao_attendance')
    .select('nickname')
    .eq('date', today)
    .eq('status', 'seeking_partner');

  const attendeeList = attendees?.map(a => a.nickname).join(', ') || '없음';
  const seekerList = seekers?.map(s => s.nickname).join(', ') || '없음';
  const totalCount = attendees?.length || 0;

  const statusText = [
    `📍 S1 체육관 현황 (${today})`,
    `━━━━━━━━━━━━━━━━━━`,
    `👥 참석 인원: ${totalCount}명`,
    `📋 참석자: ${attendeeList}`,
    ``,
    `🔍 파트너 구하는 중:`,
    `${seekerList}`,
    `━━━━━━━━━━━━━━━━━━`,
  ].join('\n');

  const response = {
    version: '2.0',
    template: {
      outputs: [{
        basicCard: {
          title: 'S1 체육관 현황',
          description: statusText,
          buttons: [
            { action: 'message', label: '참석할게요! ✋', messageText: '참석' },
            { action: 'message', label: '파트너 구해요 🙋', messageText: '파트너' },
            { action: 'message', label: '취소할게요 ❌', messageText: '취소' }
          ]
        }
      }],
      quickReplies: MENU_QUICK_REPLIES
    }
  };
  res.json(response);
});

// ──────────────────────────────────────────────
// 스킬 3: 파트너 구하기
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

  res.json(simpleText(`🙋 ${username}님이 파트너를 구하고 있어요!\n다른 분들이 현황에서 확인할 수 있습니다.`, MENU_QUICK_REPLIES));
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

  res.json(simpleText(`❌ ${username}님 참석 취소되었습니다.`, MENU_QUICK_REPLIES));
});

module.exports = router;
