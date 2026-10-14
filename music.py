"""SFX-only release: reproduce all original effects using numeric gain settings.

    python music.py [--report] -> out/audio.wav (48 kHz stereo)
    No external song is read. Original effect gains and mastering automation remain.
"""
import json
import os
import sys
import hashlib
from collections import Counter

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d, uniform_filter1d

from synth import *  # noqa: F401,F403


def fx_key(i):
    n = N(0.04)
    t = tsec(n)
    f = 1800 + 400 * ((i * 7) % 5)
    return (filt(noise(n, 300 + i), 'band', [f, f * 2.2]) * np.exp(-t * 400) + np.sin(2 * np.pi * 220 * t) * np.exp(-t * 300) * 0.3) * 0.5


def fx_soft():
    """the polite reply: two soft bells, a little too sweet"""
    out = np.zeros(N(2.4))
    for m, at in ((80, 0.0), (84, 0.07), (87, 0.14)):
        x = fx_musicbox(m)
        i = N(at)
        out[i:i + len(x)] += x[: len(out) - i]
    return out


def fx_crackle(seed, dur=0.18, k=14):
    """glass under pressure: a cluster of tiny ticks"""
    n = N(dur)
    out = np.zeros(n)
    rng = np.random.default_rng(seed)
    for j in range(k):
        at = (j / k) ** 1.6 * dur * 0.8
        m = N(0.02)
        tt = tsec(m)
        f = 2500 + rng.random() * 5000
        x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 400) + noise(m, seed + j) * np.exp(-tt * 900) * 0.6
        i = N(at)
        out[i:i + m] += x[: n - i] * (0.4 + 0.6 * rng.random())
    return out * 0.5


def fx_shatter():
    """the filter breaking: a bright burst, a rain of glass pings, and a low body"""
    n = N(2.6)
    t = tsec(n)
    burst = filt(noise(n, 501), 'high', 2500) * np.exp(-t * 9) * 0.9
    out = burst.copy()
    rng = np.random.default_rng(502)
    for j in range(60):
        at = rng.exponential(0.25)
        if at > 2.0:
            continue
        m = N(0.5)
        tt = tsec(m)
        f = 2000 + rng.random() * 7000
        x = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt * (18 + rng.random() * 30))
        i = N(at)
        out[i:i + m] += x[: n - i] * 0.22 * np.exp(-at * 1.5)
    body = sine(60 * np.exp(-t * 4) + 32, n) * np.exp(-t * 6) * 0.8
    return out * 0.5 + body


def fx_chalk():
    """chalk on a blackboard: two taps and a short scratch"""
    n = N(0.5)
    out = np.zeros(n)
    for at, f in ((0.0, 2600), (0.09, 3100)):
        m = N(0.03)
        tt = tsec(m)
        x = filt(noise(m, int(f)), 'band', [f, f * 1.8]) * np.exp(-tt * 260) + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 200) * 0.3
        i = N(at)
        out[i:i + m] += x
    m = N(0.22)
    tt = tsec(m)
    sc = filt(noise(m, 811), 'band', [3000, 7500]) * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * tt)) * np.sin(np.pi * tt / 0.22) * 0.35
    i = N(0.16)
    out[i:i + m] += sc
    return out


def fx_boing(i):
    """a soft hop: a short sine whose pitch springs upward"""
    n = N(0.22)
    t = tsec(n)
    f = mtof(72 + 3 * i) * (0.8 + 0.25 * (1 - np.exp(-t * 30)))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * (1 - np.exp(-t * 400))
    return y * 0.5




def fx_page():
    n = N(0.25)
    t = tsec(n)
    return filt(noise(n, 901), 'band', [1500, 6000]) * np.exp(-t * 18) * (1 - np.exp(-t * 200)) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t)) * 0.6


def fx_write():
    """chalk writing: a burst of short scratches"""
    n = N(0.55)
    out = np.zeros(n)
    rng = np.random.default_rng(902)
    at = 0.0
    while at < 0.45:
        m = N(0.03 + rng.random() * 0.05)
        tt = tsec(m)
        f = 2500 + rng.random() * 2500
        x = filt(noise(m, int(at * 1000) + 5), 'band', [f, f * 2]) * np.sin(np.pi * tt / (m / SR)) * (0.5 + 0.5 * rng.random())
        i = N(at)
        out[i:i + m] += x[: n - i]
        at += 0.06 + rng.random() * 0.05
    return out * 0.5


def fx_wipe():
    n = N(0.65)
    t = tsec(n)
    return tv_bandpass(noise(n, 903), lambda s: 500 * (5000 / 500) ** (s / 0.65), q=1.2) * np.sin(np.pi * t / 0.65) ** 1.5 * 0.9


