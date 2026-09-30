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
import statistics
import re
from languages import LANGUAGES
from offline import require_offline

ASR_ID='mlx-community/Qwen3-ASR-1.7B-8bit'
ALIGN_ID='mlx-community/Qwen3-ForcedAligner-0.6B-8bit'
REVISIONS=json.loads(Path(__file__).with_name('model-catalog.json').read_text())['qwen']['models']


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
        from importlib.util import find_spec
        if not find_spec('mlx_audio'): return False
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


def restore_transcript_text(words, text):
    """Restore ASR punctuation/case stripped by the aligner, without new times."""
    canonical = lambda value: ''.join(c for c in unicodedata.normalize('NFKC', value).casefold() if c.isalnum())
    if canonical(' '.join(w['text'] for w in words)) != canonical(text):
        return False
    positions=[]
    for index, character in enumerate(text):
        positions.extend([index] * len(canonical(character)))
    if len(positions) != len(canonical(text)):
        return False
    cursor=0;left=0
    for word in words:
        cursor+=len(canonical(word['text']))
        right=positions[cursor] if cursor<len(positions) else len(text)
        word['text']=text[left:right].strip()
        left=right
    return True


def trim_alignment_lead(words):
    """Bound an implausibly long first token over an instrumental introduction.

    This is an approximate onset, not a measured vocal boundary. Keep raw
    alignment separately and mark the adjusted event for review.
    """
    if not words or len(words[0]['text'].split()) != 1:
        return 0
    first=words[0]
    durations=[w['end']-w['start'] for w in words[1:]
               if len(w['text'].split())==1 and 0<w['end']-w['start']<2]
    if first['end']-first['start']<=4 or not durations:
        return 0
    cap=min(1.5,max(0.25,2*statistics.median(durations)))
    first['start']=first['end']-cap
    first['timing']='grouped'
    return 1


def repetition_start(text):
    """Detect pathological decoding loops, not normal repeated choruses."""
    tokens=list(re.finditer(r'\S+',text))
    values=[m.group().casefold().strip('.,!?;:') for m in tokens]
    for width,repeats in [(1,40),(2,24),(3,24),(4,24),(5,24),(6,24)]:
        run=0
        for i in range(width,len(values)):
            run=run+1 if values[i] and values[i]==values[i-width] else 0
            if run >= width*(repeats-1):
                return tokens[i-run-width+1].start()
    return None


def generate_segments(model, audio, language):
    """A loop in one chunk must not consume the budget for the entire song."""
    from mlx_audio.stt.models.qwen3_asr.qwen3_asr import split_audio_into_chunks
    from analyze import RATE
    segments=[];partial=False
    for chunk,start in split_audio_into_chunks(audio,sr=RATE,chunk_duration=30):
        generated=model.generate(chunk,max_tokens=1024,temperature=0,
                                 language=language,chunk_duration=45)
        text=generated.text.strip()
        if repetition_start(text) is not None:
            generated=model.generate(chunk,max_tokens=1024,temperature=0,
                                     language=language,chunk_duration=45,
                                     repetition_penalty=1.15,repetition_context_size=64)
            text=generated.text.strip()
        repeated=repetition_start(text)
        if repeated is not None:
            text=text[:repeated].strip()
            partial=True
        if generated.generation_tokens>=1024:
            partial=True
        detected=(generated.segments or [{}])[0].get('language')
        segments.append({'start':start,'end':start+len(chunk)/RATE,
                         'text':text,'language':detected or language})
    return segments,partial


def transcribe(path, language=None):
    from analyze import decode,RATE
    from mlx_audio.stt.utils import load
    import mlx.core as mx
    audio=decode(path);duration=len(audio)/RATE
    asr_path,align_path=paths()
    model=load(asr_path,strict=True)
    segments,partial=generate_segments(model,audio,LANGUAGES.get(language, {}).get('qwen'))
    transcript=' '.join(segment['text'] for segment in segments)
    del model;gc.collect();mx.clear_cache()
    aligner=load(align_path,strict=True)
    words=[];approximate=0;raw=[]
    for line,segment in enumerate(segments):
        text=segment['text'].strip()
        if not text:continue
        start,end=segment['start'],min(duration,segment['end'])
        aligned=aligner.generate(audio[round(start*RATE):round(end*RATE)],text=text,
                                 language=segment.get('language') or LANGUAGES.get(language, {}).get('qwen', 'English'))
        raw.extend({'start':start+w.start_time,'end':start+w.end_time,'text':w.text,'line':line} for w in aligned.items)
        grouped,adjustments=aligned_groups(aligned.items,start,end,line)
        # Some aligners omit tokens altogether. Keep the original transcript
        # as a coarse segment when token preservation cannot be established.
        if not restore_transcript_text(grouped, text):
            grouped = [{'start':start,'end':end,'text':text,'line':line,'timing':'segment'}]
            adjustments += 1
        adjustments += trim_alignment_lead(grouped)
        words.extend(grouped);approximate+=adjustments

    return {'words':words,'transcript':transcript,'engine':'qwen3-asr-1.7b-8bit+forced-aligner-0.6b-8bit',
            'warnings':(['alignment-approximate'] if approximate else [])+(['lyrics-partial'] if partial else []),
            'approximateAlignments':approximate,'rawAlignment':raw}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('file',nargs='?');p.add_argument('--language',choices=list(LANGUAGES));p.add_argument('--check',action='store_true');a=p.parse_args()
    require_offline()
    try:
        with redirect_stdout(sys.stderr):
            result={'qwen':ready()} if a.check else transcribe(a.file,a.language)
        print(json.dumps(result,allow_nan=False))
    except Exception:
        print(json.dumps({'error':'qwen-failed'}));sys.exit(1)
