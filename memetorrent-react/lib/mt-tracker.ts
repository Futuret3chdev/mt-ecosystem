/** Shared tracker logic — mirrors /static/mt-tracker.js on admin host */

export const TRACK_URL = 'https://admin.futuret3ch.com.au/api/track';

const GAME_PATH_SOURCES: [RegExp, string][] = [
  [/poker|poker-stars/i, 'game-poker-stars'],
  [/starfeet|starfleet/i, 'game-starfeet'],
  [/metro-vice|metrovice/i, 'game-metro-vice'],
  [/soccer-pro|soccerpro/i, 'game-soccer-pro'],
  [/mte-pop|mtepop|pop/i, 'game-mte-pop'],
  [/taptap|\/tap/i, 'game-tap'],
  [/pacman|unix\/1(?!\/fruit)/i, 'game-pacman'],
  [/tetris|\/games\/2/i, 'game-tetris'],
  [/soccer/i, 'game-soccer'],
  [/puck/i, 'game-puck'],
  [/racer/i, 'game-racer'],
  [/chicken/i, 'game-chicken'],
  [/fruit/i, 'game-fruitninja'],
  [/cncdawn|cnc/i, 'game-cnc'],
  [/neon/i, 'game-neon'],
];

export function sessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('mt_session_id');
  if (!sid) {
    sid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `mt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('mt_session_id', sid);
  }
  return sid;
}

export function trackSource(pathname: string): string {
  if (pathname.startsWith('/claims')) return 'memetorrent-claims';
  if (pathname.startsWith('/developers')) return 'memetorrent-dev';
  if (pathname.startsWith('/games')) {
    for (const [re, source] of GAME_PATH_SOURCES) {
      if (re.test(pathname)) return source;
    }
    return 'memetorrent-games';
  }
  return 'memetorrent-web';
}

export function sendTrack(pathname: string, type = 'page_view', extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const payload = {
    source: trackSource(pathname),
    type,
    path: pathname,
    session_id: sessionId(),
    data: {
      referrer: document.referrer || null,
      title: document.title || null,
      ...extra,
    },
  };
  fetch(TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}// tracker deploy 20260716T152253Z
