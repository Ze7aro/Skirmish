"""Empaquetador de las hojas de `art/design_complete` (Fase J).

Cada hoja tiene 5 filas con un número distinto de fotogramas, sin cuadrícula uniforme:
    vistas (frontal, 3/4, lateral, trasera) x4 · idle x4 · caminar x6 · ataque x4 · muerte x4
El script localiza las filas por sus huecos horizontales, divide cada fila en fotogramas por los huecos verticales
(ajustando al número esperado), recorta, escala con un único factor por unidad y alinea los pies y el centro de masa.
Solo usa Pillow (sin numpy). Uso:  python tools/pack_sheets.py [nombre ...]     (sin nombres: todas las minis)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art' / 'design_complete' / 'units_current'
OUT = ROOT / 'art' / 'units'
EXPECT = {'views': 4, 'idle': 4, 'walk': 6, 'attack': 4, 'death': 4}
ROWS = ['views', 'idle', 'walk', 'attack', 'death']
PACK = ['idle', 'walk', 'attack', 'death']   # las vistas no se empaquetan
TARGET_H = 140          # alto de celda de referencia (px)
MAX_CW = 240            # ancho máximo de celda
THRESH = 24             # alfa mínimo para contar como "ocupado"


def mask_of(im):
    return im.getchannel('A').point(lambda v: 255 if v >= THRESH else 0)


def profile(m, axis):
    """Media (0-255) de la máscara por fila (axis='y') o por columna (axis='x')."""
    w, h = m.size
    if axis == 'y':
        p = m.resize((1, h), Image.BOX)
        return [p.getpixel((0, y)) for y in range(h)]
    p = m.resize((w, 1), Image.BOX)
    return [p.getpixel((x, 0)) for x in range(w)]


def row_bounds(m):
    """Cuatro cortes entre las 5 filas: el valle más profundo cerca de h*i/5."""
    w, h = m.size
    prof = profile(m, 'y')
    cuts, prev = [], 0
    for i in range(1, 5):
        c = h * i / 5
        lo, hi = max(prev + 10, int(c - 0.075 * h)), min(h - 10, int(c + 0.075 * h))
        best = min(range(lo, hi + 1), key=lambda y: (prof[y], abs(y - c)))
        # centro de la zona vacía que contiene al mejor punto (si la hay)
        a = b = best
        while a > lo and prof[a - 1] <= prof[best]:
            a -= 1
        while b < hi and prof[b + 1] <= prof[best]:
            b += 1
        cuts.append((a + b) // 2)
        prev = cuts[-1]
    return [0] + cuts + [h]


def segments(prof, n, gap=8, minw=3):
    """Divide un perfil de columnas en exactamente n tramos [x0, x1)."""
    runs, start = [], None
    for x, v in enumerate(prof + [0]):
        on = v >= 2
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append([start, x])
            start = None
    merged = []
    for r in runs:                                   # une los tramos separados por huecos muy pequeños
        if merged and r[0] - merged[-1][1] < gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    segs = [s for s in merged if s[1] - s[0] >= minw]
    while len(segs) > n:                             # demasiados: une el par con el hueco más pequeño
        k = min(range(len(segs) - 1), key=lambda i: segs[i + 1][0] - segs[i][1])
        segs[k] = [segs[k][0], segs[k + 1][1]]
        del segs[k + 1]
    while len(segs) < n:                             # faltan: parte el más ancho por su valle central
        k = max(range(len(segs)), key=lambda i: segs[i][1] - segs[i][0])
        a, b = segs[k]
        lo, hi = a + (b - a) * 3 // 10, a + (b - a) * 7 // 10
        cut = min(range(lo, max(lo + 1, hi)), key=lambda x: prof[x])
        segs[k:k + 1] = [[a, cut], [cut, b]]
    return segs


def trim_clean(im, keep=0.05):
    """Recorta al contenido y quita motas sueltas (componentes mucho más pequeños que el mayor)."""
    im = im.convert('RGBA')
    m = mask_of(im)
    small = m.resize((max(1, im.width // 4), max(1, im.height // 4)), Image.BOX).point(lambda v: 255 if v >= 64 else 0)
    w, h = small.size
    data = small.load()
    lab = [[0] * w for _ in range(h)]
    sizes, n = {}, 0
    for y in range(h):
        for x in range(w):
            if data[x, y] and not lab[y][x]:
                n += 1
                stack = [(x, y)]
                lab[y][x] = n
                cnt = 0
                while stack:
                    cx, cy = stack.pop()
                    cnt += 1
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and data[nx, ny] and not lab[ny][nx]:
                                lab[ny][nx] = n
                                stack.append((nx, ny))
                sizes[n] = cnt
    if not sizes:
        return im.crop((0, 0, 1, 1)), 0.5
    big = max(sizes.values())
    ok = {k for k, v in sizes.items() if v >= big * keep}
    mk = Image.new('L', (w, h), 0)
    mp = mk.load()
    for y in range(h):
        for x in range(w):
            if lab[y][x] in ok:
                mp[x, y] = 255
    mk = mk.resize(im.size, Image.NEAREST).filter(__import__('PIL.ImageFilter', fromlist=['MaxFilter']).MaxFilter(9))
    a = im.getchannel('A')
    from PIL import ImageChops
    im.putalpha(ImageChops.multiply(a, mk))
    box = im.getchannel('A').point(lambda v: 255 if v >= THRESH else 0).getbbox()
    if not box:
        return im.crop((0, 0, 1, 1)), 0.5
    im = im.crop(box)
    # centro de masa horizontal de la parte opaca (el cuerpo, sin brillos ni estelas)
    body = im.getchannel('A').point(lambda v: 255 if v >= 200 else 0)
    cols = profile(body, 'x')
    tot = sum(cols)
    cx = (sum(i * v for i, v in enumerate(cols)) / tot) / im.width if tot else 0.5
    return im, cx


def split_sheet(sheet):
    """Devuelve {fila: [(imagen, centro_x), ...]} para las 5 filas de la hoja."""
    m = mask_of(sheet)
    bounds = row_bounds(m)
    out = {}
    for i, name in enumerate(ROWS):
        y0, y1 = bounds[i], bounds[i + 1]
        band = sheet.crop((0, y0, sheet.width, y1))
        prof = profile(mask_of(band), 'x')
        frames = []
        for x0, x1 in segments(prof, EXPECT[name]):
            pad = 2
            crop = band.crop((max(0, x0 - pad), 0, min(band.width, x1 + pad), band.height))
            frames.append(trim_clean(crop))
        out[name] = frames
    return out


def pack_unit(name, src=None, debug=False):
    src = src or SRC / f'{name}.png'
    sheet = Image.open(src).convert('RGBA')
    rows = split_sheet(sheet)
    # Reparación: un fotograma de ataque sin personaje (solo un ala, un brillo…) se sustituye por el anterior.
    att = rows['attack']
    area = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 200 else 0).histogram()[255]   # superficie opaca (el cuerpo)
    med = sorted(area(f[0]) for f in att)[len(att) // 2]
    fixed = []
    for i in range(1, len(att)):
        if area(att[i][0]) < 0.55 * med:
            att[i] = att[i - 1]
            fixed.append(i + 1)
    base = [f for a in ('idle', 'walk') for f in rows[a]]
    uh = max(f[0].height for f in base)
    uw = max(f[0].width for f in base)
    s = min(TARGET_H / uh, 170 / uw)                       # un único factor para toda la unidad
    bh = max(1, round(uh * s) + 2)                         # alto del personaje: la escala en pantalla se mide con él
    ch = min(round(max(f[0].height for a in PACK for f in rows[a]) * s) + 2, round(bh * 1.4))   # celda con margen arriba para saltos y efectos
    ch = max(ch, bh)
    bw = round(uw * s) + 4
    allw = max(f[0].width for a in PACK for f in rows[a])
    cw = min(MAX_CW, max(round(uw * s) + 8, round(allw * s) + 4))
    cols = max(len(rows[a]) for a in PACK)
    out = Image.new('RGBA', (cw * cols, ch * len(PACK)), (0, 0, 0, 0))
    meta = {}
    for r, a in enumerate(PACK):
        for c, (im, cx) in enumerate(rows[a]):
            w2, h2 = max(1, round(im.width * s)), max(1, round(im.height * s))
            fr = im.resize((w2, h2), Image.LANCZOS)
            x = round(cw / 2 - cx * w2)
            y = ch - h2 - 1                              # pies alineados abajo
            cell = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            cell.alpha_composite(fr, (max(0, x), max(0, y))) if x >= 0 and y >= 0 else cell.paste(fr, (x, y), fr)
            out.paste(cell, (c * cw, r * ch), cell)
        meta[a] = {'row': r, 'n': len(rows[a])}
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
    entry = {'sheet': f'art/units/{name}.webp', 'cw': cw, 'ch': ch, 'bh': bh, 'bw': bw, 'anims': meta}
    print(f'  {name}: celda {cw}x{ch} (personaje {bw}x{bh}), factor {s:.3f}' + (f', ataque reparado en {fixed}' if fixed else ''), flush=True)
    return entry


def update_manifest(entries):
    mf = ROOT / 'art' / 'manifest.json'
    m = json.loads(mf.read_text(encoding='utf-8'))
    m['units'].update(entries)
    mf.write_text(json.dumps(m, indent=1), encoding='utf-8')
    js = ROOT / 'art' / 'manifest.js'
    js.write_text('window.KOTA_ART = ' + json.dumps(m) + ';\n', encoding='utf-8')


def build_design_units(names=None):
    print('Unidades de design_complete (5 filas)')
    names = names or sorted(p.stem for p in SRC.glob('*.png'))
    entries = {n: pack_unit(n) for n in names}
    update_manifest(entries)


if __name__ == '__main__':
    build_design_units(sys.argv[1:] or None)
