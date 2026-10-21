"""Empaqueta los assets de KOTA para la web/móvil.

Uso (desde cualquier carpeta):  python tools/build_art.py
Lee ../assets y escribe en art/ : hojas de sprites por unidad, retratos de héroes,
atlas de props y VFX, fondo del mapa compuesto, logo e iconos PWA, y art/manifest.json.
Requiere Pillow. Se puede volver a ejecutar cada vez que cambien los assets.
"""
import json
import random
import re
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFile, ImageFilter

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets'
OUT = ROOT / 'Skirmish' / 'art'
MAP = ASSETS / 'KOTA_map_assets_separados'
SPR = ASSETS / 'sprites'
IDLE = ASSETS / 'KOTA_IDLE_SPRITES'
SEP = ASSETS / 'KOTA_SPRITES_SEPARADOS' / 'KOTA_SPRITES_SEPARADOS'
ORG = ASSETS / 'KOTA_SPRITES_SEPARADOS' / 'KOTA_ORGANIZADO'
VFX = ASSETS / 'KOTA_VFX' / 'KOTA_VFX'
GENERATED = OUT / 'source_generated'
REGENERATED = OUT / 'source_regenerated'

ANIMS = ['idle', 'walk', 'attack', 'hit', 'death']
manifest = {'units': {}, 'props': {}, 'vfx': {}, 'leaders': {}, 'bg': {}}


