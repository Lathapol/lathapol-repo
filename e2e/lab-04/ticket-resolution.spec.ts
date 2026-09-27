import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync,mkdirSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const password='Local resolution password 123!';
const dbUrl=()=>process.env.DATABASE_URL||config.DATABASE_URL;

test('E2E-02 resolution gate: cannot resolve without an action, resolves after one, requester signal stays advisory',async({page},info)=>{
  if(new URL(dbUrl()).pathname!=='/toktickit_lab4_test')throw new Error('Isolated Lab 4 test database required');
  const db=new Client({connectionString:dbUrl()});await db.connect();
  const users:{id:number;email:string}[]=[];const tickets:number[]=[];
  const suffix=Date.now(),summary=`Resolution browser ${suffix}`,signalSummary=`Signal browser ${suffix}`,names=['Gate Support','Gate Requester'];
  async function login(index:number){
    await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.getByRole('heading',{name:index===1?'My Tickets':'Ticket Queue',exact:true})).toBeVisible();
  }
  async function logout(){await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()}
  async function openStaff(text:string){await page.getByLabel('Search',{exact:true}).fill(text);await page.getByRole('button',{name:'Apply filters'}).click();await page.getByRole('button',{name:/^Open /}).filter({visible:true}).first().click();await expect(page.getByRole('heading',{name:'Ticket workflow',exact:true})).toBeVisible()}
  const workflow=()=>page.getByRole('region',{name:'Ticket workflow'});
  const actions=()=>page.getByRole('region',{name:'Actions Taken'});
  const status=()=>page.getByRole('combobox',{name:'Change status',exact:true});
  const shots='artifacts/lab-04/screenshots/ticket-workflow';mkdirSync(shots,{recursive:true});
  try {
    for(const [i,role] of (['IT_STAFF','REQUESTER'] as const).entries()){
      const email=`gate-${i}-${suffix}@example.test`,salt=randomBytes(16).toString('hex');
      const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
      const result=await db.query('INSERT INTO "RequesterUser" (name,email,role,"passwordHash","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,false,NOW()) RETURNING id',[names[i],email,role,hash]);users.push({id:result.rows[0].id,email});
    }
    for(const [n,text] of [[1,summary],[2,signalSummary]] as const){
      const result=await db.query('INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","currentStatus","updatedAt") VALUES ($1,$2,(SELECT id FROM "Category" LIMIT 1),(SELECT id FROM "RelatedSystem" LIMIT 1),$3,$4,\'LOW\',\'LOW\',\'IN_PROGRESS\',NOW()) RETURNING id',[`RES-BROWSER-${n}-${suffix}`,users[1].id,text,'The application will not start. Please investigate.']);tickets.push(result.rows[0].id);
    }

    // Staff: Resolved is blocked until an action exists, then works and the summary refreshes.
    await login(0);await openStaff(summary);
    await expect(status().locator('option')).toHaveText(['Keep IN PROGRESS','WAITING FOR REQUESTER','RESOLVED','CANCELLED']);
    await status().selectOption('RESOLVED');
    await expect(workflow().getByText(/Log an action first/)).toBeVisible();
    await expect(workflow().getByRole('button',{name:'Save changes'})).toBeDisabled();
    await workflow().screenshot({path:`${shots}/${info.project.name}-gate-blocked.png`});
    await actions().getByRole('button',{name:'Add action'}).click();
    await actions().getByLabel('Action description').fill('Reinstalled the application');await actions().getByLabel('Result').fill('Application starts normally');
    await actions().getByRole('button',{name:'Save action'}).click();await expect(actions().getByText('Action added.',{exact:true})).toBeVisible();
    await expect(workflow().getByText(/Log an action first/)).toHaveCount(0);
    await workflow().getByRole('checkbox').check();await workflow().getByRole('button',{name:'Save changes'}).click();
    await expect(workflow()).toContainText('Status: RESOLVED');
    await expect(page.getByText('RESOLVED',{exact:true}).first()).toBeVisible();
    await expect(status().locator('option')).toHaveText(['Keep RESOLVED','CLOSED','REOPENED']);
    await workflow().screenshot({path:`${shots}/${info.project.name}-resolved.png`});
    await logout();

    // Requester sees the resolved status and cannot change it.
    await login(1);await page.getByText(summary,{exact:true}).filter({visible:true}).first().click();
    await expect(workflow()).toContainText('Status: RESOLVED');await expect(page.getByLabel('Change status')).toHaveCount(0);
    await logout();

    // Requester signal on the other ticket does not change its status.
    await login(1);await page.getByText(signalSummary,{exact:true}).filter({visible:true}).first().click();
    await page.getByRole('button',{name:'This appears resolved'}).click();
    await expect(page.getByText(/Requester reported apparent resolution/)).toBeVisible();await expect(workflow()).toContainText('Status: IN PROGRESS');
    await logout();
    await login(0);await openStaff(signalSummary);
    await expect(workflow()).toContainText('Status: IN PROGRESS');await expect(page.getByText(/Requester reported apparent resolution/)).toBeVisible();
    await status().selectOption('RESOLVED');await expect(workflow().getByText(/Log an action first/)).toBeVisible();
    await logout();

    // Closing the first ticket ends the workflow and locks the actions list.
    await login(0);await openStaff(summary);
    await status().selectOption('CLOSED');await workflow().getByRole('checkbox').check();await workflow().getByRole('button',{name:'Save changes'}).click();
    await expect(workflow()).toContainText('Status: CLOSED');await expect(status().locator('option')).toHaveText(['Keep CLOSED']);
    await expect(actions().getByText(/closed or cancelled/)).toBeVisible();
    await logout();
  }finally{
    for(const id of tickets){await db.query('DELETE FROM "ActionTaken" WHERE "ticketId"=$1',[id]);await db.query('DELETE FROM "TicketEntry" WHERE "ticketId"=$1',[id]);await db.query('DELETE FROM "Ticket" WHERE id=$1',[id])}
    for(const user of users){await db.query('DELETE FROM "Session" WHERE "userId"=$1',[user.id]);await db.query('DELETE FROM "RequesterUser" WHERE id=$1',[user.id])}await db.end();
  }
});
