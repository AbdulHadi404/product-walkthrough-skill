#!/usr/bin/env python3
# Re-encode 2x screenshots at 1.5x (2160px wide, JPEG 86) into shots/pdf/ for a lighter PDF.
#   python3 shrink.py [shots-dir]
from PIL import Image
import glob, os
import sys
src=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.environ.get('WALKTHROUGH_WORK', '.work'), 'shots')
dst=os.path.join(src,'pdf'); os.makedirs(dst,exist_ok=True)
for f in glob.glob(src+'/*.jpg'):
    im=Image.open(f); w=2160; h=round(im.height*w/im.width)
    im.resize((w,h), Image.LANCZOS).save(os.path.join(dst,os.path.basename(f)), quality=86, optimize=True, subsampling=0)
print('shrunk', len(glob.glob(dst+'/*.jpg')))
