// campus.js — the night classroom the story happens in: wall, blackboard, clock, window with moon and blossoms,
// door with the class plate, moonlight on the floor, foreground desks, drifting petals; plus the characters' accessories.
(() => {
  const { W, H, C, seg, clamp, lerp } = F;
  const GY = 812;

  // ---------- wall + floor ----------
  const room = (ctx, t, o) => {
    const wall = ctx.createLinearGradient(0, -200, 0, GY);
    wall.addColorStop(0, '#0b0c1b'); wall.addColorStop(1, '#17183a');
    ctx.fillStyle = wall; ctx.fillRect(-500, -500, W + 1000, GY + 500);
    // painted lower wall + trim
    ctx.fillStyle = 'rgba(20,28,58,.55)'; ctx.fillRect(-500, 650, W + 1000, GY - 650);
    ctx.fillStyle = 'rgba(170,180,255,.10)'; ctx.fillRect(-500, 648, W + 1000, 3);
    // floor
    const fl = ctx.createLinearGradient(0, GY, 0, H + 300);
    fl.addColorStop(0, '#15163a'); fl.addColorStop(1, '#07070f');
    ctx.fillStyle = fl; ctx.fillRect(-500, GY, W + 1000, H + 500);
    ctx.strokeStyle = 'rgba(170,180,255,.05)'; ctx.lineWidth = 2;
    for (let k = 1; k < 9; k++) { const y = GY + 8 * k * k; ctx.beginPath(); ctx.moveTo(-500, y); ctx.lineTo(W + 500, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(170,180,255,.16)'; ctx.fillRect(-500, GY, W + 1000, 2);
  };

  // ---------- blackboard ----------
  const SMUDGE = (() => { const r = F.rng(31), o = []; for (let i = 0; i < 26; i++) o.push([r(), r(), 40 + r() * 160, r() * 6.28, r()]); return o; })();
  const board = (ctx, t, o) => {
    const x0 = 330, y0 = 120, w = 1140, h = 440;
    ctx.save();
    ctx.fillStyle = '#2b2019'; ctx.beginPath(); ctx.roundRect(x0 - 18, y0 - 18, w + 36, h + 36, 6); ctx.fill();
    const g = ctx.createRadialGradient(x0 + w * 0.45, y0 + h * 0.4, 40, x0 + w / 2, y0 + h / 2, w * 0.7);
    g.addColorStop(0, '#173129'); g.addColorStop(1, '#0c1a16');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    // old chalk smudges
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    for (const [u, v, s, a, k] of SMUDGE) {
      ctx.strokeStyle = `rgba(230,240,235,${0.025 + 0.03 * k})`; ctx.lineWidth = 18 + 30 * k;
      ctx.beginPath(); ctx.arc(x0 + u * w, y0 + v * h, s, a, a + 1.2 + k); ctx.stroke();
    }
    ctx.restore();
    // chalk tray + chalk
    ctx.fillStyle = '#3a2c22'; ctx.fillRect(x0 - 10, y0 + h + 14, w + 20, 14);
    [['#f4f4ee', 520], ['#ffb3c7', 548], ['#ffe38a', 1290]].forEach(([c, x]) => { ctx.fillStyle = c; ctx.fillRect(x, y0 + h + 6, 22, 8); });
    // chalk notes in the corners (a class at night, the countdown everyone has)
    const chalk = (s, x, y, size, rot, a, col = '#e9efe9') => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      F.text(ctx, s, 0, 0, { fam: F.SANS, size, weight: 500, color: col, alpha: a * (o.notes ?? 1), align: 'left' });
      ctx.restore();
    };
    chalk('10月14日  星期二', x0 + w - 290, y0 + 44, 26, -0.01, 0.42);
    chalk('值日：', x0 + w - 290, y0 + 84, 26, -0.01, 0.34);
    chalk('距高考还有 236 天', x0 + 34, y0 + h - 40, 30, 0.012, 0.42, '#ffd7e0');
  };

  // ---------- clock (ticks on the beat) ----------
  const clock = (ctx, t) => {
    const cx = 900, cy = 52, r = 40;
    ctx.save();
    ctx.fillStyle = '#d8dcf0'; ctx.shadowColor = 'rgba(200,210,255,.35)'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2a2c44'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = '#2a2c44'; ctx.lineCap = 'round';
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78); ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9); ctx.stroke(); }
    const hand = (a, l, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a) * l, cy - Math.cos(a) * l); ctx.stroke(); };
    hand(((22 + 10 / 60) / 12) * Math.PI * 2, r * 0.5, 5);
    hand((10 / 60) * Math.PI * 2, r * 0.72, 4);
    const beats = Math.floor(t / F.BEAT), frac = (t / F.BEAT) % 1;
    ctx.strokeStyle = '#ff5f7a'; hand(((beats + Math.min(1, frac * 8)) / 60) * Math.PI * 2, r * 0.82, 2);
    ctx.restore();
  };

  // ---------- window: night sky, moon, a blossom branch outside ----------
  const BLOSSOM = (() => { const r = F.rng(57), o = []; for (let i = 0; i < 46; i++) o.push([r(), r(), r()]); return o; })();
  const windowPane = (ctx, t) => {
    const x0 = 1560, y0 = 150, w = 320, h = 490;
    ctx.save();
    const sky = ctx.createLinearGradient(0, y0, 0, y0 + h);
    sky.addColorStop(0, '#1d2558'); sky.addColorStop(1, '#2d2a63');
    ctx.fillStyle = sky; ctx.fillRect(x0, y0, w, h);
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    // moon
    const mx = x0 + w * 0.68, my = y0 + 110;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 160);
    mg.addColorStop(0, 'rgba(235,240,255,.55)'); mg.addColorStop(1, 'rgba(235,240,255,0)');
    ctx.fillStyle = mg; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = '#eef1ff'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill();
    // branch + blossoms, swaying
    const sway = Math.sin(t * 0.9) * 6;
    ctx.strokeStyle = '#0a0b18'; ctx.lineCap = 'round';
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x0 + w + 20, y0 + 250); ctx.quadraticCurveTo(x0 + w * 0.5, y0 + 230 + sway, x0 + 40, y0 + 300 + sway); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + w * 0.55, y0 + 236 + sway); ctx.quadraticCurveTo(x0 + w * 0.4, y0 + 180 + sway, x0 + w * 0.25, y0 + 170 + sway * 1.3); ctx.stroke();
    for (const [u, v, k] of BLOSSOM) {
      const bx = x0 + 30 + u * (w - 10), by = y0 + 150 + v * 180 + sway * (1 - u * 0.5) + Math.sin(u * 9) * 20;
      ctx.fillStyle = k > 0.5 ? 'rgba(255,183,205,.85)' : 'rgba(255,214,226,.7)';
      ctx.beginPath(); ctx.arc(bx, by, 5 + k * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // frame + mullions
    ctx.strokeStyle = '#262a50'; ctx.lineWidth = 14; ctx.strokeRect(x0, y0, w, h);
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x0 + w / 2, y0); ctx.lineTo(x0 + w / 2, y0 + h); ctx.moveTo(x0, y0 + h / 3); ctx.lineTo(x0 + w, y0 + h / 3); ctx.moveTo(x0, y0 + (2 * h) / 3); ctx.lineTo(x0 + w, y0 + (2 * h) / 3); ctx.stroke();
    ctx.fillStyle = '#262a50'; ctx.fillRect(x0 - 20, y0 + h, w + 40, 14);
  };
  // moonlight: a shaft from the window and its print on the floor
  const moonlight = (ctx, a = 1) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(1700, 200, 1250, 950);
    g.addColorStop(0, `rgba(160,180,255,${0.10 * a})`); g.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(1560, 150); ctx.lineTo(1880, 150); ctx.lineTo(1640, 1000); ctx.lineTo(1150, 1000); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(170,190,255,${0.07 * a})`;
    ctx.beginPath(); ctx.moveTo(1240, 860); ctx.lineTo(1600, 860); ctx.lineTo(1540, 1010); ctx.lineTo(1120, 1010); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // ---------- door with the class plate ----------
  const door = ctx => {
    ctx.fillStyle = '#151633'; ctx.fillRect(40, 340, 210, GY - 340);
    ctx.strokeStyle = '#262a50'; ctx.lineWidth = 10; ctx.strokeRect(40, 340, 210, GY - 340);
    ctx.fillStyle = 'rgba(80,90,150,.35)'; ctx.fillRect(80, 390, 130, 140);
    ctx.fillStyle = '#9aa0c0'; ctx.beginPath(); ctx.arc(220, 600, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9dcec'; ctx.beginPath(); ctx.roundRect(70, 278, 150, 46, 6); ctx.fill();
    F.text(ctx, '高二(3)班', 145, 302, { fam: F.SANS, size: 26, weight: 700, color: '#20223a' });
  };

  // ---------- foreground desks (parallax, out of focus) ----------
  const desks = (ctx, cam) => {
    const px = (cam.x || 0) * 0.35;
    const desk = (x, y, w, flip) => {
      ctx.save(); ctx.translate(x + px, y);
      ctx.fillStyle = '#05050c';
      ctx.beginPath(); ctx.roundRect(0, 0, w, 60, 10); ctx.fill();
      ctx.fillRect(w * 0.08, 40, 26, 400); ctx.fillRect(w * 0.86, 40, 26, 400);
      ctx.fillStyle = 'rgba(170,180,255,.12)'; ctx.fillRect(10, 2, w - 20, 3);
      // a book and a pencil case on top
      ctx.fillStyle = '#0d0e1e'; ctx.fillRect(flip ? w - 240 : 60, -26, 180, 26);
      ctx.fillStyle = 'rgba(255,162,116,.25)'; ctx.fillRect(flip ? w - 240 : 60, -26, 180, 4);
      ctx.restore();
    };
    desk(-160, 960, 520, false);
    desk(1640, 975, 560, true);
  };

  // ---------- petals ----------
  const PETALS = (() => { const r = F.rng(73), o = []; for (let i = 0; i < 46; i++) o.push({ x: r(), y: r(), z: 0.5 + r() * 1.1, sp: 0.6 + r() * 0.8, ph: r() * 6.28, rot: r() * 6.28 }); return o; })();
  F.petals = (ctx, t, a = 1, wind = 0) => {
    ctx.save();
    for (const p of PETALS) {
      const travel = t * 70 * p.sp * p.z + wind * p.z;
      const x = (((p.x * (W + 400) - travel * 1.2 + Math.sin(t * 1.3 + p.ph) * 30) % (W + 400)) + W + 400) % (W + 400) - 200;
      const y = (((p.y * (H + 200) + travel * 0.7) % (H + 200)) + H + 200) % (H + 200) - 100;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + t * 1.5 * p.sp); ctx.scale(p.z, p.z * (0.5 + 0.5 * Math.abs(Math.sin(t * 2 * p.sp + p.ph))));
      ctx.globalAlpha = a * 0.75;
      ctx.fillStyle = p.z > 1.1 ? '#ffc2d3' : '#ff9fbc';
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(9, -4, 0, 9); ctx.quadraticCurveTo(-9, -4, 0, -9); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  // the whole set, back to front (characters are drawn between F.classroom and F.classroomFront)
  F.classroom = (ctx, t, o = {}) => {
    room(ctx, t, o);
    board(ctx, t, o);
    if (o.clock !== false) clock(ctx, t);
    windowPane(ctx, t);
    door(ctx);
    moonlight(ctx, o.moon ?? 1);
    if (o.warm) { ctx.save(); ctx.fillStyle = `rgba(120,20,50,${0.18 * o.warm})`; ctx.fillRect(-500, -500, W + 1000, H + 1000); ctx.restore(); }
  };
  F.classroomFront = (ctx, t, cam = {}) => desks(ctx, cam);

  // ---------- accessories: 我 has a cowlick, TA a ribbon ----------
  F.accessory = (ctx, kind, x, y, r, sq, lean, col, t, scale = 1) => {
    const w = (2 * r) / Math.sqrt(sq), h = 2 * r * sq * 0.92;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(lean);
    if (kind === 'cowlick') {
      const wob = Math.sin(t * 9) * 0.15;
      ctx.strokeStyle = col; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-w * 0.02, -h * 0.98);
      ctx.bezierCurveTo(w * 0.05, -h * 1.18, w * (0.22 + wob), -h * 1.2, w * (0.16 + wob), -h * 1.08); ctx.stroke();
    } else if (kind === 'bow') {
      ctx.translate(w * 0.27, -h * 0.9); ctx.rotate(0.35);
      ctx.fillStyle = '#ff8fb0'; ctx.shadowColor = 'rgba(255,143,176,.7)'; ctx.shadowBlur = 14;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * r * 0.3, -r * 0.22, s * r * 0.3, 0); ctx.quadraticCurveTo(s * r * 0.3, r * 0.2, 0, 0); ctx.fill(); }
      ctx.fillStyle = '#ffc2d3'; ctx.beginPath(); ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
})();
