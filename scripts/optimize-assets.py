"""Reproducible delivery-size variants; original PNGs remain untouched."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
manifest = {}
for source in sorted((root / 'game/images').rglob('*.png')):
    relative = source.relative_to(root / 'game/images')
    delivery = root / 'game/webp' / relative.with_suffix('.webp')
    delivery.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        alpha = 'A' in image.getbands()
        base = image.convert('RGBA' if alpha else 'RGB')
        # Transparent margins add no visual information and make sprite sizing unpredictable.
        if 'characters' in relative.parts and alpha:
            bounds = base.getchannel('A').getbbox()
            if bounds:
                base = base.crop(bounds)
        desktop = base.copy()
        desktop.thumbnail((1600, 1100) if 'characters' not in relative.parts else (900, 1100), Image.Resampling.LANCZOS)
        desktop.save(delivery, 'WEBP', quality=84, method=6)
        mobile_path = delivery.with_name(delivery.stem + '.mobile.webp')
        mobile = base.copy()
        mobile.thumbnail((800, 700), Image.Resampling.LANCZOS)
        mobile.save(mobile_path, 'WEBP', quality=80, method=6)
        manifest[source.relative_to(root).as_posix()] = {
            'desktop': delivery.relative_to(root).as_posix(),
            'mobile': mobile_path.relative_to(root).as_posix(),
            'width': desktop.width, 'height': desktop.height,
            'bytes': delivery.stat().st_size, 'mobileBytes': mobile_path.stat().st_size
        }
(root / 'game/asset-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(manifest)} images; desktop {sum(x["bytes"] for x in manifest.values()) / 1e6:.2f} MB; mobile {sum(x["mobileBytes"] for x in manifest.values()) / 1e6:.2f} MB')
