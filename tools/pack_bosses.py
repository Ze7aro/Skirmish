"""Empaqueta los jefes de `art/design_complete/bosses_expansion` (Fase L) con el mismo formato de 5 filas que las minis.
Uso:  python tools/pack_bosses.py [nombre ...]     (sin nombres: los 5 jefes)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pack_sheets as ps  # noqa: E402

SRC = ps.ROOT / 'art' / 'design_complete' / 'bosses_expansion'

if __name__ == '__main__':
    print('Jefes de expansión (5 filas)')
    names = sys.argv[1:] or sorted(p.stem for p in SRC.glob('*.png'))
    entries = {n: ps.pack_unit(n, src=SRC / f'{n}.png') for n in names}
    ps.update_manifest(entries)
