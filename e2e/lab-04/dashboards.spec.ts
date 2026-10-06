import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync,mkdirSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const password='Local dashboard password 123!';
const dbUrl=()=>process.env.DATABASE_URL||config.DATABASE_URL;

test('E2E-03 role dashboards show metrics, drill-down to the filtered list, and rows open a ticket',async({page},info)=>{
  if(new URL(dbUrl()).pathname!=='/toktickit_lab4_test')throw new Error('Isolated Lab 4 test database required');
  const db=new Client({connectionString:dbUrl()});await db.connect();
  const users:{id:number;email:string}[]=[];const tickets:number[]=[];
  const suffix=Date.now(),summary=`Dash browser ${suffix}`,names=['Dash Staff','Dash Requester'];
  const shots='artifacts/lab-04/screenshots/staff-dashboard',rshots='artifacts/lab-04/screenshots/requester-dashboard';
  mkdirSync(shots,{recursive:true});mkdirSync(rshots,{recursive:true});
  async function login(index:number){
    await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.getByRole('heading',{name:index===1?'My Dashboard':'IT Staff Dashboard',exact:true})).toBeVisible();
  }
  async function logout(){await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()}
  const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  try {
    for(const [i,role] of (['IT_STAFF','REQUESTER'] as const).entries()){
      const email=`dash-${i}-${suffix}@example.test`,salt=randomBytes(16).toString('hex');
      const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
      const result=await db.query('INSERT INTO "RequesterUser" (name,email,role,"passwordHash","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,false,NOW()) RETURNING id',[names[i],email,role,hash]);users.push({id:result.rows[0].id,email});
    }
    const open=await db.query('INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","currentStatus","updatedAt") VALUES ($1,$2,(SELECT id FROM "Category" LIMIT 1),(SELECT id FROM "RelatedSystem" LIMIT 1),$3,$4,\'LOW\',\'HIGH\',\'OPEN\',NOW()) RETURNING id',[`DASH-BROWSER-${suffix}`,users[1].id,summary,'Dashboard drill-down fixture.']);tickets.push(open.rows[0].id);
    await db.query('UPDATE "Ticket" SET "ownerId"=$1 WHERE id=$2',[users[0].id,open.rows[0].id]);

    // Staff dashboard: metric card drills into the filtered queue, and a list row opens the ticket directly.
    await login(0);
    await page.screenshot({path:`${shots}/${info.project.name}.png`,fullPage:true});await noOverflow();
    await page.getByRole('button',{name:/My tickets/}).click();
    await expect(page.getByRole('heading',{name:'Ticket Queue',exact:true})).toBeVisible();
    await expect(page.getByText(/Showing open tickets from the dashboard/)).toBeVisible();
    await expect(page.getByText(summary,{exact:true}).filter({visible:true}).first()).toBeVisible();
    await page.getByRole('button',{name:'Clear this filter'}).click();
    await expect(page.getByText(/Showing open tickets/)).toHaveCount(0);
    await page.getByRole('button',{name:'Dashboard',exact:true}).click();
    await expect(page.getByRole('heading',{name:'IT Staff Dashboard',exact:true})).toBeVisible();
    await page.getByRole('button',{name:new RegExp(summary)}).first().click();
    await expect(page.getByRole('heading',{name:'Ticket workflow',exact:true})).toBeVisible();
    await logout();

    // Requester dashboard: same pattern into My Tickets.
    await login(1);
    await page.screenshot({path:`${rshots}/${info.project.name}.png`,fullPage:true});await noOverflow();
    await page.getByRole('button',{name:/Open tickets/}).click();
    await expect(page.getByRole('heading',{name:'My Tickets',exact:true})).toBeVisible();
    await expect(page.getByText(/Showing open tickets from your dashboard/)).toBeVisible();
    await expect(page.getByText(summary,{exact:true}).filter({visible:true}).first()).toBeVisible();
    await logout();
  }finally{
    for(const id of tickets){await db.query('DELETE FROM "ActionTaken" WHERE "ticketId"=$1',[id]);await db.query('DELETE FROM "TicketEntry" WHERE "ticketId"=$1',[id]);await db.query('DELETE FROM "Ticket" WHERE id=$1',[id])}
    for(const user of users){await db.query('DELETE FROM "Session" WHERE "userId"=$1',[user.id]);await db.query('DELETE FROM "RequesterUser" WHERE id=$1',[user.id])}await db.end();
  }
});
