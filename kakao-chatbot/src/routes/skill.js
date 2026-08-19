const express = require('express');
const { supabase } = require('../supabase');
const router = express.Router();
const CHANNEL_1TO1_URL = process.env.KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_YOUR_CHANNEL/chat';
const SITE_STATUS_URL = process.env.SITE_STATUS_URL || 'https://dgistdrop.onrender.com';

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

// 단톡 공지용은 오픈빌더 채널메시지에서 "참여/채널이동" 2버튼으로 구성하고,
// 스킬 응답은 채널 내 후속 처리 중심으로 유지한다.
const CHANNEL_MENU = [
  { action: 'message', label: '참석 ✋', messageText: '참석' },
  { action: 'message', label: '현황 확인 📊', messageText: '현황' },
  { action: 'message', label: '참석 취소 ❌', messageText: '취소' },
  { action: 'webLink', label: '사이트 열기 🌐', webLinkUrl: SITE_STATUS_URL },
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
  const username = userRequest?.user?.properties?.nickname || '익명';
  const today = new Date().toISOString().split('T')[0];
  const signupUrl = SITE_STATUS_URL;

  if (!kakaoUserId) {
    return res.json(
      simpleText(
        `카카오 사용자 식별에 실패했어요.\n1:1 채널에서 다시 시도해 주세요.\n${CHANNEL_1TO1_URL}`,
        CHANNEL_MENU
      )
    );
  }

  // 사이트 회원과 카카오 아이디 매칭 확인
  const { data: foundByKakaoId, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, student_id')
    .eq('kakao_id', kakaoUserId)
    .maybeSingle();

  if (profileError) {
    return res.json(
      simpleText(
        `회원 조회 중 오류가 발생했어요.\n잠시 후 다시 시도해 주세요.`,
        CHANNEL_MENU
      )
    );
  }

  let matchedProfile = foundByKakaoId;

  // 편의 자동연결: 이름이 정확히 일치하고 대상이 1명이며 kakao_id가 비어있으면 자동 등록
  if (!matchedProfile) {
    const { data: byName, error: byNameError } = await supabase
      .from('profiles')
      .select('id, name, student_id, kakao_id')
      .eq('name', username);

    if (!byNameError && byName && byName.length === 1 && !byName[0].kakao_id) {
      const candidate = byName[0];
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ kakao_id: kakaoUserId })
        .eq('id', candidate.id);
      if (!updateError) {
        matchedProfile = {
          id: candidate.id,
          name: candidate.name,
          student_id: candidate.student_id,
        };
      }
    }
  }

  if (!matchedProfile) {
    return res.json(
      simpleText(
        `등록되지 않은 카카오 아이디입니다.\n프로필의 카카오 아이디에 아래 값을 입력해 주세요:\n${kakaoUserId}\n\n사이트: ${signupUrl}`,
        CHANNEL_MENU
      )
    );
  }

  // 같은 사람이 같은 날 중복 신청하면 차단
  const { data: existing } = await supabase
    .from('kakao_attendance')
    .select('id, status')
    .eq('kakao_user_id', kakaoUserId)
    .eq('date', today)
    .maybeSingle();

  if (existing && existing.status === 'attending') {
    return res.json(
      simpleText(
        `이미 신청했습니다! ✅\n참여 확인/취소는 1:1 채널에서 해주세요.\n${CHANNEL_1TO1_URL}`,
        CHANNEL_MENU
      )
    );
  }

  const { error } = await supabase
    .from('kakao_attendance')
    .upsert({
      kakao_user_id: kakaoUserId,
      nickname: matchedProfile?.name || username,
      date: today,
      status: 'attending'
    }, { onConflict: 'kakao_user_id,date' });

  if (error) {
    return res.json(simpleText('참석 등록 중 오류가 발생했어요 😢'));
  }

  res.json(
    simpleText(
      `✅ ${matchedProfile.name}님 참석 등록 완료\n참여 확인/취소는 1:1 채널에서 해주세요.\n${CHANNEL_1TO1_URL}`,
      CHANNEL_MENU
    )
  );
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
  res.json(simpleText(`${text}\n상세 현황: ${SITE_STATUS_URL}`, CHANNEL_MENU));
});


// ──────────────────────────────────────────────
// 스킬 4: 참석 취소
// ──────────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  const kakaoUserId = req.body.userRequest?.user?.id;
  const username = req.body.userRequest?.user?.properties?.nickname || '익명';
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('kakao_attendance')
    .select('id')
    .eq('kakao_user_id', kakaoUserId)
    .eq('date', today)
    .maybeSingle();

  if (!existing) {
    return res.json(simpleText(`취소할 신청 내역이 없어요.\n참여는 단톡방 버튼으로 신청해주세요.`, CHANNEL_MENU));
  }

  await supabase
    .from('kakao_attendance')
    .delete()
    .eq('kakao_user_id', kakaoUserId)
    .eq('date', today);

  res.json(simpleText(
    `✅ ${username}님 참석 취소 완료\n참여 확인/재신청은 1:1 채널에서 해주세요.\n${CHANNEL_1TO1_URL}`,
    CHANNEL_MENU
  ));
});

module.exports = router;
