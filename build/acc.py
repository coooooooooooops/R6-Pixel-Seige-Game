import re,base64,io,sys
from PIL import Image
W,H=14,18
IDS=None
src=open('/home/claude/r6-pixel-siege-extension/atlas.js').read()
IDS=eval(re.search(r"ATLAS_IDS=(\[.*?\]);",src).group(1))
base=Image.open('/home/claude/atlas.png').convert('RGBA')
LENS=dict(blue='#4aa0e8',amber='#e0a030',dark='#222a36',clear='#a8cde0',red='#c43a2a',yellow='#d8b838',purple='#8a60c8',green='#58c068',smoke='#2b3038')
STEEL='#3e444c';LIGHT='#6a717c';DK='#14171b'
def hx(c):
    c=c.lstrip('#')
    if len(c)==3: c=''.join(ch*2 for ch in c)
    return tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
def shade(p,f):
    return tuple(max(0,min(255,int(v*f))) for v in p[:3])+(255,)
def lighten(p,d): return tuple(max(0,min(255,v+d)) for v in p[:3])+(255,)
class F:
    def __init__(s,im,o,d):
        s.im=im;s.o=o;s.d=d  # d: 0 front 1 side 2 back
    def put(s,fr,x,y,c):
        if 0<=x<W and 0<=y<H:
            s.im.putpixel((s.o*W+x,fr*H+y),c if isinstance(c,tuple) else hx(c))
    def get(s,fr,x,y): return s.im.getpixel((s.o*W+x,fr*H+y))
    def set(s,x,y,c):
        for k in range(3): s.put(s.d*3+k,x,y,c)
    def rect(s,x0,y0,x1,y1,c):
        for y in range(y0,y1+1):
            for x in range(x0,x1+1): s.set(x,y,c)
    def px(s,x,y): return s.get(s.d*3,x,y)
    def lite(s,x,y,d):
        p=s.px(x,y)
        if p[3]: s.set(x,y,lighten(p,d))
    def dim(s,x,y,f):
        p=s.px(x,y)
        if p[3]: s.set(x,y,shade(p,f))
# ---- accessories: each takes (F, opts dict) ----
def a_headset(f,o):
    c=hx(o.get('c',STEEL)); hi=hx(LIGHT); out=hx(DK)
    if f.d==1:
        f.rect(5,3,7,5,c); f.set(6,4,hi); f.set(5,3,hi)
        for x in range(4,9): f.set(x,1,c)
        f.set(8,2,c); f.set(9,2,c)
        f.set(9,6,c); f.set(10,6,c) if o.get('mic') else None
    else:
        for y in (3,4,5):
            f.set(2,y,c);f.set(3,y,c);f.set(10,y,c);f.set(11,y,c)
            f.set(1,y,out);f.set(12,y,out)
        f.set(2,2,out);f.set(2,6,out);f.set(11,2,out);f.set(11,6,out)
        f.set(2,3,hi);f.set(11,3,hi)
        f.set(4,1,c);f.set(9,1,c)
        if o.get('mic') and f.d==0: f.set(9,6,c);f.set(8,7,c)
def a_goggles(f,o):
    L=hx(LENS.get(o.get('l','dark'),o.get('l'))); st=hx(DK)
    if f.d==0:
        for x in range(3,11): f.set(x,4,st)
        for x in (5,6,7,8): f.set(x,4,L)
        f.set(6,4,lighten(L,50)) ; f.set(7,4,L)
        if o.get('big'):
            for x in (5,6,7,8): f.set(x,3,L)
            f.set(5,3,lighten(L,40))
    elif f.d==1:
        for x in range(4,9): f.set(x,4,st)
        for x in (9,10): f.set(x,4,L)
        f.set(9,3,L) if o.get('big') else None
        f.set(10,4,lighten(L,40))
    else:
        for x in range(3,11): f.set(x,4,st)
