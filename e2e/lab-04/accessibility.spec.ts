import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const password='Local access password 123!';
const dbUrl=()=>process.env.DATABASE_URL||config.DATABASE_URL;

test('A11Y-01 keyboard-only flow, visible focus, landmarks and a clean console for every role',async({page})=>{
  if(new URL(dbUrl()).pathname!=='/toktickit_lab4_test')throw new Error('Isolated Lab 4 test database required');
  const db=new Client({connectionString:dbUrl()});await db.connect();
  const users:{id:number;email:string;role:string}[]=[];const tickets:number[]=[];
  const suffix=Date.now(),summary=`Access browser ${suffix}`;
  const problems:string[]=[];
  // The signed-out session check (/auth/me answering 401) is expected and logged by the browser itself.
  page.on('console',m=>{if(m.type()==='error'&&!m.location().url.includes('/auth/me'))problems.push(`console: ${m.text()} ${m.location().url}`)});
  page.on('pageerror',e=>problems.push(`pageerror: ${e.message}`));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/api/')&&!r.url().includes('/auth/me'))problems.push(`http ${r.status()} ${r.url()}`)});
  async function login(index:number){
    await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  }
  async function logout(){await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()}
  // Real keyboard focus (Tab) is what triggers :focus-visible; script focus() does not.
  async function tabTo(target:import('@playwright/test').Locator){
    await page.locator('body').click({position:{x:1,y:1}});
    for(let i=0;i<40;i++){await page.keyboard.press('Tab');if(await target.evaluate(el=>el===document.activeElement))return}
    throw new Error('Element is not reachable with the keyboard');
  }
  const focusRing=async()=>page.evaluate(()=>{const s=getComputedStyle(document.activeElement as Element);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2});
  async function landmarks(){
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading',{level:1})).toHaveCount(1);
    await expect(page.locator('nav [aria-current="page"]')).toHaveCount(1);
  }
  try {
    for(const [i,role] of (['IT_STAFF','REQUESTER','ADMINISTRATOR'] as const).entries()){
      const email=`access-${i}-${suffix}@example.test`,salt=randomBytes(16).toString('hex');
      const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
      const result=await db.query('INSERT INTO "RequesterUser" (name,email,role,"passwordHash","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,false,NOW()) RETURNING id',[`Access ${role}`,email,role,hash]);users.push({id:result.rows[0].id,email,role});
    }
    const t=await db.query('INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","currentStatus","updatedAt") VALUES ($1,$2,(SELECT id FROM "Category" LIMIT 1),(SELECT id FROM "RelatedSystem" LIMIT 1),$3,$4,\'LOW\',\'HIGH\',\'OPEN\',NOW()) RETURNING id',[`ACCESS-BROWSER-${suffix}`,users[1].id,summary,'Accessibility fixture.']);tickets.push(t.rows[0].id);

    // Staff: dashboard landmarks, focus ring, keyboard activation of a card into the queue.
    await login(0);
    await expect(page.getByRole('heading',{name:'IT Staff Dashboard',exact:true})).toBeVisible();await landmarks();
    await tabTo(page.getByRole('button',{name:'Dashboard',exact:true}));expect(await focusRing()).toBe(true);
    await tabTo(page.getByRole('button',{name:/^Unassigned/}));expect(await focusRing()).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading',{name:'Ticket Queue',exact:true})).toBeVisible();await landmarks();
    await expect(page.getByText(/Showing open tickets from the dashboard/)).toBeVisible();
    await tabTo(page.getByRole('button',{name:'Dashboard',exact:true}));await page.keyboard.press('Enter');
    await expect(page.getByRole('heading',{name:'IT Staff Dashboard',exact:true})).toBeVisible();
    await logout();

    // Requester: dashboard, My Tickets, ticket detail with the read-only actions list.
    await login(1);
    await expect(page.getByRole('heading',{name:'My Dashboard',exact:true})).toBeVisible();await landmarks();
    await tabTo(page.getByRole('button',{name:/^Open tickets/}));await page.keyboard.press('Enter');
    await expect(page.getByRole('heading',{name:'My Tickets',exact:true})).toBeVisible();
    await page.getByText(summary,{exact:true}).filter({visible:true}).first().click();
    await expect(page.getByRole('region',{name:'Actions Taken'})).toBeVisible();
    await page.getByRole('button',{name:'Create Ticket',exact:true}).click();
    await expect(page.getByLabel('Category')).toBeVisible();
    await logout();

    // Administrator: dashboard with user-account card, users screen.
    await login(2);
    await expect(page.getByRole('heading',{name:'Administrator Dashboard',exact:true})).toBeVisible();await landmarks();
    await tabTo(page.getByRole('button',{name:/^User accounts/}));await page.keyboard.press('Enter');
    await expect(page.getByRole('heading',{name:'User Management'})).toBeVisible();
    await logout();

    expect(problems).toEqual([]);
  }finally{
    for(const id of tickets){await db.query('DELETE FROM "ActionTaken" WHERE "ticketId"=$1',[id]);await db.query('DELETE FROM "TicketEntry" WHERE "ticketId"=$1',[id]);await db.query('DELETE FROM "Ticket" WHERE id=$1',[id])}
    for(const user of users){await db.query('DELETE FROM "Session" WHERE "userId"=$1',[user.id]);await db.query('DELETE FROM "RequesterUser" WHERE id=$1',[user.id])}await db.end();
  }
});
