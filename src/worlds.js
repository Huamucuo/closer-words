// worlds.js — the places the film visits after the classroom, plus the whip transition.
//   rooftop · phone chat · the street home · the night sky · the rainy window · the desk · the cherry tree at the gate
(() => {
  const { W, H, C, seg, clamp, lerp, ease } = F;
  const GY = 812;
  const R = (seed, n, f) => { const r = F.rng(seed), o = []; for (let i = 0; i < n; i++) o.push(f(r, i)); return o; };

  // ======================================================================= whip transition
  // F.WHIPS: [{ t, dir: 'up' | 'left' }] — a motion-smear of the current frame, peaking at t
  F.WHIPS = [];
  F.whips = (ctx, tAbs) => {
    for (const w of F.WHIPS) {
      const u = (tAbs - w.t) / 0.26;
      if (u <= -1 || u >= 1) continue;
      const k = 1 - Math.abs(u), kk = k * k;
      F.screen(ctx, () => {
        F.lctx.setTransform(1, 0, 0, 1, 0, 0); F.lctx.clearRect(0, 0, W, H); F.lctx.drawImage(F.src, 0, 0);
        const dx = w.dir === 'left' ? 1 : 0, dy = w.dir === 'up' ? 1 : 0, d = 90 * kk;
        for (let i = 1; i <= 7; i++) { ctx.globalAlpha = 0.2; ctx.drawImage(F.layer, -dx * d * i * (u < 0 ? 1 : -1), dy * d * i * (u < 0 ? 1 : -1)); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(10,10,24,${0.45 * kk})`; ctx.fillRect(0, 0, W, H);
        const r = F.rng(Math.floor(w.t * 97));
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = `rgba(200,210,255,${0.12 * kk * r()})`;
          if (dy) ctx.fillRect(r() * W, 0, 1 + r() * 3, H); else ctx.fillRect(0, r() * H, W, 1 + r() * 3);
        }
        ctx.globalCompositeOperation = 'source-over';
      });
    }
  };
  // camera offset a scene adds around a whip at its start (into) or end (out of)
  F.whipCam = (t, len, dirIn, dirOut) => {
    let x = 0, y = 0;
    if (dirIn) { const u = 1 - ease.outCubic(seg(t, 0, 0.3)); if (dirIn === 'up') y += 420 * u; else x -= 520 * u; }
    if (dirOut) { const u = ease.inCubic(seg(t, len - 0.3, len)); if (dirOut === 'up') y -= 420 * u; else x += 520 * u; }
    return { x, y };
  };

  // ======================================================================= shared sky bits
  const STARS = R(11, 220, r => ({ x: r() * (W + 1600) - 800, y: r() * 900 - 300, s: r(), ph: r() * 6.28 }));
  F.stars = (ctx, t, a = 1, par = 0) => {
    ctx.save();
    for (const s of STARS) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + s.s * 2) + s.ph);
      ctx.globalAlpha = a * (0.25 + 0.6 * s.s) * (0.5 + 0.5 * tw);
      ctx.fillStyle = s.s > 0.85 ? '#ffd9e6' : '#e6ebff';
      ctx.beginPath(); ctx.arc(s.x + par * s.s, s.y, 0.8 + 1.8 * s.s * s.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  F.moon = (ctx, x, y, r, a = 1) => {
    ctx.save(); ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
    g.addColorStop(0, 'rgba(235,240,255,.45)'); g.addColorStop(1, 'rgba(235,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    ctx.fillStyle = '#f1f3ff'; ctx.shadowColor = 'rgba(235,240,255,.9)'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const sky = (ctx, top, hor, y0 = -600, y1 = 760) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, top); g.addColorStop(1, hor);
    ctx.fillStyle = g; ctx.fillRect(-900, y0, W + 1800, y1 - y0 + 600);
  };
  // a city skyline with lit windows; layer 0 = far, 1 = near
  const CITY = [0, 1].map(L => R(40 + L, 40, (r, i) => {
    const w = 70 + r() * 130, h = (L ? 120 : 70) + r() * (L ? 230 : 150);
    const wins = []; for (let k = 0; k < 30; k++) if (r() < 0.35) wins.push([r(), r(), r()]);
    return { x: -900 + i * 105 + r() * 40, w, h, wins };
  }));
  F.city = (ctx, t, base, L, a = 1, par = 0) => {
    ctx.save(); ctx.globalAlpha *= a;
    for (const b of CITY[L]) {
      const x = b.x + par;
      ctx.fillStyle = L ? '#0d0e24' : '#16173a';
      ctx.fillRect(x, base - b.h, b.w, b.h + 400);
      for (const [u, v, k] of b.wins) {
        ctx.fillStyle = k > 0.7 ? `rgba(255,214,150,${0.55 + 0.3 * Math.sin(t * 0.7 + k * 9)})` : 'rgba(170,190,255,.35)';
        ctx.fillRect(x + 8 + u * (b.w - 22), base - b.h + 12 + v * (b.h - 20), 8, 10);
      }
    }
    ctx.restore();
  };

  // ======================================================================= the school rooftop
  F.rooftop = (ctx, t, o = {}) => {
    sky(ctx, '#060820', '#2d2456');
    const hg = ctx.createRadialGradient(W / 2, 700, 50, W / 2, 700, 900);
    hg.addColorStop(0, 'rgba(255,140,190,.18)'); hg.addColorStop(1, 'rgba(255,140,190,0)');
    ctx.fillStyle = hg; ctx.fillRect(-900, 0, W + 1800, 900);
    F.stars(ctx, t, 1);
    F.moon(ctx, 1520, 190, 62);
    F.city(ctx, t, 700, 0, 1, -40);
    F.city(ctx, t, 720, 1, 1, 30);
    // the stairwell hut with its little lamp
    ctx.fillStyle = '#12132c'; ctx.fillRect(-300, 420, 470, GY - 420);
    ctx.fillStyle = '#1b1d3e'; ctx.fillRect(40, 560, 110, GY - 560);
    const lg = ctx.createRadialGradient(95, 530, 4, 95, 560, 220);
    lg.addColorStop(0, 'rgba(255,200,140,.55)'); lg.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = lg; ctx.fillRect(-150, 380, 500, 460);
    ctx.fillStyle = '#ffd59a'; ctx.beginPath(); ctx.arc(95, 530, 9, 0, Math.PI * 2); ctx.fill();
    // floor
    const fl = ctx.createLinearGradient(0, GY - 60, 0, H + 200);
    fl.addColorStop(0, '#1d1d3a'); fl.addColorStop(1, '#0a0a16');
    ctx.fillStyle = fl; ctx.fillRect(-900, GY - 40, W + 1800, H);
    ctx.strokeStyle = 'rgba(170,180,255,.06)'; ctx.lineWidth = 2;
    for (let k = -8; k < 30; k++) { ctx.beginPath(); ctx.moveTo(k * 110, GY - 40); ctx.lineTo(k * 110 + (k * 110 - W / 2) * 0.9, H + 100); ctx.stroke(); }
    // railing
    ctx.strokeStyle = '#3d4170'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-900, 690); ctx.lineTo(W + 900, 690); ctx.moveTo(-900, 735); ctx.lineTo(W + 900, 735); ctx.stroke();
    ctx.lineWidth = 6;
    for (let x = 200; x < W + 900; x += 120) { ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x, GY - 40); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(200,210,255,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-900, 686); ctx.lineTo(W + 900, 686); ctx.stroke();
  };

  // ======================================================================= bokeh backdrop (behind the phones)
  const BOKEH = R(55, 34, r => ({ x: r() * W, y: r() * H, rr: 40 + r() * 140, c: ['255,143,176', '170,180,255', '255,196,120', '160,230,255'][Math.floor(r() * 4)], s: r() }));
  F.bokeh = (ctx, t, a = 1) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0b1e'); g.addColorStop(1, '#16112c');
    ctx.fillStyle = g; ctx.fillRect(-900, -900, W + 1800, H + 1800);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of BOKEH) {
      const x = b.x + Math.sin(t * 0.2 + b.s * 9) * 40, y = b.y + Math.cos(t * 0.15 + b.s * 7) * 30;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, b.rr);
      gg.addColorStop(0, `rgba(${b.c},${0.12 * a})`); gg.addColorStop(0.7, `rgba(${b.c},${0.07 * a})`); gg.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = gg; ctx.fillRect(x - b.rr, y - b.rr, b.rr * 2, b.rr * 2);
    }
    ctx.restore();
  };

  // ======================================================================= a phone with a chat
  // o: { name, avatar ('me'|'ta'|'grey'), clock, msgs: [{ side: 'l'|'r'|'time', text, at, col }], t, typingAt, heart }
  F.phone = (ctx, cx, cy, w, h, o) => {
    const t = o.t;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#0a0b16'; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 58); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(200,210,255,.25)'; ctx.lineWidth = 3; ctx.stroke();
    const sx = cx - w / 2 + 16, sy = cy - h / 2 + 16, sw = w - 32, sh = h - 32;
    ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 44); ctx.clip();
    ctx.fillStyle = '#141729'; ctx.fillRect(sx, sy, sw, sh);
    // status bar + header
    F.text(ctx, o.clock || '21:03', sx + 44, sy + 34, { fam: F.MONO, size: 22, weight: 800, color: '#e9ecff', align: 'left' });
    ctx.fillStyle = '#e9ecff'; ctx.fillRect(sx + sw - 74, sy + 24, 34, 16); ctx.fillRect(sx + sw - 39, sy + 29, 4, 6);
    ctx.fillStyle = '#1c2038'; ctx.fillRect(sx, sy + 60, sw, 84);
    const ac = o.avatar === 'ta' ? C.ta : o.avatar === 'me' ? C.me : '#8c93b8';
    ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(sx + 62, sy + 102, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1830'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx + 62 + s * 8, sy + 100, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    F.text(ctx, o.name, sx + 104, sy + 102, { fam: F.SANS, size: 30, weight: 700, color: '#e9ecff', align: 'left' });
    if (o.heart) F.heart(ctx, sx + 112 + F.measure(ctx, o.name, F.SANS, 30, 700) + 10, sy + 104, 0.7, 1);
    // messages, bottom-anchored like a real chat
    const shown = o.msgs.filter(m => t >= m.at);
    let y = sy + sh - 110;
    const rows = [];
    for (let i = shown.length - 1; i >= 0; i--) {
      const m = shown[i];
      if (m.side === 'time') { rows.push([m, y - 18]); y -= 46; continue; }
      ctx.font = F.font(F.SANS, 30, 500);
      const tw = Math.min(sw - 140, ctx.measureText(m.text).width);
      rows.push([m, y - 34, tw]); y -= 84;
    }
    if (o.typingAt != null && t >= o.typingAt && t < (o.typingEnd ?? 1e9)) {
      ctx.fillStyle = '#2b2f4a'; ctx.beginPath(); ctx.roundRect(sx + 26, sy + sh - 176, 110, 58, 24); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(233,236,255,${0.4 + 0.6 * Math.max(0, Math.sin(t * 8 - k))})`; ctx.beginPath(); ctx.arc(sx + 56 + k * 24, sy + sh - 147, 6, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const [m, yy, tw] of rows) {
      const pop = F.spring(seg(t, m.at, m.at + 0.35), 10, 18);
      if (m.side === 'time') { F.text(ctx, m.text, cx, yy, { fam: F.MONO, size: 20, weight: 500, color: '#8a90b0', alpha: pop }); continue; }
      const right = m.side === 'r', bw = tw + 48, bh = 62;
      const bx = right ? sx + sw - 26 - bw : sx + 26;
      ctx.save(); ctx.translate(bx + (right ? bw : 0), yy + bh / 2); ctx.scale(pop, pop); ctx.translate(-(bx + (right ? bw : 0)), -(yy + bh / 2));
      ctx.fillStyle = m.col || (right ? '#ff9a6a' : '#2b2f4a');
      if (m.glow) { ctx.shadowColor = m.glow; ctx.shadowBlur = 24; }
      ctx.beginPath(); ctx.roundRect(bx, yy, bw, bh, 24); ctx.fill(); ctx.shadowBlur = 0;
      F.text(ctx, m.text, bx + 24, yy + bh / 2 + 1, { fam: F.SANS, size: 30, weight: 500, color: right ? '#2a1a14' : '#e9ecff', align: 'left' });
      ctx.restore();
    }
    // input bar
    ctx.fillStyle = '#1c2038'; ctx.fillRect(sx, sy + sh - 86, sw, 86);
    ctx.fillStyle = '#2b2f4a'; ctx.beginPath(); ctx.roundRect(sx + 26, sy + sh - 66, sw - 52, 46, 23); ctx.fill();
    ctx.restore();
  };

  // ======================================================================= the street home (scrolls with sx)
  const LAMPS = 560, TREES = R(77, 30, (r, i) => ({ x: i * 430 + r() * 200, s: 0.8 + r() * 0.5 }));
  F.street = (ctx, t, sx, o = {}) => {
    sky(ctx, '#070820', '#231d48');
    F.stars(ctx, t, 0.7, -sx * 0.05);
    F.moon(ctx, 1550 - sx * 0.02, 170, 46);
    ctx.save(); ctx.translate(-((sx * 0.15) % 3000), 0); F.city(ctx, t, 600, 0, 0.9); ctx.translate(3000, 0); F.city(ctx, t, 600, 0, 0.9); ctx.restore();
    // blossom trees behind the wall
    for (const tr of TREES) {
      const x = tr.x - sx * 0.6;
      const xx = ((x % 12900) + 12900) % 12900 - 600;
      if (xx < -400 || xx > W + 400) continue;
      ctx.fillStyle = '#0d0e22'; ctx.fillRect(xx - 10, 470, 20, 200);
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7, rr = 60 * tr.s;
        ctx.fillStyle = k % 3 ? 'rgba(255,170,200,.55)' : 'rgba(255,210,226,.5)';
        ctx.beginPath(); ctx.arc(xx + Math.cos(a) * rr, 450 + Math.sin(a) * rr * 0.6, 46 * tr.s, 0, Math.PI * 2); ctx.fill();
      }
    }
    // school wall + fence
    ctx.fillStyle = '#181a3a'; ctx.fillRect(-900, 600, W + 1800, GY - 600);
    ctx.fillStyle = 'rgba(170,180,255,.12)'; ctx.fillRect(-900, 598, W + 1800, 4);
    ctx.strokeStyle = '#2a2d58'; ctx.lineWidth = 4;
    const fo = -((sx * 0.9) % 60);
    for (let x = fo - 900; x < W + 900; x += 60) { ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x, 520); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-900, 530); ctx.lineTo(W + 900, 530); ctx.stroke();
    // ground
    const g = ctx.createLinearGradient(0, GY, 0, H + 200);
    g.addColorStop(0, '#1b1c3c'); g.addColorStop(1, '#09091a');
    ctx.fillStyle = g; ctx.fillRect(-900, GY, W + 1800, H);
    ctx.fillStyle = 'rgba(170,180,255,.18)'; ctx.fillRect(-900, GY, W + 1800, 3);
    ctx.strokeStyle = 'rgba(170,180,255,.06)'; ctx.lineWidth = 2;
    const to = -(sx % 140);
    for (let x = to - 900; x < W + 900; x += 140) { ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x - 60, H + 100); ctx.stroke(); }
    // street lamps
    const lo = -(sx % LAMPS);
    for (let x = lo - LAMPS; x < W + LAMPS; x += LAMPS) {
      const pool = ctx.createRadialGradient(x + 40, GY + 20, 10, x + 40, GY + 20, 260);
      pool.addColorStop(0, 'rgba(255,205,150,.30)'); pool.addColorStop(1, 'rgba(255,205,150,0)');
      ctx.save(); ctx.scale(1, 0.3); ctx.fillStyle = pool; ctx.fillRect(x - 260, (GY - 260) / 0.3, 600, 900 / 0.3); ctx.restore();
      const cone = ctx.createLinearGradient(0, 300, 0, GY);
      cone.addColorStop(0, 'rgba(255,205,150,.22)'); cone.addColorStop(1, 'rgba(255,205,150,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(x + 60, 300); ctx.lineTo(x + 250, GY); ctx.lineTo(x - 130, GY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2d52'; ctx.fillRect(x - 6, 300, 12, GY - 300);
      ctx.fillRect(x - 6, 296, 80, 10);
      ctx.fillStyle = '#ffe3b8'; ctx.shadowColor = 'rgba(255,205,150,.9)'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.ellipse(x + 62, 310, 22, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    // the school gate, if it's in view (world x = o.gateX)
    if (o.gateX != null) {
      const gx = o.gateX - sx;
      if (gx > -600 && gx < W + 600) {
        for (const px of [gx - 260, gx + 260]) {
          ctx.fillStyle = '#23264c'; ctx.fillRect(px - 36, 430, 72, GY - 430);
          ctx.fillStyle = '#ffe3b8'; ctx.shadowColor = 'rgba(255,205,150,.9)'; ctx.shadowBlur = 30;
          ctx.beginPath(); ctx.arc(px, 420, 16, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.fillStyle = '#2b2e58'; ctx.fillRect(gx - 300, 440, 600, 50);
        F.text(ctx, '校  门', gx, 466, { fam: F.SERIF, size: 30, weight: 900, color: '#d9dcec' });
      }
    }
  };

  // ======================================================================= dominoes
  // tiles: [{ x, label, col, fall }] — fall 0..1 tips the tile to the right about its bottom-right corner
  F.dominoes = (ctx, base, tiles, a = 1) => {
    for (const d of tiles) {
      const w = 120, h = 260, ang = ease.inCubic(clamp(d.fall)) * 1.2;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(d.x + w / 2, base); ctx.rotate(ang); ctx.translate(-w, -h);
      ctx.fillStyle = '#1c1e38'; ctx.shadowColor = F.rgba(d.col || '#aab4ff', 0.6); ctx.shadowBlur = 24 * (0.4 + d.fall);
      ctx.beginPath(); ctx.roundRect(0, 0, w, h, 14); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = F.rgba(d.col || '#aab4ff', 0.9); ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = F.rgba(d.col || '#aab4ff', 0.5); ctx.fillRect(14, h / 2 - 3, w - 28, 6);
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(d.x + w / 2, base); ctx.rotate(ang); ctx.translate(-w / 2, -h);
      F.text(ctx, d.label, 0, h * 0.27, { fam: F.SERIF, size: d.label.length > 1 ? 44 : 60, weight: 900, color: d.col || '#e9ecff', glow: 16 });
      ctx.fillStyle = F.rgba(d.col || '#aab4ff', 0.8); for (const [px, py] of [[-22, 0.68], [22, 0.68], [0, 0.8]]) { ctx.beginPath(); ctx.arc(px, h * py, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  };

  // ======================================================================= the night sky (for the circles of self)
  F.cosmos = (ctx, t, o = {}) => {
    const g = ctx.createLinearGradient(0, -400, 0, H + 400);
    g.addColorStop(0, '#04051a'); g.addColorStop(1, '#140d30');
    ctx.fillStyle = g; ctx.fillRect(-900, -900, W + 1800, H + 1800);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, rr, c] of [[500, 300, 600, '120,90,255'], [1450, 700, 700, '255,110,170'], [1000, 500, 400, '90,200,255']]) {
      const n = ctx.createRadialGradient(x + Math.sin(t * 0.1) * 40, y, 0, x, y, rr);
      n.addColorStop(0, `rgba(${c},.10)`); n.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = n; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.restore();
    F.stars(ctx, t * 1.5, 1, t * 6);
    // a shooting star now and then
    const p = (t % 5.3) / 0.7;
    if (p < 1) { ctx.save(); ctx.strokeStyle = `rgba(240,245,255,${0.7 * Math.sin(p * Math.PI)})`; ctx.lineWidth = 2; const x = 300 + p * 500, y = 120 + p * 180; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 120, y - 44); ctx.stroke(); ctx.restore(); }
  };
  // a soft halo of self around a character
  F.halo = (ctx, x, y, r, col, a = 1) => {
    ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, F.rgba(col, 0.25)); g.addColorStop(0.85, F.rgba(col, 0.16)); g.addColorStop(1, F.rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = F.rgba(col, 0.75); ctx.lineWidth = 3; ctx.shadowColor = F.rgba(col, 0.9); ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };

  // ======================================================================= the rainy window
  const DROPS = R(91, 70, r => ({ x: r() * W, y: r() * H, s: 4 + r() * 9, v: r() < 0.35 ? 40 + r() * 120 : 0, ph: r() * 10 }));
  const RAIN = R(92, 220, r => ({ x: r() * (W + 400), y: r() * H, l: 30 + r() * 60, v: 900 + r() * 700, a: 0.05 + r() * 0.12 }));
  const LIGHTS = R(93, 26, r => ({ x: r() * W, y: 420 + r() * 520, rr: 30 + r() * 90, c: ['255,196,120', '255,143,176', '170,190,255'][Math.floor(r() * 3)] }));
  F.rainWindow = (ctx, t, o = {}) => {
    // outside
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080a20'); g.addColorStop(1, '#1d1838');
    ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
    F.moon(ctx, o.moonX ?? 1500, o.moonY ?? 230, o.moonR ?? 70, o.moonA ?? 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of LIGHTS) {
      const gg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.rr);
      gg.addColorStop(0, `rgba(${l.c},.18)`); gg.addColorStop(1, `rgba(${l.c},0)`);
      ctx.fillStyle = gg; ctx.fillRect(l.x - l.rr, l.y - l.rr, l.rr * 2, l.rr * 2);
    }
    ctx.restore();
    // rain beyond the glass
    ctx.save(); ctx.strokeStyle = '#c8d4ff'; ctx.lineWidth = 1.5;
    for (const d of RAIN) {
      const y = ((d.y + t * d.v) % (H + 100)) - 50, x = d.x - y * 0.18;
      ctx.globalAlpha = d.a * (o.rain ?? 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d.l * 0.18, y + d.l); ctx.stroke();
    }
    ctx.restore();
    // fog on the glass
    ctx.fillStyle = `rgba(200,210,240,${0.07 * (o.fog ?? 1)})`; ctx.fillRect(0, 0, W, H);
    // drops on the glass (some slide, leaving a trail)
    for (const d of DROPS) {
      const y = d.v ? (d.y + ((t + d.ph) * d.v) % H) % H : d.y;
      if (d.v) { ctx.strokeStyle = 'rgba(200,215,255,.10)'; ctx.lineWidth = d.s * 0.6; ctx.beginPath(); ctx.moveTo(d.x, y - 120); ctx.lineTo(d.x, y); ctx.stroke(); }
      const dg = ctx.createRadialGradient(d.x - d.s * 0.3, y - d.s * 0.3, 0, d.x, y, d.s);
      dg.addColorStop(0, 'rgba(255,255,255,.55)'); dg.addColorStop(0.5, 'rgba(200,215,255,.18)'); dg.addColorStop(1, 'rgba(200,215,255,.05)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(d.x, y, d.s * 0.8, d.s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the frame
    ctx.fillStyle = '#0a0b18';
    ctx.fillRect(0, 0, W, 50); ctx.fillRect(0, H - 70, W, 70); ctx.fillRect(0, 0, 50, H); ctx.fillRect(W - 50, 0, 50, H);
    ctx.fillRect(W / 2 - 14, 0, 28, H); ctx.fillRect(0, 520, W, 24);
    ctx.fillStyle = 'rgba(170,180,255,.12)'; ctx.fillRect(W / 2 - 14, 0, 3, H); ctx.fillRect(0, 520, W, 3);
  };
  // writing with a finger on the fogged glass
  F.fogWrite = (ctx, s, x, y, u, size = 56) => {
    if (u <= 0) return;
    F.chalkWrite(ctx, s, x, y, u, { size, align: 'left', fam: F.SANS, weight: 500, color: '#dfe6ff', glow: 14, glowColor: 'rgba(200,215,255,.5)', alpha: 0.8 });
    // a couple of drips under the stroke
    const w = F.measure(ctx, s, F.SANS, size, 500);
    for (let k = 0; k < 3; k++) {
      const dx = x + w * (0.2 + 0.3 * k) * clamp(u * 1.2), dl = 30 * seg(u, 0.6 + k * 0.1, 1);
      ctx.strokeStyle = 'rgba(220,230,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, y + size * 0.4); ctx.lineTo(dx, y + size * 0.4 + dl); ctx.stroke();
    }
  };

  // ======================================================================= the desk at night
  F.desk = (ctx, t, o = {}) => {
    const lamp = o.lamp ?? 1;
    ctx.fillStyle = '#07070f'; ctx.fillRect(-300, -300, W + 600, H + 600);
    // the wall, warmed by the lamp
    const wl = ctx.createRadialGradient(360, 300, 20, 360, 300, 1200);
    wl.addColorStop(0, `rgba(255,190,130,${0.22 * lamp})`); wl.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.fillStyle = '#10101e'; ctx.fillRect(-300, -300, W + 600, 900);
    ctx.fillStyle = wl; ctx.fillRect(-300, -300, W + 600, 900);
    // a small rainy window, top right
    ctx.fillStyle = '#141a3c'; ctx.fillRect(1440, 80, 360, 300);
    F.moon(ctx, 1700, 150, 28, 0.9);
    ctx.save(); ctx.beginPath(); ctx.rect(1440, 80, 360, 300); ctx.clip(); ctx.strokeStyle = 'rgba(200,215,255,.25)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 40; k++) { const x = 1440 + ((k * 97) % 360), y = 80 + (((k * 53) + t * 700) % 300); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 30); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#0a0b18'; ctx.lineWidth = 14; ctx.strokeRect(1440, 80, 360, 300); ctx.beginPath(); ctx.moveTo(1620, 80); ctx.lineTo(1620, 380); ctx.stroke();
    // a polaroid of the two on the wall
    ctx.save(); ctx.translate(560, 250); ctx.rotate(-0.08);
    ctx.fillStyle = `rgba(236,232,224,${0.5 + 0.5 * lamp})`; ctx.fillRect(-90, -100, 180, 210);
    ctx.fillStyle = '#2a2550'; ctx.fillRect(-76, -86, 152, 150);
    ctx.fillStyle = C.me; ctx.beginPath(); ctx.arc(-30, 40, 34, Math.PI, 0); ctx.fill();
    ctx.fillStyle = C.ta; ctx.beginPath(); ctx.arc(30, 40, 34, Math.PI, 0); ctx.fill();
    F.heart(ctx, 0, -30, 0.7, 1);
    ctx.restore();
    // desk
    const dg = ctx.createLinearGradient(0, 760, 0, H);
    dg.addColorStop(0, '#3a2a22'); dg.addColorStop(1, '#1a120e');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(-300, H + 10); ctx.lineTo(160, 760); ctx.lineTo(W - 160, 760); ctx.lineTo(W + 300, H + 10); ctx.closePath(); ctx.fill();
    // lamp
    ctx.strokeStyle = '#2a2b3e'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(250, 790); ctx.lineTo(300, 520); ctx.lineTo(420, 420); ctx.stroke();
    ctx.fillStyle = '#2a2b3e'; ctx.beginPath(); ctx.ellipse(250, 795, 70, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(430, 420); ctx.rotate(0.5);
    ctx.fillStyle = '#34364e'; ctx.beginPath(); ctx.moveTo(-50, -30); ctx.lineTo(50, -30); ctx.lineTo(80, 40); ctx.lineTo(-80, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,230,190,${lamp})`; ctx.shadowColor = 'rgba(255,200,140,.9)'; ctx.shadowBlur = 40 * lamp;
    ctx.beginPath(); ctx.ellipse(0, 40, 78, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (lamp > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cone = ctx.createLinearGradient(430, 440, 560, 900);
      cone.addColorStop(0, `rgba(255,200,140,${0.22 * lamp})`); cone.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(380, 450); ctx.lineTo(500, 440); ctx.lineTo(980, 1000); ctx.lineTo(160, 1000); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };
  // a laptop whose screen is the given rect; returns the screen rect for drawing into
  F.laptop = (ctx, cx, cy, w, h, glow = 1) => {
    ctx.save();
    ctx.shadowColor = `rgba(150,220,255,${0.35 * glow})`; ctx.shadowBlur = 80;
    ctx.fillStyle = '#1a1c2c'; ctx.beginPath(); ctx.roundRect(cx - w / 2 - 22, cy - h / 2 - 22, w + 44, h + 44, 18); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0c1020'; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = '#22253a'; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 80, cy + h / 2 + 70); ctx.lineTo(cx + w / 2 + 80, cy + h / 2 + 70); ctx.lineTo(cx + w / 2 + 22, cy + h / 2 + 22); ctx.lineTo(cx - w / 2 - 22, cy + h / 2 + 22); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // ======================================================================= the cherry tree at the school gate
  const BLOOM = R(101, 170, r => { const a = r() * Math.PI * 2, d = Math.sqrt(r()); return { x: Math.cos(a) * d * 540, y: Math.sin(a) * d * 230 - 40, rr: 22 + r() * 34, k: r() }; });
  F.cherryGate = (ctx, t, o = {}) => {
    sky(ctx, '#070822', '#2f2558', -1200, 760);
    F.stars(ctx, t, 0.9);
    F.moon(ctx, 1560, -60, 70);
    // the school building
    ctx.fillStyle = '#15163a'; ctx.fillRect(-500, 300, 1100, GY - 300); ctx.fillRect(1300, 340, 1100, GY - 340);
    const r = F.rng(5);
    for (let i = 0; i < 60; i++) {
      const bx = i < 30 ? -440 + (i % 10) * 104 : 1360 + (i % 10) * 104, by = (i < 30 ? 340 : 380) + Math.floor((i % 30) / 10) * 110;
      const lit = r() < 0.3;
      ctx.fillStyle = lit ? 'rgba(255,214,150,.75)' : 'rgba(60,70,120,.5)'; ctx.fillRect(bx, by, 60, 66);
    }
    // ground + path
    const g = ctx.createLinearGradient(0, GY, 0, H + 300);
    g.addColorStop(0, '#1d1c3e'); g.addColorStop(1, '#09091a');
    ctx.fillStyle = g; ctx.fillRect(-900, GY, W + 1800, H + 400);
    ctx.fillStyle = 'rgba(255,170,200,.10)'; ctx.beginPath(); ctx.ellipse(960, GY + 60, 900, 70, 0, 0, Math.PI * 2); ctx.fill();
    // gate pillars with lamps
    for (const px of [260, 1660]) {
      ctx.fillStyle = '#25284f'; ctx.fillRect(px - 50, 420, 100, GY - 420);
      ctx.fillStyle = '#ffe3b8'; ctx.shadowColor = 'rgba(255,205,150,.9)'; ctx.shadowBlur = 40;
      ctx.beginPath(); ctx.arc(px, 400, 22, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      const pool = ctx.createRadialGradient(px, 420, 10, px, 420, 380);
      pool.addColorStop(0, 'rgba(255,205,150,.18)'); pool.addColorStop(1, 'rgba(255,205,150,0)');
      ctx.fillStyle = pool; ctx.fillRect(px - 380, 40, 760, 760);
    }
    // the tree
    ctx.fillStyle = '#120f22';
    ctx.beginPath(); ctx.moveTo(930, GY); ctx.quadraticCurveTo(950, 520, 900, 300); ctx.lineTo(950, 300); ctx.quadraticCurveTo(1000, 520, 1000, GY); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 18; ctx.strokeStyle = '#120f22'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(925, 380); ctx.quadraticCurveTo(760, 300, 600, 250); ctx.moveTo(955, 360); ctx.quadraticCurveTo(1150, 280, 1330, 240); ctx.stroke();
    ctx.save();
    const sway = Math.sin(t * 0.8) * 8;
    for (const bl of BLOOM) {
      const x = 960 + bl.x + sway * (bl.y / -230), y = 230 + bl.y;
      ctx.fillStyle = bl.k > 0.75 ? 'rgba(214,96,150,.55)' : bl.k > 0.35 ? 'rgba(244,140,186,.55)' : 'rgba(255,190,214,.5)';
      ctx.beginPath(); ctx.arc(x, y, bl.rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  // ======================================================================= sticky notes
  F.sticky = (ctx, x, y, w, s, col, rot, u) => {
    if (u <= 0) return;
    const k = lerp(1.5, 1, ease.outBack(clamp(u))), a = clamp(u * 4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * (1 + (1 - clamp(u)) * 2)); ctx.scale(k, k); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.fillStyle = col; ctx.fillRect(-w / 2, -70, w, 140); ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-60, -86, 120, 30);
    F.text(ctx, s, 0, 4, { fam: F.SANS, size: 40, weight: 700, color: '#2a2c44' });
    ctx.restore();
  };
})();