def a_glasses(f,o):
    L=hx(LENS.get(o.get('l','clear'),o.get('l'))); fr=hx(o.get('fr','#222222'))
    if f.d==0:
        for x in (5,6,7,8): f.set(x,4,fr)
        f.set(5,4,L);f.set(8,4,L)
    elif f.d==1:
        for x in range(6,9): f.set(x,4,fr)
        f.set(9,4,L);f.set(10,4,fr)
def a_visor(f,o):
    L=hx(LENS.get(o.get('l','dark'),o.get('l')))
    if f.d==0:
        f.rect(4,3,9,5,L); f.set(4,3,lighten(L,60)); f.set(5,3,lighten(L,35)); f.set(9,5,shade(L,.7))
        f.rect(3,3,3,5,hx(STEEL)); f.rect(10,3,10,5,hx(STEEL))
    elif f.d==1:
        f.rect(8,2,11,5,L); f.set(8,2,lighten(L,50)); f.set(9,2,lighten(L,30)); f.set(11,2,hx(STEEL)); f.set(11,5,hx(STEEL))
def a_rim(f,o):
    for x in range(4,10): f.lite(x,1,22)
    if f.d!=1:
        for y in (2,3,4): f.lite(3,y,14);f.lite(10,y,14)
def a_filter(f,o):
    g=hx('#59606a');h=hx('#8a929c');d=hx('#2a2e34')
    if f.d==0:
        f.rect(6,5,7,6,g);f.set(6,5,h);f.set(7,6,d);f.set(5,5,d);f.set(8,5,d)
    elif f.d==1:
        f.rect(10,4,12,5,g);f.set(10,4,h);f.set(12,5,d);f.set(11,6,d)
def a_cap(f,o):
    c=hx(o.get('c','#2a2c30'));
    if f.d==0:
        for x in range(3,11): f.set(x,2,c)
        for x in range(5,9): f.dim(x,3,.7)
        f.set(2,2,hx(DK));f.set(11,2,hx(DK))
    elif f.d==1:
        for x in range(3,10): f.set(x,2,c)
        for x in (10,11,12): f.set(x,2,c)
        f.set(13,2,hx(DK)); f.dim(10,3,.7)
    else:
        for x in range(3,11): f.set(x,2,shade(c,.8))
def a_beret(f,o):
    c=hx(o.get('c','#2f3a2a'));d=shade(c,.7);l=lighten(c,24)
    if f.d==1:
        for x in range(3,12):
            f.set(x,1,c);f.set(x,2,d)
        f.set(2,1,c);f.set(2,2,hx(DK));f.set(5,1,l);f.set(6,1,l)
        f.set(3,3,d)
    else:
        for x in range(3,11):
            f.set(x,1,c);f.set(x,2,d)
        f.set(2,1,c);f.set(2,2,d);f.set(11,1,hx(DK));f.set(5,1,l);f.set(6,1,l);f.set(7,1,l)
def a_boonie(f,o):
    c=hx(o.get('c','#566038'));d=shade(c,.72);l=lighten(c,22)
    if f.d==1:
        for x in range(4,10): f.set(x,1,c)
        for x in range(2,13): f.set(x,2,d)
        f.set(6,1,l);f.set(7,1,l);f.dim(10,3,.75)
    else:
        for x in range(4,10): f.set(x,1,c)
        for x in range(2,12): f.set(x,2,d)
        f.set(5,1,l);f.set(6,1,l);f.dim(5,3,.8);f.dim(8,3,.8) if f.d==0 else None
def a_band(f,o):
    c=hx(o.get('c','#b3222a'))
    xs=range(4,10) if f.d!=1 else range(4,11)
    for x in xs: f.set(x,2,c)
    if f.d==2 or f.d==1: f.set(3 if f.d==2 else 3,3,c) if False else None