def save(im, path, q=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == '.webp':
        im.save(path, 'WEBP', quality=q, method=6)
    else:
        im.save(path, optimize=True)


def components(mask, w, h):
    """Etiqueta componentes conexos (8 vecinos) de una máscara booleana plana."""
    lab = [0] * (w * h)
    sizes = {}
    n = 0
    for s in range(w * h):
        if not mask[s] or lab[s]:
            continue
        n += 1
        q = deque([s])
        lab[s] = n
        cnt = 0
        while q:
            p = q.popleft()
            cnt += 1
            x, y = p % w, p // w
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        k = ny * w + nx
                        if mask[k] and not lab[k]:
                            lab[k] = n
                            q.append(k)
        sizes[n] = cnt
    return lab, sizes


def clean(im, thresh=60, keep=0.04, shrink=1):
    """Quita ruido semitransparente y componentes sueltos pequeños (restos de recortes)."""
    im = im.convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v >= thresh else 0)
    small = a.resize((max(1, im.width // shrink), max(1, im.height // shrink)), Image.BOX) if shrink > 1 else a
    w, h = small.size
    data = list(small.getdata())
    mask = [v > 0 for v in data]
    lab, sizes = components(mask, w, h)
    if not sizes:
        return im
    biggest = max(sizes.values())
    ok = {k for k, v in sizes.items() if v >= keep * biggest}
    keep_mask = Image.new('L', (w, h), 0)
    keep_mask.putdata([255 if lab[i] in ok else 0 for i in range(w * h)])
    if shrink > 1:
        keep_mask = keep_mask.resize(im.size, Image.NEAREST).filter(ImageFilter.MaxFilter(shrink * 2 + 1))
    alpha = Image.composite(im.getchannel('A'), Image.new('L', im.size, 0), keep_mask)
    alpha = alpha.point(lambda v: 0 if v < thresh // 2 else v)
    im.putalpha(alpha)
    return im


def numbered(folder, anim):
    out = []
    for p in folder.glob(f'{anim}_*.png'):
        m = re.fullmatch(rf'{anim}_(\d+)\.png', p.name)
        if m:
            out.append((int(m.group(1)), p))
    return [p for _, p in sorted(out)]


def pack_unit(name, frames_by_anim, maxw=160, maxh=140):
    """frames_by_anim: {anim: [Path,...]}. Devuelve la entrada del manifiesto y guarda la hoja."""
    loaded = {}
    for a, ps in frames_by_anim.items():
        ims = []
        for p in ps:
            try:
                ims.append(clean(Image.open(p), shrink=6))
            except Exception as e:  # archivo dañado: se omite el fotograma
                print(f'  AVISO: {p.name} omitido ({e})')
        if ims:
            loaded[a] = ims
    boxes = [im.getbbox() for ims in loaded.values() for im in ims if im.getbbox()]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    sc = min(maxw / (x1 - x0), maxh / (y1 - y0), 1.0)
    cw, ch = max(1, round((x1 - x0) * sc)), max(1, round((y1 - y0) * sc))
    anims = [a for a in ANIMS if a in loaded]
    cols = max(len(loaded[a]) for a in anims)
    sheet = Image.new('RGBA', (cw * cols, ch * len(anims)), (0, 0, 0, 0))
    meta = {}
    for r, a in enumerate(anims):
        for c, im in enumerate(loaded[a]):
            fr = im.crop((x0, y0, x1, y1)).resize((cw, ch), Image.LANCZOS)
            sheet.alpha_composite(fr, (c * cw, r * ch))
        meta[a] = {'row': r, 'n': len(loaded[a])}
    save(sheet, OUT / 'units' / f'{name}.webp')
    manifest['units'][name] = {'sheet': f'art/units/{name}.webp', 'cw': cw, 'ch': ch, 'anims': meta}
    print(f'  {name}: {cw}x{ch}, {meta}')


def pack_generated_unit(name, source, cellw=160, cellh=140):
    """Importa la pose superior izquierda de una hoja conceptual generada.

    La hoja completa se conserva en art/source_generated para una futura separación
    manual de fotogramas. El juego recibe mientras tanto una pose limpia y estable
    para todas las animaciones, evitando recortes inconsistentes en pantallas pequeñas.
    """
    sheet = Image.open(source).convert('RGBA')
    # La segunda fila comienza ligeramente antes del cuarto vertical en algunas
    # hojas; 23.5% mantiene completa la primera pose sin arrastrar la siguiente.
    first = sheet.crop((0, 0, sheet.width // 4, round(sheet.height * 0.235)))
    first = clean(first, thresh=24, keep=0.025, shrink=2)
    box = first.getbbox()
    if not box:
        raise ValueError(f'{source} no contiene una pose visible')
    first = first.crop(box)
    scale = min((cellw - 8) / first.width, (cellh - 6) / first.height)
    first = first.resize((max(1, round(first.width * scale)), max(1, round(first.height * scale))), Image.LANCZOS)
    frame = Image.new('RGBA', (cellw, cellh), (0, 0, 0, 0))
    frame.alpha_composite(first, ((cellw - first.width) // 2, cellh - first.height))
    save(frame, OUT / 'units' / f'{name}.webp', q=90)
    anims = {a: {'row': 0, 'n': 1} for a in ANIMS}
    manifest['units'][name] = {'sheet': f'art/units/{name}.webp', 'cw': cellw, 'ch': cellh, 'anims': anims}
    print(f'  {name}: pose generada {cellw}x{cellh}')


def build_units():
    print('Unidades')
    for d in sorted(SPR.iterdir()):
        if d.is_dir():
            pack_unit(d.name, {a: numbered(d, a) for a in ANIMS})
    # Jefes: idle desde KOTA_IDLE_SPRITES, ataque y muerte desde SEPARADOS.
    for d in sorted(IDLE.iterdir()):
        if d.is_dir() and d.name.startswith('boss_'):
            idle = numbered(d, 'idle')
            sep = SEP / d.name
            pack_unit(d.name, {'idle': idle, 'walk': idle, 'attack': numbered(sep, 'attack'), 'death': numbered(sep, 'death')},
                      maxw=200, maxh=200)
    build_generated_units()


def build_generated_units():
    print('Unidades generadas')
    for name in ('human_paladin', 'ordu_shaman', 'undead_abomination', 'undead_gargoyle'):
        source = GENERATED / f'{name}.png'
        if source.exists():
            pack_generated_unit(name, source)


def pack_regenerated_unit(name, source, cellw=160, cellh=140):
    """Empaqueta una pose representativa de cada fila de la hoja conceptual.

    Las hojas regeneradas conservan todos sus fotogramas como fuente. Para el juego
    se extrae el primer fotograma de cada una de las cinco bandas, lo que mantiene
    estados visuales distintos sin asumir una cantidad de columnas uniforme.
    """
    sheet = Image.open(source).convert('RGBA')
    frames = []
    for row in range(len(ANIMS)):
        y0 = round(sheet.height * row / len(ANIMS))
        y1 = round(sheet.height * (row + 1) / len(ANIMS))
        band = sheet.crop((0, y0, sheet.width, y1))
        alpha = band.getchannel('A')
        occupied = [sum(1 for y in range(alpha.height) if alpha.getpixel((x, y)) >= 24) for x in range(alpha.width)]
        gaps = []
        start = None
        for x, count in enumerate(occupied + [1]):
            if count <= 1 and start is None:
                start = x
            elif count > 1 and start is not None:
                if x - start >= 4 and sheet.width * 0.10 <= start <= sheet.width * 0.30:
                    gaps.append((start, x))
                start = None
        boundary = min(gaps, key=lambda g: abs(((g[0] + g[1]) / 2) - sheet.width * 0.20))[0] if gaps else round(sheet.width * 0.20)
        boundary = min(boundary, round(sheet.width * 0.20))
        crop = band.crop((0, 0, max(1, boundary), band.height))
        keep = 0.30 if name == 'undead_dragon' else 0.12
        crop = clean(crop, thresh=80, keep=keep, shrink=4)
        box = crop.getbbox()
        if not box:
            frames.append(Image.new('RGBA', (cellw, cellh), (0, 0, 0, 0)))
            continue
        crop = crop.crop(box)
        scale = min((cellw - 8) / crop.width, (cellh - 6) / crop.height)
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
        frame = Image.new('RGBA', (cellw, cellh), (0, 0, 0, 0))
        frame.alpha_composite(crop, ((cellw - crop.width) // 2, cellh - crop.height))
        frames.append(frame)
    packed = Image.new('RGBA', (cellw, cellh * len(ANIMS)), (0, 0, 0, 0))
    meta = {}
    for row, (anim, frame) in enumerate(zip(ANIMS, frames)):
        packed.alpha_composite(frame, (0, row * cellh))
        meta[anim] = {'row': row, 'n': 1}
    save(packed, OUT / 'units' / f'{name}.webp', q=90)
    manifest['units'][name] = {'sheet': f'art/units/{name}.webp', 'cw': cellw, 'ch': cellh, 'anims': meta}
    print(f'  {name}: cinco estados regenerados {cellw}x{cellh}')


def build_regenerated_units():
    print('Unidades regeneradas')
    folder = REGENERATED / 'units'
    for source in sorted(folder.glob('*.png')):
        pack_regenerated_unit(source.stem, source)


def fit_square(im, size):
    im = im.crop(im.getbbox())
    sc = min(size / im.width, size / im.height)
    im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, size - im.height))
    return out


def build_leaders():
    print('Héroes')
    src = {
        'kael': IDLE / 'human_commander' / 'idle_00.png',
        'brun': IDLE / 'ordu_warchief' / 'idle_00.png',
        'mora': IDLE / 'undead_crypt_lord' / 'idle_00.png',
        'ila': SEP / 'unknown_blade_mistress' / 'attack_00.png',  # no tiene idle; el fotograma de ataque sirve de retrato
        'vael': SPR / 'human_medic' / 'idle_00.png',
        'tor': SPR / 'human_mage' / 'idle_00.png',
        'rexa': SPR / 'human_archer' / 'idle_00.png',
        'dun': SPR / 'human_warrior' / 'idle_00.png',
    }
    for lid, p in src.items():
        save(fit_square(clean(Image.open(p), shrink=4), 160), OUT / 'leaders' / f'{lid}.webp')
        manifest['leaders'][lid] = f'art/leaders/{lid}.webp'
    for lid in ('goruk', 'vespera'):
        p = GENERATED / f'{lid}.png'
        if p.exists():
            save(fit_square(clean(Image.open(p), thresh=24, keep=0.015, shrink=4), 160), OUT / 'leaders' / f'{lid}.webp', q=90)
            manifest['leaders'][lid] = f'art/leaders/{lid}.webp'
    print('  ', ', '.join(src))


def build_regenerated_leaders():
    print('Héroes regenerados')
    src = {
        'kael': 'human_commander',
        'ila': 'blade_mistress',
        'brun': 'ordu_warchief',
        'goruk': 'ordu_leader2',
        'mora': 'undead_crypt_lord',
        'vespera': 'undead_leader2',
    }
    for lid, name in src.items():
        p = REGENERATED / 'leaders' / f'{name}.png'
        if not p.exists():
            continue
        portrait = fit_square(clean(Image.open(p), thresh=24, keep=0.012, shrink=4), 160)
        save(portrait, OUT / 'leaders' / f'{lid}.webp', q=90)
        manifest['leaders'][lid] = f'art/leaders/{lid}.webp'
    print('  ', ', '.join(src))


def shelf_pack(items, width=1024, pad=2):
    x = y = rowh = 0
    pos = {}
    for name, im in items:
        if x + im.width + pad > width:
            x, y, rowh = 0, y + rowh + pad, 0
        pos[name] = (x, y)
        x += im.width + pad
        rowh = max(rowh, im.height)
    sheet = Image.new('RGBA', (width, y + rowh + pad), (0, 0, 0, 0))
    for name, im in items:
        sheet.alpha_composite(im, pos[name])
    return sheet, pos


def trimmed(path):
    im = clean(Image.open(path), thresh=100, keep=0.05)
    return im.crop(im.getbbox())


def build_props():
    print('Props')
    want = {
        '06_torres': ['tower_human', 'tower_human_damaged', 'tower_ordu', 'tower_ordu_damaged', 'tower_undead', 'tower_undead_damaged', 'tower_neutral'],
        '07_bases': ['base_human', 'base_ordu', 'base_undead'],
        '09_objetivos': ['gold_mine', 'capture_stone', 'chest'],
        '10_banderas': ['banner_blue', 'banner_red', 'banner_neutral'],
        '13_zonas_marcadores': ['zone_blue', 'zone_red', 'zone_yellow'],
    }
    items = []
    for folder, names in want.items():
        for n in names:
            p = MAP / folder / f'{n}.png'
            if p.exists():
                items.append((n, trimmed(p)))
    sheet, pos = shelf_pack(items)
    save(sheet, OUT / 'props.webp', q=88)
    for n, im in items:
        manifest['props'][n] = {'x': pos[n][0], 'y': pos[n][1], 'w': im.width, 'h': im.height}
    manifest['propsSheet'] = 'art/props.webp'
    print(f'  {len(items)} piezas, hoja {sheet.size}')


def build_vfx(cell=96):
    print('VFX')
    pick = {
        'heal': 'status/heal', 'slow': 'status/slow', 'stun': 'status/stun', 'poison': 'status/poison',
        'impact_magic': 'combat/impact_magic', 'impact_physical': 'combat/impact_physical',
        'impact_ally': 'combat/impact_projectile/ally', 'impact_enemy': 'combat/impact_projectile/enemy',
        'base_hit': 'structures/base_hit', 'tower_damaged': 'structures/tower_damaged',
        'tower_capture': 'structures/tower_capture', 'gold_mine': 'objectives/gold_mine', 'stealth': 'status/stealth',
        'chest_open': 'objectives/chest_open', 'overtime': 'environment/overtime',
    }
    for d in sorted((VFX / 'boss_abilities').iterdir()):
        if d.is_dir():
            pick['boss_' + d.name] = f'boss_abilities/{d.name}'
    rows = []
    for name, rel in pick.items():
        fs = sorted((VFX / rel).glob('frame_*.png'))
        if fs:
            rows.append((name, [Image.open(f).convert('RGBA').resize((cell, cell), Image.LANCZOS) for f in fs]))
    cols = max(len(r[1]) for r in rows)
    sheet = Image.new('RGBA', (cell * cols, cell * len(rows)), (0, 0, 0, 0))
    for r, (name, frs) in enumerate(rows):
        for c, fr in enumerate(frs):
            sheet.alpha_composite(fr, (c * cell, r * cell))
        manifest['vfx'][name] = {'row': r, 'n': len(frs)}
    save(sheet, OUT / 'vfx.webp', q=85)
    manifest['vfxSheet'] = 'art/vfx.webp'
    manifest['vfxCell'] = cell
    print(f'  {len(rows)} efectos, hoja {sheet.size}')


# ---------- Fondo del mapa ----------
LANE_X = (120, 360)
ROW_Y = (72, 728)


def edge_roads(im):
    """Qué bordes (n,e,s,w) de una pieza de camino tienen arena en su punto medio."""
    w, h = im.size
    sand = lambda px: px[3] > 200 and px[0] > 170 and px[0] > px[2] + 40 and px[1] > 120
    def frac(box):
        pts = [im.getpixel((x, y)) for x in range(box[0], box[2]) for y in range(box[1], box[3])]
        return sum(sand(p) for p in pts) / max(1, len(pts))
    mx, my = int(w * 0.35), int(h * 0.35)
    strips = {'n': (mx, 0, w - mx, 8), 'e': (w - 8, my, w, h - my), 's': (mx, h - 8, w - mx, h), 'w': (0, my, 8, h - my)}
    return ''.join(k for k, b in strips.items() if frac(b) > 0.5)


TERRAINS = {  # zona -> (pieza de terreno, decorado de 11_naturaleza, color de viñeta)
    'forest': ('terrain_grass', ['pine', 'tree_green', 'tree_green', 'tree_orange', 'pine', 'bush', 'bush_fruit', 'rock_large', 'rock_medium', 'rock_small', 'flowers', 'grass', 'stump', 'log'], (10, 30, 20)),
    'desert': ('terrain_desert', ['cactus', 'cactus_tall', 'cactus', 'rock_large', 'rock_medium', 'rock_small', 'bones', 'dead_tree', 'stump', 'grass'], (50, 30, 10)),
    'ruins': ('terrain_ruins', ['rock_large', 'rock_medium', 'rock_small', 'rock_medium', 'bones', 'dead_tree', 'stump', 'log', 'bush', 'grass'], (25, 25, 35)),
    'snow': ('terrain_snow', ['tree_snow', 'tree_snow', 'pine', 'rock_large', 'rock_medium', 'rock_small', 'stump', 'bones', 'dead_tree'], (20, 30, 50)),
    'volcanic': ('terrain_volcanic', ['rock_large', 'rock_medium', 'rock_small', 'dead_tree', 'bones', 'rock_medium', 'campfire', 'stump'], (50, 15, 10)),
}


def build_background(terrain='forest', S=2, W=480, H=800):
    print(f'Fondo ({terrain})')
    tile_name, deco_names, vig_col = TERRAINS[terrain]
    rnd = random.Random(7 + sorted(TERRAINS).index(terrain))
    grass = clean(Image.open(MAP / '02_terrenos' / f'{tile_name}.png'), thresh=100, keep=0.2)
    cx0, cy0, cx1, cy1 = (int(grass.width * 0.3), int(grass.height * 0.3), int(grass.width * 0.7), int(grass.height * 0.7))
    px = [grass.getpixel((x, y)) for x in range(cx0, cx1) for y in range(cy0, cy1)]
    px = [p for p in px if p[3] > 200]
    base = tuple(sum(c[i] for c in px) // len(px) for i in range(3))
    bg = Image.new('RGBA', (W * S, H * S), base + (255,))
    d = ImageDraw.Draw(bg)
    for _ in range(2600):  # manchas de hierba
        x, y = rnd.randrange(W * S), rnd.randrange(H * S)
        r = rnd.randrange(8, 26)
        k = rnd.choice((-14, -8, 8, 14))
        col = tuple(max(0, min(255, c + k)) for c in base) + (60,)
        d.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=col)
    for _ in range(900):  # briznas
        x, y = rnd.randrange(W * S), rnd.randrange(H * S)
        col = tuple(min(255, c + 30) for c in base) + (150,)
        d.line((x, y, x + rnd.randint(-3, 3), y - rnd.randint(4, 9)), fill=col, width=2)

    road = {}
    for p in (MAP / '01_caminos').glob('road_*.png'):
        im = trimmed(p)
        road[p.stem] = im
    # Escala: el camino ocupa ~55% del ancho de la pieza; queremos ~68 px lógicos de calzada.
    tw = 124 * S
    def scaled(im, w=None, h=None):
        w = w or tw
        h = h or round(im.height * w / im.width)
        return im.resize((round(w), round(h)), Image.LANCZOS)

    # Las piezas de curva del kit no encajan entre sí (tamaños y lados distintos), así que
    # los caminos se componen solo con tramos rectos y las esquinas quedan como cruces en L.
    vtile, htile = road['road_straight_v'], road['road_straight_h']
    f = tw / vtile.width  # misma escala para tramos verticales y horizontales
    chei = round(htile.height * f)
    y0, y1 = ROW_Y[0] * S - chei // 2, ROW_Y[1] * S + chei // 2
    n = max(1, round((y1 - y0) / (vtile.height * f)))
    segh = (y1 - y0) / n
    for lx in LANE_X:
        for i in range(n):
            t = scaled(vtile, w=tw, h=round(segh) + 8)  # solape para tapar las juntas
            bg.alpha_composite(t, (round(lx * S - t.width / 2), round(y0 + i * segh) - 4))
    x0, x1 = LANE_X[0] * S - tw // 2, LANE_X[1] * S + tw // 2
    for ry in ROW_Y:
        t = scaled(htile, w=round(x1 - x0), h=chei)
        bg.alpha_composite(t, (round(x0), round(ry * S - t.height / 2)))
    curves = 'solo tramos rectos'

    # Estanque central y decoración (fuera de las calzadas y de las bases).
    pond = trimmed(MAP / '04_agua' / 'water_pool.png')
    pond = pond.resize((pond.width * S * 2 // 2, pond.height * S * 2 // 2), Image.LANCZOS)
    bg.alpha_composite(pond, (W * S // 2 - pond.width // 2, 400 * S - pond.height // 2))

    deco = {n: trimmed(MAP / '11_naturaleza' / f'{n}.png') for n in set(deco_names)}
    def free(x, y):
        if any(abs(x - lx) < 70 for lx in LANE_X) and 30 < y < 770:
            return False
        if abs(x - 240) < 150 and (y < 130 or y > 670):
            return False
        if abs(x - 240) < 70 and abs(y - 400) < 55:
            return False
        if (x < 95 or x > 385) and 270 < y < 620:  # hueco para minas libres y de campamento
            return False
        return True
    placed = []
    tries = 0
    while len(placed) < 70 and tries < 4000:
        tries += 1
        x, y = rnd.uniform(10, W - 10), rnd.uniform(25, H - 5)
        if free(x, y) and all((x - a) ** 2 + (y - b) ** 2 > 38 ** 2 for a, b in placed):
            placed.append((x, y))
    for x, y in sorted(placed, key=lambda p: p[1]):
        im = deco[rnd.choice(deco_names)]
        k = (0.8 + 0.3 * y / H) * S * (0.85 if im.width < 50 else 1.0)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((im.width * 0.15, im.height * 0.78, im.width * 0.85, im.height * 1.0), fill=(0, 0, 0, 60))
        bg.alpha_composite(sh, (round(x * S - im.width / 2), round(y * S - im.height)))
        bg.alpha_composite(im, (round(x * S - im.width / 2), round(y * S - im.height)))

    # Viñeta suave en los bordes para dar profundidad.
    vig = Image.new('L', bg.size, 0)
    ImageDraw.Draw(vig).rectangle((0, 0, bg.width, bg.height), fill=0)
    m = Image.new('L', bg.size, 255)
    ImageDraw.Draw(m).rectangle((60, 60, bg.width - 60, bg.height - 60), fill=0)
    m = m.filter(ImageFilter.GaussianBlur(70)).point(lambda v: v * 90 // 255)
    dark = Image.new('RGBA', bg.size, vig_col + (255,))
    bg = Image.composite(dark, bg, m)
    save(bg.convert('RGB'), OUT / 'map' / f'bg_{terrain}.webp', q=80)
    manifest['bg'][terrain] = {'src': f'art/map/bg_{terrain}.webp', 'w': W, 'h': H, 'lanes': list(LANE_X), 'rows': list(ROW_Y)}
    print(f'  fondo {bg.size}, {curves}, {len(placed)} decorados')


def build_backgrounds():
    for t in TERRAINS:
        build_background(t)


def build_ui():
    print('UI')
    logo = Image.open(ASSETS / 'Visuales' / 'kota_logo.png').convert('RGBA')
    save(logo.resize((512, 512), Image.LANCZOS), OUT / 'ui' / 'logo.webp')
    manifest['logo'] = 'art/ui/logo.webp'
    for size in (192, 512):
        icon = Image.new('RGBA', (size, size), (20, 24, 31, 255))
        lg = logo.resize((int(size * 0.84), int(size * 0.84)), Image.LANCZOS)
        icon.alpha_composite(lg, ((size - lg.width) // 2, (size - lg.height) // 2))
        save(icon.convert('RGB'), ROOT / 'Skirmish' / 'icons' / f'icon-{size}.png')
    wm = ASSETS / 'Visuales' / 'world_map_bg.png'
    if wm.exists():
        save(Image.open(wm).convert('RGB').resize((768, 768), Image.LANCZOS), OUT / 'ui' / 'world_map.webp', q=70)
        manifest['worldMap'] = 'art/ui/world_map.webp'


def build_js():
    """Versiones .js de los datos para que el juego cargue también abriendo index.html directamente (sin servidor)."""
    print('Datos .js')
    art = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
    (OUT / 'manifest.js').write_text('window.KOTA_ART = ' + json.dumps(art) + ';\n', encoding='utf-8')
    roster = json.loads((ROOT / 'Skirmish' / 'data' / 'kota_roster.json').read_text(encoding='utf-8'))
    (ROOT / 'Skirmish' / 'data' / 'kota_roster.js').write_text('window.KOTA_ROSTER = ' + json.dumps(roster, ensure_ascii=False) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    steps = sys.argv[1:] or ['units', 'leaders', 'props', 'vfx', 'bg', 'ui', 'js']
    mf = OUT / 'manifest.json'

    def write_manifest():
        old = json.loads(mf.read_text(encoding='utf-8')) if mf.exists() else {}
        for k, v in manifest.items():
            if isinstance(v, dict) and isinstance(old.get(k), dict):
                old[k].update(v)
            elif v:
                old[k] = v
        mf.write_text(json.dumps(old, indent=1), encoding='utf-8')

    for s in steps:
        {'units': build_units, 'generated': build_generated_units, 'regenerated': build_regenerated_units,
         'leaders': build_leaders, 'leaders_regenerated': build_regenerated_leaders,
         'props': build_props, 'vfx': build_vfx, 'bg': build_backgrounds, 'ui': build_ui,
         'js': build_js, 'design': __import__('build_design_art').build}[s]()
        write_manifest()  # se guarda tras cada paso para poder repetir solo uno
    print('manifest.json listo')
