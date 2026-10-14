"""synth.py — oscillators, filters, instruments, the main theme and sound effects. Pure numpy/scipy."""
import os

import numpy as np
from scipy import signal

SR = 48000
BPM = 112.9039
BEAT = 60 / BPM
BAR = BEAT * 4
E8 = BEAT / 2
S16 = BEAT / 4
ROOT = os.path.dirname(os.path.abspath(__file__))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tsec(n):
    return np.arange(n) / SR


def N(sec):
    return max(1, int(round(sec * SR)))


# ---------------------------------------------------------------- oscillators
def _blep(t, dt):
    y = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    y[m] = 2 * x - x * x - 1
    m = t > 1 - dt
    x = (t[m] - 1) / dt[m]
    y[m] = x * x + 2 * x + 1
    return y


def pulse(freq, n, duty=0.5):
    """band-limited pulse (PolyBLEP). freq may be scalar or per-sample array."""
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = f / SR
    ph = np.cumsum(dt) % 1.0
    y = np.where(ph < duty, 1.0, -1.0)
    y += _blep(ph, dt)
    y -= _blep((ph + 1 - duty) % 1.0, dt)
    return y - (2 * duty - 1)


def nes_triangle(freq, n):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    ph = np.cumsum(f / SR) % 1.0
    tri = 4 * np.abs(ph - 0.5) - 1
    return np.round((tri + 1) * 7.5) / 7.5 - 1


def sine(freq, n, phase=0.0):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def saw(freq, n):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = f / SR
    ph = np.cumsum(dt) % 1.0
    return 2 * ph - 1 - _blep(ph, dt)


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def lfsr_noise(n, period, seed):
    """NES-style sample&hold noise; larger period = lower 'pitch'."""
    v = np.random.default_rng(seed).choice([-1.0, 1.0], size=n // period + 2)
    return np.repeat(v, period)[:n]


def adsr(n, a, d, s, r, gate):
    t = tsec(n)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = np.clip(1 - (t - gate) / max(r, 1e-6), 0, 1)
    return e * np.where(t < gate, 1, rel)


# ---------------------------------------------------------------- filters
def sos(kind, fc, order=2):
    return signal.butter(order, fc, btype=kind, fs=SR, output='sos')


def filt(x, kind, fc, order=2):
    return signal.sosfilt(sos(kind, fc, order), x, axis=0)


def interp_log(points):
    ts = np.array([p[0] for p in points], float)
    vs = np.log(np.array([p[1] for p in points], float))
    return lambda t: float(np.exp(np.interp(t, ts, vs)))


def tv_lowpass(x, cutoff_fn, block=256):
    y = np.zeros_like(x)
    zi = None
    for s in range(0, len(x), block):
        fc = min(max(cutoff_fn((s + block / 2) / SR), 30), SR * 0.45)
        so = sos('low', fc)
        if zi is None:
            zi = np.zeros((so.shape[0], 2) + x.shape[1:])
        y[s:s + block], zi = signal.sosfilt(so, x[s:s + block], axis=0, zi=zi)
    return y


def tv_bandpass(x, center_fn, q=1.2, block=256):
    y = np.zeros_like(x)
    zi = None
    for s in range(0, len(x), block):
        c = min(max(center_fn((s + block / 2) / SR), 60), SR * 0.35)
        so = sos('band', [c / (1 + 0.5 / q), c * (1 + 0.5 / q)], 1)
        if zi is None:
            zi = np.zeros((so.shape[0], 2))
        y[s:s + block], zi = signal.sosfilt(so, x[s:s + block], zi=zi)
    return y


# ---------------------------------------------------------------- the theme
# 4 bars, C | Am | F | Fm  — the IV→iv turn is where the nostalgia lives.
MELODY = [  # (midi, start in eighths from loop start, length in eighths)
    (67, 0, 1), (72, 1, 1), (76, 2, 2), (79, 4, 2), (76, 6, 1), (74, 7, 1),
    (72, 8, 2), (76, 10, 1), (81, 11, 3), (79, 14, 2),
    (81, 16, 2), (79, 18, 1), (77, 19, 1), (72, 20, 2), (77, 22, 1), (79, 23, 1),
    (72, 24, 1), (77, 25, 1), (80, 26, 3), (79, 29, 3),
]
CHORDS = [(48, [60, 64, 67, 72]), (45, [57, 60, 64, 69]), (41, [53, 57, 60, 65]), (41, [53, 56, 60, 65])]
VOICINGS = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [53, 56, 60, 62]]  # Cmaj7 Am7 Fmaj7 Fm6


