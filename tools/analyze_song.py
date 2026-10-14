"""analyze_song.py — tempo, beat grid and section energy for music/song.wav (no librosa; numpy/scipy only).

    python tools/analyze_song.py            -> prints BPM, first downbeat, per-bar energy; writes music/beats.json
"""
import json
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sr, x = wavfile.read(os.path.join(ROOT, 'music', 'song.wav'))
x = x.astype(np.float64) / 32768
mono = x.mean(axis=1)
dur = len(mono) / sr

# ---- onset strength: half-wave rectified spectral flux on a log-magnitude STFT
hop = 480                                   # 10 ms
f, t, Z = signal.stft(mono, sr, nperseg=2048, noverlap=2048 - hop, boundary=None)
M = np.log1p(100 * np.abs(Z))
flux = np.maximum(0, np.diff(M, axis=1)).sum(axis=0)
flux = np.concatenate([[0], flux])
fps = sr / hop
onset = flux - signal.medfilt(flux, 31)
onset = np.maximum(onset, 0)
lowband = np.maximum(0, np.diff(M[(f > 30) & (f < 150)], axis=1)).sum(axis=0)
lowband = np.concatenate([[0], lowband])

# ---- tempo: autocorrelation of the onset envelope, 70–180 BPM
o = onset - onset.mean()
ac = np.correlate(o, o, 'full')[len(o) - 1:]
lags = np.arange(len(ac))
bpm_of = lambda lag: 60 * fps / lag
cands = []
for lag in range(int(fps * 60 / 180), int(fps * 60 / 70) + 1):
    cands.append((ac[lag], lag))
cands.sort(reverse=True)
best_lag = cands[0][1]
# refine with parabolic interpolation
a, b, c = ac[best_lag - 1], ac[best_lag], ac[best_lag + 1]
lag_f = best_lag + 0.5 * (a - c) / (a - 2 * b + c)
bpm = bpm_of(lag_f)
print(f'duration {dur:.2f}s  tempo candidates:', ', '.join(f'{bpm_of(l):.2f}' for _, l in cands[:6]))

# fine BPM search: maximise onset energy sampled on a comb across the whole song
def comb_score(bpm_, phase):
    period = 60 / bpm_
    ts = np.arange(phase, dur, period)
    idx = np.round(ts * fps).astype(int)
    idx = idx[idx < len(onset)]
    return onset[idx].mean()

best = (0, bpm, 0)
for bb in np.arange(bpm - 1.5, bpm + 1.5, 0.01):
    period = 60 / bb
    for ph in np.arange(0, period, 0.005):
        s = comb_score(bb, ph)
        if s > best[0]:
            best = (s, bb, ph)
_, bpm, phase = best
beat = 60 / bpm
print(f'BPM {bpm:.3f}   beat {beat:.4f}s   first beat phase {phase:.3f}s')

# downbeat: which of the 4 beat offsets carries most low-band (kick) energy
beats = np.arange(phase, dur, beat)
bidx = np.clip(np.round(beats * fps).astype(int), 0, len(lowband) - 1)
low_at = lowband[bidx]
scores = [low_at[k::4].mean() for k in range(4)]
db = int(np.argmax(scores))
print('downbeat offset scores', [f'{s:.2f}' for s in scores], '-> beat', db)
bars = beats[db::4]

# per-bar loudness (RMS dB) and low/high balance
rows = []
for i, b0 in enumerate(bars):
    i0, i1 = int(b0 * sr), int(min(dur, b0 + 4 * beat) * sr)
    seg = mono[i0:i1]
    if len(seg) < sr * 0.5:
        break
    rms = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
    lo = filt = signal.sosfilt(signal.butter(2, 150, 'low', fs=sr, output='sos'), seg)
    lo_db = 20 * np.log10(np.sqrt((lo ** 2).mean()) + 1e-9)
    on = onset[int(b0 * fps):int((b0 + 4 * beat) * fps)].mean()
    rows.append((i, b0, rms, lo_db, on))
print(' bar   start    rms   low  onset')
for i, b0, rms, lo, on in rows:
    bar = '#' * int(max(0, rms + 40))
    print(f'{i:4d} {b0:7.2f} {rms:6.1f} {lo:5.1f} {on:6.2f}  {bar}')
json.dump({'bpm': bpm, 'beat': beat, 'phase': phase, 'downbeat': db, 'bars': [float(b) for b in bars],
           'rms': [r[2] for r in rows], 'low': [r[3] for r in rows]},
          open(os.path.join(ROOT, 'music', 'beats.json'), 'w'), indent=1)
