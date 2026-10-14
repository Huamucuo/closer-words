"""pieces.py — the score for 越亲近越伤人 (demo). 100 BPM, F minor, every hit on the picture's beats.

  bar 0  (0.0–2.4)   the question: one firm low hit, the falling motif (C–A♭–G) once, a reverse breath into
  bar 1  (2.4–4.8)   calm — stranger: felt piano, a soft pad, a muffled heartbeat, vinyl
  bar 2  (4.8–7.2)   build — TA hops closer: a kick on every landing, rising piano, filter opening, riser, snare roll, a breath of silence
  bar 3  (7.2–8.4)   impact — a distorted 808, a crash, the 808 sagging as TA is pushed away, one half-time clap
  quiet  (8.4–11.8)  everything falls away to ringing ears; Fm9 on soft piano, the motif again, unresolved
"""
import numpy as np

from instruments import Track, clap, piano
from synth import BAR, BEAT, S16, N, SR, adsr, filt, fx_crash, fx_heart, fx_reverse, fx_riser, hat, kick, mtof, noise, pad_note, snare, tsec


def sub808(m, dur, drive=2.5, glide=0.0):
    n = N(dur + 0.1)
    t = tsec(n)
    f = mtof(m) * (1 + 1.2 * np.exp(-t * 30)) * 2 ** (glide * t / 12)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    y = np.tanh(y * drive) / np.tanh(drive)
    return filt(y, 'low', 900) * adsr(n, 0.003, 0.3, 0.85, 0.08, dur)


def crackle(sec, seed=5):
    n = N(sec)
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    idx = rng.integers(0, n, int(sec * 40))
    y[idx] = rng.uniform(-1, 1, len(idx))
    return filt(y, 'band', [1200, 6000]) * 0.6 + filt(noise(n, seed), 'low', 900) * 0.02


def demo(c, t_abs):
    B = BAR
    T = 12.4
    tr = Track(T)
    # --- bar 0: the question
    tr.put('kick', kick(1.0), 0.0, 0.9)
    tr.put('sub', sub808(29, 1.4, 1.8), 0.0, 0.45)
    for m in (29, 41, 56, 60, 63):                            # F1 F2 A♭3 C4 E♭4
        tr.put('piano', piano(m, 1.6, 0.7), 0.0, 0.7, (m - 48) / 40)
    for k, m in enumerate((72, 68, 67)):                      # the motif: C5 A♭4 G4
        tr.put('piano', piano(m, 0.5, 0.55), (1 + k * 0.5) * BEAT, 0.55, 0.2 * (k - 1))
    for m in (53, 56, 60):
        tr.put('pad', filt(pad_note(m, B, m), 'low', 800), 0.0, 0.05, (m - 56) / 6)
    tr.put('swell', fx_reverse(BEAT, 33), 3 * BEAT, 0.7)
    # --- bar 1: calm (stranger)
    O = B
    for m in (41, 48, 56):                                   # F2 C3 A♭3
        tr.put('piano', piano(m, 2.2, 0.45), O, 0.85)
    tr.put('piano', piano(72, 0.5, 0.55), O + BEAT, 0.6, 0.2)
    tr.put('piano', piano(68, 0.8, 0.45), O + 3 * BEAT, 0.55, -0.2)
    for m in (53, 56, 60):
        tr.put('pad', filt(pad_note(m, 2 * B, m), 'low', 900), O, 0.05, (m - 56) / 6)
    tr.put('heart', fx_heart(), O, 0.7)
    tr.put('heart', fx_heart(), O + 2 * BEAT, 0.55)
    tr.put('vinyl', crackle(T), 0.0, 0.25)
    # --- bar 2: build (closer, closer)
    O = 2 * B
    for k, m in enumerate((68, 72, 75, 77)):                 # A♭4 C5 E♭5 F5 on each landing
        tl = O + k * BEAT
        tr.put('kick', kick(0.55 + 0.15 * k), tl, 0.8)
        tr.put('piano', piano(m, 0.5, 0.55 + 0.1 * k), tl, 0.7, 0.15 * (k - 1.5))
        tr.put('piano', piano(m - 24, 0.5, 0.5), tl, 0.5)
    for m in (49, 53, 56):                                   # D♭ pad, opening
        tr.put('pad2', pad_note(m, B, m), O, 0.07, (m - 53) / 6)
    for k in range(8):
        tr.put('hat', hat(0.6 + 0.05 * k, 300 + k), O + 2 * BEAT + k * S16, 0.12, 0.3 if k % 2 else -0.3)
    for k in range(8):
        tr.put('snare', snare(0.3 + 0.08 * k, 700 + k), O + 3 * BEAT + k * S16 / 2, 0.22)
    tr.put('riser', fx_riser(B - 0.1), O, 0.35)
    # --- bar 3: impact
    O = 3 * B
    tr.put('crash', fx_crash(), O, 1.0)
    tr.put('kick', kick(1.1), O, 1.0)
    tr.put('sub', sub808(29, BEAT, 3.0), O, 0.65)                        # F1
    tr.put('kick', kick(1.0), O + BEAT, 1.0)
    tr.put('sub', sub808(29, BEAT * 1.5, 3.0, -2.0), O + BEAT, 0.65)    # sags as TA is pushed away
    tr.put('snare', clap(77), O + 2 * BEAT, 0.7)
    for m in (41, 44, 48):
        tr.put('pad3', filt(pad_note(m, 2 * BEAT, m), 'low', 700), O, 0.12, (m - 44) / 8)
    for k, m in enumerate((72, 68)):
        tr.put('piano', piano(m, 0.55, 0.7), O + k * BEAT, 0.6, -0.1)
    # --- the quiet: no drums from here on
    Q = O + 3 * BEAT                                          # 9.0 — the music comes back, softly
    for m in (41, 56, 60, 63, 67):                            # F2 A♭3 C4 E♭4 G4 = Fm9
        tr.put('piano', piano(m, 2.6, 0.4), Q, 0.6, (m - 55) / 40)
    for m in (53, 56, 60, 63):
        tr.put('pad4', pad_note(m, 2.8, m), Q, 0.04, (m - 58) / 8)
    for k, (m, at) in enumerate(((72, 1.0), (68, 1.5), (70, 2.0), (67, 3.0))):   # C5 A♭4 B♭4 … G4 (unresolved)
        tr.put('piano', piano(m, 0.9, 0.42), Q + at * BEAT, 0.5, 0.25 * (-1) ** k)
    tt = tsec(tr.n)
    x = tr.mix(auto={
        'pad2': [[0, 0], [2 * B, 0], [2 * B + 0.01, 0.4], [3 * B - 0.1, 1.2], [3 * B, 0]],
        'vinyl': [[0, 1], [3 * B - 0.1, 1.6], [3 * B, 0.4], [4 * B, 0.6]],
    })
    # lowpass sweep through bar 2: everything opens up into the drop
    lp = filt(x, 'low', 1400)
    inb = ((tt >= 2 * B) & (tt < 3 * B))[:, None]
    k = np.clip((tt - 2 * B) / B, 0, 1)[:, None]
    x = np.where(inb, lp * (1 - k) + x * k, x)
    g = np.ones_like(tt)
    g[(tt > 3 * B - 0.09) & (tt < 3 * B)] = 0.0              # the breath before the drop
    g *= np.clip((12.0 - tt) / 1.4, 0, 1)                     # final fade
    return x * g[:, None]


PIECES = {'demo': demo}


def render(c, t_abs):
    return PIECES[c['name']](c, t_abs)
