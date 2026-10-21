"""Empaqueta los 23 VFX de `art/design_complete/vfx` (Fase M) en `art/vfx2.webp`.
Cada PNG es una cuadrícula regular 4x2 de 8 fotogramas. Cada fotograma se reduce a CELL px (un único factor, centro fijo) y
se coloca en una fila de la hoja (una fila por efecto, 8 columnas). Entradas en `manifest.vfx2` = {row, n}; `vfx2Sheet`, `vfx2Cell`.
Uso:  python tools/pack_vfx.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art' / 'design_complete' / 'vfx'
CELL = 160
COLS, ROWS = 4, 2

if __name__ == '__main__':
    names = sorted(p.stem for p in SRC.glob('*.png'))
    sheet = Image.new('RGBA', (CELL * COLS * ROWS, CELL * len(names)), (0, 0, 0, 0))
    entries = {}
    for r, n in enumerate(names):
        im = Image.open(SRC / f'{n}.png').convert('RGBA')
        fw, fh = im.width / COLS, im.height / ROWS
        for k in range(COLS * ROWS):
            cx, cy = k % COLS, k // COLS
            fr = im.crop((round(cx * fw), round(cy * fh), round((cx + 1) * fw), round((cy + 1) * fh))).resize((CELL, CELL), Image.LANCZOS)
            sheet.alpha_composite(fr, (k * CELL, r * CELL))
        entries[n] = {'row': r, 'n': COLS * ROWS}
        print(' ', n, flush=True)
    sheet.save(ROOT / 'art' / 'vfx2.webp', 'WEBP', quality=88, method=6)
    mf = ROOT / 'art' / 'manifest.json'
    m = json.loads(mf.read_text(encoding='utf-8'))
    m.update({'vfx2': entries, 'vfx2Sheet': 'art/vfx2.webp', 'vfx2Cell': CELL})
    mf.write_text(json.dumps(m, indent=1), encoding='utf-8')
    (ROOT / 'art' / 'manifest.js').write_text('window.KOTA_ART = ' + json.dumps(m) + ';\n', encoding='utf-8')
    print('hoja', sheet.size)
