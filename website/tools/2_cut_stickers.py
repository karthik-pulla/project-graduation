"""Hand-scissored sticker cuts: irregular straight-faceted white borders.
Outputs the art (transparent) plus 3 cut-variant PNGs per sticker, all same canvas size."""
import numpy as np, random, math
from PIL import Image, ImageDraw, ImageFilter
import os
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets')) + '/'

DIRS=[(0,-1),(-1,-1),(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1)]
def trace(mask):
    ys,xs=np.nonzero(mask); i=np.lexsort((xs,ys))[0]; s=(ys[i],xs[i])
    H,W=mask.shape; c=s; b=0; pts=[s]
    for _ in range(200000):
        found=False
        for k in range(1,9):
            d=(b+k)%8; ny,nx=c[0]+DIRS[d][0],c[1]+DIRS[d][1]
            if 0<=ny<H and 0<=nx<W and mask[ny,nx]:
                pd=(b+k-1)%8; py,px=c[0]+DIRS[pd][0],c[1]+DIRS[pd][1]
                c=(ny,nx); b=DIRS.index((py-ny,px-nx)) if (py-ny,px-nx) in DIRS else 0
                found=True; break
        if not found or c==s: break
        pts.append(c)
    return np.array([(x,y) for y,x in pts],float)

def rdp(p,eps):
    if len(p)<3: return p
    a,b=p[0],p[-1]; ab=b-a; n=np.hypot(*ab)
    d=np.abs((ab[0]*(p-a)[:,1]-ab[1]*(p-a)[:,0]))/n if n else np.hypot(*(p-a).T)
    i=int(np.argmax(d))
    if d[i]>eps: return np.vstack([rdp(p[:i+1],eps)[:-1],rdp(p[i:],eps)])
    return np.array([a,b])

def jag(poly,rng,jit,maxseg):
    # subdivide long edges at random spots, then shove vertices outward irregularly
    out=[]; n=len(poly)
    for i in range(n):
        a,b=poly[i],poly[(i+1)%n]; out.append(a)
        L=np.hypot(*(b-a)); k=int(L//maxseg)
        if k: 
            ts=sorted(rng.uniform(0.15,0.85) for _ in range(k)) if k==1 else sorted(rng.uniform(0.05,0.95) for _ in range(k))
            out+= [a+(b-a)*t for t in ts]
    out=np.array(out); n=len(out)
    area=0.5*np.sum(out[:,0]*np.roll(out[:,1],-1)-np.roll(out[:,0],-1)*out[:,1])
    sgn=1 if area>0 else -1
    res=[]
    for i in range(n):
        t=out[(i+1)%n]-out[i-1]; t/=max(np.hypot(*t),1e-6)
        nrm=np.array([t[1],-t[0]])*sgn*-1  # outward
        res.append(out[i]+nrm*rng.uniform(0,jit)+t*rng.uniform(-jit*.4,jit*.4))
    return np.array(res)

def cuts(art, border, name, seeds=(3,7,11), eps=None, jit=None, maxseg=None, fill=(255,255,255)):
    eps=eps or border*0.45; jit=jit or border*0.5; maxseg=maxseg or border*3.2
    P=int(border+jit+12); w,h=art.size
    canvas=Image.new('RGBA',(w+2*P,h+2*P),(0,0,0,0)); canvas.paste(art,(P,P),art)
    a=Image.fromarray(((np.array(canvas)[:,:,3]>40)*255).astype('uint8')).copy()
    f=a.copy(); ImageDraw.floodfill(f,(0,0),128); a=Image.fromarray(np.where(np.array(f)==128,0,255).astype('uint8'))
    blob=np.array(a.filter(ImageFilter.GaussianBlur(border/2)))>2
    rim=a.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MaxFilter(9))
    contour=trace(blob)
    j=int(np.argmax(np.hypot(*(contour-contour[0]).T)))
    simple=np.vstack([rdp(contour[:j+1],eps)[:-1],rdp(np.vstack([contour[j:],contour[:1]]),eps)[:-1]])
    canvas.save(OUT+name+'.png',optimize=True)
    for vi,sd in enumerate(seeds,1):
        rng=random.Random(sd); poly=jag(simple,rng,jit,maxseg)
        S=2; im=Image.new('L',(canvas.width*S,canvas.height*S),0)
        ImageDraw.Draw(im).polygon([tuple(p*S) for p in poly],fill=255)
        im=im.resize(canvas.size,Image.LANCZOS); im=Image.fromarray(np.maximum(np.array(im),np.array(rim)))
        c=Image.new('RGBA',canvas.size,fill+(0,)); c.putalpha(im); c.save(OUT+f'{name}-cut{vi}.png',optimize=True)
    # single flattened sticker (variant 1) for places that want one image
    flat=Image.open(OUT+f'{name}-cut1.png'); flat.alpha_composite(canvas); flat.save(OUT+name+'-sticker.png',optimize=True)
    print(name, canvas.size, len(simple))

def tint(alpha,rgb):
    o=np.zeros(alpha.shape+(4,),'uint8'); o[:,:,:3]=rgb; o[:,:,3]=alpha; return Image.fromarray(o)

m=Image.open(OUT+'mascot.png').convert('RGBA'); m=m.resize((int(m.width*900/m.height),900),Image.LANCZOS)
cuts(m,32,'mascot-art',jit=22)
g=np.array(Image.open(OUT+'mark.png'))[:,:,3]
cap=tint(g,(128,0,0)).resize((500,int(500*g.shape[0]/g.shape[1])),Image.LANCZOS)
cuts(cap,34,'mark-art',jit=24,maxseg=70)