def chord_at(t):
    """chord sounding at absolute time t (the theme grid has phase 0 = C on every 4th bar from bar 0)."""
    return CHORDS[int(np.floor(t / BAR + 1e-6)) % 4]


def lead_note(m, gate, duty=0.25, t0=0.0, wow=0.0, detune=0.0):
    n = N(gate + 0.07)
    t = tsec(n)
    vib = 1 + 0.0069 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.16) / 0.12, 0, 1)
    vib = vib * 2 ** (detune / 1200) * (1 + wow * np.sin(2 * np.pi * 0.55 * (t + t0)) + 0.5 * wow * np.sin(2 * np.pi * 1.7 * (t + t0) + 1))
    return pulse(mtof(m) * vib, n, duty) * adsr(n, 0.004, 0.09, 0.68, 0.05, gate)


def kick(v=1.0):
    n = N(0.32)
    t = tsec(n)
    f = 44 + 120 * np.exp(-t * 32)
    y = sine(f, n) * np.exp(-t * 8.5) + 0.25 * noise(n, 1) * np.exp(-t * 380)
    return v * y


def snare(v=1.0, seed=2):
    n = N(0.22)
    t = tsec(n)
    nz = filt(lfsr_noise(n, 2, seed), 'band', [900, 9000]) * np.exp(-t * 20)
    tone = nes_triangle(185, n) * np.exp(-t * 30) * 0.5
    return v * (nz + tone)


def hat(v=1.0, seed=3):
    n = N(0.06)
    t = tsec(n)
    return v * filt(lfsr_noise(n, 1, seed), 'high', 7000) * np.exp(-t * 75)


def woodblock(f=1250, v=1.0):
    n = N(0.08)
    t = tsec(n)
    return v * (np.sin(2 * np.pi * f * t) * np.exp(-t * 60) + 0.3 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 90))


def rhodes(m, dur):
    """two-operator FM electric piano with a tine ping"""
    f = mtof(m)
    n = N(dur + 1.4)
    t = tsec(n)
    I = 1.5 * np.exp(-t * 2.6) + 0.25
    y = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t)) * np.exp(-t * 0.9)
    y += 0.10 * np.sin(2 * np.pi * f * 7.03 * t) * np.exp(-t * 16)
    rel = np.clip(1 - (t - dur) / 0.4, 0, 1)
    return y * rel * (1 - np.exp(-t * 500))


def pad_note(m, dur, seed=0):
    """string pad: four detuned saws with a slow shimmer"""
    n = N(dur + 0.8)
    t = tsec(n)
    y = np.zeros(n)
    for det in (-9, -3, 4, 10):
        y += saw(mtof(m) * 2 ** (det / 1200) * (1 + 0.002 * np.sin(2 * np.pi * 4.8 * t + det)), n)
    env = np.clip(t / 0.6, 0, 1) * np.clip(1 - (t - dur) / 0.8, 0, 1)
    return y * env * 0.25


