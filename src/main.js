// main.js — boots the film. ?export=1 exposes __frame(t) only; otherwise a small preview player with audio.
(async () => {
  const q = new URLSearchParams(location.search);
  F.exportMode = q.has('export');
  F.debug = q.has('debug');
  F.post = new F.Post(document.getElementById('gl'));
  await F.ready;

  window.__frame = t => F.render(t);
  window.__cues = () => F.collectCues();
  window.__duration = () => F.duration();
  window.__webgl = () => (F.post.gl ? F.post.gl.getParameter(F.post.gl.RENDERER) : 'none');
  window.__ready = true;

  if (F.exportMode) { document.body.classList.add('export'); F.render(0); return; }

  // ---------------- preview player ----------------
  const aud = document.getElementById('aud');
  const hud = document.getElementById('hud');
  const prog = document.getElementById('prog');
  const dur = F.duration();
  let playing = false, t = +(q.get('t') || 0), clock0 = 0, t0 = 0, lastFrame = -1, audioOK = false;
  aud.addEventListener('canplay', () => { audioOK = true; });
  aud.addEventListener('error', () => { audioOK = false; });

  const now = () => performance.now() / 1000;
  const seek = nt => {
    t = Math.max(0, Math.min(dur, nt));
    if (audioOK) aud.currentTime = t;
    clock0 = now(); t0 = t; lastFrame = -1;
  };
  const toggle = () => {
    playing = !playing;
    if (playing) { if (t >= dur - 0.05) seek(0); clock0 = now(); t0 = t; if (audioOK) { aud.currentTime = t; aud.play().catch(() => {}); } }
    else aud.pause();
  };
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') seek(t + (e.shiftKey ? F.BEAT : F.BAR));
    if (e.code === 'ArrowLeft') seek(t - (e.shiftKey ? F.BEAT : F.BAR));
    if (e.code === 'Home') seek(0);
    if (e.code === 'KeyD') F.debug = !F.debug, (lastFrame = -1);
  });
  prog.parentElement.addEventListener('pointerdown', e => {
    const r = prog.parentElement.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * dur);
  });

  const loop = () => {
    if (playing) {
      t = audioOK && !aud.paused ? aud.currentTime : t0 + (now() - clock0);
      if (t >= dur) { t = dur; playing = false; aud.pause(); }
    }
    const f = F.frameOf(t);
    if (f !== lastFrame) { F.render(Math.min(t, dur - 1e-4)); lastFrame = f; }
    const sc = F.sceneAt(t);
    hud.textContent = `${t.toFixed(2)}s / ${dur.toFixed(1)}s   bar ${(t / F.BAR).toFixed(2)}   ${sc ? sc.name : ''}   [space] play  [←/→] bar  [shift+←/→] beat  [D] debug`;
    prog.style.width = (t / dur) * 100 + '%';
    requestAnimationFrame(loop);
  };
  loop();
})();
