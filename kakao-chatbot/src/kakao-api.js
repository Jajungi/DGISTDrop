const axios = require('axios');

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY;

/**
 * 카카오 비즈니스 채널로 활동 알림 메시지 발송
 * 카카오톡 채널 메시지 API (브로드캐스트) 사용
 */
async function sendActivityMessage() {
  const today = new Date().toLocaleDateString('ko-KR', { 
    month: 'long', day: 'numeric', weekday: 'long' 
  });

  // 카카오 비즈메시지 API로 채널 메시지 발송
  // 실제로는 알림톡 템플릿 또는 채널 포스트를 사용
  const response = await axios.post(
    'https://kapi.kakao.com/v1/api/talk/friends/message/default/send',
    {
      receiver_uuids: '[]', // 전체 친구에게 발송 시 별도 로직 필요
      template_object: JSON.stringify({
        object_type: 'text',
        text: `🏸 오늘(${today}) 18:30부터 활동 있습니다!\n활동하실 분은 아래 버튼 눌러주세용🏸`,
        link: { web_url: '', mobile_web_url: '' },
        buttons: [
          {
            title: '참석할게요! ✋',
            link: { web_url: `${process.env.BOT_BASE_URL || 'http://localhost:3001'}/attend` }
          }
        ]
      })
    },
    {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

module.exports = { sendActivityMessage };
