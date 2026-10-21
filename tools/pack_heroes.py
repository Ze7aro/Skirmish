"""Empaqueta los héroes de cuerpo entero de `art/design_complete/heroes_fullbody` (Fase L).
Para cada héroe: hoja de 5 filas (clave `hero_<retrato>` en manifest.units, igual que las minis) y una pose estática
`art/leaders_full/<retrato>.webp` (primer fotograma de idle) que usa la ficha del héroe. Uso:  python tools/pack_heroes.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pack_sheets as ps  # noqa: E402

SRC = ps.ROOT / 'art' / 'design_complete' / 'heroes_fullbody'
OUT = ps.ROOT / 'art' / 'leaders_full'
MAP = {'human_commander': 'kael', 'blade_mistress': 'ila', 'ordu_warchief': 'brun', 'ordu_leader2': 'goruk',
       'undead_crypt_lord': 'mora', 'undead_leader2': 'vespera'}
POSE_H = 360

if __name__ == '__main__':
    print('Héroes de cuerpo entero')
    OUT.mkdir(parents=True, exist_ok=True)
    entries, full = {}, {}
    for fname, portrait in MAP.items():
        src = SRC / f'{fname}.png'
        key = f'hero_{portrait}'
        entries[key] = ps.pack_unit(key, src=src)
        rows = ps.split_sheet(Image.open(src).convert('RGBA'))
        im = rows['idle'][0][0]
        im = im.resize((max(1, round(im.width * POSE_H / im.height)), POSE_H), Image.LANCZOS)
        im.save(OUT / f'{portrait}.webp', 'WEBP', quality=90, method=6)
        full[portrait] = f'art/leaders_full/{portrait}.webp'
    ps.update_manifest(entries)
    mf = ps.ROOT / 'art' / 'manifest.json'
    m = json.loads(mf.read_text(encoding='utf-8'))
    m['leadersFull'] = full
    mf.write_text(json.dumps(m, indent=1), encoding='utf-8')
    (ps.ROOT / 'art' / 'manifest.js').write_text('window.KOTA_ART = ' + json.dumps(m) + ';\n', encoding='utf-8')
