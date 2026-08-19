const express = require('express');
const { supabase } = require('../supabase');
const router = express.Router();

// 설정 조회
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 설정 업데이트
router.put('/', async (req, res) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  delete updates.id;

  const { data, error } = await supabase
    .from('chatbot_settings')
    .update(updates)
    .eq('id', 'default')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 오늘 활동 취소/복구 토글
router.post('/cancel-today', async (req, res) => {
  const { cancel } = req.body;
  const { data, error } = await supabase
    .from('chatbot_settings')
    .update({ cancel_today: cancel, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 수동 메시지 발송 (로그만 기록, 실제 카카오 발송은 별도)
router.post('/send-message', async (req, res) => {
  const { type, message, sent_by } = req.body;

  const { data, error } = await supabase
    .from('chatbot_message_log')
    .insert({ type: type || 'custom', message, sent_by })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, log: data });
});

// 발송 로그 조회
router.get('/logs', async (req, res) => {
  const { data, error } = await supabase
    .from('chatbot_message_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 오늘 참석자 조회
router.get('/attendees', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('kakao_attendance')
    .select('*')
    .eq('date', today)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
