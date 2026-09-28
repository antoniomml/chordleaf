"""Local proof-of-concept chord training on GuitarSet microphone recordings.

Uses the verified, performed-chord annotation (not the prescribed chord sheet).
Only exact pitch-set matches to the declared vocabulary are scored. Omitted or
unusual voicings are excluded and coverage is reported. No user songs are used
for training. Entire compositions are held out across performers/keys/tempos.
Research output only: never auto-promoted to the application.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import time
import zipfile
import numpy as np
import torch
from torch import nn
import librosa
import mir_eval
from analyze import decode, RATE
from offline import require_offline

QUALITIES = {'': [0,4,7], 'm':[0,3,7], '7':[0,4,7,10], 'maj7':[0,4,7,11], 'm7':[0,3,7,10],
 'm7b5':[0,3,6,10], '6':[0,4,7,9], 'm6':[0,3,7,9], 'sus2':[0,2,7], 'sus4':[0,5,7],
 '5':[0,7], 'aug':[0,4,8], 'dim':[0,3,6], 'dim7':[0,3,6,9], '9':[0,2,4,7,10],
 'maj9':[0,2,4,7,11], 'm9':[0,2,3,7,10], 'add9':[0,2,4,7], 'madd9':[0,2,3,7],
 '7b9':[0,1,4,7,10], '7#9':[0,3,4,7,10], '7#5':[0,4,8,10], '7sus4':[0,5,7,10],
 '11':[0,2,4,5,7,10], '13':[0,2,4,7,9,10]}
MATCH = {tuple(sorted(v)):i for i,v in enumerate(QUALITIES.values())}
HOP = 1024
OFFSETS = [-4,-2,0,2,4]


def features(audio):
    cqt = abs(librosa.cqt(audio, sr=RATE, hop_length=HOP, fmin=librosa.note_to_hz('C1'), n_bins=84))
    cqt = np.log1p(cqt * 10)
    cqt /= np.maximum(cqt.max(axis=0, keepdims=True), 1e-6)
    indices = np.arange(cqt.shape[1])
    return np.stack([cqt[:, np.clip(indices+d,0,len(indices)-1)].T for d in OFFSETS],axis=1).astype(np.float32)


def split(group):
    if group.endswith('3'): return 'test'
    if group in ['BN2','Jazz2']: return 'validation'
    return 'train'


def target(label):
    try:
        root, bits, bass = mir_eval.chord.encode(label, reduce_extended_chords=True)
        quality = MATCH.get(tuple(np.flatnonzero(bits)))
        return (root,quality) if root >= 0 and quality is not None else None
    except Exception:
        return None


class ChordNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.body=nn.Sequential(nn.Flatten(),nn.Linear(84*5,192),nn.ReLU(),nn.Dropout(.15),nn.Linear(192,96),nn.ReLU())
        self.root=nn.Linear(96,12);self.quality=nn.Linear(96,len(QUALITIES))
    def forward(self,x):
        x=self.body(x);return self.root(x),self.quality(x)


def prepare(data, output):
    record=json.loads((data/'record.json').read_text())
    for filename in ['annotation.zip','audio_mono-mic.zip']:
        expected=next(f['checksum'].split(':')[1] for f in record['files'] if f['key']==filename)
        assert hashlib.md5((data/filename).read_bytes()).hexdigest()==expected, 'Dataset checksum mismatch'
    annotations=zipfile.ZipFile(data/'annotation.zip');audiozip=zipfile.ZipFile(data/'audio_mono-mic.zip')
    audio_names={Path(n).name:n for n in audiozip.namelist() if n.endswith('.wav') and '__MACOSX' not in n}
    rows=[]
    for name in sorted(annotations.namelist()):
        if not name.endswith('_comp.jams') or '__MACOSX' in name:continue
        stem=Path(name).stem
        if stem in ['04_BN3-154-E_comp','04_Jazz1-200-B_comp','02_Funk2-119-G_comp']:continue
        group=stem.split('_')[1].split('-')[0]; cache=output/(stem+'.npz')
        jam=json.loads(annotations.read(name))
        annotation=next(a for a in jam['annotations'] if a['namespace']=='chord' and a['annotation_metadata'].get('data_source')=='Semi-automatic chord transcription with manual verification')
        if not cache.exists():
            # Keep decompression bounded to one recording at a time.
            wav=output/'input.wav';wav.write_bytes(audiozip.read(audio_names[stem+'_mic.wav']))
            x=features(decode(str(wav)));times=np.arange(len(x))*HOP/RATE
            labels=np.full((len(x),2),-1,dtype=np.int64)
            for event in annotation['data']:
                label=target(event['value'])
                if label is None:continue
                mask=(times>=event['time']) & (times<event['time']+event['duration'])
                labels[mask]=label
            np.savez_compressed(cache,x=x,y=labels)
            wav.unlink()
        arrays=np.load(cache);mask=arrays['y'][:,0]>=0
        rows.append({'id':stem,'group':group,'split':split(group),'frames':int(len(mask)),'supportedFrames':int(mask.sum())})
        print(stem,rows[-1]['supportedFrames'],'/',len(mask),flush=True)
    (output/'manifest.json').write_text(json.dumps(rows,indent=2));return rows


def evaluate(model, x, y):
    model.eval();root=[];quality=[]
    with torch.no_grad():
        for batch in x.split(1024):
            r,q=model(batch);root.append(r.argmax(1));quality.append(q.argmax(1))
    r=torch.cat(root);q=torch.cat(quality)
    return {'rootAccuracy':float((r==y[:,0]).float().mean()), 'qualityAccuracy':float((q==y[:,1]).float().mean()),
            'exactRootQuality':float(((r==y[:,0]) & (q==y[:,1])).float().mean()),
            'frames':len(y),'perQuality':{name:{'frames':int((y[:,1]==i).sum()),'correct':int(((y[:,1]==i)&(q==i)&(r==y[:,0])).sum())} for i,name in enumerate(QUALITIES)}}


def train(data, output, epochs):
    require_offline();output.mkdir(parents=True,exist_ok=True)
    torch.manual_seed(7);np.random.seed(7);torch.set_num_threads(4)
    rows=prepare(data,output);sets={}
    for partition in ['train','validation','test']:
        xs=[];ys=[]
        for row in rows:
            if row['split']!=partition:continue
            d=np.load(output/(row['id']+'.npz'));mask=d['y'][:,0]>=0
            xs.append(d['x'][mask]);ys.append(d['y'][mask])
        sets[partition]=(torch.from_numpy(np.concatenate(xs)),torch.from_numpy(np.concatenate(ys)))
    model=ChordNet();optimizer=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.001)
    x,y=sets['train']; counts=torch.bincount(y[:,1],minlength=len(QUALITIES)).float()
    weights=(counts.max()/counts.clamp(min=1)).sqrt().clamp(max=4);history=[];best=-1;started=time.perf_counter()
    for epoch in range(epochs):
        model.train()
        for indices in torch.randperm(len(x)).split(512):
            batch=x[indices].clone();labels=y[indices].clone()
            shift=int(torch.randint(-5,7,(1,)))
            batch=torch.roll(batch,shift, dims=2)
            if shift>0:batch[:,:,:shift]=0
            if shift<0:batch[:,:,shift:]=0
            labels[:,0]=(labels[:,0]+shift)%12
            r,q=model(batch);loss=nn.functional.cross_entropy(r,labels[:,0])+nn.functional.cross_entropy(q,labels[:,1],weight=weights)
            optimizer.zero_grad();loss.backward();optimizer.step()
        metrics=evaluate(model,*sets['validation']);history.append({'epoch':epoch+1,**metrics})
        if metrics['exactRootQuality']>best:
            best=metrics['exactRootQuality'];torch.save(model.state_dict(),output/'model.pt')
        print('epoch',epoch+1,'validation',round(metrics['exactRootQuality'],4),flush=True)
    model.load_state_dict(torch.load(output/'model.pt',weights_only=True))
    report={'seed':7,'epochs':epochs,'seconds':time.perf_counter()-started,'vocabulary':list(QUALITIES),
            'warning':'Acoustic-guitar-only research model. Exact pitch-set subset, composition-disjoint split. Excludes inversions from scoring. Not deployed.',
            'coverage':{p:{'files':sum(r['split']==p for r in rows),'allFrames':sum(r['frames'] for r in rows if r['split']==p),'supportedFrames':sum(r['supportedFrames'] for r in rows if r['split']==p)} for p in sets},
            'trainingQualityCounts':{name:int(counts[i]) for i,name in enumerate(QUALITIES)},
            'history':history,'validation':evaluate(model,*sets['validation']),'test':evaluate(model,*sets['test'])}
    (output/'training.json').write_text(json.dumps(report,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('dataset',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--epochs',type=int,default=30)
    a=parser.parse_args();train(a.dataset,a.output,a.epochs)
