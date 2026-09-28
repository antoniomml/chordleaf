"""Explicit network-enabled model installation. Never processes user audio."""
import sys
from huggingface_hub import snapshot_download
from qwen_worker import REVISIONS

if sys.platform != 'darwin':
    raise SystemExit('MLX requires Apple Silicon macOS')
for model, revision in REVISIONS.items():
    print(snapshot_download(model, revision=revision,
          allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model']))
