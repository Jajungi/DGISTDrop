import type { GuideSection } from '@/src/constants/guideContent';
import { GYM_LOCATION } from '@/src/constants';

const GYM_NAME = GYM_LOCATION.name;

/** English 이용 안내 — mirrors Korean structure with natural phrasing */
export function buildEnglishGuideSections(scheduleLabel: string): GuideSection[] {
  const scheduleContent =
    `Regular sessions run at ${GYM_NAME} on ${scheduleLabel}. ` +
    'Outside session hours, a banner appears at the top of the home screen. ' +
    'You can still check court status and other features.';

  return [
    {
      id: 'app',
      title: 'How to use the app',
      icon: '📱',
      intro:
        'Drop is built for on-site play at the S1 gym. Check courts on Home, mark attendance on session days, and use Friends, Lobby, and check-in.',
      pwaInstallGuide: true,
      items: [
        {
          title: 'Court status',
          when: 'occupancy',
          content:
            'Home shows all 9 courts as open or in use. Tap a court to zoom in. Staff update occupancy.',
        },
        {
          title: 'Court reservation',
          when: 'reservation',
          content:
            'Tap a court to expand it. Pick game type (rally / match) and number of games, then reserve. Tap the court area again or outside to close.',
        },
        {
          title: 'Rally vs match',
          when: 'reservation',
          content:
            'Rally uses half a court and doesn’t affect Elo or records. Match uses the full court; entering scores updates Elo, records, and points. No score = friendly.',
        },
        {
          title: 'Join an open slot',
          when: 'reservation',
          content:
            'Request to join a court with an open spot. If the host accepts, you’re in; if declined, you’ll get a notification.',
        },
        {
          title: 'Today’s attendance',
          content:
            'On session days (default Mon & Wed, plus dates admins add), you’ll be asked coming / not coming via push, My stats, or a popup. If coming, you can set an arrival time. Friends see your time; Home “Coming” counts only those who marked coming.',
        },
        {
          title: 'Check-in (on site)',
          content: `Tap Check in in the header within about 500 m of ${GYM_NAME}. Home “Here now” shows members who checked in this way.`,
        },
        {
          title: 'Lobby & friends',
          content:
            'Find partners in the Lobby tab. On Friends, see member schedules and attendance. Guests can’t create rooms or use friend features.',
        },
        {
          title: 'Location (geofence)',
          when: 'occupancy',
          content: `Check-in and creating lobby rooms only work within about 500 m of ${GYM_NAME}.`,
        },
        {
          title: 'Location (geofence)',
          when: 'reservation',
          content: `Reserving courts, creating lobby rooms, and join requests only work within about 500 m of ${GYM_NAME}.`,
        },
        {
          title: 'Session notifications (push)',
          content:
            'In Profile → Settings, turn on device notifications and choose types. On iPhone you must add Drop to the home screen first. See Install web app below for steps.',
        },
        {
          title: 'Notifications on PC',
          forDevices: ['desktop'],
          content:
            'Allow notifications in Chrome or Edge. If nothing arrives, check the lock icon → Notifications.',
        },
        {
          title: 'Notifications not arriving (app)',
          forDevices: ['native'],
          content:
            'Check Phone settings → Apps → Drop → Notifications. Keep the Play Store app up to date.',
        },
      ],
    },
    {
      id: 'club',
      title: 'Club bylaws',
      icon: '📋',
      intro: 'Membership rules for fair gym use and healthy club operations.',
      items: [
        { title: 'Regular session times', content: scheduleContent },
        {
          title: 'Full member',
          content:
            'Signed up and fee verified. Can use attendance, friends, lobby, and other member features.',
        },
        {
          title: 'Associate member',
          content:
            'Fee paid but full membership pending. Can check in and view court status.',
        },
        {
          title: 'Guest (temporary)',
          content:
            'Same-day access with a name only. Can view courts, join lobby rooms, and read the guide. No friends, room creation, points, or rank. Deleted at midnight (Seoul). Sign up to keep your account.',
        },
        {
          title: 'Fee tier vs staff role',
          content:
            'Fee tier (guest / associate / full) is separate from staff role (admin / operator). Becoming a full member doesn’t remove admin or operator. Badge priority: operator > admin > fee tier.',
        },
        {
          title: 'Sign-up & approval',
          content:
            'Depending on settings, you may use the app immediately or wait for approval. Admins handle approval in the admin panel. Operator role is fixed in the app.',
        },
        {
          title: 'Indoor shoes only',
          content:
            'Wear non-marking indoor badminton shoes inside the gym. Outdoor shoes may lead to restricted access.',
        },
      ],
    },
    {
      id: 'manner',
      title: 'Court etiquette',
      icon: '🤝',
      intro: 'Please follow these norms so everyone can play comfortably.',
      items: [
        {
          title: 'Warm-up courts',
          content:
            'Courts 1–3 near the entrance are for warm-up when empty. Don’t reserve them for long rallies during peak time.',
        },
        {
          title: 'Yield when asked',
          content:
            'If someone waiting asks to rotate in, finish the current rally and share the court fairly.',
        },
        {
          title: 'Pick up shuttles',
          content:
            'Everyone helps collect shuttles between games. It keeps rotation moving for lessons too.',
        },
      ],
    },
    {
      id: 'lesson',
      title: 'Coaching & lessons',
      icon: '🎓',
      intro: 'How lesson queue and coaching notices work.',
      items: [
        {
          title: 'Apply for a lesson',
          content:
            'Request lesson access on your profile. Once approved, join the queue on session days.',
        },
        {
          title: 'Queue order',
          content:
            'Admins call “next” from the queue. You’ll get a siren and push when it’s your turn.',
        },
        {
          title: 'Pay it forward',
          content:
            'Pick up shuttles for the player before you so they can use the full lesson time. Do the same when it’s your turn.',
        },
      ],
    },
  ];
}
