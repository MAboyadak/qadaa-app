import type { CSSProperties, ReactNode } from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const C = {
  bg: '#0F5E55',
  gold: '#E0BE5A',
  goldSoft: '#F4EAC8',
  sand: '#F7F3EC',
};

const fontFace = `
@font-face { font-family: Plex; src: url('${staticFile('IBMPlexSansArabic_700Bold.ttf')}'); font-weight: 700; }
@font-face { font-family: Plex; src: url('${staticFile('IBMPlexSansArabic_500Medium.ttf')}'); font-weight: 500; }
`;

// scene lengths in frames (30 fps)
const SCENES = [
  { id: 'hook', len: 105 },
  { id: 'count', len: 105 },
  { id: 'estimate', len: 120 },
  { id: 'log', len: 120 },
  { id: 'remind', len: 105 },
  { id: 'plan', len: 105 },
  { id: 'outro', len: 150 },
] as const;
export const LAUNCH_FRAMES = SCENES.reduce((a, s) => a + s.len, 0);

const ar = (n: number) => Math.round(n).toLocaleString('en-US').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]).replace(/,/g, '٬');

export const Launch = () => {
  let from = 0;
  const at = (i: number) => {
    const start = SCENES.slice(0, i).reduce((a, s) => a + s.len, 0);
    from = start;
    return { from, durationInFrames: SCENES[i].len };
  };
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: 'Plex', direction: 'rtl' }}>
      <style>{fontFace}</style>
      <Audio src={staticFile('ambience.wav')} volume={0.65} />
      <Glow />
      <Sequence {...at(0)}>
        <Hook />
      </Sequence>
      <Sequence {...at(1)}>
        <Counter />
      </Sequence>
      <Sequence {...at(2)}>
        <PhoneScene src="result-ar.png" title="قدّر ما فاتك في دقائق" sub="Estimate what you missed in minutes" />
      </Sequence>
      <Sequence {...at(3)}>
        <PhoneScene src="home-ar.png" title="سجّل كل صلاة بلمسة" sub="Log each make-up prayer with one tap" />
      </Sequence>
      <Sequence {...at(4)}>
        <Reminder />
      </Sequence>
      <Sequence {...at(5)}>
        <PhoneScene src="plan-ar.png" title="خطة تناسب وقتك" sub="A pace that fits your day" />
      </Sequence>
      <Sequence {...at(6)}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};

