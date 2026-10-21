"""Pack the three reviewed structure sheets, preserving alpha and common scale."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/source_regenerated/structures'
OUT = ROOT / 'art/structures'
GROUPS = {
    'neutral_tower_states': ['tower_neutral', 'tower_neutral_capturing', 'tower_neutral_captured', 'tower_neutral_damaged'],
    'escort_cart_states': ['escort_cart', 'escort_cart_dented', 'escort_cart_smoking', 'escort_cart_broken'],
    'dwarf_base_states': ['base_dwarves', 'base_dwarves_damaged', 'base_dwarves_destroyed', 'base_dwarves_captured'],
}

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / 'art/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    entries = manifest.setdefault('structures', {})
    for source, names in GROUPS.items():
        image = Image.open(SOURCE / (source + '.png')).convert('RGBA')
        cell = 192
        sheet = Image.new('RGBA', (cell * 2, cell * 2))
        for index, name in enumerate(names):
            col, row = index % 2, index // 2
            crop = image.crop((round(col * image.width / 2), round(row * image.height / 2),
                               round((col + 1) * image.width / 2), round((row + 1) * image.height / 2)))
            # Equal source cells and equal scale keep all damage states aligned.
            crop.thumbnail((176, 176), Image.Resampling.LANCZOS)
            x, y = col * cell + (cell - crop.width) // 2, row * cell + cell - 8 - crop.height
            sheet.alpha_composite(crop, (x, y))
            entries[name] = {'sheet': 'art/structures/' + source + '.webp',
                             'x': col * cell, 'y': row * cell, 'w': cell, 'h': cell}
        sheet.save(OUT / (source + '.webp'), 'WEBP', quality=92, method=4)
    manifest_path.write_text(json.dumps(manifest, indent=1), encoding='utf-8')
    (ROOT / 'art/manifest.js').write_text('window.KOTA_ART = ' + json.dumps(manifest) + ';\n', encoding='utf-8')
    print('Packed 12 structure states')

if __name__ == '__main__':
    build()
