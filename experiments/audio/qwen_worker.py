"""Optional local Apple Silicon lyric worker: Qwen3-ASR + forced alignment.

Uses optional MLX dependencies on Apple Silicon. Loads cached weights only. stdout is JSON.
"""
import argparse
from contextlib import redirect_stdout
import gc
import json
import math
import unicodedata
import os
from pathlib import Path
import sys
from offline import require_offline

ASR_ID='mlx-community/Qwen3-ASR-1.7B-8bit'
ALIGN_ID='mlx-community/Qwen3-ForcedAligner-0.6B-8bit'
REVISIONS={ASR_ID:'a8379a2e2f9e313c9292cdf1af4055ab56d50d55',ALIGN_ID:'0e1a68e91d815300c7c9754b2a7639378b23db15'}


def model_path(variable, default):
    from huggingface_hub import snapshot_download
    value=os.environ.get(variable,default)
    if Path(value).is_dir():return Path(value)
    return Path(snapshot_download(value,revision=REVISIONS.get(value),allow_patterns=["*.json","*.safetensors","*.txt","*.model"],local_files_only=True))


def paths():
    return model_path('CHORDLEAF_QWEN_MODEL',ASR_ID),model_path('CHORDLEAF_QWEN_ALIGNER',ALIGN_ID)


def ready():
    try:
        import mlx.core
        from mlx_audio.stt.utils import load
        asr,aligner=paths()
        return all((p/'config.json').is_file() and any(p.glob('*.safetensors')) for p in [asr,aligner])
    except Exception:return False


def aligned_groups(items, start, end, line):
    """Preserve text when an aligner emits zero-length/overlapping word spans.

    Unplaced tokens join the next timed group (or the previous one at the end).
    Such groups are explicitly marked approximate, never word-level gold labels.
    """
    words=[];pending=[];approximate=0
    for item in items:
        text=item.text.strip()
        if not text:continue
        original=start+item.start_time
        left=max(start,original,words[-1]['end'] if words else start)
        right=min(end,start+item.end_time)
        if not all(math.isfinite(v) for v in [original, left, right]) or right<=left:
            pending.append(text);approximate+=1;continue
        grouped=bool(pending) or left!=original
        words.append({'start':left,'end':right,'text':' '.join(pending+[text]),'line':line,
                      **({'timing':'grouped'} if grouped else {})})
        if left!=original:approximate+=1
        pending=[]
    if pending:
        if words:
            words[-1]['text']+=' '+' '.join(pending);words[-1]['timing']='grouped'
        else:
            words=[{'start':start,'end':end,'text':' '.join(pending),'line':line,'timing':'segment'}]
    return words,approximate


def transcribe(path, language=None):
    from analyze import decode,RATE
    from mlx_audio.stt.utils import load
    import mlx.core as mx
    audio=decode(path);duration=len(audio)/RATE
    asr_path,align_path=paths()
    model=load(asr_path,strict=True)
    result=model.generate(audio,max_tokens=8192,temperature=0,language={'en':'English','es':'Spanish'}.get(language),chunk_duration=30)
    transcript=result.text;segments=result.segments
    del model;gc.collect();mx.clear_cache()
    aligner=load(align_path,strict=True)
    words=[];approximate=0;raw=[]
    for line,segment in enumerate(segments):
        text=segment['text'].strip()
        if not text:continue
        start,end=segment['start'],min(duration,segment['end'])
        aligned=aligner.generate(audio[round(start*RATE):round(end*RATE)],text=text,
                                 language=segment.get('language') or {'es':'Spanish','en':'English'}.get(language,'English'))
        raw.extend({'start':start+w.start_time,'end':start+w.end_time,'text':w.text,'line':line} for w in aligned.items)
        grouped,adjustments=aligned_groups(aligned.items,start,end,line)
        # Some aligners omit tokens altogether. Keep the original transcript
        # as a coarse segment when token preservation cannot be established.
        canonical = lambda value: ''.join(c for c in unicodedata.normalize('NFKC', value).casefold() if c.isalnum())
        if canonical(' '.join(w['text'] for w in grouped)) != canonical(text):
            grouped = [{'start':start,'end':end,'text':text,'line':line,'timing':'segment'}]
            adjustments += 1
        words.extend(grouped);approximate+=adjustments

    return {'words':words,'transcript':transcript,'engine':'qwen3-asr-1.7b-8bit+forced-aligner-0.6b-8bit',
            'warnings':['alignment-approximate'] if approximate else [],'approximateAlignments':approximate,'rawAlignment':raw}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('file',nargs='?');p.add_argument('--language',choices=['es','en']);p.add_argument('--check',action='store_true');a=p.parse_args()
    require_offline()
    try:
        with redirect_stdout(sys.stderr):
            result={'qwen':ready()} if a.check else transcribe(a.file,a.language)
        print(json.dumps(result,allow_nan=False))
    except Exception:
        print(json.dumps({'error':'qwen-failed'}));sys.exit(1)
