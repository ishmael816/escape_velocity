"""A4 print-and-play kit, generated from the actual v0.6 card definitions.

Run `node scripts/export-print-data.mjs`, then run this file with Python.
Dependencies: reportlab, pypdf; optional QA rendering: pypdfium2, Pillow.
"""
import json, math
from pathlib import Path
from collections import Counter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color, white
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
TMP = ROOT / 'tmp/pdfs'
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((TMP / 'print-data.json').read_text(encoding='utf-8'))
CARDS = DATA['cards']
pdfmetrics.registerFont(TTFont('CN', 'C:/Windows/Fonts/msyh.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('B', 'C:/Windows/Fonts/msyhbd.ttc', subfontIndex=0))
MM = 72 / 25.4
INK = '#243333'; MUTED = '#657574'; LINE = '#ccd3ce'; PAPER = '#f7f5ec'
COLORS = {'A':'#c95151','B':'#376fc1','C':'#b57c20','恢复':'#378358','灵感':'#238a99','机会':'#8054b7','解锁':'#8054b7'}
RN = {'A':'创作', 'B':'技术', 'C':'经营'}
RC = {'money':'#9b7221','sanity':'#b15058','inspiration':'#29838e','achievement':'#7151a2'}
RNAME = {'money':'资金','sanity':'理智','inspiration':'灵感','achievement':'成就'}
DAYS = ['周一','周二','周三','周四','周五','周六','周日']
manifest = {'version':'v0.6 / 2026-10-08', 'activity_dimensions_mm':{'1h':[36,22], '2h':[36,44], '4h':[36,88]}, 'cards':[], 'events':[], 'files':{}}

def tint(col, a=.10):
    c=HexColor(col); return Color(1-(1-c.red)*a,1-(1-c.green)*a,1-(1-c.blue)*a)

class Sheet:
    def __init__(self, name, title):
        self.path=OUT/name; self.c=canvas.Canvas(str(self.path), pagesize=(210*MM,297*MM), pageCompression=1)
        self.c.setTitle(title); self.c.setAuthor('逃离工位 / Escape Velocity'); self.page=0; self.w=210; self.h=297
    def begin(self, title, note='', landscape=False, chrome=True):
        self.page+=1; self.w,self.h=(297,210) if landscape else (210,297)
        self.c.setPageSize((self.w*MM,self.h*MM))
        if chrome:
            self.text(10,8,title,11,'B'); self.text(self.w-10,8,f'EV / v0.6   {self.page:02}',7,'CN',MUTED,'right')
            self.text(10,13,note,7,'CN',MUTED)
    def text(self,x,y,s,size=8,font='CN',col=INK,align='left'):
        self.c.setFillColor(HexColor(col) if isinstance(col,str) else col); self.c.setFont(font,size)
        fn={'left':self.c.drawString,'center':self.c.drawCentredString,'right':self.c.drawRightString}[align]
        fn(x*MM,(self.h-y)*MM,str(s))
    def rect(self,x,y,w,h,fill=None,stroke=LINE,r=0,lw=.25):
        c=self.c; c.setLineWidth(lw*MM)
        if fill: c.setFillColor(HexColor(fill) if isinstance(fill,str) else fill)
        if stroke: c.setStrokeColor(HexColor(stroke) if isinstance(stroke,str) else stroke)
        args=(x*MM,(self.h-y-h)*MM,w*MM,h*MM)
        if r: c.roundRect(*args,r*MM,stroke=bool(stroke),fill=bool(fill))
        else: c.rect(*args,stroke=bool(stroke),fill=bool(fill))
    def line(self,x,y,x2,y2,col=LINE,lw=.25):
        self.c.setStrokeColor(HexColor(col) if isinstance(col,str) else col); self.c.setLineWidth(lw*MM)
        self.c.line(x*MM,(self.h-y)*MM,x2*MM,(self.h-y2)*MM)
    def circle(self,x,y,r,fill,stroke=None):
        self.c.setFillColor(HexColor(fill) if isinstance(fill,str) else fill)
        if stroke:self.c.setStrokeColor(HexColor(stroke))
        self.c.circle(x*MM,(self.h-y)*MM,r*MM,fill=1,stroke=bool(stroke))
    def para(self,x,y,s,w,size=9,leading=4.8,col=INK,font='CN',max_y=None):
        start=y
        for paragraph in s.split('\n'):
            line=''
            for ch in paragraph:
                if pdfmetrics.stringWidth(line+ch,font,size)>w*MM and line and ch not in '。，；：？！、）”》':
                    self.text(x,y,line,size,font,col); y+=leading; line=''
                line+=ch
            self.text(x,y,line,size,font,col); y+=leading
        if max_y is not None and y-leading>max_y:raise ValueError(f'Overflow page {self.page}: {s}, end {y-leading}, max {max_y}')
        return y
    def crop(self,x,y,w,h):
        for xx, sx in [(x,-1),(x+w,1)]:
            for yy, sy in [(y,-1),(y+h,1)]:
                self.line(xx+sx*.5,yy,xx+sx*1.4,yy,MUTED,.12)
                self.line(xx,yy+sy*.5,xx,yy+sy*1.4,MUTED,.12)
    def end(self, foot='A4 · 单面 · 实际大小 100% · 请勿适合页面'):
        self.text(10,self.h-4,foot,6,'CN',MUTED); self.text(self.w-10,self.h-4,str(self.page),6,'CN',MUTED,'right'); self.c.showPage()
    def save(self):
        self.c.save(); manifest['files'][self.path.name]={'pages':self.page}

def icon(s,kind,x,y,z=3,col=None):
    """Simple vector resource glyphs, centered, recognizable in grayscale."""
    col=col or RC.get(kind,INK); c=s.c
    if kind=='money':
        s.circle(x,y,z/2,col); s.circle(x,y,z*.32,white); s.line(x-z*.11,y,x+z*.11,y,col,.35)
    elif kind=='sanity':
        # Heart, distinct from circular money / diamond inspiration / star achievement.
        c.setFillColor(HexColor(col)); p=c.beginPath(); X=x*MM; Y=(s.h-y)*MM; u=z*MM
        p.moveTo(X,Y-u*.45); p.curveTo(X-u*.8,Y+u*.1,X-u*.4,Y+u*.7,X,Y+u*.2)
        p.curveTo(X+u*.4,Y+u*.7,X+u*.8,Y+u*.1,X,Y-u*.45); c.drawPath(p,fill=1,stroke=0)
    elif kind=='inspiration':
        c.setFillColor(HexColor(col)); p=c.beginPath()
        for i,(dx,dy) in enumerate([(0,-.55),(.42,0),(0,.55),(-.42,0)]):
            (p.moveTo if i==0 else p.lineTo)((x+dx*z)*MM,(s.h-y-dy*z)*MM)
        p.close(); c.drawPath(p,fill=1,stroke=0)
    elif kind=='achievement':
        c.setFillColor(HexColor(col));p=c.beginPath()
        for i in range(10):
            a=-math.pi/2+i*math.pi/5; r=z*(.53 if i%2==0 else .23)
            (p.moveTo if i==0 else p.lineTo)((x+math.cos(a)*r)*MM,(s.h-y-math.sin(a)*r)*MM)
        p.close();c.drawPath(p,fill=1,stroke=0)
    elif kind=='job':
        s.rect(x-z*.5,y-z*.25,z,z*.65,col,None,r=.3)
        s.rect(x-z*.22,y-z*.48,z*.44,z*.3,None,col,r=.2,lw=.4)
    elif kind=='moon':
        s.circle(x,y,z*.5,col);s.circle(x+z*.25,y-z*.17,z*.43,white)
    elif kind=='leaf':
        c.setFillColor(HexColor(col));p=c.beginPath();X=x*MM;Y=(s.h-y)*MM;u=z*MM
        p.moveTo(X-u*.4,Y-u*.4);p.curveTo(X-u*.6,Y+u*.5,X+u*.5,Y+u*.5,X+u*.4,Y+u*.4)
        p.curveTo(X+u*.5,Y-u*.5,X-u*.3,Y-u*.45,X-u*.4,Y-u*.4);c.drawPath(p,fill=1,stroke=0)
        s.line(x-z*.45,y+z*.45,x+z*.2,y-z*.2,'#ffffff',.4)
    elif kind in ['A','B','C']:
        if kind=='A':
            s.line(x-z*.32,y+z*.3,x+z*.32,y-z*.32,col,z*.18);s.line(x-z*.42,y+z*.43,x-z*.29,y+z*.34,col,.4)
        elif kind=='B':
            for i in [-1,0,1]:s.rect(x-z*.43,y+i*z*.26-z*.08,z*.86,z*.16,col,None,r=.3)
        else:
            s.rect(x-z*.36,y-z*.1,z*.72,z*.55,None,col,lw=.5);s.rect(x-z*.47,y-z*.35,z*.94,z*.22,col,None,r=.3)

def vals(s,items,x,y,size=8,iconsize=2.4,sign=False):
    for k,v in items.items():
        if not v:continue
        icon(s,k,x+iconsize/2,y-.7,iconsize)
        st=('+' if sign and v>0 else '')+str(v)
        s.text(x+iconsize+1,y,st,size,'B',INK)
        x+=iconsize+1+pdfmetrics.stringWidth(st,'B',size)/MM+1.6
    return x

def ccolor(d):return d['printColor']
def hours(d):return 4 if d['size']==3 else d['size']
def card_special(d):
    id=d['id']
    if d['kind']=='opportunity':
        if d['method']=='slack':
            return {'slack-phone':'工作时段 → 1h','slack-headphones':'坐班→1h；未抓包 ◆+1','slack-meeting':'仅开会 → 1h'}[id]
        return '打开夜晚 2h' + ('\n该槽副业收入 +2' if id=='night-sprint' else '')
    if d.get('draft'):return f"周末 {d['draft'] if d['draft']!='any' else '任选池'} 高级 2 选 1"
    if d.get('jobBonus'):return '下次成功副业 +2'
    if d.get('core'):
        return {'royalty':'每周末版税收入 +6。','muse':'每周首个成功的 A 活动：少付至多 2 灵感，恢复 2 理智。','automation':'每周首个成功的 B 副业：少付至多 2 灵感，收入 +2。','remote':'周三白天永久自由。工资不变，少一个工作日。夜晚仍需熬夜。','chain-store':'每周首个成功的 C 副业：收入 +4，恢复 2 理智。','brand':'本周成功执行 A、B、C 活动各至少一次：周末收入 +10。'}[id]
    if d.get('unlockWeekend'):return '本周此前已完成副业。\n执行后下周起永久双休；工资不变。'
    return ''

def draw_card(s,d,x,y):
    h=hours(d)*22;w=36;co=ccolor(d)
    s.rect(x,y,w,h,white,co,r=1,lw=.32)
    s.rect(x+.4,y+.4,w-.8,4.2,co,None,r=.7)
    tag=d['code']+(' 起始' if d.get('starter') else '')
    s.text(x+1.7,y+3.3,tag,5.5,'B','#ffffff')
    route=d.get('route') or ('时' if d['kind']=='opportunity' else '生')
    life='核' if d.get('core') else '1' if d.get('once') else '∞'
    s.text(x+w-1.5,y+3.3,f'{route}  {hours(d)}h / {life}',5.5,'B','#ffffff','right')
    size=min(9.5,31*MM/pdfmetrics.stringWidth(d['name'],'B',1))
    s.text(x+1.8,y+8.5,d['name'],size,'B')
    # Numerical effects use only glyphs. Briefcase to the left flags true side-income.
    ey=y+13.1
    if d['kind']=='opportunity':
        if d['method']=='night':
            icon(s,'moon',x+3,ey-1,2.4,co);s.text(x+5,ey,'每周',6)
            vals(s,{'sanity':-(2+d.get('nightOffset',0))},x+11,ey,8)
        else: s.text(x+1.8,ey,card_special(d),6.1,'CN',co)
    else:
        xx=x+1.8
        if d.get('income'): icon(s,'job',xx+1.2,ey-.8,2.4,co);xx+=3.5
        xx=vals(s,{k:-v for k,v in d.get('cost',{}).items()},xx,ey,7.5)
        if d.get('cost') and d.get('gain'):
            s.text(xx,ey,'→',8,'B',MUTED);xx+=4
        vals(s,d.get('gain',{}),xx,ey,7.5,sign=not bool(d.get('cost')))
    special=card_special(d)
    if h==22:
        if special and d['kind']!='opportunity':s.text(x+1.8,y+16.9,special,6.2,'CN',co)
        if d.get('skill'):s.text(x+1.8,y+16.9,f"归档 +{d['skill']}",6.2,'B',co)
    else:
        if h==88:
            s.rect(x+2,y+18,32,27,tint(co,.08),None,r=1)
            icon(s,d.get('route') or ('moon' if d['kind']=='opportunity' else 'leaf'),x+18,y+29,13,co)
            s.text(x+18,y+41,'长期能力' if d.get('core') else d['category'],7,'B',co,'center')
        sy=y+(51 if h==88 else 20)
        if special:
            sy=s.para(x+2,sy,special,32,7.5,4,col=co,max_y=y+h-12)
        if d.get('skill'):
            s.text(x+2,sy+1,f"成功归档  +{d['skill']}",8,'B',co)
            if h>44:s.text(x+2,sy+6,'同名经历仅计一次',6.5,'CN',MUTED)
        if d.get('core'):
            s.text(x+2,y+h-12,'成功后移至永久区',6.7,'B',co)
            s.text(x+2,y+h-8,'下周起生效 · 不占日程',6.2,'CN',MUTED)
    # Requirements / purchase price in a separate footer, never confuse with activation.
    s.line(x+1.5,y+h-4.8,x+w-1.5,y+h-4.8,tint(co,.35),.15)
    fy=y+h-1.6;xx=x+1.7
    if d.get('requires'):
        s.text(xx,fy,d['requires'],6.4,'B',co);xx+=pdfmetrics.stringWidth(d['requires'],'B',6.4)/MM+1
    else:
        s.text(xx,fy,'购' if d['deck']!='成长' else '学',5.5,'CN',MUTED);xx+=3
        xx=vals(s,d['price'],xx,fy,5.9,1.7)
    if d.get('minSanity'):
        icon(s,'sanity',x+27.1,fy-.6,1.9)
        s.text(x+28.8,fy,'≥'+str(d['minSanity']),5.9,'B',MUTED)
    s.crop(x,y,w,h)
    manifest['cards'].append({'id':d['id'],'code':d['code'],'starter':bool(d.get('starter')),'page':s.page,'x':x,'y':y,'width':w,'height':h})

def card_set():
    s=Sheet('01-card-set-A4.pdf','逃离工位 | 每人一份卡组')
    allcards=CARDS+DATA['starters']; large=[d for d in allcards if hours(d)==4];mid=[d for d in allcards if hours(d)==2]; small=[d for d in allcards if hours(d)==1]
    s.begin('卡组 01 / 4h 活动','整份打印 N 份；N 为玩家人数。相同编号的副本全部保留。')
    for i,d in enumerate(large[:15]):draw_card(s,d,10+(i%5)*38.5,19+(i//5)*90)
    s.end('每种牌 N 张，另加每人两张起始牌。个人项目不混入公共牌堆。')
    s.begin('卡组 02 / 4h 与 2h 活动','上排 4h；下三排 2h。沿外框裁切，不缩放。')
    for i,d in enumerate(large[15:]):draw_card(s,d,10+i*38.5,19)
    for i,d in enumerate(mid[:15]):draw_card(s,d,10+(i%5)*38.5,110+(i//5)*47)
    s.end()
    s.begin('卡组 03 / 2h 与 1h 活动','起始副本标有“起始”，开局直接发给玩家；之后可正常弃置与回收。')
    for i,d in enumerate(mid[15:]):draw_card(s,d,10+(i%5)*38.5,19+(i//5)*47)
    for i,d in enumerate(small):draw_card(s,d,10+(i%5)*38.5,115+(i//5)*25)
    s.text(10,228,'等宽，按时间增加高度。',15,'B')
    s.para(10,237,'1h = 36 × 22 mm    2h = 36 × 44 mm    4h = 36 × 88 mm\n每槽最多一项活动；可以放小牌，不能用多张小牌拼满大槽。',190,9,6)
    s.line(10,265,60,265,INK,.3);s.line(10,263,10,267,INK,.3);s.line(60,263,60,267,INK,.3)
    s.text(35,273,'打印校准：这段应为 50 mm',8,'CN',MUTED,'center');s.end()
    s.begin('卡组 04 / 成长与高级抽选签','36 枚等尺寸签，替代不同高度的活动牌洗牌；本页同样打印 N 份。')
    tickets=[d for d in CARDS if d['deck'] in ['成长','高级']]
    for i,d in enumerate(tickets):
        x=10+(i%6)*32;y=20+(i//6)*25;co=ccolor(d)
        s.rect(x,y,30,22,white,co,r=.8);s.rect(x+.4,y+.4,29.2,4.6,co,None)
        s.text(x+1.5,y+3.8,d['deck']+' / '+d['route'],6,'B','#ffffff')
        s.text(x+15,y+11,d['code'],12,'B',co,'center')
        s.text(x+15,y+16.2,d['name'],min(7,26*MM/pdfmetrics.stringWidth(d['name'],'CN',1)),'CN',INK,'center')
        s.text(x+15,y+20,'按编号领取活动牌',5.5,'CN',MUTED,'center');s.crop(x,y,30,22)
    s.text(10,184,'六叠抽选签，六个公开牌库。',15,'B')
    s.para(10,194,'按 G-A / G-B / G-C / H-A / H-B / H-C 分成六叠，分别洗匀背面朝上。活动牌按编号公开叠放在旁边，供查阅与领取。\n抽到签后选择一枚，领取对应活动牌，并把该签收在个人保管区。未选签放原堆底。牌被弃回牌库时，对应签也回同一签堆底；技能归档与永久能力的签不再回堆。\n请使用不透背的纸，或统一贴背。不要直接洗不同高度的成长、高级活动牌。',190,9,5.5)
    s.end();s.save();return s.path

def well(s,x,y,w,h,label,sub,col='#71817e'):
    # Inner top/left edge: printed recessed slot, no floating outer drop shadow.
    s.rect(x,y,w,h,tint(col,.055),LINE,r=1,lw=.25)
    s.rect(x+.4,y+.4,w-.8,1.1,tint(col,.18),None)
    s.rect(x+.4,y+.4,.9,h-.8,tint(col,.14),None)
    s.text(x+w/2,y+h/2-1,label,9,'B',col,'center')
    if sub:s.text(x+w/2,y+h/2+5,sub,6,'CN',MUTED,'center')

def help_block(s,x,y,w,title,rows):
    s.rect(x,y,w,111,white,LINE,r=1)
    s.rect(x,y,w,10,INK,None,r=1);s.text(x+4,y+7,title,11,'B','#ffffff')
    yy=y+17
    for head,body in rows:
        s.text(x+4,yy,head,8.8,'B');yy=s.para(x+4,yy+4.5,body,w-8,7.6,4.1,max_y=y+107)+3
    s.crop(x,y,w,111)

def player_set():
    s=Sheet('02-player-board-and-aids-A4.pdf','逃离工位 | 玩家板与帮助卡')
    s.begin('逃离工位 / 一周由你安排','',True,False)
    s.text(15,8,'逃离工位',13,'B');s.text(81,8,'玩家：____________',8)
    s.text(282,8,'日程板 A / 白天   ·   每人一套，勿缩放',7,'CN',MUTED,'right')
    for i,day in enumerate(DAYS):
        x=15+i*38
        s.text(x+18,16,day,10,'B',COLORS['恢复'] if i==6 else INK,'center')
        for p,y in enumerate([21,112]):
            well(s,x,y,36,88,('上午 · 开会' if p==0 else '下午 · 坐班') if i<6 else '自由日程', '4h 槽 · 需解锁' if i<6 else '4h · 一槽一项')
            if i<6:
                icon(s,'job',x+18,y+24,8,'#9ba6a1')
                s.text(x+18,y+75,'摸鱼仅开放 1h',6,'CN',MUTED,'center')
            else:icon(s,'leaf',x+18,y+24,8,COLORS['恢复'])
    s.end('与 B 板上下对齐摆放；可裁去两页间空白边再贴合。印刷工位无需逐格结算，周初统一维护。')
    s.begin('夜晚 / 长期发展','',True,False)
    s.text(15,8,'夜晚 / 长期发展',12,'B');s.text(282,8,'日程板 B / 与 A 板按七列对齐',7,'CN',MUTED,'right')
    for i,day in enumerate(DAYS):
        x=15+i*38;s.text(x+18,16,day,9,'B',INK,'center')
        well(s,x,21,36,44,'夜晚 · 休息','默认无效果；熬夜开放 2h')
        well(s,x,69,36,44,'熬夜绑定位','此处放机会牌；活动放上槽',COLORS['机会'])
    s.text(15,123,'资源账本',9,'B');s.text(87,123,'用铅笔记录；每次费用与收益后立即更新。',7,'CN',MUTED)
    for i,(key,label) in enumerate([('money','资金'),('sanity','理智'),('inspiration','灵感'),('achievement','成就'),('job','本周副业收入')]):
        x=15+i*54;s.rect(x,127,51,25,white,LINE,r=1);icon(s,key,x+5,133,3)
        s.text(x+9,134,label,8,'B');s.line(x+5,147,x+46,147,LINE,.4)
    s.text(15,161,'技能归档放板旁 →',8,'B')
    for i,r in enumerate('ABC'):
        x=83+i*42;s.rect(x,156,39,15,tint(COLORS[r]),None,r=1);icon(s,r,x+5,162,4,COLORS[r]);s.text(x+9,163,r+' '+RN[r],8,'B',COLORS[r]);s.text(x+9,168,'同名只计一次',6,'CN',MUTED)
    s.text(218,162,'永久能力放板旁',8,'B');s.text(218,168,'新能力横置，下周转正',6,'CN',MUTED)
    s.rect(15,176,267,23,PAPER,None,r=1)
    s.text(20,182,'本周状态（铅笔记录，周初清空）',7.5,'B')
    s.text(20,189,'已执行方向：A □  B □  C □     已完成副业：□     下次副业加成：____     已用核心：________________',7.5)
    s.text(20,195,'周数：____     临时双休生效周：____     工作日数：____     团建：________     待抽高级：________________',7.5)
    s.end('永久双休、周三自由、逃离后用状态条覆盖 A 板日标题，白天槽变为自由槽；夜晚仍需熬夜。')
    s.begin('个人附件 / 帮助卡与摸鱼覆盖片','每人一页。覆盖片用于工作槽；底部放摸鱼机会牌，顶部仅容纳一张 1h 活动。')
    help_block(s,10,20,92,'一周怎么进行',[
        ('01 维护','每工作日理智 -2；生活费资金 -4。差多少钱，再扣多少理智。'),
        ('02 采购 ×2','蛇形：正向一轮，再反向一轮。购买 / 学习 / 双休项目 / 躺平 +4 理智。'),
        ('03 安排 → 翻事件','可自由重排与撤回。未放置手牌最多 5 张。全员锁定后揭晓一张事件。'),
        ('04 顺序执行','周一至周日：上午 → 下午 → 夜晚。只结算自定义槽，费用不足则跳过。'),
        ('05 周末','结算核心收入、工资或自由奖励、高级抽选，然后逃离判断；未结束则换起始玩家。')])
    help_block(s,108,20,92,'重要判断 / 胜利',[
        ('收入 >24 → 可选择逃离','只有副业、副业加成、版税等计入本周收入；工资、奖金、普通卖货收益不计。'),
        ('N-1 人逃离 → 本周末结束','逃离即胜利。未逃离者：分数 ≥85 且理智 ≥4，也获胜。'),
        ('计分','资金每 2 点得 1 分（向下取整）+ 理智 + 成就 ×3。灵感不计分。'),
        ('槽与执行','1 / 2 / 4h 各放一项；小牌可放大槽。执行前满足理智下限并付费用。'),
        ('符号','∞ 多次；1 一次性；核 永久。购 / 学为取得费用，主行是执行费用与收益；公文包表示副业。')])
    for i in range(3):
        x=10+i*39;y=143;co=COLORS['机会'];s.rect(x,y,36,88,white,co,r=1)
        well(s,x,y,36,22,'1h 活动','只开放这一格',co)
        s.rect(x+.4,y+22,35.2,44,tint(co,.1),None)
        icon(s,'job',x+18,y+34,7,co);s.text(x+18,y+45,'仍在工作',9,'B',co,'center')
        s.text(x+18,y+52,'抽查命中则暂停',6.5,'CN',MUTED,'center');s.text(x+18,y+59,'工资不变',6.5,'CN',MUTED,'center')
        well(s,x,y+66,36,22,'摸鱼机会牌','必须绑定；不能免费使用',co);s.crop(x,y,36,88)
    s.rect(132,143,68,88,white,LINE,r=1);s.crop(132,143,68,88)
    s.text(136,150,'数值图标',10,'B')
    for i,k in enumerate(RNAME):icon(s,k,140,159+i*9,4);s.text(146,160+i*9,RNAME[k],8)
    icon(s,'job',140,196,4);s.text(146,197,'副业收入',8)
    s.para(136,208,'理智下限只检查，不额外扣除。\n放空：1/2h 得 1 灵感；4h 得 2。',60,7.5,4.5)
    # State strips are wide enough to cover day headers, not the activity slots.
    for i,(txt,sub) in enumerate([('周六 · 永久自由','双休项目完成'),('周六 · 本周自由','临时双休'),('周三 · 永久自由','远程协议'),('已逃离 · 白天全自由','免事件；无工资')]):
        x=10+i*48;y=241;s.rect(x,y,36,12,tint(COLORS['恢复']),COLORS['恢复'],r=.5)
        s.text(x+18,y+5,txt,6.3,'B',COLORS['恢复'],'center');s.text(x+18,y+9.5,sub,5.5,'CN',MUTED,'center');s.crop(x,y,36,12)
    for i in range(14):
        x=10+(i%7)*27.4;y=263+(i//7)*11
        s.rect(x,y,25,9,white,LINE,r=.4);icon(s,'inspiration',x+3,y+4.5,2.8);s.text(x+6,y+5.8,'放空',6.8,'B');s.text(x+22,y+5.8,'1/2',6,'CN',MUTED,'right');s.crop(x,y,25,9)
    s.end('放空标记不足可直接在空槽写“放空”。无需裁独立工位卡：玩家板已印十二个初始工位。');s.save();return s.path

def section(s,y,n,title,body):
    s.circle(15,y-1,4,INK);s.text(15,y+.1,n,8,'B','#ffffff','center');s.text(22,y+.2,title,12,'B')
    return s.para(22,y+8,body,176,10.5,6.0)+7

def event_card(s,e,i,x,y):
    w=59;h=80;co='#a24d49' if e['kind']=='inspection' else '#997628' if e['kind']=='team' else '#4a786e'
    s.rect(x,y,w,h,white,co,r=1);s.rect(x+.4,y+.4,w-.8,8,co,None,r=.8)
    s.text(x+3,y+5.8,f'E{i+1:02} / 公司事件',7,'B','#ffffff');s.text(x+3,y+16,e['name'],11,'B')
    if e['kind']=='inspection':
        s.text(x+3,y+24,'检查这些工作时段',7,'CN',MUTED)
        yy=y+33
        for day,period in e['times']:
            s.rect(x+3,yy-6,53,8,tint(co),None,r=.5);s.text(x+29.5,yy,DAYS[day]+['上午','下午'][period],10,'B',co,'center');yy+=10
        fy=y+64;s.text(x+3,fy,'每处抓包',7,'B',co);vals(s,{'money':-e['money'],'sanity':-e['sanity']},x+20,fy,9,3)
        s.text(x+3,y+71,'该槽活动暂停；卡保留，工资不减。',6.5)
        s.text(x+3,y+76,'仅处罚仍在工作槽内的摸鱼。',6.5,'CN',MUTED)
    elif e['kind']=='bonus':
        vals(s,{'money':5},x+19,y+37,20,6,True)
        s.para(x+4,y+53,'所有在职玩家立即获得。\n不计副业收入；已逃离者不获得。',51,9,5)
    elif e['kind']=='team':
        day,period=e['blockedTimes'][0];s.text(x+29.5,y+31,DAYS[day]+['上午','下午'][period],15,'B',co,'center')
        s.para(x+4,y+42,'在职者该槽的活动和放空暂停一周。卡牌保留，不付执行费用。\n已双休仍需参加；已逃离免疫。',51,8.5,5,max_y=y+75)
    elif e['kind']=='weekend':
        s.para(x+4,y+30,'在职者下周临时双休一周，工资不变。\n已永久双休者：',51,9,5.5)
        vals(s,{'sanity':3},x+18,y+59,18,5,True)
        s.text(x+4,y+73,'已逃离者不受影响。',7,'CN',MUTED)
    else:
        icon(s,'leaf',x+29.5,y+37,18,co);s.para(x+4,y+59,'没有额外效果。\n按你的安排度过这一周。',51,9,5.5)
    s.crop(x,y,w,h);manifest['events'].append({'name':e['name'],'page':s.page,'code':f'E{i+1:02}'})

def shared():
    s=Sheet('03-shared-events-and-rules-A4.pdf','逃离工位 | 公共事件与规则')
    s.begin('PRINT & PLAY / 实体试玩包','2–4 人 · v0.6 · 按当前 Demo 制作 · 公共文件只印一份')
    s.text(10,32,'逃离工位',32,'B');s.text(11,44,'从周日的一点空白，构筑属于自己的生活。',11,'CN',MUTED)
    y=60
    y=section(s,y,'1','先打印，再组局','01 卡组文件打印 N 份；02 玩家板与帮助卡打印 N 份；本公共文件只打印 1 份。三人可直接打印 04 三人整包，无须再印前三份。全部 A4、单面、实际大小 100%；不要适合页面或多页合一。')
    y=section(s,y,'2','材料与裁切','建议 180–250g 不透背卡纸；普通纸可统一贴背。准备剪刀或裁纸刀、铅笔、橡皮。活动牌等宽 36mm，高 22 / 44 / 88mm；事件 59 ×80mm；抽选签 30 ×22mm。玩家板为两张横向 A4，上下按七列对齐。裁卡只沿外轮廓；板不用裁槽。')
    y=section(s,y,'3','组件核对','N 为玩家人数：公共活动/机会 22N 张，成长 18N 张，高级 18N 张，双休个人项目 N 张，额外起始牌 2N 张，共 61N 张。另有 36N 枚抽选签、12 张事件。每人两张板、两张帮助卡、一张图标卡、三片摸鱼覆盖片及状态标记。三人共 183 张游戏牌 +12 张事件 +108 枚签。')
    y=section(s,y,'4','准备公共区','M 编号牌按 1h /2h /4h 各自洗牌，分别亮 4 /3 /2 张，从左到右排成三列展示区。每堆各设弃牌区。G/H 活动牌按编号公开叠放，仅供领取与查阅；对应抽选签按成长 A/B/C、高级 A/B/C 分六堆洗匀。12 张事件洗成一堆。')
    y=section(s,y,'5','每位玩家开局','领取标“起始”的演出、零散接单各一张；双休个人项目放板旁，尚未购入。周一到周六白天都在工作，周日白天自由；夜晚均休息。记资金22、理智24、灵感4、成就0。随机决定起始玩家。第一周先维护，故首次采购前为资金18、理智12、灵感4。')
    assert y<288,y
    s.end('当前试制版保留现行数值；本包只转为实体组件，不另加胜利条件或补偿。')
    s.begin('规则 / 一周的完整流程','除个人资源与抽选外，尽量全员同时安排；实际执行按时段推进。')
    y=24
    y=section(s,y,'1','周初维护','让上周解锁的能力与自由日生效。每个仍有工作的日子理智 -2，摸鱼仍算工作；每人生活费资金 -4，钱不够的差额转为理智损失，资源最低为0。清空本周收入、执行方向、核心已用、收入加成。临时双休到期后，放不下的活动回手牌。')
    y=section(s,y,'2','每人两次采购','从起始玩家顺时针一轮，再逆序一轮（如 A-B-C-C-B-A）。每次四选一：买一张明牌并立即补同长度；付3资金选择一个成长方向抽二留一；付5资金取得自己的双休项目；不买牌，理智 +4。成长报名付费后不能取消或改方向，未选签回底；只有一张就拿一张，空堆不能报名。')
    y=section(s,y,'3','同时规划，随后锁定','一槽一项活动，小时数不能超容量；小牌可占大槽，不可拼牌。摸鱼绑定工作槽后仅开放1h；熬夜绑定夜晚后开放2h。可自由重排、撤回或弃牌；移走机会牌时，关联活动回手。高级牌安排时须满足技能组合，技能不消耗。锁定时未放置手牌最多5张，已放置牌与技能、永久区不计入。')
    y=section(s,y,'4','翻事件，执行自定义日程','全员锁定后翻一张事件。依周一至周日、上午→下午→夜晚，跳过纯工作和休息格；同一时段从起始玩家依次执行。被团建占用或摸鱼被抓包的槽暂停，牌保留。夜晚先付熬夜理智，即使没放活动也要付；连熬夜费都付不起则跳过。之后检查活动理智下限、执行成本及其他条件，足够才付费并收收益。')
    y=section(s,y,'5','周末收入、抽选与结束','先结算已生效的永久能力收入；在职者工资 +14，此前已逃离者成就 +2。处理本周活动取得的高级抽选。若本周副业收入严格大于24，可决定逃离，逃离即胜利。达到 N-1 名玩家逃离时，在当前周末结束，无额外一周。否则移交起始玩家，每条市场最左牌弃置并补牌，进入下周。')
    s.rect(10,y,190,20,PAPER,None,r=1);s.text(15,y+7,'未逃离也可能胜利',10,'B')
    s.text(15,y+14,'结算分 = 资金÷2向下取整 + 理智 + 成就×3；至少85分且理智至少4，即胜利。',8.3)
    assert y+20<287,y
    s.end('本游戏不淘汰，不设固定周数；允许共同胜利，暂不允许赠送资源或卡牌。')
    s.begin('规则 / 抽选、归档与边界','实体抽选签只隐藏牌序，不改变取得卡牌或弃牌回收规则。')
    y=24
    for n,title,body in [
        ('1','签与活动牌一一对应','每枚 G/H 签对应同编号的一张实体活动牌。保留签时，从公开牌库领取一张对应牌，并把签放个人保管区。未选签回原堆底，无须搬动公开牌。活动牌回库时，它的签才回原签堆底；同编号仍有其他副本时，不要把所有签都收走。'),
        ('2','高级牌：先取得，后满足技能','活动成功后记录一次待抽选，周末处理。研讨会限定同方向；猎头先任选一个方向并锁定，再翻签。依次抽到两种不同且自己尚未持有/建成的牌，跳过已持有及同批候选的同名签，跳过签回底；最多遍历一次牌堆。保留一个，不再付购牌费。只有一个就拿一个，完全没有合格候选则理智 +4。新牌下周才能安排。'),
        ('3','一次性活动如何离开日程','首次完成某同名成长牌：牌进技能区，签留存，永久提供一个对应技能。再完成同名副本：仍得执行收益，但牌回库、签回底。普通一次性活动进对应时长弃牌区。核心建成后移入永久区，下周起生效。双休成功后作为已完成项目留存；未执行而弃置则回个人项目区。'),
        ('4','不执行、放空、没有资源','资源或理智下限不足：整项活动跳过，不付活动费用，牌仍保留；夜晚已扣的熬夜费用不退。空的可用槽可预先安排放空：1/2h 得1灵感，4h得2；休息及未指定放空的空槽无效果。理智为0不淘汰，可在下周规划时移除熬夜，再用购买躺平或无门槛恢复活动恢复。'),
        ('5','收入、能力与自由日','带公文包的活动、其加成、版税和品牌分红才计本周副业收入；其他资金收益不计。下次副业加成可叠加，成功触发后消耗，周末未用失效；核心的“首个”每周只触发一次。自由日白天用4h槽，原摸鱼牌回手。逃离后白天全自由、免领导与团建事件，仍付生活费；夜晚仍须熬夜。'),
        ('6','弃牌、事件与查阅','公共牌堆空时才洗回同长度弃牌。G/H 弃牌回公开库且签回签堆底，不洗牌。同名高级牌每人限一张。事件每周弃置，12张用尽才重洗；抽查每命中一个摸鱼槽都处罚一次，扣到0为止。全部牌型与技能门槛允许公开查阅，但不能自由购买牌库中的牌。')]:
        y=section(s,y,n,title,body)
    assert y<290,y
    s.end('实体同周多名玩家抽高级时，按本周起始玩家顺序处理；同一玩家按获得抽选的时间顺序处理。')
    s.begin('高级路线 / 公开图鉴','仅供规划，不是可直接购买的市场。门槛是累计技能数，不会消耗技能。')
    y=24
    for r in 'ABC':
        co=COLORS[r];s.rect(10,y,190,9,co,None,r=.6);icon(s,r,16,y+4.5,4,'#ffffff');s.text(22,y+6.4,r+' / '+RN[r],11,'B','#ffffff')
        y+=15
        for d in [d for d in CARDS if d['deck']=='高级' and d['route']==r]:
            s.text(12,y,d['code'],7,'CN',MUTED);s.text(30,y,d['name'],9,'B');s.text(76,y,d['requires'],9,'B',co)
            s.text(105,y,f'{hours(d)}h',8,'B')
            desc={'royalty':'每周版税 6','muse':'首个 A：灵感优惠 + 理智恢复','automation':'首个 B 副业：优惠 + 收入','remote':'周三白天自由','chain-store':'首个 C 副业：收入 + 理智','brand':'本周 A/B/C 齐全：收入 10'}.get(d['id'])
            if desc:s.text(119,y,'核 / '+desc,7.2,'CN',co)
            elif d.get('income'):s.text(119,y,'副业收入 '+str(d['gain']['money']),8,'CN',co)
            else:s.text(119,y,'下次副业 +2' if d.get('jobBonus') else '恢复与灵感',8,'CN',co)
            s.line(12,y+3,198,y+3,LINE,.15);y+=9
        y+=10
    s.para(10,271,'成长牌每方向6种，其中1种研讨活动可抽高级牌。积累技能不要求消耗归档牌；例如 AAB 是2个不同名的 A 经历与1个 B 经历。',190,8,4.5)
    s.end()
    for block in range(2):
        s.begin('公司事件 / '+('01–06' if block==0 else '07–12'),'全桌共一套 12 张；裁好洗匀。事件背面必须不可辨认。')
        for j in range(6):
            i=block*6+j;event_card(s,DATA['events'][i],i,12+(j%3)*64,21+(j//3)*85)
        if block==0:
            labels=[('1h / 亮4张','购买立即补位'),('2h / 亮3张','购买立即补位'),('4h / 亮2张','购买立即补位'),('起始玩家','周末顺时针传递'),('当前事件','全员锁定后揭晓'),('事件弃牌','抽完12张再洗')]
        else:labels=[(prefix+' / '+r+' '+RN[r],'抽选签 · 背面朝上') for prefix in ['成长','高级'] for r in 'ABC']
        for i,(a,b) in enumerate(labels):
            x=12+(i%3)*64;y=200+(i//3)*30;s.rect(x,y,59,24,PAPER,LINE,r=.5);s.text(x+29.5,y+10,a,10,'B',INK,'center');s.text(x+29.5,y+18,b,7,'CN',MUTED,'center');s.crop(x,y,59,24)
        s.end('7张抓包 / 2张团建 / 2张正面 / 1张平静。抓包不扣工资，团建不产生额外维护。')
    s.save();return s.path

def main():
    paths=[card_set(),player_set(),shared()]
    writer=PdfWriter()
    # Rules first; then a single common event set, then complete personal packets.
    writer.append(str(paths[2]))
    for _ in range(3):
        writer.append(str(paths[1]));writer.append(str(paths[0]))
    complete=OUT/'04-three-player-complete-A4.pdf'
    writer.add_metadata({'/Title':'逃离工位 | 三人完整打印包','/Author':'Escape Velocity'})
    with complete.open('wb') as f:writer.write(f)
    manifest['files'][complete.name]={'pages':len(writer.pages)}
    for p in [*paths,complete]:
        rd=PdfReader(p)
        for page in rd.pages:
            size=sorted(float(v)/MM for v in [page.mediabox.width,page.mediabox.height])
            assert abs(size[0]-210)<.1 and abs(size[1]-297)<.1
        assert all(page.extract_text().strip() for page in rd.pages)
    assert len(manifest['cards'])==61 and len(manifest['events'])==12
    assert len({d['id'] for d in manifest['cards']})==59
    assert all(any(d['name'] in p.extract_text() for p in PdfReader(paths[0]).pages) for d in CARDS)
    (OUT/'print-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(manifest['files'],ensure_ascii=False))

if __name__=='__main__':main()
