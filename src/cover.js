// cover.js — the cover: the film's key moment (the filter shattering in the night classroom) under the question,
// framed separately for 16:9, 4:3 and 3:4. The set is drawn in the film's 1920×1080 world coordinates.
(() => {
  const { W, H, C, lerp } = F;
  const GY = 812, R = 125, XA = 640, XT = 1250;
  // cam: the world point (cx, cy) lands at screen (sx, sy), scaled by s. title: centre y of each line, size.
  const LAYOUTS = {
    '16x9': { s: 1.08, cx: 945, cy: 600, sx: W / 2, sy: H * 0.6, lines: [[160, 116], [298, 116]] },
    '4x3': { s: 1.0, cx: 945, cy: 600, sx: W / 2, sy: H * 0.62, lines: [[150, 106], [278, 106]] },
    '3x4': { s: 1.08, cx: 945, cy: 812, sx: W / 2, sy: H * 0.86, lines: [[230, 112], [390, 112]] },
  };

  const title = (ctx, L) => {
    const o = { fam: F.SERIF, size: L.lines[0][1], weight: 900, color: '#f6f7ff', track: 6, glow: 30, glowColor: 'rgba(200,215,255,.7)' };
    F.text(ctx, '为什么越亲近的人', W / 2, L.lines[0][0], o);
    F.richText(ctx, [['越容易', '#f6f7ff'], ['恶语相向', '#ffd9de', { glow: 56, glowColor: F.rgba(C.hurt, 1) }], ['？', '#f6f7ff']], W / 2, L.lines[1][0], { ...o, size: L.lines[1][1] });
  };

  F.drawCover = kind => {
    const L = LAYOUTS[kind], ctx = F.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(L.sx, L.sy); ctx.scale(L.s, L.s); ctx.translate(-L.cx, -L.cy);
    // the room, warmed red by the moment
    F.classroom(ctx, 3.2, { warm: 0.55, moon: 0.6, notes: 0, clock: false });
    F.dust(ctx, 25, 0.9, 260);
    // the blast between them
    const fcx = 935, fcy = GY - 112;
    // a red glow where the words hit
    const hg = ctx.createRadialGradient(1000, GY - 300, 20, 1000, GY - 300, 520);
    hg.addColorStop(0, F.rgba(C.hurt, 0.28)); hg.addColorStop(1, F.rgba(C.hurt, 0));
    ctx.fillStyle = hg; ctx.fillRect(400, GY - 820, 1200, 1100);
    F.shards(ctx, fcx, fcy, 0.17, 1);
    // 我 shouts; TA is knocked back, in tears
    F.blob(ctx, XA, GY, { r: R, col: C.me, acc: 'cowlick', t: 0, sq: 0.9, lean: 0.15, look: 1, mood: 'angry', shout: 1 });
    F.blob(ctx, XT, GY, { r: R, col: C.ta, acc: 'bow', t: 0, sq: 0.94, lean: -0.13, look: -0.5, lookY: 0.6, mood: 'hurt', tear: 0.45, dim: 0.2, glow: 0.8 });
    F.rawBubble(ctx, 960, GY - 345, 1.05, '你能不能别烦了！', 1, 1, 0.37);
    F.petals(ctx, 7.3, 1, 300);
    ctx.restore();
    // a soft dark band behind the title so it reads over the board, then the question in screen space
    const band = ctx.createLinearGradient(0, 0, 0, L.lines[1][0] + L.lines[1][1]);
    band.addColorStop(0, 'rgba(6,6,16,.55)'); band.addColorStop(0.75, 'rgba(6,6,16,.35)'); band.addColorStop(1, 'rgba(6,6,16,0)');
    ctx.fillStyle = band; ctx.fillRect(0, 0, W, L.lines[1][0] + L.lines[1][1]);
    title(ctx, L);
    F.post.render(F.src, { bloom: 0.6, thresh: 0.55, ca: 0.7, vig: 0.6, grain: 0.03, crt: 0 }, 7);
  };

  (async () => {
    F.post = new F.Post(document.getElementById('gl'));
    await F.ready;
    window.__drawCover = () => F.drawCover(window.__KIND);
    F.drawCover(window.__KIND);
    window.__ready = true;
  })();
})();
