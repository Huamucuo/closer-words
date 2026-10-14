// ending.js — the breath, the rewrite, making up, the last line. Each in its own place.
//   bars 32–36  quiet part of the song   the rainy window: the moon from the sky; the four reasons written in the fog
//   bars 37–39  break 2 (muffled)        the desk at night: the lamp clicks on; speak() rewritten on the laptop
//   bars 40–46  drop 2                   the cherry tree at the school gate: the honest sentence, TA comes back, three sticky notes
//   bars 47–48  outro                    the camera cranes up past the tree to the sky: 越亲近，越值得被温柔以待
(() => {
  const { W, H, C, seg, clamp, lerp, ease } = F;
  const b = F.BEAT, BAR = F.BAR;
  const GY = F.GY, R = F.R;
  const idle = (t, ph = 0) => 1 + 0.015 * Math.sin(t * 2.4 + ph);
  const OLD = '你能不能别烦了！', NEW = '我今天有点累，能让我静一会吗？';

  // =========================================================== the rainy window (bars 32–36)
  {
    const S = 32, L = 5;
    const LINES = ['①  笃定 TA 不会走', '②  对 TA 期待更高', '③  TA 是最安全的出口', '④  TA 已经是「自己」'];
    const T_SUM = 4 * BAR;
    F.scene({
      name: 'window', start: S, len: L,
      subs: [
        { at: 0.6, dur: 3.2, zh: '所以，越亲近越伤人，不是因为不爱' },
        { at: 4.1, dur: 3.0, zh: '而是太放心、太期待、太熟悉' },
        { at: 7.4, dur: 3.0, zh: '把最差的自己，留给了最爱的人' },
      ],
      sfx: [{ at: 0, id: 'rain', dur: L * BAR }, ...LINES.map((_, i) => ({ at: i * BAR + 0.3, id: 'squeak' })), { at: T_SUM, id: 'squeak' }],
      cam: t => { const u = ease.inOutSine(seg(t, 0.4, L * BAR)); return { x: 0, y: 0, z: lerp(1.0, 1.06, u) }; },
      post: () => ({ bloom: 0.6, thresh: 0.55, ca: 0.3, vig: 0.65, grain: 0.04 }),
      draw(ctx, t, tAbs) {
        F.rainWindow(ctx, tAbs);
        LINES.forEach((s, i) => F.fogWrite(ctx, s, 130, 150 + i * 92, ease.outCubic(seg(t, i * BAR + 0.3, i * BAR + 1.0)), 52));
        // what the four add up to, under the moon
        const u = seg(t, T_SUM, T_SUM + 0.6);
        if (u > 0) {
          ctx.save(); ctx.globalAlpha *= u * 0.8; ctx.strokeStyle = '#dfe6ff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(1010, 110); ctx.quadraticCurveTo(1040, 110, 1040, 150); ctx.lineTo(1040, 250); ctx.quadraticCurveTo(1040, 288, 1070, 288);
          ctx.quadraticCurveTo(1040, 288, 1040, 326); ctx.lineTo(1040, 430); ctx.quadraticCurveTo(1040, 470, 1010, 470); ctx.stroke(); ctx.restore();
          F.fogWrite(ctx, '太放心了', 1110, 400, u, 84);
        }
        // 我, from behind, looking out
        F.blob(ctx, 560, 1190, { r: R, col: C.me, acc: 'cowlick', t: tAbs, back: true, scale: 1.7, sq: idle(t), dim: 0.25, glow: 0.6 });
        // the match cut: only the moon at first, then the window fades in around it
        const k = 1 - ease.inOutSine(seg(t, 0, 0.9));
        if (k > 0) {
          F.screen(ctx, () => { ctx.fillStyle = `rgba(4,4,12,${0.85 * k})`; ctx.fillRect(0, 0, W, H); });
          F.moon(ctx, 1500, 230, 70, k);
        }
        F.hud(ctx, t, tAbs, ['所以…', C.dim]);
        const out = ease.inCubic(seg(t, L * BAR - 0.35, L * BAR));
        if (out > 0) F.screen(ctx, () => { ctx.fillStyle = `rgba(0,0,0,${out})`; ctx.fillRect(0, 0, W, H); });
      },
    });
  }

  // =========================================================== the desk (bars 37–39, the muffled break)
  const CODE = [
    ['function speak(feeling, TA) {', '#9fe6ff'],
    ['  pause(3)                // 先停三秒', '#9fe6ff'],
    ['  return honest(feeling)  // 说感受，不说指责', '#9fe6ff'],
    ['}', '#9fe6ff'],
  ];
  {
    const S = 37, L = 3;
    const T_LAMP = 0.12, T0 = 0.45, T1 = 2 * BAR - 0.1, T_GHOST = 2 * BAR, T_DUST = 2 * BAR + 2 * b;
    const keys = [];
    for (let k = 0, tt = T0; tt < T1; k++, tt += 0.11 + 0.04 * F.hash(k)) keys.push({ at: tt, id: 'type', i: k % 5 });
    F.scene({
      name: 'desk', start: S, len: L,
      subs: [
        { at: 0.3, dur: 2.4, zh: '不是要你把面具戴回去' },
        { at: 3.0, dur: 2.6, zh: '而是换一种说法' },
      ],
      sfx: [{ at: T_LAMP, id: 'lamp' }, ...keys, { at: T_GHOST, id: 'buzz' }, { at: T_DUST, id: 'dust' }],
      cam: t => ({ x: 0, y: 0, z: lerp(1.0, 1.08, ease.inOutSine(seg(t, 0, L * BAR))) }),
      post: () => ({ bloom: 0.6, thresh: 0.55, ca: 0.35, vig: 0.65, grain: 0.04 }),
      draw(ctx, t, tAbs) {
        const flick = t < T_LAMP ? 0 : t < T_LAMP + 0.12 ? (F.hash(Math.floor(t * 60)) > 0.4 ? 1 : 0.2) : 1;
        F.desk(ctx, tAbs, { lamp: flick });
        F.laptop(ctx, 1080, 430, 900, 500, flick);
        F.codePanel(ctx, 1080, 430, CODE, ease.inOutSine(seg(t, T0, T1)), flick, { size: 30, w: 880, t });
        F.blob(ctx, 700, 1210, { r: R, col: C.me, acc: 'cowlick', t: tAbs, back: true, scale: 1.65, sq: idle(t) + 0.02 * Math.sin((t / b) * Math.PI * 2), dim: 0.3 - 0.2 * flick, glow: 0.5 });
        // the old sentence floats up as a ghost, then turns to dust
        if (t >= T_GHOST) {
          const crumble = seg(t, T_DUST, L * BAR);
          ctx.save(); ctx.font = F.font(F.SANS, 76, 900);
          const chars = [...OLD], ws = chars.map(c => ctx.measureText(c).width), tw = ws.reduce((p, q) => p + q, 0);
          ctx.restore();
          let cx0 = 1080 - tw / 2;
          chars.forEach((c, i) => {
            const hx = F.hash(i * 7 + 3) - 0.5, hy = F.hash(i * 11 + 9);
            F.text(ctx, c, cx0 + ws[i] / 2 + hx * 360 * crumble, 110 - hy * 260 * crumble, {
              fam: F.SANS, size: 76, weight: 900, color: F.mix('#ffd0d6', '#ffc2d3', crumble), alpha: seg(t, T_GHOST, T_GHOST + 0.3) * 0.75 * (1 - crumble),
              glow: 30, glowColor: F.rgba(F.mix(C.hurt, '#ff8fb0', crumble), 0.9),
            });
            cx0 += ws[i];
          });
          // the dust: already pink, already petals
          if (crumble > 0) F.screen(ctx, () => F.petals(ctx, tAbs * 2, crumble, crumble * 400));
        }
        const fin = 1 - seg(t, 0, 0.1);
        if (fin > 0) F.screen(ctx, () => { ctx.fillStyle = `rgba(0,0,0,${fin})`; ctx.fillRect(0, 0, W, H); });
        F.hud(ctx, t, tAbs, ['重写 speak()', C.glass]);
      },
    });
  }

  // =========================================================== the cherry tree at the gate (bars 40–46, drop 2)
  {
    const S = 40, L = 7;
    const T_LIGHT = b, T_H1 = 2 * b, T_H2 = 4 * b, T_OK = BAR + b;
    const NOTES = [
      [2 * BAR, '①  情绪上头，先停 3 秒', 560, 190, 600, '#ffe58a', -0.04],
      [3 * BAR + 2 * b, '②  说「我很累」，不说「你好烦」', 1330, 300, 660, '#ffb3c7', 0.035],
      [5 * BAR, '③  把对外人的耐心，分一点给最近的人', 860, 445, 780, '#a8d8ff', -0.02],
    ];
    F.scene({
      name: 'gate', start: S, len: L,
      sfx: [
        { at: 0, id: 'shimmer' }, { at: 0.02, id: 'soft' }, { at: T_LIGHT, id: 'circle', i: 3 },
        { at: T_H1, id: 'hopsoft', i: 1 }, { at: T_H2, id: 'hopsoft', i: 3 }, { at: T_H2 + 0.08, id: 'heart', i: 1 }, { at: T_OK, id: 'soft' },
        ...NOTES.map(([t0]) => ({ at: t0, id: 'sticky' })), ...NOTES.map(([t0], i) => ({ at: t0 + 0.05, id: 'heart', i: i % 2 })),
      ],
      cam: t => {
        const c = F.drift(t, { z: lerp(1.08, 1.02, ease.outCubic(seg(t, 0, BAR))), cy: 545, hits: [[0, 6], ...NOTES.map(([t0]) => [t0, 4])] });
        const k = ease.inOutSine(seg(t, L * BAR - 1.0, L * BAR));   // hand over to the crane
        return { x: c.x * (1 - k), y: c.y * (1 - k) + (H / 2 - 560) * k, z: lerp(c.z, 1.0, k), r: c.r * (1 - k) };
      },
      post: t => ({ bloom: 0.6 + 0.4 * F.pulse(t, 0, 3), thresh: 0.55, ca: 0.35 + 0.8 * F.pulse(t, 0, 6), vig: 0.5, grain: 0.035 }),
      draw(ctx, t, tAbs) {
        F.cherryGate(ctx, tAbs);
        F.dust(ctx, tAbs + 80, 0.6);
        const h1 = F.hopX(t, 1330, 1180, T_H1, 0.36, 60), h2 = F.hopX(t, 1180, 1070, T_H2, 0.36, 60);
        const ta = t < T_H1 + 0.01 ? h1 : h2;
        const light = ease.outCubic(seg(t, T_LIGHT, T_LIGHT + 0.5));
        const beat = (t / b) % 1, bounce = t > 2 * BAR ? 0.04 * Math.exp(-beat * 6) : 0;
        F.blob(ctx, lerp(600, 800, ease.inOutSine(seg(t, T_H2, T_H2 + 0.5))), GY, {
          r: R, col: C.me, acc: 'cowlick', t: tAbs, sq: idle(t) - bounce, look: 0.9, mood: t >= T_OK ? 'smile' : 'calm', blush: t >= T_OK ? 1 : 0,
        });
        F.blob(ctx, ta.x, GY - ta.air, {
          r: R, col: C.ta, acc: 'bow', t: tAbs, sq: ta.sq * idle(t, 1) - bounce, look: -0.9, mood: light > 0.5 ? 'smile' : 'calm', blush: t >= T_OK ? 1 : 0,
          dim: 0.25 * (1 - light), glow: 0.7 + 0.5 * light, lean: t >= T_H2 ? -0.05 : 0,
        });
        if (t < 2 * BAR) {
          const g = ease.outCubic(seg(t, 0, 0.35));
          F.softBubble(ctx, 930, 500 - 20 * g, 0.72 * lerp(0.6, 1, g), NEW, g * (1 - seg(t, 2 * BAR - 0.4, 2 * BAR)));
        }
        if (t >= T_OK && t < 2 * BAR + b) F.chirp(ctx, 1140, GY - 430, 0.9 * F.spring(seg(t, T_OK, T_OK + 0.3), 9, 16), 1 - seg(t, 2 * BAR, 2 * BAR + b), '好，我陪着你');
        const u = seg(t, T_H2, T_H2 + 1.4);
        if (u > 0 && u < 1) for (let k = 0; k < 7; k++) {
          const ang = -Math.PI / 2 + (k - 3) * 0.42, rr = 120 + 220 * ease.outCubic(u);
          F.heart(ctx, 930 + Math.cos(ang) * rr, GY - 260 + Math.sin(ang) * rr * 0.6 - 50 * u, (0.9 + 0.3 * (k % 3)) * F.spring(seg(t, T_H2 + k * 0.03, T_H2 + 0.5 + k * 0.03), 8, 14), 1 - seg(u, 0.6, 1));
        }
        F.petals(ctx, tAbs + 3, 1.0, 300 * seg(t, 0, 2));
        F.petals(ctx, tAbs * 1.3 + 17, 0.8 * (1 - 0.6 * seg(t, 0, 3)), 900 * seg(t, 0, 1.5));
        // the three tips, stuck to the screen on the beat
        F.screen(ctx, () => NOTES.forEach(([t0, s, x, y, w, col, rot]) => F.sticky(ctx, x, y, w, s, col, rot, seg(t, t0, t0 + 0.3) * (1 - seg(t, L * BAR - 0.8, L * BAR - 0.3)))));
        const fl = 0.45 * F.pulse(t, 0, 7);
        if (fl > 0.01) F.screen(ctx, () => { ctx.fillStyle = `rgba(255,240,250,${fl})`; ctx.fillRect(0, 0, W, H); });
        F.hud(ctx, t, tAbs, ['speak() 已更新', '#7be0a0']);
      },
    });
  }

  // =========================================================== the crane up (bars 47–48)
  {
    const S = 47, L = 2;
    F.scene({
      name: 'outro', start: S, len: L,
      sfx: [{ at: 0.3, id: 'write' }, { at: b * 2, id: 'heart', i: 0 }],
      cam: t => { const u = ease.inOutSine(seg(t, 0, L * BAR - 0.4)); return { x: 0, y: H / 2 - lerp(560, 200, u), z: lerp(1.0, 0.85, u) }; },
      post: () => ({ bloom: 0.7, thresh: 0.5, ca: 0.3, vig: 0.6, grain: 0.035 }),
      draw(ctx, t, tAbs) {
        F.cherryGate(ctx, tAbs);
        F.blob(ctx, 800, GY, { r: R, col: C.me, acc: 'cowlick', t: tAbs, sq: idle(t), look: 0.9, mood: 'smile', blush: 1, lean: 0.05 });
        F.blob(ctx, 1070, GY, { r: R, col: C.ta, acc: 'bow', t: tAbs, sq: idle(t, 1), look: -0.9, mood: 'smile', blush: 1, lean: -0.05 });
        F.chalkWrite(ctx, '越亲近，越值得被温柔以待', 960, -250, ease.outCubic(seg(t, 0.3, 1.3)), { size: 92, fam: F.SERIF, weight: 900, color: '#f4f6ff', glow: 26, glowColor: 'rgba(200,215,255,.7)' });
        const u = seg(t, 2 * b, 2 * b + 1.6);
        if (u > 0 && u < 1) F.heart(ctx, 935, GY - 280 - 160 * ease.outCubic(u), 1.6 * F.spring(seg(t, 2 * b, 2 * b + 0.5), 8, 14), 1 - seg(u, 0.6, 1));
        F.petals(ctx, tAbs + 3, 1.0, 300);
        F.hud(ctx, t, tAbs, null);
        const fo = seg(t, L * BAR - 0.9, L * BAR);
        if (fo > 0) F.screen(ctx, () => { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); });
      },
    });
  }
})();
