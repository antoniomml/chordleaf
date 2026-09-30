"""Download only pinned public model assets into ignored local research storage."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import urllib.request
import json

ROOT = Path('artifacts/browser-audio/models')
MODELS = {
 'qwen': ('jiangzhuo9357/Qwen3-ASR-0.6B-ONNX', '4a01b95fafe2c9e3af77e33c18bbb7de349c62f6', [
   'encoder.fp16.onnx','decoder_init.q4f16.onnx','decoder_step.q4f16.onnx',
   'decoder_weights.q4f16.data','embed_tokens.int8.bin','embed_scales.f32.bin',
   'prompt_config.json','mel_filters.json','config.json','tokenizer.json','tokenizer_config.json']),
 'aligner': ('valoomba/Qwen3-ForcedAligner-0.6B-ONNX','261c9ed100c1b18a4a1fbc488e05625dc9a4ae5c', [
   'onnx/model_q4.onnx','config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json']),
}

def download(task):
 name, repo, revision, filename = task
 dest = ROOT / name / filename
 dest.parent.mkdir(parents=True, exist_ok=True)
 if dest.exists(): return
 url = f'https://huggingface.co/{repo}/resolve/{revision}/{filename}'
 temp = dest.with_suffix(dest.suffix+'.partial')
 with urllib.request.urlopen(url, timeout=120) as source, temp.open('wb') as target:
  while chunk := source.read(1024*1024): target.write(chunk)
 temp.rename(dest)
 print(name, filename, dest.stat().st_size, flush=True)

if __name__ == '__main__':
 tasks = [(name, repo, revision, filename) for name, (repo, revision, files) in MODELS.items() for filename in files]
 with ThreadPoolExecutor(max_workers=3) as executor:
  list(executor.map(download, tasks))
