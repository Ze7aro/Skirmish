"""Empaqueta las estructuras de `art/design_complete/structures` (Fase K).

Cada PNG es una cuadrícula de 2x2 estados. Se separan, se recortan, se escalan con un único factor por imagen (para que
el estado "destruido" conserve su tamaño relativo) y se guardan en un atlas `art/structures/design_states.webp`.
Las entradas se añaden a `manifest.structures` con `k0 = 0.5` (el atlas está a doble resolución: 1 px lógico = 2 px).
Solo Pillow. Uso:  python tools/pack_structures.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pack_sheets as ps  # noqa: E402  (segmentación y recorte compartidos)

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art' / 'design_complete' / 'structures'
OUT = ROOT / 'art' / 'structures'
SS = 2                                  # resolución del atlas respecto al lienzo lógico del juego

# nombre del PNG -> (prefijo en el juego, estados en orden arriba-izq, arriba-der, abajo-izq, abajo-der, caja objetivo en px lógicos)
SPEC = {
    'base_human': ('base_human', ['', '_damaged', '_destroyed', '_captured'], (132, 126)),
    'base_ordu': ('base_ordu', ['', '_damaged', '_destroyed', '_captured'], (132, 126)),
    'base_undead': ('base_undead', ['', '_damaged', '_destroyed', '_captured'], (132, 126)),
    'tower_human': ('tower_human', ['', '_damaged', '_destroyed', '_captured'], (84, 92)),
    'tower_ordu': ('tower_ordu', ['', '_damaged', '_destroyed', '_captured'], (84, 92)),
    'tower_undead': ('tower_undead', ['', '_damaged', '_destroyed', '_captured'], (84, 92)),
    'tower_dwarf': ('tower_dwarves', ['', '_damaged', '_destroyed', '_captured'], (84, 92)),
    'gold_mine': ('gold_mine', ['', '_locked', '_working', '_depleted'], (100, 88)),
    'capture_point': ('capture', ['_neutral', '_enemy', '_player', '_contested'], (64, 78)),
    'map_chest': ('chest', ['', '_locked', '_opening', '_open'], (58, 52)),
    'neutral_camps': ('camp', ['_slime', '_bone', '_gnoll', '_outpost'], (122, 100)),
}


def valley(prof, lo, hi):
    """Posición con menos contenido en [lo, hi] (el centro de la zona vacía si es ancha)."""
    best = min(range(lo, hi + 1), key=lambda i: (prof[i], abs(i - (lo + hi) / 2)))
    a = b = best
    while a > lo and prof[a - 1] <= prof[best]:
        a -= 1
    while b < hi and prof[b + 1] <= prof[best]:
        b += 1
    return (a + b) // 2


def quadrants(im):
    """Cuatro estados de una cuadrícula 2x2 como imágenes RGBA recortadas."""
    m = ps.mask_of(im)
    w, h = im.size
    ry = valley(ps.profile(m, 'y'), int(h * 0.35), int(h * 0.65))
    out = []
    for y0, y1 in ((0, ry), (ry, h)):
        band = im.crop((0, y0, w, y1))
        cx = valley(ps.profile(ps.mask_of(band), 'x'), int(w * 0.35), int(w * 0.65))
        for x0, x1 in ((0, cx), (cx, w)):
            out.append(ps.trim_clean(band.crop((x0, 0, x1, band.height)), keep=0.03)[0])
    return out


def shelf_pack(items, width=2048, pad=4):
    x = y = rowh = 0
    pos = {}
    for name, im in items:
        if x + im.width + pad > width:
            x, y, rowh = 0, y + rowh + pad, 0
        pos[name] = (x, y)
        x += im.width + pad
        rowh = max(rowh, im.height)
    return pos, y + rowh


def build():
    print('Estructuras de design_complete')
    items = []
    for fname, (prefix, states, (bw, bh)) in SPEC.items():
        im = Image.open(SRC / f'{fname}.png').convert('RGBA')
        quads = quadrants(im)
        ref = quads[0]
        s = min(bw * SS / ref.width, bh * SS / ref.height)           # un factor por imagen
        for st, q in zip(states, quads):
            w2, h2 = max(1, round(q.width * s)), max(1, round(q.height * s))
            items.append((prefix + st, q.resize((w2, h2), Image.LANCZOS)))
        print(f'  {fname}: factor {s:.3f}, ' + ', '.join(f'{prefix}{st or ""}:{q.width}x{q.height}' for st, q in zip(states, quads)), flush=True)
    pos, total_h = shelf_pack(items)
    atlas = Image.new('RGBA', (2048, total_h), (0, 0, 0, 0))
    entries = {}
    for name, im in items:
        x, y = pos[name]
        atlas.alpha_composite(im, (x, y))
        entries[name] = {'sheet': 'art/structures/design_states.webp', 'x': x, 'y': y, 'w': im.width, 'h': im.height, 'k0': 1 / SS}
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'design_states.webp', 'WEBP', quality=90, method=6)
    mf = ROOT / 'art' / 'manifest.json'
    m = json.loads(mf.read_text(encoding='utf-8'))
    m.setdefault('structures', {}).update(entries)
    mf.write_text(json.dumps(m, indent=1), encoding='utf-8')
    (ROOT / 'art' / 'manifest.js').write_text('window.KOTA_ART = ' + json.dumps(m) + ';\n', encoding='utf-8')
    print(f'  atlas {atlas.width}x{atlas.height}, {len(entries)} estados')
    return atlas, entries


if __name__ == '__main__':
    build()