# arrangement presets — the same 4 bars, re-dressed for every emotional state
PRESETS = {
    'menu': dict(lead=1, bass=1, arp=1, bassmode='quarter'),
    'full': dict(lead=1, bass=1, arp=1, drums=1, bassmode='eighth', kit='full'),
    'thin': dict(lead=0.8, bass=0.85, arp=0.5, drums=0.55, bassmode='eighth', kit='light'),
    'soft': dict(lead=0.7, bass=0.7, arp=0.25, pad=0.5, bassmode='quarter'),
    'numb': dict(lead=0.8, bass=0.7, drums=0.8, bassmode='quarter', kit='tick', detune=-38, wow=0.014, crush=4, leadlp=1500),
    'want': dict(lead=0.4, bass=1.0, arp=1.25, drums=0.7, bassmode='eighth', kit='pulse', wow=0.012, leadlp=850),
    'warm': dict(lead=0.95, bass=0.75, arp=0.35, drums=0.55, rhodes=1, pad=1, bassmode='quarter', kit='light'),
    'pad': dict(pad=1, bass=0.35, bassmode='whole'),
}
BASE_GAIN = dict(lead=0.20, bass=0.30, arp=0.055, drums=1.0, rhodes=0.15, pad=0.085)


def render_theme(c, t_abs):
    bars = c.get('bars', 4)
    p = {**PRESETS[c.get('variant', 'full')], **c.get('set', {})}
    phase = c.get('phase', int(np.floor(t_abs / BAR + 1e-6)) % 4)
    n = N(bars * BAR + 1.6)
    layers = {k: np.zeros((n, 2)) for k in BASE_GAIN}

    def put(layer, x, t0, g=1.0, pan=0.0):
        i = N(t0) if t0 > 0 else 0
        x = x[: n - i]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        layers[layer][i:i + len(x), 0] += x * g * l * 1.414
        layers[layer][i:i + len(x), 1] += x * g * r * 1.414

    seed = int(t_abs * 10)
    for b in range(bars):
        lb, bt = (b + phase) % 4, b * BAR
        root, tones = CHORDS[lb]
        if p.get('lead'):
            for m, s, l in MELODY:
                if lb * 8 <= s < lb * 8 + 8:
                    st = bt + (s - lb * 8) * E8
                    put('lead', lead_note(m, l * E8 * 0.9, 0.25, st, p.get('wow', 0), p.get('detune', 0)), st, 1, -0.08)
        if p.get('bass'):
            mode = p.get('bassmode', 'eighth')
            step = {'eighth': E8, 'quarter': BEAT, 'whole': BAR}[mode]
            for k in range(int(round(BAR / step))):
                m = root + (12 if (mode == 'eighth' and k % 2) else 0)
                g = step * (0.8 if mode != 'whole' else 0.98)
                nn = N(g + 0.03)
                put('bass', nes_triangle(mtof(m), nn) * adsr(nn, 0.003, 0.2, 0.9, 0.02, g), bt + k * step)
        if p.get('arp'):
            for k in range(16):
                nn = N(S16)
                put('arp', pulse(mtof(tones[k % 4] + 12), nn, 0.125) * np.exp(-tsec(nn) * 16), bt + k * S16, 1, 0.35 if k % 2 else -0.35)
        if p.get('rhodes'):
            for hit, dur in ((0, 2.4 * BEAT), (2.5 * BEAT, 1.4 * BEAT)):
                for j, m in enumerate(VOICINGS[lb]):
                    put('rhodes', rhodes(m, dur), bt + hit + j * 0.012, 0.8 if hit else 1.0, (j - 1.5) * 0.25)
        if p.get('pad'):
            for j, m in enumerate(VOICINGS[lb]):
                put('pad', pad_note(m + 12 if j < 2 else m, BAR, j), bt, 1, (j - 1.5) * 0.4)
        if p.get('drums'):
            kit = p.get('kit', 'full')
            if kit == 'full':
                for k in (0, 8, 10):
                    put('drums', kick(), bt + k * S16, 0.55)
                for k in (4, 12):
                    put('drums', snare(1, seed + b * 7 + k), bt + k * S16, 0.22, 0.05)
                for k in range(0, 16, 2):
                    put('drums', hat(1, seed + b * 16 + k), bt + k * S16, 0.06 if k % 4 else 0.035, 0.25)
            elif kit == 'light':
                for k in (0, 8):
                    put('drums', kick(), bt + k * S16, 0.42)
                put('drums', snare(0.6, seed + b), bt + 12 * S16, 0.14, 0.05)
                for k in range(0, 16, 4):
                    put('drums', hat(1, seed + b * 16 + k), bt + (k + 2) * S16, 0.045, 0.25)
            elif kit == 'tick':
                for k in range(4):
                    put('drums', woodblock(1500 if k == 0 else 1180), bt + k * BEAT, 0.16 if k == 0 else 0.11, 0.15)
            elif kit == 'pulse':
                for k in range(4):
                    put('drums', filt(kick(0.8), 'low', 300), bt + k * BEAT, 0.45)
                for k in range(16):
                    put('drums', hat(1, seed + b * 16 + k), bt + k * S16, 0.025 if k % 2 else 0.04, -0.25)

    tt = tsec(n)
    out = np.zeros((n, 2))
    for name, x in layers.items():
        g = p.get(name, 0)
        if not g:
            continue
        x = x * BASE_GAIN[name] * g
        if name == 'lead':
            if p.get('crush'):
                q = 2 ** (p['crush'] - 1)
                x = np.repeat(np.round(x[::3] * q / 0.25) * 0.25 / q, 3, axis=0)[:n]
            if p.get('leadlp'):
                x = filt(x, 'low', p['leadlp'])
        if name == 'rhodes':
            trem = 0.22 * np.sin(2 * np.pi * 4.2 * tt)
            x = x * np.stack([1 + trem, 1 - trem], axis=1)
        if name == 'pad':
            x = filt(x, 'low', 1800)
        if name in c.get('auto', {}):
            pts = c['auto'][name]
            x = x * np.interp(tt, [q[0] for q in pts], [q[1] for q in pts])[:, None]
        out += x
    return out


