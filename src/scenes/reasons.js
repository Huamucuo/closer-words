// reasons.js — the four reasons, each in its own place. Bars are film bars (film t = song t − SONG0).
//   bars  8–11  ① 笃定 TA 不会走      the school rooftop at night: a glass thread vs a red string     (whip up in)
//   bars 12–17  ② 对 TA 的期待更高     two phone chats: the stranger's message vs TA's late reply       (whip left in)
//   bars 18–24  ③ TA 是最安全的出口    the walk home: worries pile up, TA waits at the gate; dominoes   (whip left in)
//   bars 25–31  ④ TA 已经是「自己」了  the night sky: two halos of self drawing together; ends as the moon (whip up in)
(() => {
  const { W, H, C, seg, clamp, lerp, ease } = F;
  const b = F.BEAT, BAR = F.BAR;
  const GY = F.GY, R = F.R;
  const GREY = '#8c93b8';
  const idle = (t, ph = 0) => 1 + 0.015 * Math.sin(t * 2.4 + ph);

  // ---------- shared ----------
  F.hud = (ctx, t, tAbs, status, o = {}) => {
    if (o.petals) F.petals(ctx, tAbs + 3, o.petals, o.wind || 0);
    if (status) F.statusLine(ctx, status[0], seg(t, 0.1, 0.5) * (o.statusA ?? 1), status[1] || C.dim, tAbs);
    F.wipes(ctx, tAbs);
    F.whips(ctx, tAbs);
  };
  F.drift = (t, o = {}) => {
    const z = (o.z || 1.04) + 0.015 * Math.sin(t * 0.4), cx = (o.cx || 960) + 18 * Math.sin(t * 0.27), cy = o.cy || 560;
    const sh = (o.hits || []).reduce((p, [t0, k]) => p + k * F.pulse(t, t0, 9), 0), f = Math.floor(t * 30);
    const wc = o.len ? F.whipCam(t, o.len, o.whipIn, o.whipOut) : { x: 0, y: 0 };
    return { x: W / 2 - cx + (F.hash(f) - 0.5) * sh + wc.x, y: H / 2 - cy + (F.hash(f + 99) - 0.5) * sh + wc.y, z, r: (F.hash(f + 7) - 0.5) * sh * 0.001 };
  };
  F.hopX = (t, x0, x1, tl, dur = 0.34, hgt = 70) => {
    if (t >= tl) return { x: x1, air: 0, sq: 1 - 0.14 * F.kick(t, tl, 9, 22) * (t < tl + 0.6) };
    const up = tl - dur;
    if (t < up) return { x: x0, air: 0, sq: t > up - 0.1 ? 1 - 0.12 * seg(t, up - 0.1, up) : 1 };
    const u = seg(t, up, tl);
    return { x: lerp(x0, x1, ease.inOutSine(u)), air: Math.sin(u * Math.PI) * hgt, sq: 1.1 };
  };
  // a title written across the sky (no board out here)
  const skyTitle = (ctx, num, s, t, y = 120, a = 1) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    F.chalkWrite(ctx, num + '  ' + s, W / 2, y, ease.outCubic(seg(t, 0.15, 0.7)), { size: 62, fam: F.SERIF, weight: 900, color: '#f4f6ff', glow: 22, glowColor: 'rgba(200,215,255,.6)' });
    ctx.restore();
  };

  // =========================================================== ① the rooftop (bars 8–11)
  {
    const S = 8, L = 4;
    const XA = 640, XS = 1280, XT = 1180;
    const T_TINK = BAR, T_SWAP = 2 * BAR, T_TA = 2 * BAR + b, T_CHIP = 2 * BAR + 2 * b, T_YANK = 3 * BAR, T_HOLD = 3 * BAR + b;
    F.WHIPS.push({ t: (S + L) * BAR, dir: 'left' });
    F.scene({
      name: 'r1', start: S, len: L,
      subs: [
        { at: 0.3, dur: 3.6, zh: '对陌生人：关系像一根玻璃丝，怕断' },
        { at: T_SWAP + 0.1, dur: 2.1, zh: '对恋人：关系是一根红线' },
        { at: T_YANK - 0.1, dur: 2.2, zh: '笃定断不了，就敢用力扯' },
      ],
      sfx: [
        { at: 0.15, id: 'write' }, { at: 2 * b, id: 'soft' }, { at: T_TINK, id: 'tink' },
        { at: T_SWAP - 0.1, id: 'swap' }, { at: T_TA, id: 'hopsoft', i: 2 }, { at: T_CHIP, id: 'chip' },
        { at: T_YANK, id: 'yank' }, { at: T_HOLD, id: 'pop' }, { at: L * BAR - 0.3, id: 'whip' },
      ],
      cam: t => F.drift(t, { z: 1.05, cy: 560, hits: [[T_TINK, 4], [T_YANK, 12]], len: L * BAR, whipIn: 'up', whipOut: 'left' }),
      post: t => ({ bloom: 0.6, thresh: 0.55, ca: 0.35 + 1.2 * F.pulse(t, T_YANK, 6), vig: 0.55, grain: 0.035 }),
      draw(ctx, t, tAbs) {
        F.rooftop(ctx, tAbs);
        F.dust(ctx, tAbs + 40, 0.5);
        skyTitle(ctx, '①', '笃定 TA 不会走', t);
        const xs = t < T_SWAP - 0.1 ? XS : lerp(XS, 2200, ease.inCubic(seg(t, T_SWAP - 0.1, T_SWAP + 0.25)));
        const ta = F.hopX(t, 2150, XT, T_TA, 0.5, 60);
        const jolt = t >= T_YANK ? -50 * F.kick(t, T_YANK, 6, 14) : 0;
        const ax = XA, ay = GY - 115, sx = xs - 85, tx = ta.x + jolt - 95;
        const thread = 1 - seg(t, T_SWAP - 0.15, T_SWAP + 0.1);
        F.glassThread(ctx, ax + 95, ay, sx, ay + 10, tAbs, F.pulse(t, T_TINK, 4) * 1.4 + 0.15, thread);
        if (t > T_TINK && thread > 0) F.chalkWrite(ctx, '易碎', (ax + sx) / 2, GY - 210, seg(t, T_TINK, T_TINK + 0.3), { size: 40, color: '#bfe9ff' });
        if (t >= T_TA - 0.05) {
          const tension = t < T_YANK ? 0.2 : lerp(1, 0.4, ease.outCubic(seg(t, T_YANK + 0.25, T_YANK + 1.2)));
          F.redString(ctx, ax + 95, ay, tx, ay + 10, tension, seg(t, T_TA - 0.05, T_TA + 0.25));
          F.chalkWrite(ctx, '稳定 · 在一起第 730 天', (ax + tx) / 2, GY + 48, seg(t, T_TA + 0.1, T_TA + 0.5), { size: 34, color: '#ffc2d3' });
        }
        if (t >= T_HOLD) F.chalkWrite(ctx, '反正断不了', 1100, 400, ease.outCubic(seg(t, T_HOLD, T_HOLD + 0.35)), { size: 62, color: '#ff8fa3', weight: 900, fam: F.SERIF, glow: 20, glowColor: 'rgba(255,90,120,.6)' });
        const careful = t < T_SWAP;
        const tip = careful ? 0.03 * Math.abs(Math.sin((t / b) * Math.PI)) : 0;
        F.blob(ctx, ax, GY - tip * 300, {
          r: R, col: C.me, acc: 'cowlick', t: tAbs,
          sq: idle(t) - (careful ? 0.04 : 0) + 0.1 * F.kick(t, T_TINK, 9, 18) - (t >= T_YANK ? 0.12 * F.kick(t, T_YANK, 6, 16) : 0),
          lean: careful ? 0.05 : t >= T_YANK ? -0.22 * (1 - ease.outCubic(seg(t, T_YANK + 0.4, T_YANK + 1.4))) : -0.05,
          look: 0.9, mood: careful ? (t > T_TINK && t < T_TINK + 0.4 ? 'shock' : 'smile') : t >= T_YANK && t < T_YANK + 1.2 ? 'angry' : 'calm',
          blink: !careful && t < T_YANK ? 0.45 : 0, shout: 0.8,
        });
        if (careful) F.blob(ctx, xs, GY, { r: 105, col: GREY, look: -0.8, mood: 'calm', sq: idle(t, 2), blink: t > 1.5 && t < 1.6 ? 1 : 0 });
        if (t >= T_SWAP) F.blob(ctx, ta.x + jolt, GY - ta.air, {
          r: R, col: C.ta, acc: 'bow', t: tAbs, sq: ta.sq * idle(t, 1) + 0.1 * F.kick(t, T_YANK, 8, 20), look: -0.9,
          lean: t >= T_YANK ? 0.15 * F.kick(t, T_YANK, 5, 12) : 0, mood: t >= T_YANK ? 'shock' : 'smile',
        });
        if (t >= 2 * b && t < T_TINK + b) F.softBubble(ctx, ax + 40, GY - 360, F.spring(seg(t, 2 * b, 2 * b + 0.4), 8, 14) * 0.7, '不好意思呀～', 1 - seg(t, T_TINK + 0.2, T_TINK + b));
        if (t >= T_YANK && t < L * BAR - 0.2) F.rawBubble(ctx, ax - 10, GY - 360, 0.8 * F.spring(seg(t, T_YANK, T_YANK + 0.4)), '烦死了', 1, 0.6, tAbs);
        F.codeChip(ctx, 960, 250, 'if (bond.safe) filter.off()', seg(t, T_CHIP, T_CHIP + 0.6), seg(t, T_CHIP, T_CHIP + 0.15), { t, size: 32 });
        F.hud(ctx, t, tAbs, ['原因 1/4 · 安全感', C.dim], { petals: 0.5 });
      },
    });
  }

  // =========================================================== ② two phones (bars 12–17)
  {
    const S = 12, L = 6;
    const PW = 480, PH = 800, PY = 500, LX = 640, RX = 1280;
    const T_DROP = BAR, T_PICK = BAR + b, T_FILL1 = BAR + 2 * b, T_GOOD = BAR + 3 * b;
    const T_EXP = 2 * BAR, T_NOTE = 3 * BAR, T_FILL2 = 3 * BAR + b, T_GAP = 3 * BAR + 2 * b, T_MAD = 3 * BAR + 3 * b, T_CHIP = 4 * BAR;
    const LEFT = [
      { side: 'time', text: '10:12', at: 0.3 },
      { side: 'l', text: '同学，你的笔掉在走廊了', at: T_DROP },
      { side: 'l', text: '我帮你放桌上啦', at: T_PICK },
      { side: 'r', text: '啊！谢谢你！！', at: T_GOOD },
    ];
    const RIGHT = [
      { side: 'time', text: '21:03', at: T_EXP - 0.1 },
      { side: 'r', text: '在干嘛', at: T_EXP },
      { side: 'r', text: '？', at: T_EXP + b },
      { side: 'time', text: '21:40', at: T_EXP + 2 * b - 0.05 },
      { side: 'r', text: '人呢', at: T_EXP + 2 * b },
      { side: 'time', text: '22:03 · 1 小时后', at: T_NOTE - 0.05 },
      { side: 'l', text: '刚刚在上课呀', at: T_NOTE },
      { side: 'r', text: '怎么才回！', at: T_MAD, col: '#ff4d6a', glow: 'rgba(255,77,106,.8)' },
    ];
    F.WHIPS.push({ t: (S + L) * BAR, dir: 'left' });
    F.scene({
      name: 'r2', start: S, len: L,
      subs: [
        { at: 0.3, dur: 3.4, zh: '对陌生人，我们几乎不抱期待' },
        { at: 3.8, dur: 2.3, zh: '所以做一点点，就是惊喜' },
        { at: 6.4, dur: 2.0, zh: '对 TA，期待早就拉满了' },
        { at: 8.6, dur: 3.7, zh: '做到 90 分，差的 10 分也会变成火气' },
      ],
      sfx: [
        { at: 0.15, id: 'write' },
        { at: T_DROP, id: 'recv' }, { at: T_PICK, id: 'recv' },
        ...[0, 1, 2, 3].map(k => ({ at: T_FILL1 + k * 0.1, id: 'fill', i: k })), { at: T_GOOD, id: 'send' }, { at: T_GOOD + 0.05, id: 'good' },
        { at: T_EXP, id: 'send' }, { at: T_EXP + b, id: 'send' }, { at: T_EXP + 2 * b, id: 'send' },
        ...[0, 1, 2, 3, 4, 5].map(k => ({ at: T_EXP + k * 0.3, id: 'fill', i: 4 + (k % 4) })),
        { at: T_NOTE, id: 'recv' }, ...[0, 1, 2, 3].map(k => ({ at: T_FILL2 + k * 0.08, id: 'fill', i: k + 2 })),
        { at: T_GAP, id: 'bad' }, { at: T_MAD, id: 'send' }, { at: T_MAD + 0.03, id: 'pop' }, { at: T_CHIP, id: 'chip' },
        { at: L * BAR - 0.3, id: 'whip' },
      ],
      cam: t => F.drift(t, { z: 1.0, cy: 540, hits: [[T_GAP, 5], [T_MAD, 8]], len: L * BAR, whipIn: 'left', whipOut: 'left' }),
      post: t => ({ bloom: 0.5, thresh: 0.6, ca: 0.3 + 1.0 * F.pulse(t, T_GAP, 6), vig: 0.5, grain: 0.03 }),
      draw(ctx, t, tAbs) {
        F.bokeh(ctx, tAbs);
        const hA = 1 - seg(t, T_CHIP - 0.2, T_CHIP);
        ctx.save(); ctx.globalAlpha *= hA;
        F.chalkWrite(ctx, '②  对 TA 的期待更高', W / 2, 52, ease.outCubic(seg(t, 0.15, 0.7)), { size: 50, fam: F.SERIF, weight: 900, color: '#f4f6ff', glow: 18 });
        ctx.restore();
        F.codeChip(ctx, W / 2, 54, 'anger = expect - reality', seg(t, T_CHIP, T_CHIP + 0.6), seg(t, T_CHIP, T_CHIP + 0.15), { t, size: 36, col: '#ffb3c7' });
        // focus moves from the stranger's chat to TA's
        const fo = ease.inOutSine(seg(t, 2 * BAR - 0.3, 2 * BAR + 0.2)), both = seg(t, T_CHIP, T_CHIP + 0.5);
        const lS = lerp(lerp(1.03, 0.94, fo), 1, both), rS = lerp(lerp(0.94, 1.03, fo), 1, both);
        const phone = (cx, sc, dimA, o) => {
          ctx.save(); ctx.translate(cx, PY); ctx.scale(sc, sc); ctx.translate(-cx, -PY);
          F.phone(ctx, cx, PY, PW, PH, o);
          if (dimA > 0) { ctx.fillStyle = `rgba(8,8,20,${dimA})`; ctx.beginPath(); ctx.roundRect(cx - PW / 2, PY - PH / 2, PW, PH, 58); ctx.fill(); }
          ctx.restore();
        };
        const shake = t >= T_MAD ? (F.hash(Math.floor(t * 30)) - 0.5) * 14 * F.pulse(t, T_MAD, 6) : 0;
        phone(LX, lS, lerp(0, 0.45, fo) * (1 - both), { t, name: '隔壁班 · 同学', avatar: 'grey', clock: '10:12', msgs: LEFT, typingAt: T_DROP - 0.45, typingEnd: T_DROP });
        phone(RX + shake, rS, lerp(0.45, 0, fo), { t, name: 'TA', avatar: 'ta', heart: true, clock: '22:03', msgs: RIGHT, typingAt: T_NOTE - 0.45, typingEnd: T_NOTE });
        // the meters, outside the phones
        const real1 = 0.6 * ease.outCubic(seg(t, T_FILL1, T_FILL1 + 0.4));
        const exp2 = ease.outCubic(seg(t, T_EXP, T_EXP + 3 * b)), real2 = 0.9 * ease.outCubic(seg(t, T_FILL2, T_FILL2 + 0.4));
        const ma = seg(t, 2 * b, 3 * b);
        F.meterBar(ctx, 225, 760, 330, 64, 0, '#b9a8ff', '期待', ma, { value: 0 });
        F.meterBar(ctx, 320, 760, 330, 64, real1, '#ffb070', '现实', ma, { value: real1 * 100 });
        F.meterBar(ctx, 1600, 760, 330, 64, exp2, '#b9a8ff', '期待', ma, { value: exp2 * 100 });
        F.meterBar(ctx, 1695, 760, 330, 64, real2, '#ffb070', '现实', ma, { value: real2 * 100 });
        if (t >= T_GOOD) F.text(ctx, '+60 惊喜！', 272, 330 - 20 * ease.outCubic(seg(t, T_GOOD, T_GOOD + 0.4)), { fam: F.SANS, size: 44, weight: 900, color: '#7be0a0', alpha: seg(t, T_GOOD, T_GOOD + 0.15), glow: 18 });
        if (t >= T_GAP) {
          const p = 0.5 + 0.5 * Math.cos(((t - T_GAP) / b) * Math.PI * 2);
          ctx.save(); ctx.fillStyle = F.rgba(C.hurt, 0.35 + 0.45 * p); ctx.shadowColor = F.rgba(C.hurt, 0.9); ctx.shadowBlur = 30;
          ctx.fillRect(1695 - 27, 760 - 330, 54, 33); ctx.restore();
          F.text(ctx, '−10 失望', 1648, 330, { fam: F.SANS, size: 44, weight: 900, color: '#ff8fa3', alpha: seg(t, T_GAP, T_GAP + 0.15), glow: 18 });
        }
        F.hud(ctx, t, tAbs, ['原因 2/4 · 期待落差', C.dim]);
      },
    });
  }

  // =========================================================== ③ the walk home (bars 18–24)
  {
    const S = 18, L = 7;
    const XA = 760, XT = 1330, V = 260, T_STOP = 3 * BAR, RAMP = 1.2;
    const LABELS = ['月考退步了', '被老师点名', '作业写不完', '社团被骂', '爸妈催成绩', '和同桌冷战'];
    const LAND = [2 * b, BAR, BAR + 2 * b, 2 * BAR, 2 * BAR + 2 * b, 3 * BAR];
    const T_TA = 3 * BAR + b, T_SNAP = 3 * BAR + 2 * b, T_FALL = 4 * BAR;
    const T_DOM = 4 * BAR + 2 * b, T_D0 = 5 * BAR, T_TERM = 6 * BAR, T_CHIP = 6 * BAR + b;
    const PILE = [[-110, -20, -0.3], [100, -24, 0.25], [-30, -64, 0.1], [140, -80, -0.2], [-140, -86, 0.35], [20, -128, -0.08]];
    const scroll = t => {
      const t0 = T_STOP - RAMP;
      if (t < t0) return V * t;
      const u = Math.min(t - t0, RAMP);
      return V * t0 + V * (u - (u * u) / (2 * RAMP));
    };
    const SX_END = scroll(1e9), TA_W = XT + SX_END;
    const walking = t => t < T_STOP - 0.2;
    F.WHIPS.push({ t: (S + L) * BAR, dir: 'up' });
    F.scene({
      name: 'r3', start: S, len: L,
      subs: [
        { at: 0.3, dur: 3.6, zh: '在外面受的气，我们笑着咽下去' },
        { at: 4.1, dur: 2.4, zh: '因为对外人发火，代价太大' },
        { at: 8.6, dur: 2.9, zh: '最后，全倒给了最安全的那个人' },
        { at: 11.7, dur: 3.1, zh: '这叫「情绪转移」，俗称踢猫效应' },
      ],
      sfx: [
        { at: 0.15, id: 'write' },
        ...Array.from({ length: 11 }, (_, k) => ({ at: k * b, id: 'foot', i: k })),
        ...LAND.map((t0, i) => ({ at: t0, id: 'drop', i: i + 1 })),
        { at: BAR + 3 * b, id: 'soft' },
        { at: T_TA, id: 'hopsoft', i: 1 }, { at: T_SNAP, id: 'crack', i: 1 }, { at: T_FALL - 0.25, id: 'swap' }, { at: T_FALL, id: 'topple' },
        ...[0, 1, 2, 3].map(k => ({ at: T_D0 + k * b, id: 'domino', i: k })),
        { at: T_TERM, id: 'write' }, { at: T_CHIP, id: 'chip' }, { at: L * BAR - 0.3, id: 'whip' },
      ],
      cam: t => F.drift(t, { z: 1.02, cy: 545, hits: [...LAND.map((t0, i) => [t0, 2 + i]), [T_FALL, 18], ...[0, 1, 2, 3].map(k => [T_D0 + k * b, 3 + 2 * k])], len: L * BAR, whipIn: 'left', whipOut: 'up' }),
      post: t => ({ bloom: 0.55 + 0.3 * F.pulse(t, T_FALL, 4), thresh: 0.55, ca: 0.35 + 2.0 * F.pulse(t, T_FALL, 6), vig: 0.55, grain: 0.035 }),
      draw(ctx, t, tAbs) {
        const sx = scroll(t);
        F.street(ctx, tAbs, sx, { gateX: TA_W + 40 });
        F.dust(ctx, tAbs + 60, 0.5, -sx * 0.4);
        skyTitle(ctx, '③', 'TA 是最安全的出口', t, 110, 1 - seg(t, T_DOM, T_DOM + 0.3));
        const step = walking(t) ? Math.abs(Math.sin((t / b) * Math.PI)) : 0;
        const n = LAND.filter(t0 => t >= t0).length, load = t < T_SNAP ? n : 0;
        const sqA = idle(t) - 0.035 * load - LAND.reduce((p, t0) => p + 0.06 * F.kick(t, t0, 10, 22), 0) + 0.12 * F.kick(t, T_SNAP, 7, 16) + (walking(t) ? 0.04 * (1 - step) - 0.02 : 0);
        const hA = 2 * R * sqA * 0.92, bob = 16 * step;
        const trem = t < T_SNAP ? Math.sin(t * 60) * load * 0.5 : 0;
        F.blob(ctx, XA + trem, GY - bob, {
          r: R, col: C.me, acc: 'cowlick', t: tAbs, sq: sqA, look: t >= T_TA - 0.6 ? 0.9 : 0.4, lookY: t >= T_FALL + 0.6 ? 0.6 : 0,
          mood: t < T_SNAP ? 'smile' : t < T_FALL + 0.6 ? 'angry' : 'shock', shout: 1,
          lean: walking(t) ? 0.06 : t >= T_SNAP && t < T_FALL + 0.4 ? 0.12 : 0,
        });
        const px = 2100 - (t - BAR * 0.6) * 620;
        if (px > -300 && px < 2300) F.blob(ctx, px, GY - 10 * Math.abs(Math.sin((t / b) * Math.PI)), { r: 100, col: GREY, look: -0.9, mood: 'calm', sq: idle(t, 3), lean: -0.05 });
        if (t >= BAR + 3 * b && t < 2 * BAR + 2 * b) F.softBubble(ctx, XA - 250, GY - 330, 0.7 * F.spring(seg(t, BAR + 3 * b, BAR + 3 * b + 0.4), 8, 14), '没事没事～', 1 - seg(t, 2 * BAR + b, 2 * BAR + 2 * b));
        const taX = TA_W - sx;
        const hop = F.hopX(t, taX, taX, T_TA, 0.4, 70);
        const buried = seg(t, T_FALL, T_FALL + 0.2);
        if (taX < W + 300) F.blob(ctx, taX, GY - hop.air, {
          r: R, col: C.ta, acc: 'bow', t: tAbs, sq: hop.sq * idle(t, 1) - 0.25 * F.kick(t, T_FALL, 7, 18), look: -0.9, lookY: buried ? 0.5 : 0,
          mood: t >= T_FALL ? 'hurt' : t >= T_SNAP ? 'shock' : 'smile', dim: 0.5 * seg(t, T_FALL, T_FALL + 1), glow: 1 - 0.5 * buried,
        });
        if (t >= T_TA && t < T_SNAP + 0.2) F.chirp(ctx, XT + 40, GY - 320, 0.85 * F.spring(seg(t, T_TA, T_TA + 0.3), 9, 16), 1 - seg(t, T_SNAP, T_SNAP + 0.2), '今天开心吗？');
        if (t >= T_SNAP && t < T_FALL + 1.2) F.rawBubble(ctx, XA - 40, GY - 370, 0.8 * F.spring(seg(t, T_SNAP, T_SNAP + 0.3)), '别烦我！', 1 - seg(t, T_FALL + 0.8, T_FALL + 1.2), 0.8, tAbs);
        LAND.forEach((t0, i) => {
          if (t < t0 - 0.35) return;
          const rest = { x: XA + (i % 2 ? 12 : -12), y: GY - bob - hA - 32 - i * 62, r: (i % 2 ? 0.04 : -0.035) + (walking(t) ? Math.sin((t / b) * Math.PI * 2 + i) * 0.015 * i : 0) };
          let x = rest.x, y = rest.y, r = rest.r;
          if (t < t0) { const u = seg(t, t0 - 0.35, t0); y = lerp(-200, rest.y, u * u); }
          if (t >= T_SNAP) {
            const [ppx, ppy, pr] = PILE[i];
            const u = ease.inOutCubic(seg(t, T_SNAP + i * 0.03, T_FALL));
            x = lerp(rest.x, XT + ppx, u); y = lerp(rest.y, GY + ppy - 30, u) - Math.sin(u * Math.PI) * (160 - i * 10); r = t >= T_FALL ? pr : lerp(rest.r, pr + u * 4, u);
          }
          F.block(ctx, x, y, 230, 58, r, LABELS[i]);
        });
        // the dominoes: 考试 → 老师 → 我 → TA
        const dA = seg(t, T_DOM, T_DOM + 0.4);
        if (dA > 0) {
          F.screen(ctx, () => { ctx.fillStyle = `rgba(6,6,16,${0.62 * dA})`; ctx.fillRect(0, 0, W, H); });
          F.screen(ctx, () => {
            const tiles = [['考试', '#aab4ff'], ['老师', '#aab4ff'], ['我', '#ff9a6a'], ['TA', '#ff4d6a']].map(([label, col], k) => ({
              x: 520 + k * 230, label, col, fall: seg(t, T_D0 + k * b, T_D0 + k * b + 0.35) * (k < 3 ? 0.8 : 1),
            }));
            F.dominoes(ctx, 780, tiles, dA);
            F.chalkWrite(ctx, '情绪转移 · 踢猫效应', W / 2, 330, seg(t, T_TERM, T_TERM + 0.5), { size: 56, fam: F.SERIF, weight: 900, color: '#ffe38a', glow: 18 });
            F.codeChip(ctx, W / 2, 200, 'vent(target = mostSafe())', seg(t, T_CHIP, T_CHIP + 0.6), seg(t, T_CHIP, T_CHIP + 0.15), { t, size: 32 });
          });
        }
        F.hud(ctx, t, tAbs, ['原因 3/4 · 情绪转移', C.dim], { petals: 0.6, wind: -sx * 0.5 });
      },
    });
  }

  // =========================================================== ④ the night sky (bars 25–31)
  {
    const S = 25, L = 7;
    const STAGES = [[2 * b, 760, '陌生人'], [BAR, 520, '朋友'], [BAR + 2 * b, 360, '恋人'], [2 * BAR, 200, '在一起很久']];
    const T_SELF1 = 3 * BAR, T_SELF2 = 3 * BAR + 2 * b, T_TURN = 4 * BAR, T_HIT = 4 * BAR + b, T_CHIP = 5 * BAR, T_MOON = 6 * BAR;
    const FY = 640, HR = 230;   // where they float; the halo radius
    F.scene({
      name: 'r4', start: S, len: L,
      subs: [
        { at: 0.3, dur: 3.5, zh: '心理学家 Aron 发现：关系越近' },
        { at: 4.0, dur: 2.9, zh: '我们越会把对方，算进「自我」里' },
        { at: 7.1, dur: 2.3, zh: '而我们对自己，往往最苛刻' },
        { at: 9.6, dur: 3.4, zh: '于是骂自己的话，也顺口落到了 TA 身上' },
      ],
      sfx: [
        { at: 0.15, id: 'write' }, ...STAGES.map(([t0], i) => ({ at: t0, id: 'circle', i })),
        { at: T_SELF1, id: 'buzz' }, { at: T_SELF2, id: 'buzz' }, { at: T_TURN, id: 'swap' }, { at: T_HIT, id: 'impact' },
        { at: T_CHIP, id: 'chip' }, { at: T_MOON + 2 * b, id: 'shimmer' },
      ],
      cam: t => {
        const c = F.drift(t, { z: 1.0, cy: 540, hits: [[T_HIT, 10]], len: L * BAR, whipIn: 'up' });
        const k = ease.inOutSine(seg(t, T_MOON, T_MOON + 2 * b));   // settle to a still frame for the match cut
        return { x: c.x * (1 - k), y: c.y * (1 - k), z: lerp(c.z, 1, k), r: c.r * (1 - k) };
      },
      post: t => ({ bloom: 0.7, thresh: 0.5, ca: 0.35 + 1.4 * F.pulse(t, T_HIT, 6), vig: 0.6, grain: 0.035 }),
      draw(ctx, t, tAbs) {
        F.cosmos(ctx, tAbs);
        skyTitle(ctx, '④', 'TA 已经是「自己」了', t, 110, 1 - seg(t, T_MOON, T_MOON + 0.4));
        let d = STAGES[0][1], lab = '';
        STAGES.forEach(([t0, dd, l], i) => { if (t >= t0) { const prev = i ? STAGES[i - 1][1] : dd; d = lerp(prev, dd, ease.outBack(seg(t, t0, t0 + 0.45))); lab = l; } });
        // the end: the two halos become one, then the moon
        const merge = ease.inOutCubic(seg(t, T_MOON, T_MOON + 2 * b));
        const toMoon = ease.inOutCubic(seg(t, T_MOON + 2 * b, L * BAR - 0.05));
        d = lerp(d, 0, merge);
        const bobA = Math.sin(t * 1.6) * 10, bobT = Math.sin(t * 1.6 + 1.3) * 10;
        const xA = 960 - d / 2, xT = 960 + d / 2;
        const ha = seg(t, 2 * b, 2 * b + 0.4) * (1 - 0.55 * seg(t, T_CHIP - 0.3, T_CHIP) + 0.55 * seg(t, T_MOON - 0.3, T_MOON));
        const hcx = lerp(960, 1500, toMoon), hcy = lerp(FY - 115, 230, toMoon), hr = lerp(HR, 70, toMoon);
        if (toMoon <= 0) {
          F.halo(ctx, xA, FY - 115 + bobA, HR, C.me, ha);
          F.halo(ctx, xT, FY - 115 + bobT, HR, C.ta, ha);
        } else {
          F.halo(ctx, hcx, hcy, hr, F.mix('#d9c8ff', '#f1f3ff', toMoon), 1 - toMoon * 0.6);
          F.moon(ctx, hcx, hcy, hr, toMoon);
        }
        const ca = 1 - merge;
        if (lab && ca > 0) F.text(ctx, lab, 960, FY + 130, { fam: F.SANS, size: 36, weight: 700, color: '#e9ecff', alpha: seg(t, 2 * b, 2 * b + 0.3) * ca * (1 - seg(t, T_SELF1 - 0.3, T_SELF1)), track: 4 });
        if (t >= 2 * BAR && d < 2 * HR) F.chalkWrite(ctx, '重叠的部分 = 被算进「自我」', 960, FY - 400, seg(t, 2 * BAR + 0.2, 2 * BAR + 0.8) * (1 - seg(t, T_SELF1 - 0.3, T_SELF1)), { size: 38, color: '#d9c8ff', fam: F.SERIF, weight: 700 });
        if (ca > 0) {
          ctx.save(); ctx.globalAlpha *= ca;
          const selfTalk = t >= T_SELF1 && t < T_TURN;
          F.blob(ctx, xA, FY + bobA, {
            r: R, col: C.me, acc: 'cowlick', t: tAbs, noPool: true, sq: idle(t) - 0.08 * selfTalk + 0.08 * F.kick(t, T_TURN, 8, 18), look: selfTalk ? -0.3 : 0.9, lookY: selfTalk ? 0.8 : 0,
            mood: selfTalk ? 'hurt' : t >= T_TURN && t < T_HIT + 1 ? 'angry' : t >= T_HIT + 1 ? 'shock' : 'calm', blush: t >= BAR + 2 * b && t < T_SELF1 ? 1 : 0, shout: 0.9,
          });
          F.blob(ctx, xT, FY + bobT, {
            r: R, col: C.ta, acc: 'bow', t: tAbs, noPool: true, sq: idle(t, 1) - 0.2 * F.kick(t, T_HIT, 7, 18), look: -0.9, lookY: t >= T_HIT ? 0.6 : 0,
            mood: t >= T_HIT ? 'hurt' : t >= BAR + 2 * b ? 'smile' : 'calm', blush: t >= BAR + 2 * b && t < T_SELF1 ? 1 : 0, dim: 0.4 * seg(t, T_HIT, T_HIT + 1),
            tear: t > T_HIT + 0.5 ? seg(t, T_HIT + 0.5, T_HIT + 2.5) : 0,
          });
          if (t >= T_SELF1 && t < T_TURN) F.rawBubble(ctx, xA - 250, FY - 300, 0.62 * F.spring(seg(t, T_SELF1, T_SELF1 + 0.4)), '你怎么这么笨', 1, 0.3, tAbs);
          if (t >= T_SELF2 && t < T_TURN) F.rawBubble(ctx, xA - 170, FY - 420, 0.55 * F.spring(seg(t, T_SELF2, T_SELF2 + 0.4)), '这都做不好', 1, 0.3, tAbs);
          if (t >= T_SELF1 && t < T_TURN) F.chalkWrite(ctx, '对自己', xA - 300, FY - 180, seg(t, T_SELF1 + 0.2, T_SELF1 + 0.5), { size: 36, color: '#ff8fa3' });
          if (t >= T_TURN && t < 6 * BAR) {
            const u = ease.inOutCubic(seg(t, T_TURN, T_HIT));
            F.rawBubble(ctx, lerp(xA - 200, xT + 20, u), lerp(FY - 300, FY - 250, u), 0.75 * (1 + 0.2 * F.pulse(t, T_HIT, 6)), '你怎么这么笨！', 1 - seg(t, 5 * BAR + 2 * b, 6 * BAR), 0.9, tAbs);
          }
          ctx.restore();
        }
        F.codeChip(ctx, 960, 250, 'TA === me', seg(t, T_CHIP, T_CHIP + 0.4), seg(t, T_CHIP, T_CHIP + 0.15) * (1 - seg(t, T_MOON - 0.2, T_MOON + 0.2)), { t, size: 48, col: '#d9c8ff' });
        if (t >= T_CHIP) {
          ctx.save(); ctx.globalAlpha *= 1 - seg(t, T_MOON - 0.2, T_MOON + 0.2);
          F.chalkWrite(ctx, '// 对自己多苛刻，对 TA 就多苛刻', 960, 340, seg(t, T_CHIP + 0.5, T_CHIP + 1.2), { size: 38, color: '#b9c0d8' });
          ctx.restore();
        }
        // everything but the moon goes dark for the cut to the window
        const dk = 0.85 * toMoon;
        if (dk > 0) {
          F.screen(ctx, () => { ctx.fillStyle = `rgba(4,4,12,${dk})`; ctx.fillRect(0, 0, W, H); });
          F.moon(ctx, hcx, hcy, hr, toMoon);
        }
        F.hud(ctx, t, tAbs, ['原因 4/4 · 自我扩展', C.dim], { statusA: 1 - merge });
      },
    });
  }
})();
