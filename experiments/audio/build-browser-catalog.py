"""Record hashes/sizes of pinned public weights after conversion and download.

Run download-browser-research.py and export-browser-chords.py first. Only public
model data is inspected; private audio and experiment results are never read.
"""
import hashlib
import json
from pathlib import Path
import runpy

models = runpy.run_path(str(Path(__file__).with_name('download-browser-research.py')))['MODELS']
catalog = {}
for name, (repository, revision, files) in models.items():
    catalog[name] = []
    for filename in files:
        path = Path('artifacts/browser-audio/models') / name / filename
        catalog[name].append(dict(name=filename,
            url=f'https://huggingface.co/{repository}/resolve/{revision}/{filename}',
            bytes=path.stat().st_size, sha256=hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()))
catalog['chords'] = []
for path in sorted(Path('public/models/lv-chordia-web-v1').iterdir()):
    catalog['chords'].append(dict(name=path.name, url='/models/lv-chordia-web-v1/' + path.name,
        bytes=path.stat().st_size, sha256=hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()))
Path('src/browser-audio/catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
