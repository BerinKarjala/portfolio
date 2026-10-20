"""Verify the supplied photo library; requires Pillow only for this development check."""
import collections
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public/css-studio'
catalog = json.loads((root / 'catalog.json').read_text())
images = catalog['images']
index = json.loads((root.parents[1] / 'src/features/css-studio/backgroundIndex.json').read_text())
keys = ['id', 'season', 'kind', 'holiday', 'title', 'relativePath', 'thumbnailPath']
assert index == [{key: image[key] for key in keys} for image in images], 'Runtime index differs from supplied catalog'
assert len(images) == 248, 'Expected 248 photos'
for key in ['id', 'sourceSha1', 'downloadedSourceSha256', 'sha256', 'relativePath', 'thumbnailPath']:
    assert len({i[key] for i in images}) == 248, f'Duplicate {key}'
counts = collections.Counter((i['season'], i['kind']) for i in images)
for season in ['spring', 'summer', 'fall', 'winter']:
    assert counts[season, 'wilderness'] == 50
    assert counts[season, 'celebration'] == 12
for image in images:
    for key in ['creator', 'sourcePage', 'originalUrl', 'license', 'licenseUrl', 'changes', 'attribution']:
        assert isinstance(image[key], str) and image[key], (image['id'], key)
    assert 'rightsRestrictions' in image
    for path_key, hash_key, width, height in [('relativePath', 'sha256', 'width', 'height'), ('thumbnailPath', 'thumbnailSha256', 'thumbnailWidth', 'thumbnailHeight')]:
        path = root / image[path_key]
        assert path.resolve().is_relative_to(root.resolve()), path
        assert path.suffix == '.webp' and path.is_file(), path
        assert hashlib.sha256(path.read_bytes()).hexdigest() == image[hash_key], path
        with Image.open(path) as decoded:
            decoded.load()
            assert decoded.format == 'WEBP', path
            assert decoded.size == (image[width], image[height]), path
print('PASS: 248 unique photos + 248 thumbnails decoded; hashes, dimensions, 62/season, 50/12 split, paths and attribution metadata verified.')
print('Rights restrictions retained:', [(i['id'], i['rightsRestrictions']) for i in images if i['rightsRestrictions']])
