-- 카카오 챗봇 참석 관리 테이블
CREATE TABLE IF NOT EXISTS kakao_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_user_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'attending', -- 'attending' | 'seeking_partner'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kakao_user_id, date)
);

-- 인덱스
CREATE INDEX idx_kakao_attendance_date ON kakao_attendance(date);
CREATE INDEX idx_kakao_attendance_status ON kakao_attendance(date, status);
