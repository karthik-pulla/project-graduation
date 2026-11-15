"""Scissor-cut stickers: a white border made of a few long, uneven straight cuts.
Outputs the art (transparent) plus 3 cut-variant PNGs per sticker, all same canvas size."""
import numpy as np, random, math
from PIL import Image, ImageDraw, ImageFilter
import os
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets')) + '/'

def scissor(pts, seed, variant, border, jit, n):
    """A few long straight cuts around the art (same method as stickers.js)."""
    R = random.Random(seed); V = random.Random(seed * 7 + variant * 131)
    k = n + R.randint(0, 1)
    gaps = [0.7 + R.random() * 0.6 for _ in range(k)]; tot = sum(gaps)
    ang = R.random() * 2 * math.pi; lines = []
    for g in gaps:
        t = ang + (V.random() - 0.5) * 0.06; ang += g / tot * 2 * math.pi
        nx, ny = math.cos(t), math.sin(t)
        far = float((pts[:, 0] * nx + pts[:, 1] * ny).max())
        lines.append((nx, ny, far + border + R.random() * jit + V.random() * 3))
    out = []
    for i in range(k):
        (a1, b1, d1), (a2, b2, d2) = lines[i], lines[(i + 1) % k]
        det = a1 * b2 - b1 * a2
        out.append(((d1 * b2 - d2 * b1) / det, (a1 * d2 - a2 * d1) / det))
    return out

def cuts(art, border, name, seed=5, jit=None, n=9, fill=(255,255,255)):
    jit = border * 0.5 if jit is None else jit
    a = np.array(art)[:, :, 3] > 40
    ys, xs = np.nonzero(a); pts = np.stack([xs, ys], 1)[::7].astype(float)
    polys = [scissor(pts, seed, v, border, jit, n) for v in (1, 2, 3)]
    allp = np.array([p for poly in polys for p in poly])
    x0, y0 = np.floor(allp.min(0)) - 4; x1, y1 = np.ceil(allp.max(0)) + 4
    W, H = int(x1 - x0), int(y1 - y0)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); canvas.paste(art, (int(-x0), int(-y0)), art)
    canvas.save(OUT + name + '.png', optimize=True)
    for vi, poly in enumerate(polys, 1):
        S = 2; im = Image.new('L', (W * S, H * S), 0)
        ImageDraw.Draw(im).polygon([((x - x0) * S, (y - y0) * S) for x, y in poly], fill=255)
        im = im.resize((W, H), Image.LANCZOS)
        c = Image.new('RGBA', (W, H), fill + (0,)); c.putalpha(im); c.save(OUT + f'{name}-cut{vi}.png', optimize=True)
    flat = Image.open(OUT + f'{name}-cut1.png'); flat.alpha_composite(canvas); flat.save(OUT + name + '-sticker.png', optimize=True)
    print(name, (W, H))

def tint(alpha,rgb):
    o=np.zeros(alpha.shape+(4,),'uint8'); o[:,:,:3]=rgb; o[:,:,3]=alpha; return Image.fromarray(o)

m=Image.open(OUT+'mascot.png').convert('RGBA'); m=m.resize((int(m.width*900/m.height),900),Image.LANCZOS)
cuts(m,40,'mascot-art',seed=5,n=10)
g=np.array(Image.open(OUT+'mark.png'))[:,:,3]
cap=tint(g,(128,0,0)).resize((500,int(500*g.shape[0]/g.shape[1])),Image.LANCZOS)
cuts(cap,38,'mark-art',seed=3,n=8)