def fx_tink():
    n = N(1.2)
    t = tsec(n)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2093, 5), (3136, 7), (4186, 10))) * (1 - np.exp(-t * 800)) * 0.25


def fx_yank():
    n = N(0.5)
    t = tsec(n)
    creak = filt(noise(n, 904), 'band', [200, 900]) * np.exp(-t * 10) * (0.5 + 0.5 * np.sin(2 * np.pi * 45 * t))
    return creak * 0.6 + sine(90 * np.exp(-t * 5) + 40, n) * np.exp(-t * 9) * 0.8


def fx_fill(i):
    m = [65, 68, 72, 75, 77, 80, 84, 87][i % 8]      # F minor pentatonic, climbing
    n = N(0.18)
    t = tsec(n)
    return pulse(mtof(m), n, 0.25) * np.exp(-t * 22) * 0.35


def fx_good():
    out = np.zeros(N(1.6))
    for k, m in enumerate((77, 80, 84)):
        x = fx_musicbox(m)
        i = N(k * 0.06)
        out[i:i + len(x)] += x[: len(out) - i]
    return out


def fx_bad():
    out = []
    for m, d in ((53, 0.12), (49, 0.3)):
        n = N(d)
        out.append(filt(pulse(mtof(m), n, 0.5), 'low', 1200) * adsr(n, 0.004, 0.1, 0.7, 0.04, d - 0.04))
    return np.concatenate(out) * 0.4


def fx_drop(i):
    n = N(0.5)
    t = tsec(n)
    f0 = 120 - 8 * i
    return (sine(f0 * np.exp(-t * 7) + 40, n) * np.exp(-t * 11) + filt(noise(n, 905 + i), 'low', 700) * np.exp(-t * 30) * 0.5) * 0.8


def fx_topple():
    n = N(1.2)
    out = np.zeros(n)
    for k in range(6):
        x = fx_drop(k)
        i = N(k * 0.045)
        out[i:i + len(x)] += x[: n - i] * (1 - k * 0.08)
    return out * 0.7


def fx_circle(i):
    m = [68, 72, 75, 80][i % 4]
    n = N(1.4)
    t = tsec(n)
    y = (np.sin(2 * np.pi * mtof(m) * t) + 0.4 * np.sin(2 * np.pi * mtof(m + 12) * t)) * np.clip(t / 0.08, 0, 1) * np.exp(-t * 2.5)
    return y * 0.3


def fx_dust():
    n = N(1.4)
    t = tsec(n)
    return filt(noise(n, 906), 'high', 3500) * np.exp(-t * 2.5) * np.clip(t / 0.05, 0, 1) * 0.4 + fx_shimmer()[:n] * 0.6


def fx_whip():
    n = N(0.6)
    t = tsec(n)
    y = tv_bandpass(noise(n, 910), lambda s: 300 * (6000 / 300) ** (np.sin(np.pi * min(s / 0.6, 1)) ** 2), q=1.5)
    return y * np.sin(np.pi * t / 0.6) ** 2 * 1.2


def fx_msg(up=True):
    notes = (79, 84) if up else (84, 79)
    out = np.zeros(N(0.4))
    for k, m in enumerate(notes):
        nn = N(0.18)
        tt = tsec(nn)
        x = np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt * 18) * (1 - np.exp(-tt * 600))
        i = N(k * 0.07)
        out[i:i + nn] += x
    return out * 0.5


def fx_foot(i):
    n = N(0.12)
    t = tsec(n)
    return filt(noise(n, 920 + i), 'band', [150, 1200]) * np.exp(-t * 45) * (0.7 + 0.3 * (i % 2)) + sine(70 + 6 * (i % 2), n) * np.exp(-t * 40) * 0.4


def fx_domino(i):
    n = N(0.25)
    t = tsec(n)
    f = 900 - 60 * i
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 60) + filt(noise(n, 930 + i), 'band', [1500, 5000]) * np.exp(-t * 90) * 0.6 + sine(110, n) * np.exp(-t * 30) * 0.5) * 0.7


def fx_rain(dur):
    n = N(dur)
    t = tsec(n)
    y = filt(noise(n, 940), 'band', [600, 7000]) * 0.25
    rng = np.random.default_rng(941)
    for at in rng.uniform(0, dur, int(dur * 25)):
        m = N(0.02)
        i = N(at)
        y[i:i + m] += filt(noise(m, int(at * 100)), 'high', 3000)[: n - i] * np.exp(-tsec(m) * 300)[: n - i] * rng.uniform(0.2, 0.8)
    return y * np.clip(t / 0.8, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def fx_squeak():
    n = N(0.5)
    t = tsec(n)
    f = 1400 + 500 * np.sin(2 * np.pi * 2.2 * t)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t))
    return filt(y, 'band', [900, 3000]) * np.sin(np.pi * t / 0.5) * 0.25


