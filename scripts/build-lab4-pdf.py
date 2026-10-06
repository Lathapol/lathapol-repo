"""Build the Lab 4 nine-part submission PDF from versioned documents and real evidence."""
from pathlib import Path
import re, html, json, math, textwrap, subprocess
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable, Preformatted, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/67070503475_Lab4_Submission.pdf'
BASE = 'https://github.com/Lathapol/lathapol-repo/blob/main/'
REPO = 'https://github.com/Lathapol/lathapol-repo'
SHOTS = ROOT / 'artifacts/lab-04/screenshots'
styles = getSampleStyleSheet()
for key in ['Normal', 'BodyText']:
    styles[key].fontName = 'Times-Roman'; styles[key].fontSize = 11; styles[key].leading = 14
for key in ['Title', 'Heading1', 'Heading2', 'Heading3']:
    styles[key].fontName = 'Times-Bold'
styles.add(ParagraphStyle('SmallLab', parent=styles['BodyText'], fontSize=9, leading=11, spaceAfter=5))
styles.add(ParagraphStyle('CellLab', parent=styles['BodyText'], fontSize=8.5, leading=10.5))
story = []

def inline(s):
    s = s.replace('–', '-').replace('—', '-').replace('‑', '-').replace('≥', '>=').replace('→', ' -> ').replace('…', '...').replace('·', '.')
    s = html.escape(s)
    def link(m):
        label, url = m.groups()
        if url.startswith('../../'): url = BASE + url[6:]
        elif not url.startswith('http'): url = BASE + 'docs/lab-04/' + url
        return '<a color="#006B3C" href="' + url + '">' + label + '</a>'
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, s)
    s = re.sub(r'`([^`]+)`', r'<font name="Courier" size="8">\1</font>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    return s

def p(s, style='BodyText'): story.append(Paragraph(inline(s), styles[style]))

def md(path):
    lines = (ROOT / path).read_text(encoding='utf-8-sig').splitlines(); i = 0; code = False
    p('[Repository source](' + BASE + path + ')', 'SmallLab')
    while i < len(lines):
        line = lines[i]; i += 1
        if line.startswith('```'): code = not code; continue
        if not line.strip(): story.append(Spacer(1, 4)); continue
        if line.startswith('|'):
            rows = [line]
            while i < len(lines) and lines[i].startswith('|'): rows.append(lines[i]); i += 1
            cells = []
            for row in rows:
                if re.match(r'^\|[\s:|\-]+$', row): continue
                cells.append([Paragraph(inline(x.strip()), styles['CellLab']) for x in row.strip().strip('|').split('|')])
            count = max(map(len, cells))
            cells = [r + [Paragraph('', styles['CellLab'])] * (count - len(r)) for r in cells]
            t = Table(cells, colWidths=[483 / count] * count, repeatRows=1, hAlign='LEFT')
            t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EAF6EF')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), .3, colors.lightgrey), ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5)])); story.append(t)
        elif line.startswith('#'):
            n = len(line) - len(line.lstrip('#')); p(line.lstrip('# '), 'Heading2' if n <= 2 else 'Heading3')
        else: p(line, 'SmallLab' if code else 'BodyText')

class Slice(Flowable):
    def __init__(self, path, y, h, width):
        Flowable.__init__(self); self.path = path; self.iw, self.ih = Image.open(path).size
        self.y = y; self.crop = min(h, self.ih - y); self.width = width; self.height = self.crop * width / self.iw
    def draw(self):
        c = self.canv; s = self.width / self.iw; c.saveState(); clip = c.beginPath(); clip.rect(0, 0, self.width, self.height); c.clipPath(clip, stroke=0)
        c.drawImage(str(self.path), 0, self.height - (self.ih - self.y) * s, width=self.width, height=self.ih * s); c.restoreState()

def rel(path): return Path(path).relative_to(ROOT).as_posix()

def tall(path, label, width=210, page_h=2100):
    """Tall captures are shown as consecutive vertical excerpts so text stays readable."""
    _, h = Image.open(path).size
    chunk = math.ceil(h / (2 * math.ceil(h / page_h))) if h > page_h / 2 else h
    for start in range(0, h, chunk * 2):
        story.append(PageBreak()); p(label + (' (continued)' if start else ''), 'Heading2')
        p('Original capture. Consecutive vertical excerpts; image content is unchanged.', 'SmallLab')
        pieces = [Slice(path, y, chunk, width) for y in [start, start + chunk] if y < h]
        story.append(Table([pieces], colWidths=[241.5] * len(pieces), style=[('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        p('[Open original PNG](' + BASE + rel(path) + ')', 'SmallLab')

def whole(path, label, maxh=235):
    iw, ih = Image.open(path).size; scale = min(483 / iw, maxh / ih)
    p(label, 'Heading3'); story.append(RLImage(str(path), width=iw * scale, height=ih * scale, hAlign='LEFT'))
    p('[Full-resolution screenshot](' + BASE + rel(path) + ')', 'SmallLab')

def part(n, title):
    story.append(PageBreak()); p('Answer Part ' + str(n), 'Heading1'); p(title, 'Heading2')

def run(*a): return subprocess.run(['git', '-c', f'safe.directory={ROOT.as_posix()}', *a], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout

p('CPE334 - Software Engineering', 'Title'); story.append(Spacer(1, 28))
p('Lab 4: TokTickIT', 'Title'); p('Actions Taken, dashboards and final regression', 'Heading2')
p('Lathapol Srikhiao - 67070503475'); p('Reviewer: Kittakorn Poungpien - 67070503401')
p('[GitHub repository](' + REPO + ')'); p('Prepared 6 October 2026')
story.append(Spacer(1, 25))
p('This submission follows the nine answer parts in the Lab 4 handout. Every feature PR was reviewed by Kittakorn-P and merged into lab4-staging; PR #63 released lab4-staging to main. All checks passed on a clean checkout of main commit a4dff3cd228463c841292927c352bdabe69305a5. The reflection is AI-assisted and marked as a draft for the student to rewrite; test execution is attributed to the assistant.')
for n, title in enumerate(['Git workflow and review', 'Specification-driven development', 'Tests and traceability', 'AI use and reflection', 'IT Staff dashboard', 'Actions Taken UI', 'Ticket workflow', 'Requester dashboard and regression', 'Zen Green, responsive, accessibility'], 1): p(f'Answer Part {n}: {title}')

part(1, 'Git use with engineering workflow')
md('docs/lab-04/reviewer.md')
p('Merge history on main', 'Heading2')
p('First-parent history of origin/main shows lab4-staging merged into main by PR #63; the feature PRs were merged into lab4-staging first.', 'SmallLab')
story.append(Preformatted(run('log', 'origin/main', '--first-parent', '--format=%h %ad %s', '--date=short', '-4'), ParagraphStyle('G', fontName='Courier', fontSize=7.5, leading=9.5)))
story.append(Preformatted(run('log', 'origin/lab4-staging', '--merges', '--format=%h %ad %s', '--date=short', '-9'), ParagraphStyle('G2', fontName='Courier', fontSize=7.5, leading=9.5)))
p('Issues: #49 contract, #50 Actions Taken foundation, #51 Actions Taken UI, #52 workflow, #53 dashboards, #54 hardening, #55 release.')
p('[GitHub Project](https://github.com/users/Lathapol/projects/3). GITHUB PROJECT SCREENSHOTS: insert the two board screenshots (top and bottom of the board) showing all Lab 4 issues in Done on the next two pages before submitting. They were not captured by the assistant because it cannot read the board.')
for label in ['GitHub Project - top of board (INSERT SCREENSHOT)', 'GitHub Project - bottom of board (INSERT SCREENSHOT)']:
    story.append(PageBreak()); p(label, 'Heading2'); story.append(Spacer(1, 400))
p('Repository setup and structure', 'Heading2'); p('[README and directory tree](' + BASE + 'README.md)'); p('[Ignore rules](' + BASE + '.gitignore)'); p('[Environment example](' + BASE + 'server/.env.example)')
p('Root: client/ (React UI), server/ (API, Prisma migrations and tests), e2e/ (browser tests), docs/lab-04/ (contract and review records), artifacts/lab-04/ (screenshots, migration report and verification logs), scripts/ (reproducible checks).')

part(2, 'Specification-driven development')
p('The contract below was written before implementation. Its Definition of Done checkboxes show the pre-implementation state; completion is documented in Parts 1 and 3. It was reviewed and merged as [PR #56](' + REPO + '/pull/56) on 24 September 2026, before implementation PRs #57 (24 Sep), #58 (24 Sep), #59 (27 Sep), #60 (27 Sep) and #61 (28 Sep) were merged.')
md('docs/lab-04/specification.md')

part(3, 'Test DD and traceability')
md('docs/lab-04/tests.md')
p('Final-main results', 'Heading2')
p('Passed on clean main commit a4dff3cd228463c841292927c352bdabe69305a5 on 6 October 2026. The complete terminal outputs follow; ANSI styling is removed and long lines wrap for readability.')
report = json.loads((ROOT / 'artifacts/lab-04/verification/report.json').read_text())
p('Tested commit recorded in report.json: ' + report['testedCommit'], 'SmallLab')
for step in report['steps']: p('[' + step['name'] + ' full output](' + BASE + step['log'] + ') - exit ' + str(step['exitCode']))
log_style = ParagraphStyle('LogLab', fontName='Courier', fontSize=7, leading=9)
for step in report['steps']:
    p(step['name'] + ' - complete output', 'Heading3')
    raw = (ROOT / step['log']).read_text(encoding='utf-8', errors='replace')
    raw = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', raw).replace('✓', 'PASS').replace('✔', 'PASS').replace('›', '>').replace('→', '->').replace('─', '-').replace('×', 'x')
    raw = raw.encode('ascii', 'replace').decode()
    wrapped = '\n'.join('\n'.join(textwrap.wrap(line, 108, replace_whitespace=False, drop_whitespace=False)) if line else '' for line in raw.splitlines())
    story.append(Preformatted(wrapped or '(No terminal output; exit code 0.)', log_style))

part(4, 'AI use with reflection')
md('docs/lab-04/ai-use.md')

part(5, 'Working IT Staff dashboard UI')
p('Metrics are calculated by the backend (see API-11, API-12 and PERF-01 in Part 3): dashboard counts are compared with direct database counts and with the totalCount of the matching drill-down list, role denials return 403/401, and empty datasets return zeros. The browser test dashboards.spec.ts clicks a card into the filtered Ticket Queue, clears the filter banner and opens a ticket from a list row. Component tests cover loading, empty, forbidden and safe-failure states. The numbers shown are from the shared local test database, which holds many fixture tickets.')
md('docs/lab-04/issue-05.md')
for v in ['mobile', 'tablet', 'desktop']: tall(SHOTS / 'staff-dashboard' / f'{v}.png', f'IT Staff dashboard - {v}', width=210 if v == 'mobile' else 228, page_h=2100 if v == 'mobile' else 3200)

part(6, 'Working Actions Taken UI')
p('Real-browser scenarios list, add and edit actions, show different performers on one ticket, validate the follow-up rule, show the requester read-only view and lock a closed ticket. API tests cover inactive/forbidden roles, stale versions, duplicate request keys and safe failures (API-01..API-07).')
md('docs/lab-04/issue-03.md')
for v, w, h in [('mobile', 210, 2100), ('tablet', 228, 3200), ('desktop', 228, 3200)]:
    tall(SHOTS / 'actions-taken' / f'{v}-staff.png', f'Actions Taken, staff - {v}', width=w, page_h=h)
    tall(SHOTS / 'actions-taken' / f'{v}-requester.png', f'Actions Taken, requester read-only - {v}', width=w, page_h=h)

part(7, 'Working Ticket workflow')
p('The transition matrix is tested for every from/to pair, the resolution gate returns ACTION_REQUIRED without an action, terminal statuses have no exits, and the requester signal never changes the status. Actions are ordered oldest first with an id tie-break and are never deleted (append-only).')
md('docs/lab-04/issue-04.md')
for v in ['desktop', 'tablet', 'mobile']:
    story.append(PageBreak()); p('Ticket workflow - ' + v, 'Heading2')
    whole(SHOTS / 'ticket-workflow' / f'{v}-gate-blocked.png', 'Resolved blocked until an action is logged', maxh=330)
    whole(SHOTS / 'ticket-workflow' / f'{v}-resolved.png', 'After an action is logged: Resolved, next options Closed or Reopened', maxh=330)

part(8, 'Requester dashboard and final regression')
p('The Requester dashboard returns only the caller\'s own metrics (API-10), empty accounts show zeros (API-13), and counts equal the drill-down list. Regression evidence: the full Lab 3 browser suite (15 scenarios covering login, My Tickets, ticket detail, attachments, public comments, staff functions, internal notes and administrator user management) and all Lab 1-3 server and client tests pass on main (Part 3).')
for v in ['mobile', 'tablet', 'desktop']:
    story.append(PageBreak()); whole(SHOTS / 'requester-dashboard' / f'{v}.png', 'Requester dashboard - ' + v, maxh=420)

part(9, 'Zen Green UI, responsive behavior, accessibility and final polish')
md('docs/lab-04/ui-spec.md')
p('Evidence for the checklist above: the accessibility browser test (accessibility.spec.ts, RESP-01 and A11Y-01 in Part 3) checks real keyboard navigation with a visible focus ring, one main landmark and one h1 and one active nav item per screen, and no console errors or failing API calls for all three roles at 1440x1000, 820x1180 and 390x844. Issue 6 restored a focus ring Bootstrap was hiding and moves focus to the first invalid field. Desktop, tablet and mobile screenshots of every major Lab 4 screen are in Parts 5-8.')
md('docs/lab-04/issue-06.md')

def footer(canvas, doc):
    canvas.setFont('Times-Roman', 9); canvas.drawCentredString(297.6, 25, str(doc.page)); canvas.setFont('Times-Roman', 8)
    canvas.drawString(54, 817, 'LAB 4 - FINAL-MAIN EVIDENCE'); canvas.drawRightString(541, 817, '67070503475')
OUT.parent.mkdir(parents=True, exist_ok=True)
SimpleDocTemplate(str(OUT), pagesize=(595.28, 841.89), rightMargin=56, leftMargin=56, topMargin=45, bottomMargin=42, title='Lab 4 - Lathapol - Submission', author='Lathapol Srikhiao').build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
