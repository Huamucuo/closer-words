"""instruments.py — shared instruments and mixing helpers (from the game-changed-video engine).

Each piece is written for what its chapter means:
  victory  I   a bright F-major chip loop that wears out as it repeats (hedonic adaptation)
  want     II  a cold A-minor sequencer pulse that never resolves; the sweet melody only as a distant ghost
  work     III a music box going out of tune, then a marimba production line with a clock and a typewriter
  needs    IV  warm G major; guitar = autonomy, bass = competence, a two-voice duet = relatedness
  tired    V   slow, tired piano under a ticking clock
  warm     VII the main theme, re-orchestrated, with a string counter-line and bells
"""
import numpy as np
from scipy import signal

from synth import (BAR, BEAT, E8, S16, MELODY, N, SR, adsr, filt, fx_crash, fx_musicbox, fx_riser, hat, interp_log,
                   kick, lead_note, mtof, nes_triangle, noise, pad_note, pulse, render_theme, rhodes, saw, snare,
                   tsec, tv_lowpass, woodblock)


def env(points, tt):
    return np.interp(tt, [p[0] for p in points], [p[1] for p in points])


class Track:
    """named stereo layers on one timeline, mixed with optional per-layer automation"""

    def __init__(self, sec):
        self.n = N(sec)
        self.layers = {}

    def put(self, layer, x, t0, g=1.0, pan=0.0):
        L = self.layers.setdefault(layer, np.zeros((self.n, 2)))
        i = N(t0) if t0 > 0 else 0
        if i >= self.n:
            return
        x = np.asarray(x, float)
        if x.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            x = np.stack([x * l, x * r], axis=1) * 1.414
        x = x[: self.n - i] * g
        L[i:i + len(x)] += x

    def mix(self, auto=None, only=None):
        tt = tsec(self.n)
        out = np.zeros((self.n, 2))
        for k, x in self.layers.items():
            if only and k not in only:
                continue
            if auto and k in auto:
                x = x * env(auto[k], tt)[:, None]
            out += x
        return out


# ---------------------------------------------------------------- instruments
def marimba(m, v=1.0):
    f = mtof(m)
    n = N(0.5)
    t = tsec(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 14) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 40)
    y += 0.08 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 90)
    return y * (1 - np.exp(-t * 2000)) * v


def ks_pluck(m, dur, seed=0, bright=0.5):
    """Karplus–Strong string: a nylon-ish guitar"""
    f = mtof(m)
    n = N(dur + 0.6)
    d = max(2, int(round(SR / f - 0.5)))
    burst = filt(np.random.default_rng(seed).uniform(-1, 1, d), 'low', 1800 + 6000 * bright)
    x = np.zeros(n)
    x[:d] = burst
    a = np.zeros(d + 2)
    a[0], a[d], a[d + 1] = 1.0, -0.4985, -0.4985
    y = signal.lfilter([1.0], a, x)
    t = tsec(n)
    return y * np.clip(1 - (t - dur) / 0.2, 0, 1) * 0.7


def saw_pluck(m, dur, cutoff, v=1.0):
    n = N(dur + 0.08)
    t = tsec(n)
    y = saw(mtof(m), n) + 0.6 * saw(mtof(m) * 1.006, n)
    e = np.exp(-t * 28)
    y = filt(y, 'low', cutoff * 0.3) * (1 - e) + filt(y, 'low', cutoff) * e
    return y * np.exp(-t * 6) * adsr(n, 0.002, 0.1, 1, 0.05, dur) * v * 0.4


def sub_note(m, dur):
    n = N(dur + 0.05)
    return np.sin(2 * np.pi * mtof(m) * tsec(n)) * adsr(n, 0.006, 0.1, 0.9, 0.04, dur)


