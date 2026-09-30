"""Read-only local readiness probe. Never downloads models or receives audio."""
import json
import os
from pathlib import Path
from contextlib import redirect_stdout
import sys
from importlib.util import find_spec
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
            spec = find_spec('lv_chordia')
            cache = Path(sys.prefix) / 'share/lv-chordia/cache_data'
            if not cache.is_dir() and spec:
                cache = Path(spec.origin).parent / 'cache_data'
            names = [f'joint_chord_net_ismir_naive_v1.0_reweight(0.0,10.0)_s{i}.best.sdict' for i in range(5)]
            result['neural'] = bool(spec and find_spec('torch') and find_spec('librosa') and all((cache / name).is_file() for name in names))
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
