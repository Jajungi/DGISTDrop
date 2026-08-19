-- 카카오 챗봇 참석 관리 테이블
CREATE TABLE IF NOT EXISTS kakao_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_user_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'attending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kakao_user_id, date)
);

CREATE INDEX idx_kakao_attendance_date ON kakao_attendance(date);
CREATE INDEX idx_kakao_attendance_status ON kakao_attendance(date, status);

-- 챗봇 설정 테이블
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  activity_days TEXT[] DEFAULT ARRAY['tue','thu'],
  activity_start_time TEXT DEFAULT '18:30',
  notify_time TEXT DEFAULT '18:00',
  message_template TEXT DEFAULT '🏸 오늘 {time}부터 활동 있습니다!\n활동하실 분은 눌러주세요🏸',
  button_text TEXT DEFAULT '참석할게요! ✋',
  bot_enabled BOOLEAN DEFAULT true,
  auto_notify_enabled BOOLEAN DEFAULT true,
  cancel_today BOOLEAN DEFAULT false,
  cancel_message TEXT DEFAULT '❌ 오늘 활동이 취소되었습니다.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- 기본 설정 삽입
INSERT INTO chatbot_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- 봇 메시지 발송 로그
CREATE TABLE IF NOT EXISTS chatbot_message_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'activity', 'cancel', 'custom'
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by TEXT, -- admin user id
  response_count INTEGER DEFAULT 0
);
