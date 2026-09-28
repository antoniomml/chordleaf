"""Read-only local readiness probe. Never downloads models or receives audio."""
import json
import os
from pathlib import Path
from contextlib import redirect_stdout
import sys
from offline import require_offline


def check():
    require_offline()
    result = {'available': False, 'neural': False, 'lyrics': False, 'offline': True, 'qwen': False}
    with redirect_stdout(sys.stderr):
        try:
            import av, numpy, scipy
            result['available'] = True
        except Exception:
            return {**result, 'reason': 'dependencies'}
        try:
            import torch, librosa
            from lv_chordia.chord_recognition import MODEL_NAMES
            from lv_chordia.mir.common import CACHE_DATA_PATH
            result['neural'] = all((Path(CACHE_DATA_PATH) / (n + '.sdict')).is_file() for n in MODEL_NAMES)
        except Exception:
            pass
        try:
            from faster_whisper.utils import download_model
            name = os.environ.get('CHORDLEAF_WHISPER_MODEL', 'small')
            folder = Path(name) if Path(name).is_dir() else Path(download_model(name, local_files_only=True))
            result['lyrics'] = all((folder / n).is_file() for n in ['model.bin', 'config.json', 'tokenizer.json'])
        except Exception:
            pass
        try:
            from qwen_worker import ready
            result['qwen'] = ready()
        except Exception:
            pass
    return result


if __name__ == '__main__':
    print(json.dumps(check()))
