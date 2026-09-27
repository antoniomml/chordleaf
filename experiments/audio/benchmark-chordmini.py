"""Optional comparison with externally cloned ChordMini research checkpoints.

Does not install, download, train or publish anything. See the pilot report for
source revision, inference settings and interpretation limits.
"""
import argparse
from pathlib import Path
import runpy
import sys
import time

import torch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--audio-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    repo, audio, output = args.repo.resolve(), args.audio_dir.resolve(), args.output.resolve()
    sys.path[:0] = [str(repo), str(repo / 'src')]
    original_load = torch.load
    original_state = torch.nn.Module.load_state_dict

    def safe_load(*a, **kw):
        kw['weights_only'] = True
        return original_load(*a, **kw)

    def strict_state(self, state, *a, **kw):
        kw['strict'] = True
        return original_state(self, state, **kw)

    # These two CL checkpoints support safe tensor-only loading. Refuse the
    # upstream fallback that silently ignores incompatible checkpoint keys.
    torch.load = safe_load
    torch.nn.Module.load_state_dict = strict_state
    torch.set_num_threads(4)
    try:
        from src.utils import device
        device._device = torch.device('cpu')
        for model, checkpoint in [('BTC', 'btc_model_best.pth'), ('ChordNet', '2e1d_model_best.pth')]:
            sys.argv = ['test.py', '--model_type', model, '--checkpoint', str(repo / 'checkpoints' / checkpoint),
                        '--config', str(repo / 'config/ChordMini.yaml'), '--audio_dir', str(audio),
                        '--save_dir', str(output / model), '--use_overlap', '--use_gaussian',
                        '--kernel_size', '9', '--vote_aggregation', 'logit', '--min_segment_duration', '0',
                        '--smooth_predictions']
            if model == 'BTC':
                sys.argv.append('--smooth_logits')
            started = time.perf_counter()
            runpy.run_path(str(repo / 'src/evaluation/test.py'), run_name='__main__')
            print(model, 'wall_seconds', time.perf_counter() - started)
    finally:
        torch.load = original_load
        torch.nn.Module.load_state_dict = original_state


if __name__ == '__main__':
    main()
