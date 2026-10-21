"""Read-only technical checks plus reproducible local catalog/preview generation."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/design_complete'

def main():
    catalog = json.loads((ART / 'catalog.json').read_text(encoding='utf-8'))
    review_path = ART / 'review.json'
    reviews = json.loads(review_path.read_text(encoding='utf-8')) if review_path.exists() else {}
    records = []
    for job in catalog['jobs']:
        path = ART / job['category'] / (job['id'] + '.png')
        record = {'id': job['id'], 'category': job['category'], 'section': job['section'],
                  'path': str(path.relative_to(ROOT)).replace('\\', '/'), 'status': 'missing'}
        if path.exists():
            with Image.open(path) as source:
                source.load()
                image = source.convert('RGBA')
            alpha = image.getchannel('A')
            hist = alpha.histogram()
            clear = hist[0] / (image.width * image.height)
            record.update(size=list(image.size), transparent_fraction=round(clear, 4), status='needs_visual_review')
            if job['transparent'] and clear < 0.10:
                record['status'] = 'transparency_failed'
            if job.get('cols'):
                record['grid'] = [job['cols'], job['rows']]
            review = reviews.get(job['category'] + '/' + job['id'])
            if review:
                record.update(review)
        records.append(record)
    report = {'expected': len(records), 'present': sum(r['status'] != 'missing' for r in records),
              'records': records}
    (ART / 'audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    (ART / 'audit.js').write_text('window.DESIGN_AUDIT = '+json.dumps(report, ensure_ascii=False)+';\n', encoding='utf-8')
    preview = ART / 'review_pages'
    preview.mkdir(exist_ok=True)
    for category in sorted(set(r['category'] for r in records)):
        present = [r for r in records if r['category'] == category and r['status'] != 'missing']
        for offset in range(0, len(present), 6):
            page = Image.new('RGB', (1200, 880), '#293243')
            draw = ImageDraw.Draw(page)
            for i, item in enumerate(present[offset:offset + 6]):
                with Image.open(ROOT / item['path']) as src:
                    thumb = src.convert('RGBA')
                thumb.thumbnail((390, 390), Image.Resampling.LANCZOS)
                x, y = (i % 3) * 400, (i // 3) * 440
                page.paste(thumb, (x + (400-thumb.width)//2, y + 24), thumb)
                draw.text((x+8, y+4), item['id'], fill='white')
                draw.text((x+8, y+416), item['status'], fill='#e0b040')
            page.save(preview / f'{category}_{offset//6+1}.jpg', quality=90)
    print(json.dumps({k:v for k,v in report.items() if k != 'records'}))
    for record in records:
        if record['status'] == 'transparency_failed': print('TRANSPARENCY:', record['id'])

if __name__ == '__main__':
    main()