def a_beard(f,o):
    c=hx(o.get('c','#2a1d14'));
    if f.d==0:
        for x in (4,5,6,7,8,9): f.set(x,6,c)
        f.set(4,5,c);f.set(9,5,c);f.set(5,5,c);f.set(8,5,c)
        if o.get('goatee')!=True: f.set(6,7,c);f.set(7,7,c)
        f.set(6,5,shade(f.px(6,5),.8)); 
    elif f.d==1:
        for x in (8,9,10): f.set(x,6,c)
        f.set(9,5,c);f.set(10,5,c);f.set(9,7,c);f.set(8,5,c);f.set(7,6,c)
def a_stache(f,o):
    c=hx(o.get('c','#2a1d14'))
    if f.d==0:
        for x in (5,6,7,8): f.set(x,5,c)
    elif f.d==1:
        f.set(9,5,c);f.set(10,5,c)
def a_ear(f,o):
    c=hx(STEEL);
    if f.d==0 or f.d==2: f.set(10,4,c);f.set(10,5,hx(LIGHT)) ; (f.set(9,6,c) if f.d==0 and o.get('mic') else None)
    else: f.set(6,4,c);f.set(6,5,hx(LIGHT))
def a_scarf(f,o):
    c=hx(o.get('c','#8a7a58'));d=shade(c,.7);l=lighten(c,22)
    xs=range(3,11) if f.d!=1 else range(4,11)
    for x in xs: f.set(x,7,c); f.set(x,8,d)
    f.set(5,7,l);f.set(6,7,l)
    if f.d==0: f.set(6,8,c);f.set(7,8,c)
def a_pads(f,o):
    c=hx(o.get('c',LIGHT));d=hx(STEEL)
    if f.d==1:
        for x in (5,6,7): f.set(x,8,c)
        f.set(5,9,d);f.set(6,9,d);f.set(7,9,d)
    else:
        for x in (1,2,11,12): f.set(x,8,c)
        for x in (1,12): f.set(x,9,d)
def a_pack(f,o):
    c=hx(o.get('c','#3b4048'));d=shade(c,.7);l=lighten(c,24);st=hx(DK)
    if f.d==2:
        f.rect(4,8,9,12,c)
        for x in range(4,10): f.set(x,8,l)
        f.rect(4,12,9,12,d); f.set(6,9,d);f.set(7,9,d);f.set(6,10,l);f.set(7,10,l)
        f.set(3,9,st);f.set(10,9,st)
    elif f.d==1:
        f.rect(1,8,3,12,c); f.rect(1,8,3,8,l); f.rect(1,12,3,12,d)
        f.set(0,9,st);f.set(0,10,st)
    else:
        f.set(5,8,d);f.set(5,9,d);f.set(5,10,d);f.set(8,8,d);f.set(8,9,d);f.set(8,10,d)
        f.set(5,11,hx(DK));f.set(8,11,hx(DK))
def a_vest(f,o):
    c=lighten(hx(o.get('c','#2f3338')),6);l=lighten(c,14)
    if f.d==0:
        f.rect(4,10,5,11,c);f.rect(8,10,9,11,c);f.set(4,10,l);f.set(5,10,l);f.set(8,10,l);f.set(9,10,l)
    elif f.d==1:
        f.rect(6,10,8,11,c);f.set(6,10,l);f.set(7,10,l)
def a_lamp(f,o):
    if f.d==0 or f.d==2: f.set(6,0,hx('#f3e9b0'));f.set(7,0,hx('#f3e9b0')) if f.d==0 else None
    else: f.set(9,0,hx('#f3e9b0'));f.set(10,0,hx('#ffffff'))
def a_cam(f,o):
    c=hx('#4a5058');l=hx('#8a929c');r=hx('#e03a2a')
    if f.d==0: f.rect(11,6,12,7,c);f.set(12,7,r);f.set(11,6,l)
    elif f.d==2: f.rect(1,6,2,7,c);f.set(1,7,r);f.set(2,6,l)
    else: f.rect(6,6,7,7,c);f.set(7,7,r);f.set(6,6,l)