# ---------------------------------------------------------------- sound effects
def fx_ding(i, k):
    """notification '叮' — FM bell, every one slightly different"""
    notes = [88, 91, 93, 96, 98, 100]
    rng = np.random.default_rng(100 + i * 10 + k)
    f = mtof(notes[int(rng.integers(len(notes)))] + rng.uniform(-0.25, 0.25))
    n = N(0.9)
    t = tsec(n)
    env = np.exp(-t * 6.5) * (1 - np.exp(-t * 900))
    y = np.sin(2 * np.pi * f * t + 1.3 * np.exp(-t * 18) * np.sin(2 * np.pi * f * 2 * t)) * env
    y += 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 14)
    d = N(0.065)
    y2 = np.zeros(n)
    y2[d:] = 0.55 * np.sin(2 * np.pi * f * 1.5 * t[: n - d]) * np.exp(-t[: n - d] * 7) * (1 - np.exp(-t[: n - d] * 900))
    return (y + y2) * 0.5, float(rng.uniform(-0.65, 0.65))


def fx_hit(i):
    n = N(0.18)
    t = tsec(n)
    return sine(70 * np.exp(-t * 6) + 30, n) * np.exp(-t * 22) * (0.5 + i * 0.04) + 0.15 * noise(n, 9 + i) * np.exp(-t * 300)


def fx_hdd(seed):
    n = N(0.035)
    t = tsec(n)
    click = filt(noise(n, seed), 'band', [1800, 5200]) * np.exp(-t * 520)
    thunk = np.sin(2 * np.pi * 150 * t) * np.exp(-t * 260) * 0.6
    return (click * 1.6 + thunk) * 0.6


def fx_whir(dur):
    n = N(dur)
    t = tsec(n)
    hum = sum(np.sin(2 * np.pi * 120 * h * t) / h for h in (1, 2, 3)) * 0.12
    air = filt(noise(n, 5), 'band', [300, 1200]) * 0.05
    env = np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
    return (hum + air) * env


