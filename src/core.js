// core.js — timeline, math, text helpers, subtitles. Every frame is a pure function of t.
(() => {
  const F = (window.F = {});

  // ---------- spec ----------
  F.W = window.__W || 1920; F.H = window.__H || 1080; F.FPS = 30; F.BPM = 112.9039;   // __W/__H: cover.html sets them for other aspect ratios; BPM: original animation timing, retained for the SFX-only release
  F.BEAT = 60 / F.BPM; F.BAR = F.BEAT * 4; F.E8 = F.BEAT / 2;
  F.bar = n => n * F.BAR;
  const { W, H } = F;

  F.C = { bg: "#0a0b16", ink: "#14122a", white: "#eef0f8", dim: "#6b6f8e", me: "#ffa274", ta: "#aab4ff", hurt: "#ff4d6a", glass: "#9fe6ff", amber: "#ffc46b" };
  F.rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  F.SERIF = '"Noto Serif SC"'; F.SANS = '"Noto Sans SC"'; F.MONO = '"JetBrains Mono"'; F.LATIN = '"Noto Serif"';

  F.POST_DEFAULT = { bloom: 0.45, thresh: 0.62, ca: 0.4, vig: 0.45, grain: 0.025, crt: 0 };

  // ---------- math ----------
  F.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  F.lerp = (a, b, u) => a + (b - a) * u;
  F.seg = (t, a, b) => F.clamp((t - a) / (b - a));
  F.ease = {
    outCubic: u => 1 - Math.pow(1 - u, 3),
    inCubic: u => u * u * u,
    outQuint: u => 1 - Math.pow(1 - u, 5),
    inOutSine: u => -(Math.cos(Math.PI * u) - 1) / 2,
    inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    inExpo: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
    outBack: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  };
  F.hash = n => {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
  F.rng = seed => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  F.frameOf = t => Math.round(t * F.FPS);

  // ---------- canvases ----------
  F.mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  F.src = F.mk(W, H); F.ctx = F.src.getContext('2d');
  F.scratch = F.mk(W, H); F.sctx = F.scratch.getContext('2d');
  F.layer = F.mk(W, H); F.lctx = F.layer.getContext('2d');

  // ---------- fonts ----------
  const FACES = [
    '500 20px "Noto Serif SC"', '700 20px "Noto Serif SC"', '900 20px "Noto Serif SC"',
    '400 20px "Noto Sans SC"', '500 20px "Noto Sans SC"', '700 20px "Noto Sans SC"', '900 20px "Noto Sans SC"',
    '500 20px "JetBrains Mono"', '800 20px "JetBrains Mono"', 'italic 400 20px "Noto Serif"',
  ];
  F._cache = new Map();
  F.ready = (async () => {
    await Promise.all(FACES.map(f => document.fonts.load(f, '游戏Aa0').catch(() => null)));
    await document.fonts.ready;
    F._cache.clear();
  })();

  // ---------- scenes ----------
  F.scenes = [];
  F.scene = def => {
    def.t0 = F.bar(def.start); def.t1 = F.bar(def.start + def.len);
    def.subs = def.subs || []; def.sfx = def.sfx || [];
    F.scenes.push(def);
    return def;
  };
  F.duration = () => Math.max(...F.scenes.map(s => s.t1));
  F.sceneAt = t => {
    let cur = null;
    for (const s of F.scenes) if (t >= s.t0 && t < s.t1) cur = s;
    if (!cur && F.scenes.length) { const last = F.scenes.reduce((a, b) => (a.t1 > b.t1 ? a : b)); if (t >= last.t1) cur = last; }
    return cur;
  };
  F.collectCues = () => {
    const cues = [], subs = [];
    for (const s of F.scenes) {
      for (const c of s.sfx) { const { at, ...rest } = c; cues.push({ t: +(s.t0 + at).toFixed(4), ...rest }); }
      for (const u of s.subs) subs.push({ t0: s.t0 + u.at, t1: s.t0 + u.at + u.dur });
    }
    cues.sort((a, b) => a.t - b.t);
    // reading-time check: at least one second per five characters
    const warnings = [];
    for (const s of F.scenes) for (const u of s.subs) {
      const n = u.zh.replace(/[\s，。：；、？！“”‘’—（）,.:;?!'"-]/g, '').length;
      if (u.dur < n / 5) warnings.push(`${s.name} @${u.at}s: ${n} chars in ${u.dur}s (need ${(n / 5).toFixed(1)}s) — ${u.zh.slice(0, 14)}…`);
    }
    const mmss = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const chapters = [{ t: 0, name: '开场' }, ...F.scenes.filter(s => s.chapter).map(s => ({ t: s.t0, name: `${s.chapter.num} ${s.chapter.zh}` }))]
      .map(c => `${mmss(c.t)} ${c.name}`);
    return { fps: F.FPS, bpm: F.BPM, duration: F.duration(), cues, subs, warnings, chapters };
  };

  // ---------- drawing helpers ----------
  F.font = (fam, size, weight = 400, style = '') => `${style} ${weight} ${size}px ${fam}`.trim();
  F.text = (ctx, s, x, y, o = {}) => {
    ctx.save();
    ctx.font = F.font(o.fam || F.SANS, o.size || 40, o.weight || 400, o.style || '');
    ctx.fillStyle = o.color || F.C.white;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    const track = o.track || 0;
    ctx.letterSpacing = track + 'px';
    if (track && (o.align || 'center') === 'center') x += track / 2;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { ctx.shadowColor = o.glowColor || o.color; ctx.shadowBlur = o.glow; }
    ctx.fillText(s, x, y);
    ctx.restore();
  };
  F.measure = (ctx, s, fam, size, weight = 400, track = 0) => {
    ctx.save(); ctx.font = F.font(fam, size, weight); ctx.letterSpacing = track + 'px';
    const w = ctx.measureText(s).width; ctx.restore(); return w;
  };
  // parts: [[text, color, extra opts], ...] laid out on one centred line
  F.richText = (ctx, parts, x, y, o = {}) => {
    const fam = o.fam || F.SANS, size = o.size || 40, weight = o.weight || 400;
    const ws = parts.map(p => F.measure(ctx, p[0], fam, size, weight, o.track || 0));
    let cx = x - ws.reduce((a, b) => a + b, 0) / 2;
    parts.forEach((p, i) => {
      F.text(ctx, p[0], cx, y, { ...o, ...(p[2] || {}), align: 'left', color: p[1] || o.color });
      cx += ws[i];
    });
  };
  F.screen = (ctx, fn) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); fn(); ctx.restore(); };

  const scanPat = new Map();
  F.scanPattern = (ctx, period, depth) => {
    const k = period + ':' + depth;
    if (!scanPat.has(k)) {
      const c = F.mk(1, period), g = c.getContext('2d');
      g.fillStyle = `rgba(0,0,0,${depth})`; g.fillRect(0, period - Math.max(1, period >> 1), 1, Math.max(1, period >> 1));
      scanPat.set(k, c);
    }
    return ctx.createPattern(scanPat.get(k), 'repeat');
  };
  // draw something through CRT scanlines (screen-aligned), with optional glow
  F.scan = (ctx, fn, o = {}) => {
    const s = F.sctx;
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1; s.filter = 'none';
    s.clearRect(0, 0, W, H);
    s.setTransform(ctx.getTransform());
    fn(s);
    s.setTransform(1, 0, 0, 1, 0, 0); s.filter = 'none'; s.globalAlpha = 1;
    s.globalCompositeOperation = 'destination-out';
    s.fillStyle = F.scanPattern(s, o.period || 4, o.depth ?? 0.5);
    s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.glow) { ctx.shadowColor = o.glowColor || 'rgba(255,181,71,.5)'; ctx.shadowBlur = o.glow; }
    ctx.drawImage(F.scratch, 0, 0);
    ctx.restore();
  };

  // crisp pixel-font text: rendered tiny, alpha-thresholded, tinted, cached
  F.pixelText = (s, size, color, weight = 700, fam = F.SANS) => {
    const key = ['px', s, size, color, weight, fam].join('|');
    if (F._cache.has(key)) return F._cache.get(key);
    const m = F.mk(8, 8).getContext('2d');
    m.font = F.font(fam, size, weight);
    const w = Math.ceil(m.measureText(s).width) + 4, h = Math.ceil(size * 1.5);
    const c = F.mk(w, h), g = c.getContext('2d');
    g.font = F.font(fam, size, weight); g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText(s, 2, h / 2);
    const d = g.getImageData(0, 0, w, h);
    const n = parseInt(color.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    for (let i = 0; i < d.data.length; i += 4) {
      const on = d.data[i + 3] > 100;
      d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b; d.data[i + 3] = on ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
    F._cache.set(key, c);
    return c;
  };
  F.drawPixel = (ctx, img, x, y, scale, align = 'center') => {
    const w = img.width * scale, h = img.height * scale;
    const px = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(px), Math.round(y - h / 2), w, h);
    ctx.restore();
  };
  // the motif: a pixel ▶ cursor
  const CURSOR = ['X....', 'XX...', 'XXX..', 'XXXX.', 'XXX..', 'XX...', 'X....'];
  F.cursor = (ctx, x, y, px, color) => {
    ctx.save(); ctx.fillStyle = color;
    CURSOR.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === 'X') ctx.fillRect(Math.round(x + i * px), Math.round(y + (j - 3.5) * px), px, px);
    }));
    ctx.restore();
  };

  // ---------- subtitles ----------
  const PUNCT = '，。：；、？！—';
  const wrapZh = (ctx, s, maxW) => {
    if (ctx.measureText(s).width <= maxW) return [s];
    const mid = s.length / 2; let best = -1, bd = 1e9;
    for (let i = 2; i < s.length - 2; i++) if (PUNCT.includes(s[i - 1])) { const d = Math.abs(i - mid); if (d < bd) { bd = d; best = i; } }
    if (best < 0) best = Math.ceil(mid);
    return [s.slice(0, best), s.slice(best)];
  };
  F.drawSubs = (ctx, t) => {
    for (const sc of F.scenes) for (const u of sc.subs) {
      const t0 = sc.t0 + u.at, t1 = t0 + u.dur;
      if (t < t0 || t >= t1) continue;
      const a = Math.min(F.seg(t, t0, t0 + 0.25), 1 - F.seg(t, t1 - 0.25, t1));
      F.screen(ctx, () => {
        ctx.font = F.font(F.SANS, 44, 700);
        const lines = wrapZh(ctx, u.zh, 1500);
        const base = u.en ? H - 122 : H - 96;
        lines.forEach((ln, i) => F.text(ctx, ln, W / 2, base - (lines.length - 1 - i) * 56,
          { fam: F.SANS, size: 44, weight: 700, track: 2, alpha: a, color: F.C.white, glow: 16, glowColor: 'rgba(0,0,0,.9)' }));
        if (u.en) {
          let es = 25;
          while (es > 18 && F.measure(ctx, u.en, F.LATIN, es, 400) > 1640) es -= 1;
          F.text(ctx, u.en, W / 2, H - 70, { fam: F.LATIN, style: 'italic', size: es, alpha: a * 0.62 });
        }
      });
    }
  };

  F.drawDebug = (ctx, t, sc) => {
    F.screen(ctx, () => {
      const s = `bar ${(t / F.BAR).toFixed(2)}  |  ${sc ? sc.name : '-'}  |  t=${t.toFixed(2)}s  f=${F.frameOf(t)}`;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(16, 16, 640, 44);
      F.text(ctx, s, 30, 38, { fam: F.MONO, size: 22, weight: 500, align: 'left', color: '#7CFC9A' });
    });
  };

  // ---------- render ----------
  F.applyCam = (ctx, c = {}) => {
    const { x = 0, y = 0, z = 1, r = 0 } = c;
    ctx.translate(W / 2, H / 2); ctx.rotate(r); ctx.scale(z, z); ctx.translate(-W / 2 + x, -H / 2 + y);
  };
  F.render = t => {
    const ctx = F.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = F.C.bg; ctx.fillRect(0, 0, W, H);
    const sc = F.sceneAt(t);
    const post = { ...F.POST_DEFAULT };
    if (sc) {
      const lt = t - sc.t0;
      ctx.save(); F.applyCam(ctx, sc.cam ? sc.cam(lt) : {}); sc.draw(ctx, lt, t); ctx.restore();
      if (sc.post) Object.assign(post, sc.post(lt));
      // pixel dissolve in/out: the frame breaks into ever-larger game pixels and dims
      const len = sc.t1 - sc.t0;
      let u = 0;
      if (sc.pixOut && lt > len - sc.pixOut) u = F.ease.inCubic(F.seg(lt, len - sc.pixOut, len));
      if (sc.pixIn && lt < sc.pixIn) u = Math.max(u, 1 - F.ease.outCubic(F.seg(lt, 0, sc.pixIn)));
      if (u > 0.01) {
        F.lctx.setTransform(1, 0, 0, 1, 0, 0); F.lctx.clearRect(0, 0, W, H); F.lctx.drawImage(F.src, 0, 0);
        ctx.fillStyle = F.C.bg; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1 - 0.75 * u;
        F.mosaic(ctx, F.layer, 1 + 47 * u, { gap: true });
        ctx.globalAlpha = 1;
      }
    }
    F.drawSubs(ctx, t);
    if (F.debug) F.drawDebug(ctx, t, sc);
    F.post.render(F.src, post, F.frameOf(t));
  };
})();
