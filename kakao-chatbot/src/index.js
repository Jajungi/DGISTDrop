require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { supabase } = require('./supabase');
const { sendActivityMessage } = require('./kakao-api');
const skillRouter = require('./routes/skill');

const app = express();
app.use(express.json());

// 카카오 챗봇 스킬 API 라우트
app.use('/api/skill', skillRouter);

// 헬스체크
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 스케줄러: 화(2), 목(4) 18:00에 활동 알림 발송
cron.schedule('0 18 * * 2,4', async () => {
  console.log('[CRON] 활동 알림 발송 시작');
  try {
    await sendActivityMessage();
    console.log('[CRON] 활동 알림 발송 완료');
  } catch (err) {
    console.error('[CRON] 알림 발송 실패:', err.message);
  }
}, { timezone: 'Asia/Seoul' });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Drop 챗봇] 서버 실행 중 - port ${PORT}`);
});