def fx_lamp():
    n = N(0.15)
    t = tsec(n)
    return (filt(noise(n, 950), 'band', [2000, 6000]) * np.exp(-t * 200) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * 0.4) * 0.8


def fx_sticky():
    n = N(0.3)
    t = tsec(n)
    return filt(noise(n, 960), 'band', [400, 3000]) * np.exp(-t * 35) * (1 - np.exp(-t * 900)) + sine(160 * np.exp(-t * 8) + 60, n) * np.exp(-t * 25) * 0.5


SFX_LEVEL = {
    'chalk': -6, 'fold': -10, 'pop': -6, 'suck': -12, 'type': -11, 'soft': -8, 'hopsoft': -7, 'heart': -10,
    'hop': -7, 'crack': -6, 'breath': -8, 'shatter': -3, 'impact': -5, 'realize': -10, 'step': -9,
    'page': -8, 'write': -10, 'wipe': -8, 'tink': -7, 'yank': -5, 'swap': -9, 'fill': -11, 'good': -7, 'bad': -6,
    'drop': -6, 'topple': -3, 'circle': -9, 'buzz': -8, 'chip': -9, 'dust': -8, 'shimmer': -6,
    'whip': -6, 'recv': -8, 'send': -9, 'foot': -15, 'domino': -6, 'rain': -12, 'squeak': -12, 'lamp': -8, 'sticky': -6,
}