def fx_blip(notes, step=0.045):
    out = []
    for m in notes:
        n = N(step)
        out.append(pulse(mtof(m), n, 0.125) * adsr(n, 0.001, 0.05, 0.7, 0.008, step - 0.008))
    return np.concatenate(out) * 0.35


def fx_riser(dur):
    n = N(dur)
    t = tsec(n)
    u = t / dur
    nz = tv_bandpass(noise(n, 11), lambda s: 300 * (7000 / 300) ** (s / dur), q=2.5)
    tone = sine(180 * (6.5 ** u), n) * 0.25 + sine(180 * (6.5 ** u) * 1.5, n) * 0.12
    return (nz * 1.4 + tone) * u ** 2.6 * 0.7


def fx_suck(dur):
    """reverse-swell inhale: a reverbed noise burst played backwards, ending dead on the cut"""
    n = N(1.2)
    t = tsec(n)
    burst = filt(noise(n, 21), 'band', [500, 9000]) * np.exp(-t * 4.5)
    burst += sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 5) for f in (1318, 1975, 2637)) * 0.15
    rev = burst[::-1][-N(dur):]
    m = len(rev)
    tt = tsec(m)
    sub = sine(40 + 60 * (tt / dur) ** 2, m) * (tt / dur) ** 3 * 0.8
    return (rev / (np.abs(rev).max() + 1e-9) * 0.9 + sub) * (tt / dur) ** 1.5


def fx_piano(note):
    """low felt-piano single note: inharmonic partials, two detuned strings, hammer thump"""
    f0 = mtof(note)
    n = N(7.0)
    t = tsec(n)
    B = 0.00035
    y = np.zeros(n)
    for k in range(1, 22):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = 1 / k ** 1.15 * (1.0 if k < 8 else 0.6)
        dec = 0.35 + 0.22 * k
        for det in (-0.25, 0.25):
            y += amp * np.sin(2 * np.pi * fk * (1 + det / 1200) * t + k) * np.exp(-t * dec)
    hammer = filt(noise(n, 31), 'low', 900) * np.exp(-t * 60) * 0.25
    y = filt(y + hammer, 'low', 2600)
    return y * (1 - np.exp(-t * 300)) * 0.35


def fx_tick():
    n = N(0.05)
    t = tsec(n)
    return (np.sin(2 * np.pi * 3400 * t) * np.exp(-t * 160) + 0.4 * noise(n, 41) * np.exp(-t * 900)) * 0.18


def fx_drone(dur):
    n = N(dur)
    t = tsec(n)
    y = np.zeros(n)
    for m, g in ((36, 1.0), (43, 0.6), (48, 0.35)):
        for det in (-7, 0, 6):
            y += saw(mtof(m) * 2 ** (det / 1200), n) * g
    y = filt(y, 'low', 260)
    env = np.clip(t / 2.5, 0, 1) ** 2 * np.clip((dur - t) / 0.08, 0, 1)
    return y * env * 0.05


def fx_heart():
    def thump(n, f0):
        t = tsec(n)
        return sine(f0 * np.exp(-t * 9) + 32, n) * np.exp(-t * 26) * (1 - np.exp(-t * 600))
    n = N(0.45)
    y = np.zeros(n)
    a = thump(N(0.25), 62)
    y[: len(a)] += a
    d = N(0.17)
    b = thump(N(0.25), 54) * 0.6
    y[d:d + len(b)] += b[: n - d]
    return filt(y, 'low', 180) * 0.9


def fx_thud():
    n = N(1.0)
    t = tsec(n)
    return (sine(50 * np.exp(-t * 2) + 28, n) * np.exp(-t * 5) + filt(noise(n, 51), 'low', 300) * np.exp(-t * 18) * 0.4) * 0.45


def fx_crash():
    n = N(2.6)
    t = tsec(n)
    y = filt(noise(n, 61), 'high', 4200) * np.exp(-t * 2.0)
    for k, f in enumerate((3120, 4410, 5230, 6170, 7330, 8810)):
        y += 0.06 * np.sin(2 * np.pi * f * t + k) * np.exp(-t * 2.8)
    return y * 0.32


