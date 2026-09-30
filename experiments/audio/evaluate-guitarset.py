"""Compare LV-Chordia with the locally trained model on identical held-out frames."""
import argparse
import importlib.util
import json
from pathlib import Path
import time
import zipfile
import numpy as np
from analyze import decode
from neural import recognize
from offline import require_offline


def evaluate(dataset, training):
    require_offline()
    spec=importlib.util.spec_from_file_location('guitar_training',Path(__file__).with_name('train-guitarset.py'))
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    archive=zipfile.ZipFile(dataset/'audio_mono-mic.zip')
    names={Path(n).name:n for n in archive.namelist() if n.endswith('.wav') and '__MACOSX' not in n}
    report=[]
    for item in json.loads((training/'manifest.json').read_text()):
        if item['split'] not in ['validation','test']:continue
        cache=training/(item['id']+'-lv.json')
        if cache.exists():report.append(json.loads(cache.read_text()));continue
        path=training/'evaluation.wav';path.write_bytes(archive.read(names[item['id']+'_mic.wav']))
        audio=decode(str(path));started=time.perf_counter();events=recognize(audio)
        labels=np.load(training/(item['id']+'.npz'))['y'];times=np.arange(len(labels))*mod.HOP/mod.RATE
        predicted=np.full_like(labels,-1)
        for event in events:
            target=mod.target(event['rawLabel'])
            if target is not None:predicted[(times>=event['start'])&(times<event['end'])]=target
        mask=labels[:,0]>=0;correct=np.all(predicted[mask]==labels[mask],axis=1)
        row={**item,'seconds':time.perf_counter()-started,'correctFrames':int(correct.sum()),'framesScored':int(mask.sum())}
        cache.write_text(json.dumps(row,indent=2));report.append(row);print(item['id'],round(correct.mean(),3),flush=True)
    (training/'lv-comparison.json').write_text(json.dumps(report,indent=2));(training/'evaluation.wav').unlink(missing_ok=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('dataset',type=Path);p.add_argument('training',type=Path);a=p.parse_args();evaluate(a.dataset,a.training)
