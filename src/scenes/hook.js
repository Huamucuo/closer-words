// hook.js — the original opening, rhythm and sound effects; external BGM removed (1 bar = 2.126 s).
//   bar 0     open    intro groove   the question, chalked on the blackboard; folds into the header
//   bar 1     calm    break          隔壁班的陌生人: a raw feeling goes through polite() and comes out soft
//   bar 2     sweet   break          four soft hops: 同班同学 → 每天一起放学 → 暧昧期 → 在一起了; hearts
//   bar 3     time    break          the distance stays; the days pass (100 → 365 → 730); TA's small asks, 我's
//                                    irritation grows, the filter wears out; beat 4 = the song's breath
//   bar 4     impact  drop 1         the filter shatters; the raw words blast out and push TA away
//   bars 5–7  quiet   (muffled)      ringing ears; "其实，这不是因为不爱" → the question again → into the reasons
(() => {
  const { W, H, C, seg, clamp, lerp, ease } = F;
  const b = F.BEAT, BAR = F.BAR;
  const GY = 812, XA = 470, R = 125;
  F.GY = GY; F.R = R;
  const HOPS = [[1450, 0], [1200, BAR], [1060, BAR + b], [940, BAR + 2 * b], [830, BAR + 3 * b]];
  const LABELS = [['3.6 m', '隔壁班的陌生人'], ['1.2 m', '同班同学'], ['0.8 m', '每天一起放学'], ['0.45 m', '暧昧期'], ['0.2 m', '在一起了']];
  const DAYS = [[2 * BAR, 100], [2 * BAR + b, 365], [2 * BAR + 2 * b, 730]];
  const ASKS = ['在干嘛呀？', '怎么不回我', '陪我嘛～'];
  const ANNOY = ['啧', '又来了', '烦死了'];
  const T_POP = b, T_SUCK = 2 * b, T_FILTER = 2 * b + 0.22, T_SOFT = 3 * b;
  const T_BREATH = 2 * BAR + 3 * b;
  const T_SHATTER = 3 * BAR, T_HIT = T_SHATTER + b, T_REAL = T_SHATTER + 2 * b, T_SWELL = T_SHATTER + 3 * b, T_QUIET = 4 * BAR;
  const T_LINE = T_QUIET + 0.35, T_STEP = T_QUIET + 1.0, T_ASK = 5 * BAR + 0.15, T_FOUR = 6 * BAR + 0.1, LEN = 7 * BAR;
  const TITLE1 = '为什么越亲近的人', TITLE2 = ['越容易', '恶语相向', '？'];
  F.WHIPS.push({ t: 8 * BAR, dir: 'up' });

  const taState = t => {
    let x = HOPS[0][0], sq = 1, air = 0;
    for (let i = 1; i < HOPS.length; i++) {
      const [x1, tl] = HOPS[i], x0 = HOPS[i - 1][0], up = tl - 0.36;
      if (t >= tl) { x = x1; continue; }
      if (t >= up) { const u = seg(t, up, tl); x = lerp(x0, x1, ease.inOutSine(u)); air = Math.sin(u * Math.PI) * 80; sq = 1.1; }
      else if (t >= up - 0.1) sq = 1 - 0.12 * seg(t, up - 0.1, up);
      break;
    }
    for (let i = 1; i < HOPS.length; i++) if (t >= HOPS[i][1] && t < HOPS[i][1] + 0.5) sq = 1 - 0.14 * F.kick(t, HOPS[i][1], 9, 22);
    // the clingy asks: a little bounce toward 我 on each
    for (const [t0] of DAYS) if (t >= t0 && t < t0 + 0.5) sq = 1 + 0.08 * F.kick(t, t0, 10, 24);
    if (t >= T_BREATH && t < T_SHATTER) sq = 1 - 0.08 * seg(t, T_BREATH, T_SHATTER);
    if (t >= T_HIT) { x = lerp(HOPS[4][0], 1360, ease.outExpo(seg(t, T_HIT, T_HIT + 0.7))); sq = 1 - 0.3 * F.kick(t, T_HIT, 7, 20); }
    return { x, sq, air };
  };
  const hopAt = t => { let i = 0; for (let k = 1; k < HOPS.length; k++) if (t >= HOPS[k][1]) i = k; return i; };
  const dayAt = t => { let i = -1; for (let k = 0; k < DAYS.length; k++) if (t >= DAYS[k][0]) i = k; return i; };

  // ---------- header (shared by every scene) ----------
  const HX = 64, HY = 66, HS = 34;
  F.header = (ctx, a) => {
    return;   // the user asked for no persistent title in the corner; kept as a no-op so the scenes stay unchanged
    if (a <= 0) return;
    F.screen(ctx, () => {
      const g = ctx.createLinearGradient(0, 0, 760, 0);
      g.addColorStop(0, `rgba(6,6,16,${0.78 * a})`); g.addColorStop(0.75, `rgba(6,6,16,${0.55 * a})`); g.addColorStop(1, 'rgba(6,6,16,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 760, 136);
      F.text(ctx, TITLE1 + TITLE2.join(''), HX, HY, { fam: F.SERIF, size: HS, weight: 900, color: C.white, alpha: a * 0.92, align: 'left', track: 2, glow: 10, glowColor: 'rgba(170,180,255,.5)' });
    });
  };
  const TY = 330;
  const bigTitle = (ctx, cx, cy, s, a) => {
    if (a <= 0) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-W / 2, -TY);
    const o = { fam: F.SERIF, size: 104, weight: 900, color: '#f4f6ff', alpha: a, track: 8, glow: 26, glowColor: 'rgba(200,215,255,.65)' };
    F.text(ctx, TITLE1, W / 2, TY - 64, o);
    F.richText(ctx, [[TITLE2[0], '#f4f6ff'], [TITLE2[1], '#ffd9de', { glow: 46, glowColor: F.rgba(C.hurt, 1) }], [TITLE2[2], '#f4f6ff']], W / 2, TY + 64, o);
    ctx.restore();
  };
  const DUSTPUFF = (() => { const r = F.rng(808), o = []; for (let i = 0; i < 60; i++) o.push([r() * 2 - 1, r() * 2 - 1, r(), r()]); return o; })();
  const chalkPuff = (ctx, t) => {
    if (t > 1.6) return;
    const u = ease.outCubic(seg(t, 0, 1.4));
    ctx.save();
    for (const [dx, dy, k, s] of DUSTPUFF) {
      ctx.globalAlpha = (1 - seg(t, 0.2, 1.5)) * (0.25 + 0.4 * k);
      ctx.fillStyle = '#e9eef5';
      ctx.beginPath(); ctx.arc(W / 2 + dx * (460 + 160 * u * k), TY + dy * (130 + 90 * u * k) + 40 * u * u * k, 2 + 3 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  // ======================================================================= bar 0: say what this is
  F.scene({
    name: 'open', start: 0, len: 1,
    sfx: [
      { at: 0, id: 'chalk' },
      { at: BAR - 0.45, id: 'fold' },
    ],
    cam: t => {
      const u = ease.inOutSine(seg(t, 3 * b, BAR)), sh = 8 * F.pulse(t, 0, 8), f = Math.floor(t * 30);
      return { x: W / 2 - lerp(W / 2, 960, u) + (F.hash(f) - 0.5) * sh, y: H / 2 - lerp(H / 2, 600, u) + (F.hash(f + 9) - 0.5) * sh, z: lerp(1.0, 1.07, u) };
    },
    post: t => ({ bloom: 0.55 + 0.4 * F.pulse(t, 0, 4), thresh: 0.55, ca: 0.35 + 1.2 * F.pulse(t, 0, 6), vig: 0.55, grain: 0.035 }),
    draw(ctx, t) {
      F.classroom(ctx, t);
      F.dust(ctx, t + 20, 0.8);
      F.blob(ctx, XA, GY, { r: R, col: C.me, look: 0.2, lookY: -0.9, mood: 'calm', blink: t > 1.2 && t < 1.3 ? 1 : 0, acc: 'cowlick', t });
      F.blob(ctx, HOPS[0][0], GY, { r: R, col: C.ta, look: t < 2 * b ? 0.9 : lerp(0.9, -0.9, ease.outBack(seg(t, 2 * b, 2 * b + 0.3))), lookY: -0.3, mood: 'calm', acc: 'bow', t });
      F.petals(ctx, t + 3, 1);
      F.classroomFront(ctx, t, {});
      const u = ease.inOutCubic(seg(t, 3 * b, BAR - 0.05));
      const hw = F.measure(ctx, TITLE1 + TITLE2.join(''), F.SERIF, HS, 900, 2);
      F.screen(ctx, () => {
        chalkPuff(ctx, t);
        const land = lerp(1.1, 1, ease.outExpo(seg(t, 0, 0.3)));
        // the title lifts off the board as chalk dust
        bigTitle(ctx, W / 2, TY - 30 * u, land * (1 + 0.06 * u) * (1 + 0.02 * F.pulse(t, 2 * b, 6)), clamp(t / 0.08) * (1 - u));
      });
    },
  });

  // ======================================================================= the hook
  F.scene({
    name: 'hook', start: 1, len: 7,
    sfx: [
      { at: T_POP, id: 'pop' },
      { at: T_SUCK, id: 'suck' }, { at: T_FILTER, id: 'type', i: 1 }, { at: T_FILTER + 0.07, id: 'type', i: 2 }, { at: T_FILTER + 0.14, id: 'type', i: 3 },
      { at: T_SOFT, id: 'soft' },
      ...HOPS.slice(1).map(([, tl], i) => ({ at: tl, id: 'hopsoft', i })),
      { at: HOPS[3][1] + 0.08, id: 'heart', i: 0 }, { at: HOPS[4][1] + 0.08, id: 'heart', i: 1 },
      ...DAYS.map(([t0], i) => ({ at: t0, id: 'page', i })),
      ...DAYS.map(([t0], i) => ({ at: t0 + 0.12, id: 'crack', i: Math.min(i, 1) })),
      { at: T_BREATH, id: 'breath' },
      { at: T_SHATTER, id: 'shatter' }, { at: T_HIT, id: 'impact' },
      { at: T_QUIET - 0.05, id: 'realize' },
      { at: T_STEP, id: 'step' },
      { at: 7 * BAR - 0.3, id: 'whip' },
    ],
    cam: t => {
      let z = 1.07, cx = 960, cy = 600;
      if (t > BAR) { const u = ease.inOutSine(seg(t, BAR, 2 * BAR)); z = lerp(1.07, 1.14, u); cx = lerp(960, 800, u); }
      if (t > 2 * BAR) { const u = ease.inOutSine(seg(t, 2 * BAR, T_BREATH)); z = lerp(1.14, 1.27, u); cx = lerp(800, 660, u); }
      if (t > T_BREATH) { const u = ease.inCubic(seg(t, T_BREATH, T_SHATTER)); z = lerp(1.27, 1.36, u); cx = lerp(660, 650, u); cy = lerp(600, 630, u); }
      if (t >= T_SHATTER) { const u = ease.outCubic(seg(t, T_SHATTER, T_SHATTER + 0.9)); z = lerp(1.36, 1.02, u); cx = lerp(650, 915, u); cy = lerp(630, 570, u); }
      if (t >= T_REAL) { const u = ease.inOutSine(seg(t, T_REAL, LEN)); z = lerp(1.02, 1.1, u); cx = lerp(915, 900, u); cy = lerp(570, 590, u); }
      const sh = 26 * F.pulse(t, T_SHATTER, 7) + 16 * F.pulse(t, T_HIT, 9) + DAYS.reduce((p, [t0], i) => p + (4 + 2 * i) * F.pulse(t, t0, 10), 0)
        + 3 * seg(t, T_BREATH, T_SHATTER) * (t < T_SHATTER);
      const f = Math.floor(t * 30), wc = F.whipCam(t, LEN, null, 'up');
      return { x: W / 2 - cx + (F.hash(f) - 0.5) * sh + wc.x, y: H / 2 - cy + (F.hash(f + 99) - 0.5) * sh + wc.y, z, r: (F.hash(f + 7) - 0.5) * sh * 0.0012 };
    },
    post: t => ({
      bloom: 0.55 + 0.6 * F.pulse(t, T_SHATTER, 4),
      thresh: 0.55,
      ca: 0.35 + 0.8 * seg(t, T_BREATH, T_SHATTER) * (t < T_SHATTER) + 3.0 * F.pulse(t, T_SHATTER, 5) + 1.6 * F.pulse(t, T_HIT, 7),
      vig: 0.55 + 0.2 * seg(t, T_BREATH, T_SHATTER) * (t < T_SHATTER) + 0.25 * seg(t, T_REAL, T_QUIET) * (1 - seg(t, 6 * BAR, 7 * BAR)),
      grain: 0.035,
    }),
    draw(ctx, t, tAbs) {
      const warm = clamp(seg(t, 2 * BAR, T_SHATTER) * 0.7 + F.pulse(t, T_SHATTER, 2) * 0.3) * (1 - seg(t, T_REAL, T_QUIET));
      F.classroom(ctx, t + BAR, { warm, moon: 1 - 0.5 * warm, notes: 1 - seg(t, 0, 0.5) * 0.4 - 0.3 * seg(t, 2 * BAR, 2 * BAR + 0.4) });
      const wind = t > T_SHATTER ? 600 * (1 - Math.exp(-(t - T_SHATTER) * 3)) : 0;
      F.dust(ctx, t + 22.4, 0.8, wind);

      const ta = taState(t);
      const gapL = XA + R, gapR = ta.x - R, gap = gapR - gapL;
      const hi = hopAt(t), di = dayAt(t);

      // ---------- the ruler: distance first, then the days ----------
      if (t < T_SHATTER) {
        const sub = di >= 0 ? `在一起 第 ${DAYS[di][1]} 天` : LABELS[hi][1];
        const pop = di >= 0 ? F.pulse(t, DAYS[di][0], 7) : F.pulse(t, hi ? HOPS[hi][1] : 99, 7);
        const col = hi === 4 && di < 0 ? '#ffb3c7' : C.glass;
        F.ruler(ctx, XA, ta.x, 250, LABELS[hi][0], sub, seg(t, 0.1, 0.5), { draw: ease.outCubic(seg(t, 0.15, 0.8)), pop, col, labelCol: col });
        DAYS.forEach(([t0, n]) => F.calendarPage(ctx, (XA + ta.x) / 2 + 160, 210, String(n), seg(t, t0, t0 + 0.9)));
      } else {
        const red = F.mix(C.glass, C.hurt, seg(t, T_SHATTER, T_SHATTER + 0.1));
        const d = t < T_HIT ? 0.2 : lerp(0.2, 3.0, ease.outExpo(seg(t, T_HIT, T_HIT + 0.7)));
        F.ruler(ctx, XA, ta.x, 250, `${d.toFixed(1)} m`, t < T_HIT ? '' : '被推远了', 1 - seg(t, T_QUIET - 0.2, T_QUIET + 0.3),
          { col: red, labelCol: red, pop: F.pulse(t, T_SHATTER, 6) + F.pulse(t, T_HIT, 6) });
      }

      // ---------- the filter ----------
      const fcx = (gapL + gapR) / 2, fcy = GY - 112;
      if (t < T_SHATTER) {
        const bw = Math.max(18, gap - 40) * ease.outBack(seg(t, 0.2, 0.6));
        const code = bw > 330 ? 'polite(   )' : bw > 200 ? 'polite()' : bw > 90 ? 'pol()' : '()';
        const crack = DAYS.reduce((p, [t0]) => p + 0.25 * seg(t, t0 + 0.12, t0 + 0.17), 0) + 0.25 * seg(t, T_BREATH, T_SHATTER);
        const jit = t > T_BREATH ? (F.hash(Math.floor(t * 30)) - 0.5) * 6 : 0;
        F.filterBox(ctx, fcx + jit, fcy, bw, 104 - 22 * crack, code, {
          flash: F.pulse(t, T_FILTER, 5) * 1.5 + DAYS.reduce((p, [t0]) => p + F.pulse(t, t0 + 0.12, 6), 0) + 0.6 * seg(t, T_BREATH, T_SHATTER), crack,
        });
      }
      F.shards(ctx, fcx, fcy, t - T_SHATTER, 1 - seg(t, T_REAL + 0.4, T_QUIET + 0.4) * 0.5);

      // ---------- 我 ----------
      const shout = t >= T_SHATTER && t < T_REAL;
      let moodA = 'calm', lid = 0;
      if (t >= T_POP && t < T_SOFT) moodA = 'angry';
      if (t >= T_SOFT && t < 2 * BAR) moodA = 'smile';
      if (t >= 2 * BAR) { moodA = di >= 1 ? 'angry' : 'calm'; lid = di === 0 ? 0.45 : 0; }
      if (t >= T_REAL) moodA = 'shock', lid = 0;
      if (t >= T_STEP) moodA = 'calm';
      const trem = moodA === 'angry' && t > 2 * BAR ? Math.sin(t * 70) * (1.5 + 3.5 * seg(t, T_BREATH, T_SHATTER)) * seg(t, 2 * BAR, T_SHATTER) : 0;
      const stepA = 90 * ease.inOutSine(seg(t, T_STEP, T_STEP + 0.6));
      const sqA = 1 + 0.12 * F.kick(t, T_POP, 9, 20) - 0.16 * F.kick(t, T_SHATTER, 6, 18) + 0.08 * F.kick(t, T_REAL, 8, 16)
        + 0.05 * F.kick(t, HOPS[4][1], 8, 20)
        - 0.04 * seg(t, 2 * BAR, T_BREATH) * (t < T_SHATTER) - 0.12 * ease.inCubic(seg(t, T_BREATH, T_SHATTER)) * (t < T_SHATTER)
        + 0.05 * Math.sin(seg(t, T_STEP, T_STEP + 0.6) * Math.PI);
      F.blob(ctx, XA + trem + stepA, GY, {
        r: R, col: C.me, sq: sqA, acc: 'cowlick', t,
        lean: shout ? 0.16 * (1 - seg(t, T_HIT, T_REAL)) : moodA === 'smile' ? -0.04 : t >= T_STEP ? 0.07 * seg(t, T_STEP, T_STEP + 0.6) : 0,
        look: t < T_HIT ? (di === 0 ? 0.3 : 0.9) : t < T_REAL ? 1 : 0.7, lookY: t >= T_STEP ? 0.7 * seg(t, T_STEP, T_STEP + 0.4) : di === 0 ? 0.6 : 0,
        mood: moodA, shout: shout ? 1 : 0.5, blush: t >= BAR && t < 2 * BAR ? seg(t, BAR, BAR + 0.3) : 0,
        blink: Math.max(lid, (t > T_QUIET - 0.1 && t < T_QUIET + 0.05) || (t > T_ASK + 1.2 && t < T_ASK + 1.32) ? 1 : 0), glow: 1 - 0.4 * seg(t, T_REAL, T_QUIET),
      });

      // ---------- TA ----------
      let moodB = 'calm';
      if (t >= T_SOFT + 0.25) moodB = 'smile';
      if (t >= T_BREATH) moodB = 'shock';
      if (t >= T_HIT) moodB = 'hurt';
      F.blob(ctx, ta.x, GY - ta.air, {
        r: R, col: C.ta, sq: ta.sq, acc: 'bow', t,
        lean: t >= T_HIT ? -0.12 * F.spring(seg(t, T_HIT, T_HIT + 1.2)) + 0.08 * F.kick(t, T_HIT, 6, 18) : di >= 0 && t < T_BREATH ? -0.06 : 0,
        look: t < T_HIT ? -0.9 : lerp(-0.4, 0.9, seg(t, T_REAL, T_REAL + 0.4)), lookY: t >= T_HIT ? 0.6 : 0,
        mood: moodB, blush: moodB === 'smile' && t < 2 * BAR + 2 * b ? 1 : 0,
        blink: (t > 0.75 && t < 0.85) ? 1 : 0,
        dim: 0.55 * seg(t, T_HIT, T_QUIET), glow: 1 - 0.6 * seg(t, T_HIT, T_QUIET),
        tear: t > T_REAL ? seg(t, T_REAL + 0.3, T_QUIET + 1.2) : 0,
      });

      // hearts: 暧昧 and the big one when they're together
      [[HOPS[3][1], 3, 1], [HOPS[4][1], 6, 1.4]].forEach(([t0, n, big]) => {
        const u = seg(t, t0, t0 + 1.3);
        if (u <= 0 || u >= 1) return;
        for (let k = 0; k < n; k++) {
          const ang = -Math.PI / 2 + (k - (n - 1) / 2) * 0.45;
          const rr = 120 + 160 * ease.outCubic(u) * big;
          F.heart(ctx, fcx + Math.cos(ang) * rr * 0.8, GY - 240 + Math.sin(ang) * rr * 0.6 - 60 * u, (0.8 + 0.25 * (k % 3)) * big * F.spring(seg(t, t0 + k * 0.04, t0 + 0.5 + k * 0.04), 8, 14), 1 - seg(u, 0.6, 1));
        }
      });
      // TA's small asks over the days
      DAYS.forEach(([t0], i) => {
        const u = seg(t, t0, t0 + b * 0.95);
        if (u <= 0 || u >= 1) return;
        F.chirp(ctx, ta.x + 40, GY - 320 - 20 * u, 0.85 * F.spring(seg(t, t0, t0 + 0.3), 9, 16), 1 - seg(u, 0.7, 1), ASKS[i]);
      });

      // ---------- words ----------
      if (t >= T_POP && t < T_FILTER) {
        const s = F.spring(seg(t, T_POP, T_SUCK)) * (1 - ease.inCubic(seg(t, T_SUCK, T_FILTER)));
        const u = ease.inCubic(seg(t, T_SUCK, T_FILTER));
        F.rawBubble(ctx, lerp(XA, fcx, u), lerp(GY - 350, fcy, u), s * 0.9, '烦死了', 1, 0, t);
      }
      if (t >= T_SOFT && t < BAR + 0.3) {
        F.softBubble(ctx, fcx, fcy - 140 - 40 * seg(t, T_SOFT, BAR), F.spring(seg(t, T_SOFT, T_SOFT + 0.5), 8, 14) * 0.85, '没关系呀～', 1 - seg(t, BAR - 0.1, BAR + 0.3));
      }
      if (di >= 0 && t < T_SHATTER) {
        const s = [0.55, 0.75, 0.95][di] + 0.06 * F.pulse(t, DAYS[di][0], 6) + 0.3 * ease.inCubic(seg(t, T_BREATH, T_SHATTER));
        F.rawBubble(ctx, XA - 10, GY - 360 - 12 * di, s * F.spring(seg(t, 2 * BAR, 2 * BAR + 0.35)), ANNOY[di], 1, seg(t, 2 * BAR, T_SHATTER), t);
      }
      if (t >= T_SHATTER && t < T_QUIET + 0.3) {
        const u = ease.outExpo(seg(t, T_SHATTER, T_SHATTER + 0.3));
        const fly = ease.inOutCubic(seg(t, T_SHATTER + 0.18, T_HIT));
        const x = lerp(XA + 120, 900, u) + 140 * fly, y = lerp(GY - 240, 450, u);
        const a = 1 - seg(t, T_REAL, T_QUIET + 0.3);
        ctx.save(); ctx.globalAlpha = 0.5 * (1 - seg(t, T_HIT, T_HIT + 0.4));
        const st = ctx.createLinearGradient(XA, 0, x, 0);
        st.addColorStop(0, F.rgba(C.hurt, 0)); st.addColorStop(1, F.rgba(C.hurt, 0.6));
        ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(XA + 70, GY - 140); ctx.lineTo(x, y - 60 * u); ctx.lineTo(x, y + 60 * u); ctx.closePath(); ctx.fill();
        ctx.restore();
        for (const [t0, k] of [[T_SHATTER, 1], [T_SHATTER + 0.13, 0.6], [T_HIT, 1.2]]) {
          const v = seg(t, t0, t0 + 0.55); if (v <= 0 || v >= 1) continue;
          const cx = t0 === T_HIT ? ta.x : XA + 70, cy = t0 === T_HIT ? GY - 130 : GY - 140;
          ctx.save(); ctx.strokeStyle = F.rgba(C.hurt, (1 - v) * 0.8); ctx.lineWidth = 10 * (1 - v) * k;
          ctx.beginPath(); ctx.arc(cx, cy, 40 + 520 * ease.outCubic(v) * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const txt = '你能不能别烦了！';
        const size = 120 * (0.4 + 0.6 * F.spring(seg(t, T_SHATTER, T_SHATTER + 0.55), 7, 12));
        const crumble = seg(t, T_REAL, T_QUIET + 0.3);
        ctx.save(); ctx.font = F.font(F.SANS, size, 900);
        const chars = [...txt], ws = chars.map(c => ctx.measureText(c).width), tw = ws.reduce((p, q) => p + q, 0);
        ctx.restore();
        let cx0 = x - tw / 2;
        chars.forEach((c, i) => {
          const hx = F.hash(i * 13 + 5) - 0.5, hy = F.hash(i * 31 + 2);
          const j = (F.hash(Math.floor(t * 30) + i) - 0.5) * 6 * (1 - crumble);
          F.text(ctx, c, cx0 + ws[i] / 2 + hx * 160 * crumble + j, y + (120 + hy * 260) * crumble * crumble + j, {
            fam: F.SANS, size, weight: 900, color: '#ffe3e6', alpha: a * (1 - crumble * hy * 0.6), glow: 40, glowColor: F.rgba(C.hurt, 0.95),
          });
          cx0 += ws[i];
        });
      }
      F.petals(ctx, t + BAR + 3, 1, wind * 0.6);
      F.classroomFront(ctx, t, {});
      const fl = 0.75 * F.pulse(t, T_SHATTER, 9) + 0.35 * F.pulse(t, T_HIT, 12);
      if (fl > 0.01) F.screen(ctx, () => { ctx.fillStyle = `rgba(255,240,245,${fl})`; ctx.fillRect(0, 0, W, H); });

      // ---------- the quiet ----------
      const dark = 0.35 * ease.inOutSine(seg(t, T_SWELL, T_QUIET + 0.6)) * (1 - 0.6 * seg(t, 6 * BAR, LEN));
      if (dark > 0) F.screen(ctx, () => { ctx.fillStyle = `rgba(6,6,14,${dark})`; ctx.fillRect(0, 0, W, H); });
      F.screen(ctx, () => {
        const q = { fam: F.SERIF, size: 66, weight: 700, color: '#eef0ff', track: 10, glow: 22, glowColor: 'rgba(170,180,255,.55)' };
        const a1 = seg(t, T_LINE, T_LINE + 0.7) * (1 - seg(t, T_ASK - 0.35, T_ASK - 0.05));
        if (a1 > 0) F.text(ctx, '其实，这不是因为不爱', W / 2, 300 - 10 * ease.outCubic(seg(t, T_LINE, T_LINE + 0.9)), { ...q, alpha: a1 });
        const a2 = seg(t, T_ASK, T_ASK + 0.6) * (1 - seg(t, LEN - 0.35, LEN - 0.1));
        if (a2 > 0) F.text(ctx, '那为什么，偏偏对最亲近的人最凶？', W / 2, 300 - 10 * ease.outCubic(seg(t, T_ASK, T_ASK + 0.9)), { ...q, size: 60, alpha: a2 });
        const a3 = seg(t, T_FOUR, T_FOUR + 0.4) * (1 - seg(t, LEN - 0.35, LEN - 0.1));
        if (a3 > 0) F.text(ctx, '// 拆开来看，有 4 个原因', W / 2, 384, { fam: F.SANS, size: 32, weight: 700, color: C.glass, alpha: a3, track: 3, glow: 10 });
      });
      F.header(ctx, 1 - 0.4 * seg(t, T_REAL, T_QUIET) + 0.4 * seg(t, 6 * BAR, LEN));
      const status = t < BAR ? ['polite() 正在过滤措辞…', C.dim] : t < 2 * BAR ? ['polite() 运行正常', C.dim] : t < T_SHATTER ? ['相处越久 · 过滤器越薄', C.amber] : t < 6 * BAR ? ['filter = null', C.hurt] : ['正在拆解…', C.dim];
      F.statusLine(ctx, status[0], seg(t, 0.2, 0.6) * (1 - seg(t, T_SWELL, T_SWELL + 0.4) + seg(t, 6 * BAR, 6 * BAR + 0.4)), status[1], t);
      F.wipes(ctx, tAbs);
      F.whips(ctx, tAbs);
    },
  });
})();