def fx_assemble():
    notes = [72, 76, 79, 84, 88, 91, 96]
    step = S16 / 2
    out = np.zeros(N(step * len(notes) + 0.3))
    for k, m in enumerate(notes):
        nn = N(0.22)
        t = tsec(nn)
        x = pulse(mtof(m), nn, 0.25) * np.exp(-t * 14)
        i = N(k * step)
        out[i:i + nn] += x
    return out * 0.12


def fx_levelup(k, t_abs, kind, tones=None):
    """chip fanfare built from the chord that's sounding — duller, shorter, flatter as k drops"""
    if tones is None:
        root, tones = chord_at(t_abs)
    seq = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[0] + 24] if kind == 'lv' else [tones[2] + 12, tones[0] + 24]
    step = 0.055 + 0.03 * (1 - k)
    hold = 0.12 + 0.45 * k
    out = np.zeros(N(step * len(seq) + hold + 0.3))
    for j, m in enumerate(seq):
        gate = hold if j == len(seq) - 1 else step * 0.9
        x = lead_note(m - (1 - k) * 0.6, gate, 0.25 if k > 0.4 else 0.5)
        i = N(j * step)
        out[i:i + len(x)] += x[: len(out) - i]
    out = filt(out, 'low', 1200 + 9000 * k ** 1.5)
    return out * (0.25 + 0.75 * k)


def fx_tinnitus(dur):
    """the ringing left behind after the noise"""
    n = N(dur)
    t = tsec(n)
    y = np.sin(2 * np.pi * 2350 * t) + 0.5 * np.sin(2 * np.pi * 2356 * t)
    env = (1 - np.exp(-t * 40)) * np.exp(-t * 1.6)
    return y * env * 0.05


def fx_musicbox(m):
    f = mtof(m)
    n = N(2.2)
    t = tsec(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.35 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 6)
    y += 0.12 * np.sin(2 * np.pi * f * 8.1 * t) * np.exp(-t * 14)
    return y * (1 - np.exp(-t * 900)) * 0.3


def fx_memory(notes, stop):
    """the theme's first notes on a music box — cut off when 'now' arrives"""
    out = np.zeros(N(stop + 0.25))
    for m, at in notes:
        x = fx_musicbox(m)
        i = N(at)
        out[i:i + len(x)] += x[: len(out) - i]
    ts = tsec(len(out))
    return out * np.clip((stop + 0.12 - ts) / 0.12, 0, 1)


def fx_steps(notes, step, decay=14, duty=0.25):
    out = np.zeros(N(step * len(notes) + 0.4))
    for k, m in enumerate(notes):
        nn = N(0.26)
        x = pulse(mtof(m), nn, duty) * np.exp(-tsec(nn) * decay)
        i = N(k * step)
        out[i:i + nn] += x[: len(out) - i]
    return out


def fx_flip(seed):
    n = N(0.14)
    t = tsec(n)
    return tv_bandpass(noise(n, seed), lambda s: 3200 * (900 / 3200) ** (s / 0.14), q=1.5) * np.exp(-t * 18) * 0.35


def fx_mclick():
    n = N(0.03)
    t = tsec(n)
    return (filt(noise(n, 71), 'band', [2000, 6000]) * np.exp(-t * 700) + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 400) * 0.4) * 0.5


def fx_power_off():
    n = N(0.5)
    t = tsec(n)
    y = sine(1400 * np.exp(-t * 14) + 60, n) * np.exp(-t * 7) * 0.35
    y += filt(noise(n, 72), 'band', [300, 3000]) * np.exp(-t * 50) * 0.4
    return y


def fx_liking():
    a = lead_note(84, 0.07, 0.5)
    b = lead_note(79, 0.18, 0.5)
    out = np.zeros(N(0.08) + len(b))
    out[: len(a)] += a
    out[N(0.08):N(0.08) + len(b)] += b
    return filt(out, 'low', 2500) * 0.35