def render_effects(data, profile, report=False):
    """Render the unchanged effect generators, pans and sends with their original gains."""
    if profile['format'] != 1 or profile['sample_rate'] != SR:
        raise ValueError('Unsupported numeric sound-effect profile.')
    if data['duration'] != profile['duration']:
        raise ValueError('Film duration does not match the preserved sound-effect profile.')
    if data['cues'] != [row['cue'] for row in profile['cues']]:
        raise ValueError('Effect cues differ from the preserved profile; update the profile for an edited film.')
    gains = np.asarray([row['gain'] for row in profile['cues']], dtype=float)
    if not np.isfinite(gains).all() or (gains < 0).any():
        raise ValueError('Invalid effect gain in profile.')
    dur = data['duration']
    total = N(dur + 4)
    sfx, verb = (np.zeros((total, 2)) for _ in range(2))
    cur = {}

    def add(bus, t, x, gain=1.0, pan=0.0, send=0.0):
        if bus is None:
            bus = cur['s']
        i = N(t) if t > 0 else 0
        if i >= total:
            return
        x = np.asarray(x, float)
        if x.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            x = np.stack([x * l, x * r], axis=1) * 1.414
        x = x[: total - i] * gain
        bus[i:i + len(x)] += x
        if send:
            cur['v'][i:i + len(x)] += x * send

    applied = []
    for index, c in enumerate(data['cues']):
        t, cid = c['t'], c['id']
        cur['s'], cur['v'] = np.zeros((total, 2)), np.zeros((total, 2))
        if cid in ('song', 'piece'):
            raise ValueError('This release accepts sound effects only; no background music.')
        elif cid == 'chalk':
            add(None, t, fx_chalk(), 1.0, 0.0, send=0.2); add(None, t, fx_hit(4), 0.5)
        elif cid == 'hopsoft':
            add(None, t, fx_boing(c['i']), 0.8, 0.3, send=0.25)
        elif cid == 'heart':
            add(None, t, fx_musicbox(80 + 4 * c['i']), 0.9, 0.15, send=0.4)
        elif cid == 'page':
            add(None, t, fx_page(), 1.0, 0.3)
        elif cid == 'write':
            add(None, t, fx_write(), 1.0, -0.1, send=0.15)
        elif cid == 'wipe':
            add(None, t, fx_wipe(), 1.0, 0.0, send=0.1)
        elif cid == 'tink':
            add(None, t, fx_tink(), 1.0, 0.2, send=0.4)
        elif cid == 'yank':
            add(None, t, fx_yank(), 1.0, -0.2, send=0.15)
        elif cid == 'swap':
            add(None, t, fx_reverse(0.3, 95), 1.0, 0.4)
        elif cid == 'fill':
            add(None, t, fx_fill(c['i']), 1.0, 0.2, send=0.2)
        elif cid == 'good':
            add(None, t, fx_good(), 1.0, -0.3, send=0.4)
        elif cid == 'bad':
            add(None, t, fx_bad(), 1.0, 0.3, send=0.15)
        elif cid == 'drop':
            add(None, t, fx_drop(c['i']), 1.0, 0.0, send=0.1)
        elif cid == 'topple':
            add(None, t, fx_topple(), 1.0, 0.35, send=0.25); add(None, t, fx_hit(6), 0.6, 0.35)
        elif cid == 'circle':
            add(None, t, fx_circle(c['i']), 1.0, 0.0, send=0.4)
        elif cid == 'buzz':
            add(None, t, fx_bad(), 0.8, -0.3, send=0.2)
        elif cid == 'chip':
            add(None, t, fx_steps([84, 91], 0.05, 18, 0.25), 0.6, 0.0, send=0.2)
        elif cid == 'dust':
            add(None, t, fx_dust(), 1.0, 0.0, send=0.4)
        elif cid == 'shimmer':
            add(None, t, fx_shimmer(), 1.0, 0.0, send=0.4)
        elif cid == 'whip':
            add(None, t, fx_whip(), 1.0, 0.0, send=0.1)
        elif cid == 'recv':
            add(None, t, fx_msg(False), 1.0, -0.2, send=0.2)
        elif cid == 'send':
            add(None, t, fx_msg(True), 1.0, 0.2, send=0.2)
        elif cid == 'foot':
            add(None, t, fx_foot(c['i']), 1.0, -0.2 + 0.4 * (c['i'] % 2))
        elif cid == 'domino':
            add(None, t, fx_domino(c['i']), 1.0, -0.4 + 0.27 * c['i'], send=0.2)
        elif cid == 'rain':
            add(None, t, fx_rain(c['dur']), 1.0, 0.0)
        elif cid == 'squeak':
            add(None, t, fx_squeak(), 1.0, -0.3, send=0.2)
        elif cid == 'lamp':
            add(None, t, fx_lamp(), 1.0, -0.5)
        elif cid == 'sticky':
            add(None, t, fx_sticky(), 1.0, 0.0, send=0.15)
        elif cid == 'breath':
            add(None, t, fx_suck(c.get('dur', BEAT)), 0.5, 0.0)
        elif cid == 'pop':
            add(None, t, fx_pop(), 1.2, -0.4, send=0.2); add(None, t, fx_hit(2), 0.4, -0.4)
        elif cid == 'suck':
            add(None, t, fx_suck(0.22), 0.25, 0.0)
        elif cid == 'type':
            add(None, t, fx_key(c['i']), 0.7, 0.1 * c['i'])
        elif cid == 'soft':
            add(None, t, fx_soft(), 0.9, 0.2, send=0.4)
        elif cid == 'hop':
            add(None, t, fx_tick(), 1.0, 0.3 - 0.1 * c['i'], send=0.1)
            add(None, t, woodblock(900 + 180 * c['i'], 0.5), 0.35, 0.3 - 0.1 * c['i'])
        elif cid == 'crack':
            add(None, t, fx_crackle(600 + c['i'], 0.16 + 0.1 * c['i'], 10 + 8 * c['i']), 0.7 + 0.3 * c['i'], 0.0, send=0.2)
        elif cid == 'shatter':
            add(None, t, fx_shatter(), 1.0, 0.0, send=0.35)
        elif cid == 'impact':
            add(None, t, fx_thud(), 1.0, 0.25, send=0.2); add(None, t, fx_hit(6), 0.8, 0.25)
            add(None, t - 0.25, fx_reverse(0.25, 77), 0.6, 0.2)
        elif cid == 'realize':
            add(None, t, fx_tinnitus(2.0), 0.8, 0.0)
        elif cid == 'open':
            add(None, t, fx_hit(6), 0.8, send=0.25)
        elif cid == 'fold':
            add(None, t, fx_reverse(0.55, 91), 0.5, -0.3)
        elif cid == 'appear':
            add(None, t, fx_steps([68, 75], 0.08, 16, 0.5), 0.12, -0.3, send=0.3)
            add(None, t + 0.08, fx_steps([72, 80], 0.08, 16, 0.5), 0.12, 0.3, send=0.3)
        elif cid == 'step':
            add(None, t, woodblock(520, 0.4), 0.25, -0.2, send=0.4)
            add(None, t + 0.3, woodblock(480, 0.3), 0.2, -0.1, send=0.4)
        else:
            raise ValueError(f'Unknown effect cue: {cid!r}')
        gain = profile['cues'][index]['gain']
        sfx += cur['s'] * gain
        verb += cur['v'] * gain
        applied.append({'cue': c, 'gain': gain})
        if report:
            print(f"  {cid:9s} {t:6.2f}s  preserved gain {gain:.8f}")

    ir = make_ir(2.2)
    wet = np.stack([signal.fftconvolve(verb[:, ch], ir[:, ch])[:total] for ch in (0, 1)], axis=1)
    return sfx + wet * 0.45, applied


