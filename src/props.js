// props.js — the film's shared props: eraser wipe, chalk writing, code chips, the thread and the red string,
// meters, stress blocks, Aron's circles, chalk arrows, calendar pages, a pencil, a phone notice.
(() => {
  const { W, H, C, seg, clamp, lerp, ease } = F;
  F.CODE = '"JetBrains Mono", "Noto Sans SC"';
  F.CHALK = '#eef3ee';

  // ---------- eraser wipe: a band of chalk dust sweeping the frame; fully covered at tc ----------
  F.WIPES = [];
  F.wipes = (ctx, tAbs) => {
    for (const tc of F.WIPES) {
      const u = (tAbs - tc) / 0.32;              // -1 … 1
      if (u <= -1 || u >= 1) continue;
      F.screen(ctx, () => {
        const x = lerp(-W * 0.9, W * 1.9, (u + 1) / 2);
        const g = ctx.createLinearGradient(x - W * 0.9, 0, x + W * 0.25, 0);
        g.addColorStop(0, 'rgba(210,216,232,0)'); g.addColorStop(0.35, 'rgba(46,50,74,.98)'); g.addColorStop(0.72, 'rgba(58,62,90,1)'); g.addColorStop(0.9, 'rgba(200,206,226,.9)'); g.addColorStop(1, 'rgba(210,216,232,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // dust specks at the leading edge
        const r = F.rng(Math.floor(tc * 100));
        ctx.fillStyle = 'rgba(235,240,250,.75)';
        for (let i = 0; i < 90; i++) { const px = x + W * 0.2 + (r() - 0.5) * 220, py = r() * H; ctx.beginPath(); ctx.arc(px, py, 1 + r() * 3, 0, Math.PI * 2); ctx.fill(); }
      });
    }
  };

  // ---------- chalk writing revealed left → right ----------
  F.chalkWrite = (ctx, s, x, y, u, o = {}) => {
    if (u <= 0) return;
    const size = o.size || 60, fam = o.fam || F.SANS, weight = o.weight || 700, align = o.align || 'center';
    const w = F.measure(ctx, s, fam, size, weight, o.track || 0);
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const vis = w * clamp(u);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 10, y - size, vis + 10, size * 2); ctx.clip();
    F.text(ctx, s, x0, y, { fam, size, weight, color: o.color || F.CHALK, alpha: o.alpha ?? 0.92, align: 'left', track: o.track || 0, glow: o.glow ?? 8, glowColor: o.glowColor || 'rgba(230,240,235,.35)' });
    ctx.restore();
    if (u < 1) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x0 + vis, y + size * 0.3, 4, 0, Math.PI * 2); ctx.fill(); }
  };
  // a section heading on the board: "① 笃定 TA 不会走"
  F.heading = (ctx, num, s, lt, o = {}) => {
    const u = ease.outCubic(seg(lt, o.at || 0, (o.at || 0) + 0.55));
    const x = o.x ?? W / 2, y = o.y ?? 196;
    const full = num + '  ' + s;
    F.chalkWrite(ctx, full, x, y, u, { size: o.size || 58, color: F.CHALK, weight: 900, fam: F.SERIF });
  };

  // ---------- code: a glass chip, typed in ----------
  F.codeChip = (ctx, x, y, code, u, a = 1, o = {}) => {
    if (a <= 0 || u <= 0) return;
    const size = o.size || 34;
    const full = F.measure(ctx, code, F.CODE, size, 800);
    const n = Math.round(code.length * clamp(u));
    const shown = code.slice(0, n);
    const w = full + 56, h = size * 1.9;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = F.rgba(o.col || C.glass, 0.5); ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(14,22,40,.82)'; ctx.strokeStyle = F.rgba(o.col || C.glass, 0.8); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 16); ctx.fill(); ctx.stroke();
    ctx.restore();
    F.text(ctx, shown, x - full / 2, y + 1, { fam: F.CODE, size, weight: 800, color: o.col || C.glass, alpha: a, align: 'left', glow: 12 });
    if (u < 1 || Math.floor(o.t * 2.5) % 2 === 0) {
      const cw = F.measure(ctx, shown, F.CODE, size, 800);
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = o.col || C.glass; ctx.fillRect(x - full / 2 + cw + 4, y - size * 0.55, size * 0.5, size * 1.1); ctx.restore();
    }
  };
  // a multi-line code panel; lines: [[text, colour], ...]; u types through all lines
  F.codePanel = (ctx, x, y, lines, u, a = 1, o = {}) => {
    if (a <= 0) return;
    const size = o.size || 40, lh = size * 1.55;
    const total = lines.reduce((p, l) => p + l[0].length, 0);
    let left = Math.round(total * clamp(u));
    const w = o.w || 1100, h = lines.length * lh + 70;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = F.rgba(C.glass, 0.45); ctx.shadowBlur = 50;
    ctx.fillStyle = 'rgba(12,18,34,.88)'; ctx.strokeStyle = F.rgba(C.glass, 0.7); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    [[C.hurt], ['#ffc46b'], ['#7be0a0']].forEach(([c], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - w / 2 + 34 + i * 26, y - h / 2 + 26, 7, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
    let cy = y - h / 2 + 62 + lh / 2, last = null;
    for (const [s, col] of lines) {
      const k = Math.min(left, s.length); left -= k;
      const shown = s.slice(0, k);
      F.text(ctx, shown, x - w / 2 + 50, cy, { fam: F.CODE, size, weight: 800, color: col || C.glass, alpha: a, align: 'left', glow: 10 });
      if (k > 0) last = [x - w / 2 + 50 + F.measure(ctx, shown, F.CODE, size, 800), cy];
      cy += lh;
    }
    if (last && (u < 1 || Math.floor((o.t || 0) * 2.5) % 2 === 0)) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.glass; ctx.fillRect(last[0] + 4, last[1] - size * 0.55, size * 0.5, size * 1.1); ctx.restore(); }
  };

  // ---------- the glass thread (fragile) and the red string (sure) ----------
  F.glassThread = (ctx, x0, y0, x1, y1, t, tremble = 0, a = 1) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = 'rgba(225,248,255,.95)'; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(160,230,255,.9)'; ctx.shadowBlur = 16;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + Math.sin(u * Math.PI) * 26 + Math.sin(u * Math.PI * 9 + t * 60) * tremble * 7 * Math.sin(u * Math.PI);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 1; i < 9; i++) {
      const u = i / 9, tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.3);
      ctx.fillStyle = `rgba(240,252,255,${0.4 + 0.5 * tw})`;
      ctx.beginPath(); ctx.arc(lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * Math.PI) * 26, 2 + 2 * tw, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  F.redString = (ctx, x0, y0, x1, y1, tension, a = 1) => {
    if (a <= 0) return;
    const sag = 70 * (1 - tension), xm = (x0 + x1) / 2, ym = (y0 + y1) / 2 + sag;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = '#ff3f62'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,63,98,.8)'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(xm, ym + sag * 0.5, x1, y1); ctx.stroke();
    // the knot / bow
    const bx = xm, by = (y0 + y1) / 2 + sag * 0.75;
    ctx.fillStyle = '#ff3f62';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(bx + s * 18, by - 4, 18, 11, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // ---------- meters on the board ----------
  F.meterBar = (ctx, x, yb, h, w, v, col, label, a = 1, o = {}) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = 'rgba(238,243,238,.55)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    ctx.strokeRect(x - w / 2, yb - h, w, h); ctx.setLineDash([]);
    const fh = h * clamp(v);
    ctx.shadowColor = F.rgba(col, 0.7); ctx.shadowBlur = 24; ctx.fillStyle = col;
    ctx.fillRect(x - w / 2 + 5, yb - fh, w - 10, Math.max(0, fh - 4));
    ctx.restore();
    F.text(ctx, label, x, yb + 30, { fam: F.SANS, size: 26, weight: 700, color: F.CHALK, alpha: a * 0.85 });
    if (o.value != null) F.text(ctx, String(Math.round(o.value)), x, yb - fh - 22, { fam: F.MONO, size: 30, weight: 800, color: col, alpha: a, glow: 12 });
  };

  // ---------- a stress block ----------
  F.block = (ctx, x, y, w, h, rot, label, a = 1) => {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
    ctx.fillStyle = '#3b3f58'; ctx.strokeStyle = '#5b6080'; ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    F.text(ctx, label, 0, 2, { fam: F.SANS, size: 28, weight: 700, color: '#d7dbef', alpha: a });
    ctx.restore();
  };

  // ---------- Aron's inclusion-of-other-in-the-self circles ----------
  F.iosCircles = (ctx, cx, cy, r, d, a = 1, o = {}) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const xa = cx - d / 2, xb = cx + d / 2;
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, col] of [[xa, C.me], [xb, C.ta]]) {
      ctx.fillStyle = F.rgba(col, 0.22); ctx.strokeStyle = F.rgba(col, 0.95); ctx.lineWidth = 4;
      ctx.shadowColor = F.rgba(col, 0.7); ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    F.text(ctx, '我', xa - (d < r ? r * 0.5 : 0), cy, { fam: F.SERIF, size: 44, weight: 900, color: C.me, alpha: a, glow: 10 });
    F.text(ctx, 'TA', xb + (d < r ? r * 0.5 : 0), cy, { fam: F.SERIF, size: 40, weight: 900, color: C.ta, alpha: a, glow: 10 });
    if (o.overlapLabel && d < 2 * r) F.text(ctx, o.overlapLabel, cx, cy + r + 34, { fam: F.SANS, size: 28, weight: 700, color: '#d9c8ff', alpha: a * seg(2 * r - d, 0, 60) });
  };

  // ---------- chalk arrow ----------
  F.chalkArrow = (ctx, x0, y0, x1, y1, u, col = F.CHALK, a = 1) => {
    if (u <= 0) return;
    const x = lerp(x0, x1, clamp(u)), y = lerp(y0, y1, clamp(u));
    ctx.save(); ctx.globalAlpha *= a * 0.9;
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowColor = F.rgba(col, 0.5); ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    if (u >= 1) {
      const ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(ang - 0.5) * 26, y1 - Math.sin(ang - 0.5) * 26);
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(ang + 0.5) * 26, y1 - Math.sin(ang + 0.5) * 26); ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- a tear-off calendar page flying away ----------
  F.calendarPage = (ctx, x, y, s, u) => {
    if (u <= 0 || u >= 1) return;
    const px = x + 260 * ease.outCubic(u), py = y - 160 * u + 280 * u * u;
    ctx.save(); ctx.translate(px, py); ctx.rotate(u * 2.4); ctx.globalAlpha *= 1 - seg(u, 0.6, 1);
    ctx.fillStyle = '#f2f0ea'; ctx.fillRect(-46, -56, 92, 112);
    ctx.fillStyle = '#ff5f7a'; ctx.fillRect(-46, -56, 92, 22);
    F.text(ctx, s, 0, 12, { fam: F.MONO, size: 38, weight: 800, color: '#2a2c44' });
    ctx.restore();
  };

  // ---------- small things ----------
  F.pencil = (ctx, x, y, rot, a = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
    ctx.fillStyle = '#ffc46b'; ctx.fillRect(-46, -8, 76, 16);
    ctx.fillStyle = '#f1d3a8'; ctx.beginPath(); ctx.moveTo(30, -8); ctx.lineTo(48, 0); ctx.lineTo(30, 8); ctx.fill();
    ctx.fillStyle = '#2a2c44'; ctx.beginPath(); ctx.moveTo(42, -3); ctx.lineTo(48, 0); ctx.lineTo(42, 3); ctx.fill();
    ctx.fillStyle = '#ff8fb0'; ctx.fillRect(-56, -8, 10, 16);
    ctx.restore();
  };
  F.notice = (ctx, x, y, s, a = 1) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const w = F.measure(ctx, s, F.SANS, 28, 700) + 90;
    ctx.fillStyle = 'rgba(240,242,252,.95)'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - 32, w, 64, 18); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#7be0a0'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 16, y - 16, 32, 32, 8); ctx.fill();
    ctx.restore();
    F.text(ctx, s, x + 22, y + 1, { fam: F.SANS, size: 28, weight: 700, color: '#2a2c44', alpha: a });
  };
  F.heart = (ctx, x, y, s, a) => {
    if (a <= 0 || s <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
    ctx.fillStyle = '#ff8fb0'; ctx.shadowColor = 'rgba(255,143,176,.9)'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-22, -6, -12, -24, 0, -12); ctx.bezierCurveTo(12, -24, 22, -6, 0, 8); ctx.fill();
    ctx.restore();
  };
  // a small floating bubble that says something soft (used for TA's clingy lines)
  F.chirp = (ctx, x, y, s, a, txt, col = C.ta) => {
    if (a <= 0 || s <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
    ctx.font = F.font(F.SANS, 36, 700);
    const w = ctx.measureText(txt).width + 50, h = 64;
    ctx.fillStyle = 'rgba(28,30,62,.85)'; ctx.strokeStyle = F.rgba(col, 0.9); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 26); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, h / 2 - 1); ctx.lineTo(4, h / 2 + 16); ctx.lineTo(14, h / 2 - 1); ctx.fill();
    ctx.restore();
    F.text(ctx, txt, x, y + 1, { fam: F.SANS, size: 36 * s, weight: 700, color: '#e9ecff', alpha: a });
  };
})();