def fx_stamp(v, hi=False):
    n = N(0.16)
    t = tsec(n)
    thud = sine(150 * np.exp(-t * 20) + 70, n) * np.exp(-t * 30)
    paper = filt(noise(n, int(v * 1000) + (5 if hi else 0)), 'band', [3000, 9000] if hi else [1500, 6000]) * np.exp(-t * 90)
    return (thud * (0.3 if hi else 1.0) + paper * 0.6) * v * 0.5


def fx_morph(dur):
    n = N(dur)
    t = tsec(n)
    u = t / dur
    f = mtof(84) * 2 ** (-u ** 1.3)
    y = pulse(f, n, 0.25) * 0.5 + pulse(f * 1.012, n, 0.5) * 0.3
    y = tv_lowpass(y[:, None], lambda s: 6000 * (700 / 6000) ** (s / dur))[:, 0]
    return y * np.clip(t / 0.1, 0, 1) * 0.3


def fx_heartchip():
    return fx_steps([88, 91], 0.09, 10) * 0.18


def fx_clank():
    n = N(0.8)
    t = tsec(n)
    y = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((420, 1, 8), (1130, 0.6, 12), (2290, 0.4, 18), (3610, 0.25, 26)))
    y = y + filt(noise(n, 81), 'band', [800, 5000]) * np.exp(-t * 60) * 0.8
    return y * 0.28


def fx_clockcut():
    out = np.zeros(N(0.8))
    for k in range(4):
        x = woodblock(1700, 0.6)
        i = N(k * 0.07)
        out[i:i + len(x)] += x
    t = tsec(len(out))
    out += sine(90 * np.exp(-t * 4) + 40, len(out)) * np.exp(-t * 7) * 0.5
    return out * 0.45


def fx_offline():
    return filt(fx_steps([79, 72], 0.09, 12, 0.5), 'low', 2200) * 0.22


def fx_snap():
    n = N(1.0)
    t = tsec(n)
    return (filt(noise(n, 91), 'low', 1500) * np.exp(-t * 25) * 0.8 + sine(70 * np.exp(-t * 3) + 30, n) * np.exp(-t * 4) * 0.6) * 0.45


def fx_clockticks(dur):
    out = np.zeros(N(dur + 0.2))
    for k in range(int(dur / BEAT + 1e-6)):
        x = filt(woodblock(2100 if k % 2 else 1650, 1), 'high', 600)
        i = N(k * BEAT)
        out[i:i + len(x)] += x[: len(out) - i]
    return out * 0.10


def fx_sand(dur):
    n = N(dur)
    t = tsec(n)
    y = filt(noise(n, 101), 'band', [2500, 9000]) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7.3 * t)))
    env = np.clip(t / 0.8, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)
    return y * env * 0.05


def fx_pop():
    return filt(fx_steps([84, 96], 0.04, 22, 0.5), 'low', 5000) * 0.18


def fx_lampclick():
    n = N(0.06)
    t = tsec(n)
    return (filt(noise(n, 111), 'band', [1500, 5000]) * np.exp(-t * 400) + np.sin(2 * np.pi * 300 * t) * np.exp(-t * 200) * 0.3) * 0.5


def fx_tone(dur):
    """the single held tone under the quietest page"""
    n = N(dur)
    t = tsec(n)
    f = mtof(48)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t + 0.3) + 0.12 * nes_triangle(f * 3, n)
    y = y * (1 + 0.12 * np.sin(2 * np.pi * 0.21 * t))
    env = np.clip(t / 2.5, 0, 1) ** 2 * np.clip((dur - t) / 1.4, 0, 1)
    return filt(y, 'low', 900) * env * 0.16


def fx_crt_on():
    n = N(1.4)
    t = tsec(n)
    thunk = sine(110 * np.exp(-t * 6) + 40, n) * np.exp(-t * 9) * 0.6
    static = filt(noise(n, 121), 'band', [1000, 8000]) * np.exp(-t * 6) * 0.25
    hum = (np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t)) * np.clip(t / 0.3, 0, 1) * np.exp(-t * 1.2) * 0.08
    return thunk + static + hum


