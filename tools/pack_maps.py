"""Empaqueta los fondos de batalla de `art/design_complete/maps` (Fase K) en `art/map/bg_<terreno>.webp` a 960x1600 (2x del lienzo 480x800).
Los carriles de cada terreno están medidos sobre estos fondos y definidos en `game.js` (LANE_SETS). Solo Pillow. Uso: python tools/pack_maps.py"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art' / 'design_complete' / 'maps'
OUT = ROOT / 'art' / 'map'
TERRAINS = ['forest', 'desert', 'ruins', 'snow', 'volcanic']


def build():
    print('Fondos de batalla')
    mf = ROOT / 'art' / 'manifest.json'
    m = json.loads(mf.read_text(encoding='utf-8'))
    for t in TERRAINS:
        im = Image.open(SRC / f'battlefield_{t}.png').convert('RGB').resize((960, 1600), Image.LANCZOS)
        im.save(OUT / f'bg_{t}.webp', 'WEBP', quality=84, method=6)
        m['bg'][t].update({'src': f'art/map/bg_{t}.webp', 'w': 960, 'h': 1600})
        print(f'  {t}: {(OUT / f"bg_{t}.webp").stat().st_size // 1024} KB', flush=True)
    mf.write_text(json.dumps(m, indent=1), encoding='utf-8')
    (ROOT / 'art' / 'manifest.js').write_text('window.KOTA_ART = ' + json.dumps(m) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    build()
