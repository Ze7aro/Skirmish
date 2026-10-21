"""Package design-source sheets without silently replacing the live game's art.

The original PNGs are preserved. Grid coordinates are advisory until visual
acceptance: image generation can move or merge animation poses across cells.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/design_complete'

def build():
    catalog = json.loads((ART / 'catalog.json').read_text(encoding='utf-8'))
    review_file = ART / 'review.json'
    reviews = json.loads(review_file.read_text(encoding='utf-8')) if review_file.exists() else {}
    manifest = {'version': 1, 'purpose': 'design_sources_not_live_game', 'assets': {}}
    for job in catalog['jobs']:
        source = ART / job['category'] / (job['id'] + '.png')
        if not source.exists():
            continue
        target = ART / 'packed' / job['category'] / (job['id'] + '.webp')
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as opened:
            image = opened.convert('RGBA' if job['transparent'] else 'RGB')
        # No slicing, recolouring, inferred inpainting or background removal.
        image.save(target, 'WEBP', lossless=True, method=4)
        key = job['category'] + '/' + job['id']
        item = {'source': str(source.relative_to(ROOT)).replace('\\', '/'),
                'sheet': str(target.relative_to(ROOT)).replace('\\', '/'),
                'width': image.width, 'height': image.height,
                'status': reviews.get(key, {}).get('status', 'needs_visual_review'),
                'integrated': False}
        if job.get('cols'):
            item['requested_grid'] = [job['cols'], job['rows']]
            item['grid_verified'] = False
        manifest['assets'][key] = item
    (ART / 'design_manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Packaged {len(manifest['assets'])} design sources; live manifest unchanged")

if __name__ == '__main__':
    build()