function Glow() {
  const f = useCurrentFrame();
  const x = 70 + Math.sin(f / 90) * 10;
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(circle at ${x}% 12%, rgba(224,190,90,.22), transparent 45%)` }}
    />
  );
}

function useEnter(delay = 0) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping: 16, mass: 0.8 } });
}

function useExit(len: number) {
  const f = useCurrentFrame();
  return interpolate(f, [len - 12, len], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

function Caption({ title, sub, delay = 0, top = 120 }: { title: ReactNode; sub: string; delay?: number; top?: number }) {
  const p = useEnter(delay);
  const style: CSSProperties = {
    position: 'absolute',
    top,
    left: 60,
    right: 60,
    textAlign: 'center',
    opacity: p,
    transform: `translateY(${(1 - p) * 30}px)`,
  };
  return (
    <div style={style}>
      <div style={{ fontSize: 76, fontWeight: 700, color: C.goldSoft, lineHeight: 1.35 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 500, color: C.sand, opacity: 0.85, marginTop: 10, direction: 'ltr' }}>{sub}</div>
    </div>
  );
}

function Hook() {
  const out = useExit(SCENES[0].len);
  return (
    <AbsoluteFill style={{ opacity: out, justifyContent: 'center' }}>
      <Caption top={470} title="سنواتٌ من الصلوات الفائتة؟" sub="Years of missed prayers?" />
    </AbsoluteFill>
  );
}

function Counter() {
  const f = useCurrentFrame();
  const out = useExit(SCENES[1].len);
  const n = interpolate(f, [0, 55], [0, 21920], { extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
  const p2 = useEnter(60);
  return (
    <AbsoluteFill style={{ opacity: out, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 190, fontWeight: 700, color: C.gold, lineHeight: 1 }}>{ar(n)}</div>
      <div style={{ fontSize: 50, fontWeight: 500, color: C.sand, marginTop: 24 }}>صلاة تبدو مستحيلة…</div>
      <div
        style={{
          fontSize: 58,
          fontWeight: 700,
          color: C.goldSoft,
          marginTop: 60,
          opacity: p2,
          transform: `scale(${0.9 + p2 * 0.1})`,
        }}>
        لكنها تُقضى صلاةً بعد صلاة
      </div>
      <div style={{ fontSize: 34, color: C.sand, opacity: 0.8 * p2, marginTop: 12, direction: 'ltr' }}>
        …but it is repaid one prayer at a time
      </div>
    </AbsoluteFill>
  );
}

function PhoneScene({ src, title, sub }: { src: string; title: string; sub: string }) {
  const f = useCurrentFrame();
  const p = useEnter(8);
  const out = useExit(115);
  const drift = interpolate(f, [0, 120], [0, -40]);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Caption title={title} sub={sub} top={70} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 380,
          width: 620,
          transform: `translateX(-50%) translateY(${(1 - p) * 500 + drift}px)`,
          borderRadius: 56,
          background: '#111',
          padding: 18,
          boxShadow: '0 40px 90px rgba(0,0,0,.35)',
        }}>
        <Img src={staticFile(src)} style={{ width: '100%', borderRadius: 40, display: 'block' }} />
      </div>
    </AbsoluteFill>
  );
}

function Reminder() {
  const p = useEnter(10);
  const tap = useEnter(55);
  const out = useExit(SCENES[4].len);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Caption title="تذكير لطيف بعد كل صلاة" sub="A gentle reminder after every prayer" top={200} />
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 560,
          transform: `translateY(${(1 - p) * -300}px)`,
          opacity: p,
          borderRadius: 40,
          overflow: 'hidden',
          boxShadow: '0 40px 90px rgba(0,0,0,.35)',
        }}>
        <Img src={staticFile('notif-card.png')} style={{ width: '100%', display: 'block' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1010,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 48,
          fontWeight: 700,
          color: C.gold,
          opacity: tap,
          transform: `scale(${0.8 + tap * 0.2})`,
        }}>
        صلّيتها ✓ — وتُسجَّل فورًا
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const p = useEnter(0);
  const p2 = useEnter(25);
  const p3 = useEnter(50);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Img
        src={staticFile('icon.png')}
        style={{ width: 260, height: 260, borderRadius: 60, transform: `scale(${p})`, boxShadow: '0 30px 80px rgba(0,0,0,.35)' }}
      />
      <div style={{ fontSize: 96, maxWidth: 960, fontWeight: 700, color: C.gold, marginTop: 30, opacity: p }}>قضاء الصلوات</div>
      <div style={{ fontSize: 40, color: C.sand, opacity: p2, direction: 'ltr' }}>Qadaa Planner · Missed Prayers</div>
      <div style={{ fontSize: 44, fontWeight: 500, color: C.sand, marginTop: 40, opacity: p2, lineHeight: 1.6 }}>
        مجاني · بلا إعلانات · بياناتك على جهازك
      </div>
      <div
        style={{
          marginTop: 50,
          padding: '18px 44px',
          borderRadius: 999,
          background: C.gold,
          color: '#1C1606',
          fontSize: 44,
          fontWeight: 700,
          opacity: p3,
          transform: `scale(${0.9 + p3 * 0.1})`,
        }}>
        قريبًا على Google Play
      </div>
      <div style={{ fontSize: 34, color: C.goldSoft, marginTop: 36, opacity: p3 }}>صدقة جارية — نسأل الله القبول</div>
    </AbsoluteFill>
  );
}
