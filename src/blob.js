// blob.js — the two characters (soft glowing mochi people), the distance ruler, the filter box, shards and dust.
(() => {
  const { W, H, C, seg, clamp, lerp } = F;

  F.mix = (a, b, u) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = s => Math.round(((pa >> s) & 255) * (1 - u) + ((pb >> s) & 255) * u);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  };
  // a decaying spring: 0 at u=0, settles to 1 with overshoot
  F.spring = (u, k = 9, w = 16) => (u <= 0 ? 0 : 1 - Math.exp(-k * u) * Math.cos(w * u));
  // impulse that kicks to 1 at t0 and rings out
  F.kick = (t, t0, decay = 10, freq = 26) => (t < t0 ? 0 : Math.exp(-(t - t0) * decay) * Math.cos((t - t0) * freq));
  F.pulse = (t, t0, decay = 8) => (t < t0 ? 0 : Math.exp(-(t - t0) * decay));

  // ---------- a mochi person. (x, y) = ground contact ----------
  // o: r, col, sq (stretch >1 tall), lean, look [-1..1], lookY, blink 0..1, mood, glow, dim, blush, tear
  F.blob = (ctx, x, y, o) => {
    const r = o.r || 110, sq = o.sq || 1;
    const w = (2 * r) / Math.sqrt(sq), h = 2 * r * sq * 0.92;
    const col = F.mix(o.col, '#2a2c44', clamp(o.dim || 0) * 0.75);
    ctx.save();
    ctx.translate(x, y);
    if (o.scale != null) ctx.scale(o.scale, o.scale);
    // ground shadow + light pool
    if (!o.noPool) {
    ctx.save();
    ctx.scale(1, 0.18);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.1);
    pool.addColorStop(0, F.rgba(col, 0.32 * (1 - (o.dim || 0) * 0.7)));
    pool.addColorStop(1, F.rgba(col, 0));
    ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, w * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    }
    ctx.rotate(o.lean || 0);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.bezierCurveTo(-w / 2, -h * 0.64, -w * 0.3, -h, 0, -h);
      ctx.bezierCurveTo(w * 0.3, -h, w / 2, -h * 0.64, w / 2, 0);
      ctx.quadraticCurveTo(0, h * 0.07, -w / 2, 0);
      ctx.closePath();
    };
    // outer glow
    ctx.save();
    ctx.shadowColor = F.rgba(col, 0.85 * (o.glow ?? 1));
    ctx.shadowBlur = 70 * (o.glow ?? 1);
    const g = ctx.createRadialGradient(-w * 0.18, -h * 0.72, r * 0.1, 0, -h * 0.45, r * 1.4);
    g.addColorStop(0, F.mix(col, '#ffffff', 0.45));
    g.addColorStop(0.55, col);
    g.addColorStop(1, F.mix(col, '#0a0b16', 0.45));
    ctx.fillStyle = g; body(); ctx.fill();
    ctx.restore();
    // rim light on the far side
    ctx.save(); body(); ctx.clip();
    ctx.strokeStyle = F.rgba('#ffffff', 0.18); ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(-w * 0.1, -h * 0.5, r * 1.05, -0.9, 0.5); ctx.stroke();
    ctx.restore();

    if (o.back) { if (o.acc) F.accessory(ctx, o.acc, 0, 0, r, sq, 0, col, o.t || 0); ctx.restore(); return; }
    // ---- face ----
    const lx = (o.look || 0) * w * 0.09, ly = (o.lookY || 0) * h * 0.05;
    const ey = -h * 0.54 + ly, ex = w * 0.17, ink = '#1b1830';
    const mood = o.mood || 'calm';
    const blink = clamp(o.blink || 0);
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const eh = r * 0.2 * (1 - blink * 0.92), ew = r * 0.105;
    const eye = (sx) => {
      const cx = sx * ex + lx;
      if (mood === 'smile') {
        ctx.lineWidth = r * 0.06;
        ctx.beginPath(); ctx.arc(cx, ey + r * 0.05, ew * 1.1, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      } else if (mood === 'hurt') {
        ctx.lineWidth = r * 0.055;
        ctx.beginPath(); ctx.moveTo(cx + ew * 1.1 * sx, ey - r * 0.06); ctx.lineTo(cx - ew * 0.9 * sx, ey + r * 0.01); ctx.lineTo(cx + ew * 1.1 * sx, ey + r * 0.07); ctx.stroke();
      } else if (mood === 'shock') {
        ctx.beginPath(); ctx.ellipse(cx, ey, ew * 0.75, ew * 0.75 * (1 - blink * 0.9), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - ew * 0.25, ey - ew * 0.25, ew * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink;
      } else {
        ctx.beginPath(); ctx.ellipse(cx, ey, ew, Math.max(1.5, eh), 0, 0, Math.PI * 2); ctx.fill();
        if (eh > ew) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - ew * 0.3, ey - eh * 0.4, ew * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink; }
        if (mood === 'angry') {   // a lid cut slanting down towards the nose
          const o1 = cx + sx * ew * 1.7, i1 = cx - sx * ew * 1.7;
          ctx.save(); ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(o1, ey - eh * 1.5); ctx.lineTo(i1, ey - eh * 1.5); ctx.lineTo(i1, ey - eh * 0.05); ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.lineWidth = r * 0.05;
          ctx.beginPath(); ctx.moveTo(o1, ey - eh * 1.15); ctx.lineTo(i1, ey - eh * 0.1); ctx.stroke();
        }
      }
    };
    eye(-1); eye(1);
    // blush
    if (o.blush) {
      ctx.fillStyle = F.rgba('#ff6f8e', 0.35 * o.blush);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * ex * 1.55 + lx, ey + r * 0.2, r * 0.11, r * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // mouth
    const my = ey + r * 0.3, mx = lx * 0.8;
    ctx.lineWidth = r * 0.045;
    ctx.beginPath();
    if (mood === 'smile') ctx.arc(mx, my - r * 0.05, r * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 'angry') { ctx.ellipse(mx, my + r * 0.02, r * 0.11 * (o.shout || 0.4) + r * 0.05, r * 0.09 * (o.shout || 0.4) + r * 0.02, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'hurt') { ctx.moveTo(mx - r * 0.1, my + r * 0.03); ctx.quadraticCurveTo(mx - r * 0.05, my - r * 0.03, mx, my + r * 0.02); ctx.quadraticCurveTo(mx + r * 0.05, my + r * 0.07, mx + r * 0.1, my); }
    else if (mood === 'shock') { ctx.ellipse(mx, my + r * 0.02, r * 0.045, r * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
    else ctx.moveTo(mx - r * 0.05, my), ctx.lineTo(mx + r * 0.05, my);
    ctx.stroke();
    // tear
    if (o.tear) {
      const ty = ey + r * 0.12 + o.tear * r * 0.45;
      ctx.fillStyle = F.rgba('#cfe9ff', 0.9 * (1 - seg(o.tear, 0.8, 1)));
      ctx.beginPath(); ctx.ellipse(ex + lx + r * 0.02, ty, r * 0.03, r * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (o.acc) F.accessory(ctx, o.acc, 0, 0, r, sq, 0, col, o.t || 0);
    ctx.restore();
  };

  // ---------- the distance ruler (a CAD dimension line between the two) ----------
  F.ruler = (ctx, x0, x1, y, label, sub, a, o = {}) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const col = o.col || C.glass;
    ctx.strokeStyle = F.rgba(col, 0.7); ctx.fillStyle = F.rgba(col, 0.85); ctx.lineWidth = 2;
    const L = Math.max(0, x1 - x0) * (o.draw ?? 1), xm = (x0 + x1) / 2;
    ctx.beginPath(); ctx.moveTo(xm - L / 2, y); ctx.lineTo(xm + L / 2, y); ctx.stroke();
    for (const [x, d] of [[xm - L / 2, 1], [xm + L / 2, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14 * d, y - 7); ctx.lineTo(x + 14 * d, y + 7); ctx.closePath(); ctx.fill();
    }
    // ticks
    ctx.globalAlpha *= 0.5;
    for (let k = 1; k < 20; k++) { const x = xm - L / 2 + (L * k) / 20; ctx.beginPath(); ctx.moveTo(x, y - (k % 5 ? 5 : 10)); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.restore();
    const pop = 1 + 0.25 * (o.pop || 0);
    F.text(ctx, label, xm, y - 46, { fam: F.MONO, size: 40 * pop, weight: 800, color: o.labelCol || col, alpha: a, glow: 18 });
    if (sub) F.text(ctx, sub, xm, y + 46, { fam: F.SANS, size: 30, weight: 500, color: C.white, alpha: a * 0.7, track: 4 });
  };

  // ---------- the filter: a glass code pill squeezed into the gap ----------
  F.filterBox = (ctx, cx, cy, w, h, code, o = {}) => {
    if (w < 4) return;
    ctx.save();
    const glow = 0.5 + (o.flash || 0);
    ctx.shadowColor = F.rgba(C.glass, 0.6 * glow); ctx.shadowBlur = 40 * glow;
    ctx.fillStyle = F.rgba('#1a2a44', 0.55);
    ctx.strokeStyle = F.rgba(C.glass, 0.75 + 0.25 * (o.flash || 0)); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(h / 2, w / 2, 26)); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // glass sheen
    ctx.save(); ctx.clip();
    const sh = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    sh.addColorStop(0, 'rgba(255,255,255,.14)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(0.6, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    // cracks
    if (o.crack > 0) {
      const rnd = F.rng(77);
      ctx.strokeStyle = 'rgba(230,250,255,.85)'; ctx.lineWidth = 2;
      const n = Math.floor(o.crack * 9);
      for (let i = 0; i < n; i++) {
        let x = cx + (rnd() - 0.5) * w * 0.3, y = cy + (rnd() - 0.5) * h * 0.4;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) { x += (rnd() - 0.5) * w * 0.5; y += (rnd() - 0.5) * h * 0.9; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    ctx.restore();
    if (code) {
      let size = 44;
      while (size > 14 && F.measure(ctx, code, F.MONO, size, 800) > w - 30) size -= 2;
      F.text(ctx, code, cx, cy + 2, { fam: F.MONO, size, weight: 800, color: C.glass, glow: 14 });
    }
    ctx.restore();
  };

  // ---------- shards of the broken filter ----------
  const SHARDS = (() => {
    const r = F.rng(4242), out = [];
    for (let i = 0; i < 70; i++) {
      const pts = [], n = 3 + Math.floor(r() * 2), s = 10 + r() * 34;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.8; pts.push([Math.cos(a) * s * (0.5 + r()), Math.sin(a) * s * (0.5 + r())]); }
      const ang = r() * Math.PI * 2, sp = 500 + r() * 1500;
      out.push({ pts, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.75 - 250, spin: (r() - 0.5) * 14, z: 0.6 + r() * 0.9, ox: (r() - 0.5) * 60, oy: (r() - 0.5) * 50 });
    }
    return out;
  })();
  // dt = time since the shatter; slow = time-scale curve (fast burst, then a near-frozen drift)
  F.shards = (ctx, cx, cy, dt, a = 1) => {
    if (dt < 0) return;
    const T = 0.5 * (1 - Math.exp(-dt * 7)) / 1 + dt * 0.06;   // burst then crawl
    ctx.save();
    for (const s of SHARDS) {
      const x = cx + s.ox + s.vx * T * s.z, y = cy + s.oy + s.vy * T * s.z + 60 * dt * dt * 0.4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.spin * T); ctx.scale(s.z, s.z);
      ctx.globalAlpha = a * (0.35 + 0.5 * s.z / 1.5);
      ctx.fillStyle = F.rgba(C.glass, 0.18); ctx.strokeStyle = F.rgba('#e6faff', 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------- dust: slow lavender motes with parallax ----------
  const DUST = (() => { const r = F.rng(9), o = []; for (let i = 0; i < 140; i++) o.push({ x: r() * W, y: r() * H, z: 0.3 + r() * 1.2, s: r(), ph: r() * 6.28 }); return o; })();
  F.dust = (ctx, t, a = 1, wind = 0) => {
    ctx.save();
    for (const d of DUST) {
      const x = ((d.x + t * 14 * d.z + wind * d.z) % (W + 100) + W + 100) % (W + 100) - 50;
      const y = d.y + Math.sin(t * 0.5 + d.ph) * 20 * d.z - t * 8 * d.z;
      const yy = ((y % H) + H) % H;
      ctx.globalAlpha = a * (0.15 + 0.35 * d.s) * (0.6 + 0.4 * Math.sin(t * 1.3 + d.ph));
      ctx.fillStyle = d.s > 0.8 ? C.me : C.ta;
      ctx.beginPath(); ctx.arc(x, yy, 1.2 + d.z * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  // ---------- backdrop ----------
  F.backdrop = (ctx, warm = 0) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.62, 50, W / 2, H * 0.6, W * 0.75);
    g.addColorStop(0, F.mix('#1d1b3a', '#3a1626', warm));
    g.addColorStop(0.6, '#0e0f20');
    g.addColorStop(1, '#07070f');
    ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800);
    // floor line
    const fl = ctx.createLinearGradient(0, 0, W, 0);
    fl.addColorStop(0, 'rgba(170,180,255,0)'); fl.addColorStop(0.5, 'rgba(170,180,255,.16)'); fl.addColorStop(1, 'rgba(170,180,255,0)');
    ctx.fillStyle = fl; ctx.fillRect(-400, 812, W + 800, 2);
  };

  // ---------- words as objects ----------
  // a jagged "raw feeling" bubble
  F.rawBubble = (ctx, x, y, s, txt, a, heat = 0, t = 0) => {
    if (a <= 0 || s <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
    const col = F.mix('#ff8a7a', C.hurt, heat);
    ctx.font = F.font(F.SANS, 64, 900);
    const tw = ctx.measureText(txt).width + 70, th = 120;
    ctx.beginPath();
    const n = 22, rnd = F.rng(5);
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2, spike = i % 2 ? 1 : 0.84 + 0.05 * Math.sin(t * 20 + i);
      const px = Math.cos(ang) * (tw / 2) * spike * (1.05 + rnd() * 0.08), py = Math.sin(ang) * (th / 2) * spike * (1.1 + rnd() * 0.1);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.shadowColor = F.rgba(col, 0.8); ctx.shadowBlur = 30 + 30 * heat;
    ctx.fillStyle = F.rgba('#2a0d18', 0.75); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    const j = heat * 3;
    F.text(ctx, txt, x + (F.hash(Math.floor(t * 30)) - 0.5) * j, y + (F.hash(Math.floor(t * 30) + 7) - 0.5) * j,
      { fam: F.SANS, size: 64 * s, weight: 900, color: F.mix('#ffd0c8', '#ffffff', heat * 0.3), alpha: a, glow: 20 + 20 * heat, glowColor: F.rgba(col, 0.9) });
  };
  // a soft rounded "polite" bubble
  F.softBubble = (ctx, x, y, s, txt, a) => {
    if (a <= 0 || s <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
    ctx.font = F.font(F.SERIF, 56, 700);
    const tw = ctx.measureText(txt).width + 80, th = 104;
    ctx.shadowColor = F.rgba(C.ta, 0.7); ctx.shadowBlur = 40;
    ctx.fillStyle = F.rgba('#1c1f3e', 0.8); ctx.strokeStyle = F.rgba(C.ta, 0.9); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-tw / 2, -th / 2, tw, th, th / 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    F.text(ctx, txt, x, y + 2, { fam: F.SERIF, size: 56 * s, weight: 700, color: '#e9ecff', alpha: a, glow: 16, glowColor: F.rgba(C.ta, 0.8) });
  };

  F.statusLine = (ctx, s, a, col = C.dim, t = 0) => {
    if (a <= 0) return;
    const star = '✻✺✹✸'[Math.floor(t * 8) % 4];
    F.screen(ctx, () => {
      F.text(ctx, star, 70, H - 52, { fam: F.MONO, size: 26, weight: 800, color: C.me, alpha: a, align: 'left', glow: 10 });
      F.text(ctx, s, 108, H - 52, { fam: F.MONO, size: 24, weight: 500, color: col, alpha: a, align: 'left' });
    });
  };
})();
