#!/usr/bin/env python3
"""Tile images into review sheets so a whole guide (or every screenshot) can
be inspected in a few pictures.

  python3 contact-sheet.py --shots [.work/shots]          # screenshots, 3 per row
  python3 contact-sheet.py --pages [.work/preview]        # PDF page PNGs, 5 per row, 10 per sheet
  pdftoppm -r 50 -png GUIDE.pdf .work/preview/p           # makes the page PNGs first

Sheets land next to the inputs as sheet-N.png / sheet-N.jpg. Requires Pillow.
"""
import glob, math, os, sys
from PIL import Image


def grid(files, out, cols, w, gap=8):
    ims = [Image.open(f).convert('RGB') for f in files]
    h = int(ims[0].height * w / ims[0].width)
    rows = math.ceil(len(ims) / cols)
    sheet = Image.new('RGB', (cols * w + (cols + 1) * gap, rows * h + (rows + 1) * gap), (120, 120, 120))
    for i, im in enumerate(ims):
        im = im.resize((w, int(im.height * w / im.width)))
        sheet.paste(im, (gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)))
    sheet.save(out, quality=85)
    return out


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--pages'
    if mode == '--shots':
        d = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get('WALKTHROUGH_WORK', '.work'), 'shots')
        files = sorted(glob.glob(os.path.join(d, '*.jpg')))
        per, cols, w, ext = 9, 3, 760, 'jpg'
    else:
        d = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get('WALKTHROUGH_WORK', '.work'), 'preview')
        files = sorted(f for f in glob.glob(os.path.join(d, '*.png')) if 'sheet' not in os.path.basename(f))
        per, cols, w, ext = 10, 5, 380, 'png'
    if not files:
        sys.exit(f'no images in {d}')
    for k in range(0, len(files), per):
        print(grid(files[k:k + per], os.path.join(d, f'sheet-{k // per + 1}.{ext}'), cols, w))


if __name__ == '__main__':
    main()