def render_audio(data, profile, master_gain, report=False):
    """Remove only the song bus; preserve the original mix's numeric mastering gain."""
    fx, applied = render_effects(data, profile, report)
    gain = np.asarray(master_gain, dtype=float)
    expected = N(data['duration'])
    if gain.shape != (expected,) or not np.isfinite(gain).all() or (gain < 0).any():
        raise ValueError('Invalid preserved mastering automation.')
    mix = filt(fx[:expected], 'high', 25) * gain[:, None]
    dith = (np.random.default_rng(0).random(mix.shape) - np.random.default_rng(1).random(mix.shape)) / 32768
    pcm = np.clip(np.round((mix + dith) * 32767), -32768, 32767).astype(np.int16)
    return pcm, mix, applied


def main():
    with open(os.path.join(ROOT, 'cues.json'), encoding='utf-8') as stream:
        data = json.load(stream)
    with open(os.path.join(ROOT, 'audio', 'sfx-profile.json'), encoding='utf-8') as stream:
        profile = json.load(stream)
    with np.load(os.path.join(ROOT, 'audio', 'master-gain.npz'), allow_pickle=False) as archive:
        master_gain = archive['gain']
    pcm, mix, applied = render_audio(data, profile, master_gain, '--report' in sys.argv)
    out = os.path.join(ROOT, 'out')
    os.makedirs(out, exist_ok=True)
    wavfile.write(os.path.join(out, 'audio.wav'), SR, pcm)
    evidence = {
        'retained_effects': len(applied),
        'effect_types': dict(sorted(Counter(row['cue']['id'] for row in applied).items())),
        'song_recordings_read': 0,
        'profile_cues_match': True,
        'sample_rate': SR,
        'sample_count': len(pcm),
        'channels': 2,
        'integrated_lufs': float(lufs(mix)),
        'true_peak_dbtp': float(true_peak_db(mix)),
        'pcm_sha256': hashlib.sha256(pcm.tobytes()).hexdigest(),
    }
    with open(os.path.join(out, 'audio-report.json'), 'w', encoding='utf-8') as stream:
        json.dump(evidence, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(f"out/audio.wav: {len(applied)} effects; zero song recordings; {len(pcm) / SR:.3f}s")
    print(f"{evidence['integrated_lufs']:.2f} LUFS, {evidence['true_peak_dbtp']:.2f} dBTP (original effect levels preserved)")



# mastering helpers (shared with the other films)
def make_ir(rt=2.4, seed=3):
    n = N(rt)
    t = tsec(n)
    ir = np.random.default_rng(seed).standard_normal((n, 2)) * np.exp(-6.91 * t / rt)[:, None]
    ir = filt(ir, 'low', 5500, 1)
    ir[: N(0.014)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=0))


K_PRE = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
K_RLB = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def loudness_blocks(x, win=0.4, hop=0.1):
    y = signal.lfilter(*K_RLB, signal.lfilter(*K_PRE, x, axis=0), axis=0)
    p = (y ** 2).sum(axis=1)
    cs = np.concatenate([[0], np.cumsum(p)])
    b, h = N(win), N(hop)
    idx = np.arange(0, len(p) - b + 1, h)
    return (cs[idx + b] - cs[idx]) / b


def lufs(x):
    ms = loudness_blocks(x)
    ms = ms[ms > 10 ** ((-70 + 0.691) / 10)]
    if len(ms) == 0:
        return -120.0
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    ms = ms[-0.691 + 10 * np.log10(ms) > rel]
    return -0.691 + 10 * np.log10(ms.mean())


def true_peak_db(x):
    return 20 * np.log10(np.abs(signal.resample_poly(x, 4, 1, axis=0)).max() + 1e-12)


def limit(x, ceiling_db=-1.0):
    c = 10 ** (ceiling_db / 20)
    os_ = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)
    pk = os_[: len(x) * 4].reshape(-1, 4).max(axis=1)
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    g = minimum_filter1d(g, N(0.03))
    g = uniform_filter1d(g, N(0.01))
    return x * g[:, None]


if __name__ == '__main__':
    main()
