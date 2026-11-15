import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import os
SRC=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) + '/'  # folder with the original logo files
OUT=os.path.join(SRC, 'website', 'assets') + '/'

def crop(im, pad=0):
    a=np.array(im)[:,:,3]; ys,xs=np.where(a>8)
    return im.crop((max(xs.min()-pad,0),max(ys.min()-pad,0),xs.max()+pad+1,ys.max()+pad+1))


# Mascot: remove near-white background connected to the edges
m=Image.open(SRC+'WithoutShadow.png').convert('RGBA'); arr=np.array(m)
white=Image.fromarray(((arr[:,:,:3].min(axis=2)>225)*255).astype('uint8')).copy()
for pt in [(0,0),(white.width-1,0),(0,white.height-1),(white.width-1,white.height-1)]:
    if white.getpixel(pt)==255: ImageDraw.floodfill(white,pt,128)
bg=np.array(white)==128
bg=np.array(Image.fromarray((bg*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0
bg=bg&(arr[:,:,:3].min(axis=2)>190)
arr[:,:,3]=np.where(bg,0,255).astype('uint8')
m=crop(Image.fromarray(arr)); m=m.resize((int(m.width*1100/m.height),1100),Image.LANCZOS)
m.save(OUT+'mascot.png',optimize=True)

# Geometric logo
g=crop(Image.open(SRC+'Geometric_Logo.png').convert('RGBA'))
g=g.resize((900,int(g.height*900/g.width)),Image.LANCZOS)
g.save(OUT+'mark.png',optimize=True)
ga=np.array(g)[:,:,3]
def tint(alpha,rgb):
    o=np.zeros(alpha.shape+(4,),'uint8'); o[:,:,:3]=rgb; o[:,:,3]=alpha; return Image.fromarray(o)
tint(ga,(128,0,0)).save(OUT+'mark-maroon.png',optimize=True)
tint(ga,(255,255,255)).save(OUT+'mark-white.png',optimize=True)
gold=tint(ga,(204,177,121)).resize((500,int(500*g.height/g.width)),Image.LANCZOS)

# Wordmarks
for name,f in [('wordmark','Text_No_Hillsborough.png'),('wordmark-hhs','Text_Hillsborough.png')]:
    w=crop(Image.open(SRC+f).convert('RGBA')); w=w.resize((1400,int(w.height*1400/w.width)),Image.LANCZOS)
    w.save(OUT+name+'.png',optimize=True)
    a=np.array(w).astype(int); red=(a[:,:,0]-a[:,:,2])>40
    d=a.copy(); d[:,:,:3]=np.where(red[...,None],[204,177,121],[255,255,255])
    Image.fromarray(d.astype('uint8')).save(OUT+name+'-dark.png',optimize=True)

# Pattern: split black tiles & red tile into alpha masks
p=Image.open(SRC+'GeometricPattern.png').convert('RGBA'); p=p.resize((2400,int(p.height*2400/p.width)),Image.LANCZOS)
a=np.array(p).astype(int); red=((a[:,:,0]-a[:,:,1])>60)&(a[:,:,3]>20)
blk=np.where(red,0,a[:,:,3]); rd=np.where(red,a[:,:,3],0)
tint(blk.astype('uint8'),(0,0,0)).save(OUT+'pattern.png',optimize=True)
tint(rd.astype('uint8'),(0,0,0)).save(OUT+'pattern-accent.png',optimize=True)
print('ok')
