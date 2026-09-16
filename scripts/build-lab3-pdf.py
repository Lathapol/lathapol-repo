"""Build the review draft from versioned Lab 3 documents and original evidence."""
from pathlib import Path
import re, html, json, math, textwrap
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/67070503475_Lab3_Submission.pdf'
BASE = 'https://github.com/Lathapol/lathapol-repo/blob/codex/lab3-final-evidence/'
styles = getSampleStyleSheet()
for key in ['Normal','BodyText']:
    styles[key].fontName='Times-Roman'; styles[key].fontSize=11; styles[key].leading=14
for key in ['Title','Heading1','Heading2','Heading3']:
    styles[key].fontName='Times-Bold'
styles.add(ParagraphStyle('SmallLab',parent=styles['BodyText'],fontSize=9,leading=11,spaceAfter=5))
styles.add(ParagraphStyle('CellLab',parent=styles['BodyText'],fontSize=8.5,leading=10.5))
story=[]

def inline(s):
    s=s.replace('\u2013','-').replace('\u2014','-').replace('\u2011','-').replace('\u2265','>=').replace('\u2192',' -> ')
    s=html.escape(s)
    def link(m):
        label,url=m.groups()
        if url.startswith('../../'): url=BASE+url[6:]
        elif not url.startswith('http'): url=BASE+'docs/lab-03/'+url
        return '<a color="#006B3C" href="'+url+'">'+label+'</a>'
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,s)
    s=re.sub(r'`([^`]+)`',r'<font name="Courier" size="8">\1</font>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    return s

def p(s,style='BodyText'): story.append(Paragraph(inline(s),styles[style]))
def md(path):
    lines=(ROOT/path).read_text(encoding='utf-8-sig').splitlines(); i=0; code=False
    p('[Repository source]('+BASE+path+')','SmallLab')
    while i<len(lines):
        line=lines[i]; i+=1
        if line.startswith('```'): code=not code; continue
        if not line.strip(): story.append(Spacer(1,4)); continue
        if line.startswith('|'):
            rows=[line]
            while i<len(lines) and lines[i].startswith('|'): rows.append(lines[i]); i+=1
            cells=[]
            for row in rows:
                if re.match(r'^\|[\s:|\-]+$',row): continue
                cells.append([Paragraph(inline(x.strip()),styles['CellLab']) for x in row.strip('|').split('|')])
            count=max(map(len,cells))
            cells=[r+[Paragraph('',styles['CellLab'])]*(count-len(r)) for r in cells]
            t=Table(cells,colWidths=[483/count]*count,repeatRows=1,hAlign='LEFT')
            t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EAF6EF')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.3,colors.lightgrey),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5)]));story.append(t)
        elif line.startswith('#'):
            n=len(line)-len(line.lstrip('#'));p(line.lstrip('# '),'Heading2' if n<=2 else 'Heading3')
        else: p(line,'SmallLab' if code else 'BodyText')

class ScreenshotSlice(Flowable):
    def __init__(self,path,y,h,width=228):
        Flowable.__init__(self);self.path=path;self.iw,self.ih=Image.open(path).size
        self.y=y;self.crop=min(h,self.ih-y);self.width=width;self.height=self.crop*width/self.iw
    def draw(self):
        c=self.canv;s=self.width/self.iw;c.saveState();clip=c.beginPath();clip.rect(0,0,self.width,self.height);c.clipPath(clip,stroke=0)
        c.drawImage(str(self.path),0,self.height-(self.ih-self.y)*s,width=self.width,height=self.ih*s)
        c.restoreState()

def mobile(name,label,first=False):
    path=ROOT/f'artifacts/lab-03/issue7-mobile-{name}.png'
    _,h=Image.open(path).size
    chunk=math.ceil(h/(2*math.ceil(h/2100))) if h>1050 else h
    for start in range(0,h,chunk*2):
        if start or not first: story.append(PageBreak())
        p(label+(' (continued)' if start else ''),'Heading2')
        p('Original mobile capture, 390 x 844 viewport. Consecutive vertical excerpts; image content is unchanged.','SmallLab')
        pieces=[ScreenshotSlice(path,y,chunk,width=210) for y in [start,start+chunk] if y<h]
        story.append(Table([pieces],colWidths=[241.5]*len(pieces),style=[('VALIGN',(0,0),(-1,-1),'TOP')]))
        p('[Open original PNG]('+BASE+path.relative_to(ROOT).as_posix()+')','SmallLab')

def overview(view,name):
    path=ROOT/f'artifacts/lab-03/issue7-{view}-{name}.png'
    iw,ih=Image.open(path).size
    from reportlab.platypus import Image as RLImage
    scale=min(483/iw,235/ih)
    p(view.capitalize()+' - '+name,'Heading3');story.append(RLImage(str(path),width=iw*scale,height=ih*scale,hAlign='LEFT'))
    p('[Full-resolution screenshot]('+BASE+path.relative_to(ROOT).as_posix()+')','SmallLab')

def part(n,title):
    story.append(PageBreak());p('Answer Part '+str(n),'Heading1');p(title,'Heading2')

p('CPE334 - Software Engineering','Title');story.append(Spacer(1,28))
p('Lab 3: TokTickIT','Title');p('Final-main verification: all checks passed','Heading2')
p('Lathapol Srikhiao - 67070503475');p('Reviewer: Kittakorn Poungpien - 67070503401')
p('[GitHub repository](https://github.com/Lathapol/lathapol-repo)');p('Prepared 16 September 2026')
story.append(Spacer(1,25))
p('This submission follows the nine answer parts in the Lab 3 handout and the simple layout of the supplied Lab 2 submission. All feature and cleanup PRs were peer reviewed and merged into lab3-staging, then PR #47 released them to main. All checks passed on main commit 43e6c0605766586f7bacafde882da1a06ab1e9c2. The reflection is AI-assisted; test execution is attributed to the assistant.')
for n,title in enumerate(['Git workflow','Specification-driven development','Tests and traceability','AI use and reflection','Authentication and requester UI','IT Staff queue','Ticket workflow and communication','Administrator users','Zen Green and responsive UI'],1): p(f'Answer Part {n}: {title}')
part(1,'Git workflow and review');md('docs/lab-03/reviewer.md');md('docs/lab-03/issue-08.md')
p('[GitHub Project](https://github.com/users/Lathapol/projects/3)');p('PR #47 records the reviewed staging-to-main release. The Project showed all eight Lab 3 issues in Done on 16 September 2026. The following two screenshots cover the complete list.')

from reportlab.platypus import Image as RLImage
for image_name in ['final-project-top.png','final-project-bottom.png']:
    story.append(PageBreak());p('GitHub Project - all eight Lab 3 items in Done','Heading2')
    path=ROOT/'artifacts/lab-03'/image_name;iw,ih=Image.open(path).size
    story.append(RLImage(str(path),width=483,height=ih*483/iw))
p('Repository setup and structure','Heading2');p('[README and directory tree]('+BASE+'README.md)');p('[Ignore rules]('+BASE+'.gitignore)');p('[Environment example]('+BASE+'server/.env.example)')
p('Root: client/ (React UI), server/ (API, Prisma migrations and tests), e2e/ (browser tests), docs/lab-03/ (contract and review records), artifacts/lab-03/ (real verification evidence), scripts/ (reproducible checks).')
part(2,'Specification-driven development');p('The original contract below is preserved as specification-first evidence. Its unchecked definition of done and planning notes describe the pre-implementation state; final completion is documented in Parts 1 and 3.');p('The contract was reviewed in PR #36 and merged before implementation PR #40. [Specification-first review](https://github.com/Lathapol/lathapol-repo/pull/36).');md('docs/lab-03/specification.md')
part(3,'Tests and traceability');md('docs/lab-03/tests.md')
p('Final-main results','Heading2');p('The recorded 160 server, 26 client and 15 browser tests passed on merged main commit 43e6c0605766586f7bacafde882da1a06ab1e9c2 on 16 September 2026. Every build and type check exited successfully. The complete terminal outputs follow; ANSI styling is removed and long lines wrap for readability.')
report=json.loads((ROOT/'artifacts/lab-03/verification/report.json').read_text())
for step in report['steps']: p('['+step['name']+' full output]('+BASE+step['log']+') - exit '+str(step['exitCode']))

log_style=ParagraphStyle('LogLab',fontName='Courier',fontSize=7,leading=9)
for step in report['steps']:
    p(step['name']+' - complete output','Heading3')
    raw=(ROOT/step['log']).read_text(encoding='utf-8',errors='replace')
    raw=re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',raw).replace('✓','PASS').replace('✔','PASS').replace('›','>').replace('→','->').replace('─','-').replace('×','x')
    raw=raw.encode('ascii','replace').decode()
    wrapped='\n'.join('\n'.join(textwrap.wrap(line,108,replace_whitespace=False,drop_whitespace=False)) if line else '' for line in raw.splitlines())
    story.append(Preformatted(wrapped or '(No terminal output; exit code 0.)',log_style))
part(4,'AI use and reflection');md('docs/lab-03/ai-use.md')
part(5,'Login, mandatory password change and requester UI');p('Real-browser scenarios cover login, initial password change, authenticated create/upload/list/detail and logout. API and component tests cover invalid/inactive credentials, failed requests, busy states and direct role/ownership rejection. See Answer Part 3 for exact test paths. Screenshots show successful states; they do not independently prove every negative case.')
mobile('login','Login',first=True);mobile('password-change','Mandatory password change');mobile('create-ticket','Authenticated ticket creation')
part(6,'IT Staff ticket queue');p('Queue API tests cover combined filters, stable sorting and pagination. Browser scenarios open tickets for staff and read-only administrators. Component checks cover loading, empty and failure states.');mobile('IT_STAFF','IT Staff queue',first=True)
part(7,'Staff workflow and communication');p('Workflow tests exercise ownership, competing claims, every status transition pair, confirmation, public/private communication, requester resolution signal and role restrictions. Real browser flows verify claim, status updates, public comments, internal notes, requester reply/signal and reopening.');mobile('staff','Staff ticket detail',first=True);mobile('requester','Requester ticket detail')
part(8,'Administrator user management');p('API tests cover normalized duplicate emails, safe responses, resets and session revocation, self-deactivation and concurrent last-administrator protection. Browser flows create, edit, deactivate, reactivate and reset an account, then require its new password.');mobile('users','Administrator users',first=True);mobile('edit','Edit user')
part(9,'Zen Green and responsive UI');md('docs/lab-03/ui-spec.md');p('Completed inspection record','Heading2');p('The issue 7 verification record documents visual inspection across desktop, tablet and mobile, plus native keyboard controls, labels, role navigation, text badges, wrapping and absence of page overflow. Mobile excerpts appear in Parts 5-8. The following desktop/tablet images show layout overviews; linked originals provide full detail.');p('[Completed visual checklist]('+BASE+'docs/lab-03/tests.md)')
for name in ['login','IT_STAFF','staff','users']:
    story.append(PageBreak());p(name+' - responsive comparison','Heading2');overview('desktop',name);overview('tablet',name)

def footer(canvas,doc):
    canvas.setFont('Times-Roman',9);canvas.drawCentredString(297.6,25,str(doc.page));canvas.setFont('Times-Roman',8);canvas.drawString(54,817,'LAB 3 - FINAL-MAIN EVIDENCE');canvas.drawRightString(541,817,'67070503475')
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),rightMargin=56,leftMargin=56,topMargin=45,bottomMargin=42,title='Lab 3 - Lathapol - Submission',author='Lathapol Srikhiao').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
