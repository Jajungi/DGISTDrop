require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { supabase } = require('./supabase');
const { sendActivityMessage } = require('./kakao-api');
const skillRouter = require('./routes/skill');
const settingsRouter = require('./routes/settings');

const app = express();
app.use(express.json());

// CORS 허용 (Drop 사이트에서 API 호출용)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 카카오 챗봇 스킬 API 라우트
app.use('/api/skill', skillRouter);

// 관리자 설정 API
app.use('/api/settings', settingsRouter);

// 헬스체크
app.get('/health', async (req, res) => {
  const { data } = await supabase.from('chatbot_settings').select('*').eq('id', 'default').single();
  res.json({ status: 'ok', settings: data });
});

// 매분 체크: 현재 시간이 설정된 알림 시간 & 활동일이면 발송
cron.schedule('* * * * *', async () => {
  try {
    const { data: settings } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!settings || !settings.bot_enabled || !settings.auto_notify_enabled) return;
    if (settings.cancel_today) return;

    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    const seoulNow = new Date(now);
    const dayMap = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
    const today = dayMap[seoulNow.getDay()];
    const currentTime = `${String(seoulNow.getHours()).padStart(2, '0')}:${String(seoulNow.getMinutes()).padStart(2, '0')}`;

    if (!settings.activity_days.includes(today)) return;
    if (currentTime !== settings.notify_time) return;

    // 오늘 이미 발송했는지 확인
    const todayDate = seoulNow.toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('chatbot_message_log')
      .select('id')
      .eq('type', 'activity')
      .gte('sent_at', todayDate)
      .limit(1);

    if (existing && existing.length > 0) return;

    console.log('[CRON] 활동 알림 발송');
    await sendActivityMessage(settings);

    await supabase.from('chatbot_message_log').insert({
      type: 'activity',
      message: settings.message_template.replace('{time}', settings.activity_start_time),
    });
  } catch (err) {
    console.error('[CRON] 오류:', err.message);
  }
}, { timezone: 'Asia/Seoul' });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Drop 챗봇] 서버 실행 중 - port ${PORT}`);
});
