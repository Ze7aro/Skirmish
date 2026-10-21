"""Empaqueta el kit de interfaz y los cosméticos de `art/design_complete` (Fase M) como WebP sueltos.
  ui/ui_kit.png          -> art/ui/kit/<nombre>.webp   (componentes por recuadros medidos; escala KIT_S)
  cosmetics/*.png        -> art/cosmetics/<tipo>_<nombre>.webp (insignias de liga, marcos de avatar, emotes, miniaturas de arena)
Registra `manifest.ui` y `manifest.cos`. Solo Pillow. Uso:  python tools/pack_ui.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pack_sheets as ps  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art' / 'design_complete'
KIT_S = 0.6
KIT_DIR = ROOT / 'art' / 'ui' / 'kit'
COS_DIR = ROOT / 'art' / 'cosmetics'

# recuadros (x0, y0, x1, y1) del ui_kit.png de 1254x1254, medidos por componentes conexos
KIT = {
    'panel': (36, 12, 596, 280), 'panel_small': (616, 20, 848, 280),
    'btn_gold_long': (856, 44, 1220, 164), 'btn_dark_long': (860, 168, 1220, 288),
    'btn_gold': (36, 300, 292, 424), 'btn_dark': (296, 304, 548, 424), 'btn_danger': (552, 308, 792, 424), 'btn_close': (800, 312, 912, 424),
    'gem': (48, 432, 184, 584), 'coin': (212, 432, 368, 584), 'star': (400, 440, 540, 576), 'star_empty': (544, 440, 692, 580), 'stars_row': (712, 452, 1216, 564),
    'card_gray': (40, 580, 236, 868), 'card_green': (244, 580, 436, 872), 'card_blue': (448, 580, 640, 872), 'card_purple': (652, 580, 844, 872),
    'bar_green': (860, 600, 1216, 668), 'bar_blue': (860, 676, 1216, 744), 'bar_purple': (860, 748, 1216, 816), 'bar_red': (860, 824, 1216, 892),
    'toggle_on': (32, 1092, 212, 1204), 'toggle_off': (224, 1092, 404, 1204),
    'check_on': (420, 1088, 532, 1204), 'check_off': (540, 1100, 644, 1204), 'box_on': (668, 1100, 760, 1196), 'box_off': (780, 1104, 868, 1196),
    'toast_bell': (896, 1084, 1216, 1212),
}
# franjas que contienen varios componentes juntos: (recuadro, nombres en orden de izquierda a derecha)
KIT_STRIPS = [((924, 312, 1216, 424), ['btn_gear', 'btn_home', 'dot_red']),
              ((40, 896, 1216, 1080), ['tab_hero', 'tab_army', 'tab_tower', 'tab_scroll', 'tab_battle', 'tab_bag'])]

BADGES = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
FRAMES = ['bosque', 'calavera', 'oro', 'dorado', 'escarcha', 'fuego', 'mitico']   # orden de lectura de avatar_frames.png
EMOTES = ['saludo', 'risa', 'enfado', 'llanto', 'gg', 'aviso', 'gracias', 'asombro']
ARENAS = ['forest', 'desert', 'ruins', 'snow', 'volcanic']


def save(im, path, scale=None, fit=None):
    if scale:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    elif fit:
        k = min(fit / im.width, fit / im.height)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=90, method=6)
    return {'w': im.width, 'h': im.height}


def grid_cells(im, cols, rows):
    fw, fh = im.width / cols, im.height / rows
    return [im.crop((round((k % cols) * fw), round((k // cols) * fh), round((k % cols + 1) * fw), round((k // cols + 1) * fh))) for k in range(cols * rows)]


def kit():
    im = Image.open(SRC / 'ui' / 'ui_kit.png').convert('RGBA')
    ui = {}
    for name, box in KIT.items():
        ui[name] = dict(file=f'art/ui/kit/{name}.webp', **save(ps.trim_clean(im.crop(box), keep=0.02)[0], KIT_DIR / f'{name}.webp', scale=KIT_S))
    for box, names in KIT_STRIPS:
        strip = im.crop(box)
        segs = ps.segments(ps.profile(ps.mask_of(strip), 'x'), len(names), gap=6)
        for (x0, x1), name in zip(segs, names):
            part = strip.crop((max(0, x0 - 2), 0, min(strip.width, x1 + 2), strip.height))
            ui[name] = dict(file=f'art/ui/kit/{name}.webp', **save(ps.trim_clean(part, keep=0.02)[0], KIT_DIR / f'{name}.webp', scale=KIT_S))
    return ui


def cosmetics():
    cos = {}
    def put(prefix, names, png, cols, rows, fit):
        for name, cell in zip(names, grid_cells(Image.open(SRC / 'cosmetics' / png).convert('RGBA'), cols, rows)):
            key = f'{prefix}_{name}'
            cos[key] = dict(file=f'art/cosmetics/{key}.webp', **save(ps.trim_clean(cell, keep=0.03)[0], COS_DIR / f'{key}.webp', fit=fit))
    put('badge', BADGES, 'league_badges.png', 3, 2, 160)
    put('frame', FRAMES, 'avatar_frames.png', 4, 2, 160)
    put('emote', EMOTES, 'hero_emotes.png', 4, 2, 144)
    put('arena', ARENAS, 'arena_thumbnails.png', 2, 3, 240)
    return cos


if __name__ == '__main__':
    ui, cos = kit(), cosmetics()
    mf = ROOT / 'art' / 'manifest.json'
    m = json.loads(mf.read_text(encoding='utf-8'))
    m['ui'], m['cos'] = ui, cos
    mf.write_text(json.dumps(m, indent=1), encoding='utf-8')
    (ROOT / 'art' / 'manifest.js').write_text('window.KOTA_ART = ' + json.dumps(m) + ';\n', encoding='utf-8')
    print(len(ui), 'componentes de kit,', len(cos), 'cosméticos')
