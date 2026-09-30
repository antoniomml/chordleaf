"""Compare the candidate convolutional CQT with the deployed librosa features."""
import json
import sys
from pathlib import Path
import numpy as np
import torch
import librosa
from nnAudio.features import CQT2010v2
from analyze import decode
from scipy.signal import resample_poly

torch.set_num_threads(4)
audio = resample_poly(decode(sys.argv[1])[:16000 * 30], 441, 320)
fmin = librosa.note_to_hz('F#0')
model = CQT2010v2(sr=22050, hop_length=512, fmin=fmin, n_bins=288,
                   bins_per_octave=36, verbose=False)
with torch.no_grad():
    actual = model(torch.from_numpy(audio)).numpy()[0].T
expected = abs(librosa.hybrid_cqt(audio, sr=22050, hop_length=512, fmin=fmin,
                               n_bins=288, bins_per_octave=36, tuning=0)).T
print(json.dumps({'shape': list(actual.shape), 'referenceShape': list(expected.shape),
                  'relativeL2': float(np.linalg.norm(actual-expected)/np.linalg.norm(expected)),
                  'correlation': float(np.corrcoef(actual.flatten(),expected.flatten())[0,1])}))
Path('artifacts/browser-audio/cqt-nnaudio.f32').write_bytes(actual.astype('<f4').tobytes())
Path('artifacts/browser-audio/cqt-librosa.f32').write_bytes(expected.astype('<f4').tobytes())
