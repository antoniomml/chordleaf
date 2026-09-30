"""Explicit desktop model installation. This command never accepts audio."""
import argparse
import json
from huggingface_hub import snapshot_download
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('model', choices=['qwen', 'whisper'])
a = p.parse_args()
catalog = json.loads(Path(__file__).with_name('model-catalog.json').read_text())
models = catalog[a.model]['models']
for index, (model, revision) in enumerate(models.items()):
    print(json.dumps({'stage': 'download', 'model': a.model,
                      'completed': index, 'total': len(models)}), flush=True)
    folder = Path(snapshot_download(model, revision=revision,
                      allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model', '*.bin']))
    if not (folder / 'config.json').is_file() or not (any(folder.glob('*.safetensors')) or (folder / 'model.bin').is_file()):
        raise RuntimeError('Model download is incomplete')
if a.model == 'qwen':
    from qwen_worker import ready
    if not ready(): raise RuntimeError('Downloaded models are not ready')
print(json.dumps({'stage': 'complete', 'model': a.model}), flush=True)
