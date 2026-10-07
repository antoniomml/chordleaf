#!/usr/bin/env python3
"""Add PyPI distribution hashes without changing any pinned dependency version."""

import concurrent.futures
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = [
    ROOT / "experiments/audio/requirements-desktop.lock.txt",
    ROOT / "experiments/audio/requirements-neural.lock.txt",
]


def pins(path):
    text = path.read_text().replace("\\\n", " ")
    text = re.sub(r"\s+--hash=sha256:[a-f0-9]{64}", "", text)
    result = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.fullmatch(r"([A-Za-z0-9_.-]+)==([A-Za-z0-9_.+!-]+)", line)
        if not match:
            raise ValueError(f"Unpinned requirement in {path.name}: {line}")
        result.append(match.groups())
    return result


def distributions(pin):
    name, version = pin
    with urllib.request.urlopen(
        f"https://pypi.org/pypi/{name}/{version}/json", timeout=30
    ) as response:
        data = json.load(response)
    hashes = sorted({file["digests"]["sha256"] for file in data["urls"]})
    if not hashes or any(not re.fullmatch(r"[a-f0-9]{64}", value) for value in hashes):
        raise ValueError(f"Missing distribution hashes for {name}=={version}")
    return pin, hashes


def main():
    manifests = {path: pins(path) for path in FILES}
    unique = sorted({pin for values in manifests.values() for pin in values})
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        hashes = dict(pool.map(distributions, unique))
    # Write only after every pinned release was successfully verified.
    for path, values in manifests.items():
        header = (
            "# Exact versions with SHA-256 hashes for their PyPI distributions.\n"
            "# Refresh hashes after reviewed updates: python3 scripts/hash-python-locks.py\n"
        )
        lines = [
            f"{name}=={version} \\\n"
            + " \\\n".join(f"    --hash=sha256:{value}" for value in hashes[(name, version)])
            for name, version in values
        ]
        path.write_text(header + "\n".join(lines) + "\n")
        print(f"{path.name}: {len(values)} pinned dependencies hashed")


if __name__ == "__main__":
    main()