def fx_shimmer():
    """the menu dissolving into light: a cloud of rising pings"""
    n = N(2.4)
    out = np.zeros(n)
    rng = np.random.default_rng(131)
    for k in range(26):
        at = (k / 26) ** 1.4 * 1.1
        m = 84 + [0, 4, 7, 11, 12, 14, 16, 19, 24][int(rng.integers(9))]
        nn = N(0.9)
        tt = tsec(nn)
        x = np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt * 5) * (1 - np.exp(-tt * 300))
        i = N(at)
        out[i:i + nn] += x[: n - i] * (0.4 + 0.6 * k / 26)
    t = tsec(n)
    swell = filt(noise(n, 132), 'high', 3000) * np.clip(t / 1.0, 0, 1) ** 2 * np.exp(-np.maximum(t - 1.0, 0) * 3)
    return out * 0.12 + swell * 0.08


def fx_final(dur):
    """last chord: Rhodes + strings + the original square wave, C add9"""
    n = N(dur + 0.5)
    out = np.zeros((n, 2))
    for j, m in enumerate([48, 55, 60, 64, 67, 74]):
        pan = (j - 2.5) * 0.25
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = rhodes(m, dur)[:n]
        out[: len(x), 0] += x * l * 0.2
        out[: len(x), 1] += x * r * 0.2
        y = filt(pad_note(m + 12, dur, j), 'low', 1800)[:n]
        out[: len(y), 0] += y * 0.09
        out[: len(y), 1] += y * 0.09
    lead = lead_note(84, dur - 0.3, 0.25)[:n] * 0.13
    out[: len(lead)] += lead[:, None]
    t = tsec(n)
    return out * np.clip((dur + 0.3 - t) / (dur * 0.7), 0, 1)[:, None]




# ---------------------------------------------------------------- transitions
def fx_coin():
    """the chip coin: a task done, a 'salary' paid"""
    a = pulse(mtof(83), N(0.07), 0.5) * 0.8
    n = N(0.4)
    b = pulse(mtof(88), n, 0.5) * np.exp(-tsec(n) * 7)
    return np.concatenate([a, b]) * 0.14


def fx_reverse(dur, seed=141):
    """reverse cymbal swell ending dead on its cue end"""
    n = N(dur)
    t = tsec(n)
    y = filt(noise(n, seed), 'high', 2500) * np.exp(-(dur - t) * 3.2)
    y += filt(noise(n, seed + 1), 'band', [300, 2000]) * np.exp(-(dur - t) * 5) * 0.5
    return y * (t / dur) ** 1.5 * 0.35


def fx_flipclunk():
    n = N(0.9)
    t = tsec(n)
    wood = woodblock(380, 1.0)
    y = np.zeros(n)
    y[: len(wood)] += wood
    y += sine(120 * np.exp(-t * 8) + 60, n) * np.exp(-t * 12) * 0.6
    y += (np.sin(2 * np.pi * 2650 * t) + 0.5 * np.sin(2 * np.pi * 3970 * t)) * np.exp(-t * 6) * 0.08
    return y * 0.5


def fx_pixel(direction=-1):
    """bit-crushed chip sweep for pixel dissolves"""
    notes = [96, 91, 88, 84, 79, 76, 72] if direction < 0 else [72, 76, 79, 84, 88, 91, 96]
    step = 0.05
    out = np.zeros(N(step * len(notes) + 0.3))
    for k, m in enumerate(notes):
        nn = N(0.12)
        x = pulse(mtof(m), nn, 0.125) * np.exp(-tsec(nn) * 25)
        i = N(k * step)
        out[i:i + nn] += x[: len(out) - i]
    nz = lfsr_noise(len(out), 6, 151) * np.exp(-tsec(len(out)) * 6) * 0.25
    return (out + nz) * 0.16
