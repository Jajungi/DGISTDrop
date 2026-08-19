const axios = require('axios');

const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY;

/**
 * 설정 기반으로 활동 알림 메시지 발송
 */
async function sendActivityMessage(settings) {
  const message = settings.message_template.replace('{time}', settings.activity_start_time);

  if (!KAKAO_ADMIN_KEY) {
    console.log('[카카오] ADMIN_KEY 없음 — 메시지 로그만 기록:', message);
    return { success: true, mode: 'log_only', message };
  }

  const response = await axios.post(
    'https://kapi.kakao.com/v1/api/talk/friends/message/default/send',
    {
      receiver_uuids: '[]',
      template_object: JSON.stringify({
        object_type: 'text',
        text: message,
        link: { web_url: '', mobile_web_url: '' },
        buttons: [
          {
            title: settings.button_text || '참석할게요! ✋',
            link: { web_url: '', mobile_web_url: '' }
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
