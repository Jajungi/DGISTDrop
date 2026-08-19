const express = require('express');
const crypto = require('crypto');
const { supabase } = require('../supabase');

const router = express.Router();

const GROUP_BOT_API_KEY = process.env.GROUP_BOT_API_KEY || '';
const SITE_STATUS_URL = process.env.SITE_STATUS_URL || 'https://dgistdrop.pages.dev/';

function unauthorized(res) {
  return res.status(401).json({ ok: false, message: 'Unauthorized' });
}

function verifyRequest(req) {
  if (!GROUP_BOT_API_KEY) return false;
  const provided = req.header('x-group-bot-key') || '';
  return provided === GROUP_BOT_API_KEY;
}

function todayKeySeoul() {
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
  return new Date(now).toISOString().slice(0, 10);
}

function senderKey(room, sender, profileHash) {
  const raw = `${room}::${sender}::${profileHash || ''}`;
  const digest = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
  return `group-${digest}`;
}

async function getOpenLobbyRooms() {
  const { data } = await supabase
    .from('team_rooms')
    .select('id, host_name, title, status')
    .eq('status', 'open');
  return data || [];
}

router.post('/attend', async (req, res) => {
  if (!verifyRequest(req)) return unauthorized(res);

  const { room, sender, profileHash } = req.body || {};
  if (!room || !sender) {
    return res.status(400).json({ ok: false, message: 'room/sender required' });
  }

  const date = todayKeySeoul();
  const key = senderKey(room, sender, profileHash);

  const { data: existing } = await supabase
    .from('kakao_attendance')
    .select('id, status')
    .eq('kakao_user_id', key)
    .eq('date', date)
    .maybeSingle();

  if (existing && existing.status === 'attending') {
    return res.json({
      ok: true,
      duplicate: true,
      message: '이미 신청했습니다! ✅',
    });
  }

  const { error } = await supabase
    .from('kakao_attendance')
    .upsert(
      {
        kakao_user_id: key,
        nickname: sender,
        date,
        status: 'attending',
      },
      { onConflict: 'kakao_user_id,date' }
    );

  if (error) {
    return res.status(500).json({ ok: false, message: '참석 등록 실패', detail: error.message });
  }

  const { count } = await supabase
    .from('kakao_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('date', date)
    .eq('status', 'attending');

  return res.json({
    ok: true,
    message: `참석 등록 완료! 현재 ${count || 0}명`,
  });
});

router.post('/cancel', async (req, res) => {
  if (!verifyRequest(req)) return unauthorized(res);
  const { room, sender, profileHash } = req.body || {};
  if (!room || !sender) {
    return res.status(400).json({ ok: false, message: 'room/sender required' });
  }

  const date = todayKeySeoul();
  const key = senderKey(room, sender, profileHash);

  const { data: existing } = await supabase
    .from('kakao_attendance')
    .select('id')
    .eq('kakao_user_id', key)
    .eq('date', date)
    .maybeSingle();

  if (!existing) {
    return res.json({
      ok: true,
      message: '취소할 신청 내역이 없어요.',
    });
  }

  const { error } = await supabase
    .from('kakao_attendance')
    .delete()
    .eq('kakao_user_id', key)
    .eq('date', date);

  if (error) {
    return res.status(500).json({ ok: false, message: '취소 실패', detail: error.message });
  }

  return res.json({
    ok: true,
    message: '참석 취소 완료.',
  });
});

router.post('/status', async (req, res) => {
  if (!verifyRequest(req)) return unauthorized(res);
  const date = todayKeySeoul();

  const { data: attendance } = await supabase
    .from('kakao_attendance')
    .select('nickname, status')
    .eq('date', date)
    .eq('status', 'attending');

  const attendees = attendance || [];
  const lobbyRooms = await getOpenLobbyRooms();

  let text = `📍 S1 체육관 현황\n━━━━━━━━━━━━━━━\n`;
  text += `👥 참석 ${attendees.length}명\n`;
  text += attendees.length > 0 ? attendees.map((a) => `• ${a.nickname}`).join('\n') : '• 아직 없어요';

  if (lobbyRooms.length > 0) {
    text += `\n\n🔍 파트너 모집 중 (${lobbyRooms.length}방)\n`;
    text += lobbyRooms.map((r) => `• ${r.title} (${r.host_name})`).join('\n');
  }

  text += `\n━━━━━━━━━━━━━━━\n상세: ${SITE_STATUS_URL}`;

  return res.json({ ok: true, message: text });
});

module.exports = router;

