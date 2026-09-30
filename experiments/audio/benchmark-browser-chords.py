"""Compare the complete ONNX chord port with deployed Python on identical clips."""
import json
import time
from pathlib import Path
import librosa
import numpy as np
import onnxruntime as ort
from scipy.signal import resample_poly
from lv_chordia.chordnet_ismir_naive import ChordNet
from lv_chordia.chord_recognition import MODEL_NAMES
from lv_chordia.mir.nn.train import NetworkInterface
from lv_chordia.extractors.xhmm_ismir import XHMMDecoder
import lv_chordia
import torch

ROOT = Path('artifacts/browser-audio')
MODELS = Path('public/models/lv-chordia-web-v1')
manifest = json.loads((MODELS/'manifest.json').read_text())
bank = np.fromfile(MODELS/'tuning-kernels.f32',dtype='<f4').reshape((21,-1))
kernel_shape = manifest['kernelShape']
kernel_size = int(np.prod(kernel_shape))
torch.set_num_threads(4)
options = ort.SessionOptions()
options.intra_op_num_threads = 4
front = ort.InferenceSession(str(MODELS/'cqt.onnx'), options)
nets = [ort.InferenceSession(str(MODELS/f'net-{i}.onnx'),options) for i in range(5)]
native = [NetworkInterface(ChordNet(None),name) for name in MODEL_NAMES]
hmm = XHMMDecoder(template_file=str(Path(lv_chordia.__file__).parent/'data/submission_chord_list.txt'))
report = []
for clip in json.loads((ROOT/'clips.json').read_text()):
    audio = resample_poly(np.fromfile(ROOT/clip['file'],dtype='<f4'),441,320)
    begin = time.perf_counter()
    tuning = librosa.estimate_tuning(y=audio,sr=22050,bins_per_octave=36)
    kernel = bank[int(np.clip(np.floor((tuning+0.5)/0.05+0.5),0,20))]
    cqt = front.run(None, {'audio':audio[None,:],'real':kernel[:kernel_size].reshape(kernel_shape),'imag':kernel[kernel_size:2*kernel_size].reshape(kernel_shape),'lengths':kernel[2*kernel_size:]})[0]
    predictions = [net.run(None, {'cqt':cqt}) for net in nets]
    probabilities = [np.mean([p[h] for p in predictions],axis=0) for h in range(6)]
    actual = hmm.decode(probabilities,np.ones(len(probabilities[0])))
    reference = abs(librosa.hybrid_cqt(audio,sr=22050,hop_length=512,fmin=librosa.note_to_hz('F#0'),n_bins=288,bins_per_octave=36,tuning=None)).T.astype(np.float32)
    original = [net.inference(reference) for net in native]
    expectedProbs = [np.mean([p[h] for p in original],axis=0) for h in range(6)]
    expected = hmm.decode(expectedProbs,np.ones(len(expectedProbs[0])))
    # Isolate network export equivalence from the intentional CQT difference.
    same_features = nets[0].run(None, {'cqt':reference[None,:,18:270]})
    network_error = max(float(np.max(abs(a-b))) for a,b in zip(same_features,original[0]))
    row = {'name':clip['name'], 'tuning':float(tuning), 'frames':len(actual), 'agreementWithPython':float(np.mean(np.array(actual)==np.array(expected))), 'networkMaxAbsError':network_error,'seconds':time.perf_counter()-begin}
    report.append(row)
    print(json.dumps(row),flush=True)
    (ROOT/(clip['name']+'-chords-reference.json')).write_text(json.dumps({'labels':actual,'probabilities':[p.tolist() for p in probabilities]}))
    (ROOT/(clip['name']+'-22050.f32')).write_bytes(audio.astype('<f4').tobytes())
(ROOT/'chord-parity.json').write_text(json.dumps(report,indent=2)+'\n')
