"""Regression: rendering the distributed film requires no external song recording."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

from scipy.io import wavfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


class AudioReleaseTest(unittest.TestCase):
    def test_distributed_cues_keep_157_effects_without_the_song(self):
        data = json.loads((ROOT / 'cues.json').read_text(encoding='utf-8'))
        self.assertEqual(len(data['cues']), 157)
        self.assertFalse(any(c['id'] == 'song' for c in data['cues']))

    def test_sound_effect_mix_renders_with_no_song_file(self):
        self.assertFalse((ROOT / 'music' / 'song.wav').exists())
        process = subprocess.run([sys.executable, '-B', 'music.py'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=300)
        self.assertEqual(process.returncode, 0, process.stdout + process.stderr)
        sr, audio = wavfile.read(ROOT / 'out' / 'audio.wav')
        self.assertEqual(sr, 48000)
        self.assertEqual(audio.shape, (4999650, 2))
        self.assertGreater(np.max(np.abs(audio.astype(float))), 100)
        report = json.loads((ROOT / 'out' / 'audio-report.json').read_text(encoding='utf-8'))
        self.assertEqual(report['retained_effects'], 157)
        self.assertEqual(len(report['effect_types']), 38)
        self.assertEqual(report['song_recordings_read'], 0)
        # Frozen independently from the original effect bus, before removing the song.
        self.assertEqual(report['pcm_sha256'], 'e69e98781cb0d4d903847b17a50563850746c62b96118b470ab0ad23dff6cb46')


if __name__ == '__main__':
    unittest.main()