def piano(m, dur=2.0, v=1.0):
    """additive felt piano for the middle register"""
    f0 = mtof(m)
    n = N(dur + 1.5)
    t = tsec(n)
    y = np.zeros(n)
    for k in range(1, 14):
        fk = k * f0 * np.sqrt(1 + 0.0004 * k * k)
        if fk > 12000:
            break
        amp = 1 / k ** 1.3
        dec = (0.6 + 0.35 * k) * (f0 / 220) ** 0.4
        for det in (-0.3, 0.3):
            y += amp * np.sin(2 * np.pi * fk * (1 + det / 1200) * t + k * det) * np.exp(-t * dec)
    y += filt(noise(n, int(m * 7)), 'low', 1500) * np.exp(-t * 80) * 0.12
    rel = np.clip(1 - (t - dur) / 0.5, 0, 1)
    return filt(y, 'low', 1800 + 3000 * v) * rel * (1 - np.exp(-t * 400)) * 0.25 * v


def soft_lead(m, gate):
    """a breathy square for the duet: soft attack, delayed vibrato"""
    n = N(gate + 0.12)
    t = tsec(n)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.2) / 0.2, 0, 1)
    y = pulse(mtof(m) * vib, n, 0.5) * 0.7 + np.sin(2 * np.pi * mtof(m) * t) * 0.5
    return filt(y, 'low', 2400) * adsr(n, 0.035, 0.2, 0.8, 0.1, gate)


def clap(seed):
    n = N(0.2)
    t = tsec(n)
    nz = filt(noise(n, seed), 'band', [900, 5000])
    e = sum(np.exp(-np.maximum(t - d, 0) * 70) * (t >= d) for d in (0, 0.011, 0.022)) * 0.5 + np.exp(-t * 14) * 0.5
    return nz * e * 0.5


def brush(seed):
    n = N(0.12)
    t = tsec(n)
    return filt(noise(n, seed), 'band', [2000, 7000]) * np.exp(-t * 30) * (1 - np.exp(-t * 300)) * 0.5


def typeclick(seed):
    n = N(0.03)
    t = tsec(n)
    return filt(noise(n, seed), 'band', [2500, 8000]) * np.exp(-t * 500)


def tw_bell():
    n = N(1.0)
    t = tsec(n)
    return (np.sin(2 * np.pi * 2200 * t) + 0.3 * np.sin(2 * np.pi * 5900 * t)) * np.exp(-t * 4) * (1 - np.exp(-t * 900))


def pump(tt, depth=0.5):
    """sidechain duck on every beat"""
    ph = tt % BEAT
    return 1 - depth * np.exp(-ph * 9) * (1 - np.exp(-ph * 400))


def echo(x, delay, fb=0.4, taps=3, lp=2500):
    out = x.copy()
    d = N(delay)
    y = x
    for k in range(taps):
        y = filt(y, 'low', lp)
        sh = np.zeros_like(x)
        sh[d * (k + 1):] = y[: len(x) - d * (k + 1)] * fb ** (k + 1)
        out += sh
    return out


def tapestop(x, t0, dur):
    """the machine losing power: playback slows to a stop, then silence"""
    i0, m, n = N(t0), N(dur), len(x)
    if i0 >= n:
        return x
    rate = (1 - np.linspace(0, 1, m)) ** 1.6
    pos = np.minimum(i0 + np.cumsum(rate), n - 1)
    seg = np.stack([np.interp(pos, np.arange(n), x[:, c]) for c in (0, 1)], axis=1)
    seg *= np.clip((m - np.arange(m)) / N(0.03), 0, 1)[:, None]
    out = x.copy()
    k = min(m, n - i0)
    out[i0:i0 + k] = seg[:k]
    out[i0 + k:] = 0
    return out


SCALE_G = [7, 9, 11, 0, 2, 4, 6]


def third_below(m, scale=SCALE_G):
    i = scale.index(m % 12)
    want = scale[(i - 2) % 7]
    for d in range(1, 6):
        if (m - d) % 12 == want:
            return m - d
    return m - 3