def a_ghillie(f,o):
    cs=[hx('#4d5a2e'),hx('#6a6a3a'),hx('#3a4524'),hx('#7a6a40')]
    pts=[(3,0),(10,0),(2,2),(11,2),(3,5),(10,4),(1,8),(12,8),(2,9),(11,9),(5,0),(8,0),(2,7),(11,7)]
    if f.d==1: pts=[(4,0),(9,0),(3,2),(11,3),(3,5),(5,7),(8,7),(3,8),(10,9)]
    for i,(x,y) in enumerate(pts):
        f.set(x,y,cs[i%4])
def a_tail(f,o):
    c=hx(o.get('c','#1a1a1a'));d=shade(c,.75)
    if f.d==2:
        f.rect(6,7,7,10,c);f.set(6,10,d);f.set(7,10,d)
    elif f.d==1:
        f.rect(2,3,3,7,c);f.set(2,7,d);f.set(3,7,d)
A=dict(headset=a_headset,goggles=a_goggles,glasses=a_glasses,visor=a_visor,rim=a_rim,filter=a_filter,cap=a_cap,beret=a_beret,boonie=a_boonie,band=a_band,beard=a_beard,stache=a_stache,ear=a_ear,scarf=a_scarf,pads=a_pads,pack=a_pack,vest=a_vest,lamp=a_lamp,cam=a_cam,ghillie=a_ghillie,tail=a_tail)
S=lambda n,**k:(n,k)
ACC={
'sledge':[S('rim'),S('filter')],
'thatcher':[S('rim'),S('filter')],
'ash':[S('cap',c='#26282c'),S('goggles',l='amber')],
'thermite':[S('rim'),S('goggles',l='dark'),S('pads')],
'montagne':[S('visor',l='smoke'),S('rim')],
'blitz':[S('visor',l='blue'),S('rim')],
'striker':[S('goggles',l='dark'),S('pack',c='#3a3f33')],
'twitch':[S('pads'),S('vest')],
'glaz':[S('headset'),S('goggles',l='amber')],
'fuze':[S('rim'),S('goggles',l='blue',big=1),S('pack',c='#3a4630')],
'iq':[S('visor',l='blue'),S('pack',c='#2a3040')],
'buck':[S('beard',c='#3b2a1e'),S('vest'),S('pads')],
'blackbeard':[S('rim'),S('goggles',l='dark'),S('beard',c='#4a301c')],
'capitao':[S('beret',c='#2a3a28')],
'hibana':[S('goggles',l='clear'),S('pads')],
'jackal':[S('goggles',l='clear',big=1),S('lamp')],
'ying':[S('headset'),S('goggles',l='clear')],
'zofia':[S('beret',c='#50603a'),S('goggles',l='dark')],
'dokkaebi':[S('ear',mic=1),S('pads')],
'lion':[S('visor',l='dark'),S('rim')],
'finka':[S('visor',l='clear'),S('pads')],
'maverick':[S('cap',c='#2e3228'),S('scarf',c='#3e4430'),S('goggles',l='amber')],
'nomad':[S('scarf',c='#c8b888')],
'gridlock':[S('headset'),S('rim')],
'nokk':[S('ghillie')],
'amaru':[S('pack',c='#3a3a3a')],
'kali':[S('goggles',l='clear'),S('pack',c='#2f343c')],
'iana':[S('ear',mic=1),S('pads')],
'ace':[S('goggles',l='red'),S('rim')],
'zero':[S('beard',c='#2a2420'),S('cam')],
'flores':[S('cap',c='#2f3640'),S('glasses',l='red')],
'osa':[S('glasses',l='purple')],
'sens':[S('ear',mic=1),S('pads')],
'grim':[S('boonie',c='#566038'),S('goggles',l='dark')],
'brava':[S('cap',c='#6a6444'),S('pads')],
'ram':[S('rim'),S('pack',c='#4a4e3a')],
'deimos':[S('filter'),S('rim')],
'rauora':[S('pack',c='#4a4034')],
'solidsnake':[S('band',c='#d8d8d0'),S('beard',c='#2c1e14')],
'rook':[S('visor',l='smoke'),S('rim')],
'smoke':[S('rim'),S('filter')],
'kapkan':[S('ghillie')],
'castle':[S('rim'),S('goggles',l='dark'),S('beard',c='#16110e')],
'pulse':[S('glasses',l='dark',fr='#111'),S('beard',c='#4a4038',goatee=True)],
'doc':[S('rim'),S('goggles',l='clear')],
'frost':[S('goggles',l='clear'),S('pack',c='#3a3f46')],
'sentry':[S('rim'),S('goggles',l='dark'),S('pack',c='#3a4030')],
'mute':[S('rim'),S('filter')],
'tachanka':[S('visor',l='dark'),S('pads'),S('vest')],
'jager':[S('headset'),S('goggles',l='dark',big=1),S('rim')],
'bandit':[S('headset'),S('rim')],
'valkyrie':[S('scarf',c='#7a7a6a'),S('goggles',l='dark')],
'caveira':[S('pack',c='#26282c')],
'echo':[S('ear',mic=1),S('pads')],
'mira':[S('rim'),S('visor',l='smoke')],
'lesion':[S('rim'),S('headset')],
'ela':[S('cap',c='#2a2d28'),S('goggles',l='dark')],
'vigil':[S('pads')],
'maestro':[S('beret',c='#6a1e24'),S('beard',c='#1e1612')],
'alibi':[S('beret',c='#7a1e24'),S('goggles',l='yellow'),S('scarf',c='#a83a3a')],
'clash':[S('ear',mic=1)],
'kaid':[S('beret',c='#3a5a30'),S('beard',c='#5a4630')],
'mozzie':[S('rim'),S('goggles',l='dark',big=1)],
'warden':[S('headset'),S('glasses',l='clear'),S('stache',c='#2a1a12')],
'goyo':[S('scarf',c='#c8b078'),S('beard',c='#1e1612',goatee=True)],
'wamai':[S('pads')],
'oryx':[S('beard',c='#1a1410')],
'melusi':[S('ear',mic=1),S('pads')],
'aruni':[S('pads'),S('ear')],
'thunderbird':[S('visor',l='smoke'),S('headset')],
'thorn':[S('ear',mic=1),S('pads')],
'azami':[S('tail',c='#16141c'),S('filter')],
'solis':[S('visor',l='amber'),S('rim')],
'fenrir':[S('beard',c='#2a201a')],
'tubarao':[S('beret',c='#1f3a58'),S('beard',c='#3a2a20')],
'skopos':[S('pads'),S('ear')],
'denari':[S('ear',mic=1),S('pads')],
'noor':[S('headset',mic=1),S('goggles',l='dark'),S('rim')],
}
def build():
    im=base.copy()
    miss=[i for i in IDS if i not in ACC]; assert not miss,miss
    for o,i in enumerate(IDS):
        for d in range(3):
            f=F(im,o,d)
            for n,k in ACC[i]: A[n](f,k)
    return im
if __name__=='__main__':
    im=build(); im.save('/home/claude/atlas_acc.png')
    def sheet(img,fn,sc=6,per=13):
        rows=(len(IDS)+per-1)//per
        cw=(W*2+4)*sc
        out=Image.new('RGBA',(per*cw,rows*(H*sc+6)),(16,18,22,255))
        for o in range(len(IDS)):
            r,c=divmod(o,per)
            for k,fr in enumerate((0,3)):
                t=img.crop((o*W,fr*H,o*W+W,fr*H+H)).resize((W*sc,H*sc),Image.NEAREST)
                out.alpha_composite(t,(c*cw+k*(W*sc+2),r*(H*sc+6)))
        out.save(fn)
    sheet(base,'/home/claude/cmp_old.png');sheet(im,'/home/claude/cmp_new.png')
