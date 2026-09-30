"""Export the existing LV-Chordia ensemble and a convolutional CQT frontend.

Requires the optional research dependencies onnx and nnAudio. The CQT frontend
exports a tuning kernel bank and differs from librosa hybrid_cqt: benchmark the whole
pipeline, not just the network export, before selecting it for production.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
import torch
from torch import nn
from nnAudio.features import CQT2010v2
from lv_chordia.chordnet_ismir_naive import ChordNet
from lv_chordia.chord_recognition import MODEL_NAMES
from lv_chordia.mir.common import CACHE_DATA_PATH
from lv_chordia.extractors.xhmm_ismir import XHMMDecoder
from neural import display_label
import lv_chordia

DEST = Path('public/models/lv-chordia-web-v1')
DEST.mkdir(parents=True, exist_ok=True)
torch.set_num_threads(4)

class Normalization(nn.Module):
    def forward(self, x):
        mean = x.mean(dim=(2, 3), keepdim=True)
        variance = ((x-mean)**2).mean(dim=(2, 3), keepdim=True)
        return (x-mean) / torch.sqrt(variance + 1e-5)

class Probabilities(nn.Module):
    def __init__(self, net):
        super().__init__()
        self.net = net
    def forward(self, cqt):
        return tuple(torch.softmax(y, dim=1) for y in self.net(cqt))

class Frontend(nn.Module):
    def __init__(self):
        super().__init__()
        self.cqt = CQT2010v2(sr=22050, hop_length=512, fmin=23.12465141947715,
                            n_bins=288, bins_per_octave=36, verbose=False)
    def forward(self, audio, real, imag, lengths):
        self.cqt.cqt_kernels_real = real
        self.cqt.cqt_kernels_imag = imag
        self.cqt.lenghts = lengths
        return self.cqt(audio)[:,18:270,:].transpose(1,2)

frontend = Frontend().eval()
kernel_shape = list(frontend.cqt.cqt_kernels_real.shape)
bank = []
for step in range(21):
    tuning = -0.5 + step * 0.05
    transform = CQT2010v2(sr=22050, hop_length=512, fmin=23.12465141947715*2**(tuning/36),
                         n_bins=288, bins_per_octave=36, verbose=False)
    assert list(transform.cqt_kernels_real.shape) == kernel_shape
    bank.append(np.concatenate([transform.cqt_kernels_real.numpy().flatten(),transform.cqt_kernels_imag.numpy().flatten(),transform.lenghts.numpy()]))
(DEST/'tuning-kernels.f32').write_bytes(np.stack(bank).astype('<f4').tobytes())
torch.onnx.export(frontend, (torch.zeros(1,22050*3),frontend.cqt.cqt_kernels_real,frontend.cqt.cqt_kernels_imag,frontend.cqt.lenghts), DEST/'cqt.onnx',
                  input_names=['audio','real','imag','lengths'], output_names=['cqt'],
                  dynamic_axes={'audio':{1:'samples'},'cqt':{1:'frames'}},
                  opset_version=17, dynamo=False)
heads = ['triad','bass','seventh','ninth','eleventh','thirteenth']
for index, name in enumerate(MODEL_NAMES):
    net = ChordNet(None)
    state = torch.load(Path(CACHE_DATA_PATH)/(name+'.sdict'), map_location='cpu')
    net.load_state_dict(state['net'])
    net.use_gpu = False
    for key, module in list(net.audio_feature_block.named_children()):
        if isinstance(module, nn.InstanceNorm2d):
            setattr(net.audio_feature_block,key,Normalization())
    net.eval()
    torch.onnx.export(Probabilities(net), (torch.zeros(1,129,252),), DEST/f'net-{index}.onnx',
                      input_names=['cqt'], output_names=heads,
                      dynamic_axes={'cqt':{1:'frames'},**{h:{0:'frames'} for h in heads}},
                      opset_version=17, dynamo=False)
    print('Exported', name, flush=True)
hmm = XHMMDecoder(template_file=str(Path(lv_chordia.__file__).parent/'data/submission_chord_list.txt'))
shapes = [73,13,4,4,3,3]
dictionary = [{'array':[int(v) for v in a],'rawLabel':label,'label':display_label(label)}
              for a,label in hmm.known_chord_array if all(v < s for v,s in zip(a,shapes))]
files = [{'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
         for p in sorted(DEST.iterdir()) if p.suffix in ['.onnx','.f32']]
(DEST/'manifest.json').write_text(json.dumps({'version':1,'sampleRate':22050,'hop':512,
    'heads':heads,'sizes':shapes,'transitionPenalty':30,'dictionary':dictionary,'files':files,
    'kernelShape':kernel_shape,'tuningSteps':21,'tuningResolution':0.05,
    'preprocessing':'nnAudio CQT2010v2 with estimated tuning; approximate librosa hybrid CQT'},indent=2)+'\n')
print('Total bytes',sum(f['bytes'] for f in files),'labels',len(dictionary))
