import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const password='Local workflow password 123!';

test('staff workflow, private notes, requester signal and admin read-only view',async({page},info)=>{
  if(new URL(config.DATABASE_URL).pathname!=='/toktickit_lab3_test')throw new Error('Isolated test database required');
  const db=new Client({connectionString:config.DATABASE_URL});await db.connect();
  const users:{id:number;email:string}[]=[];let ticketId:number|undefined;
  const suffix=Date.now(),summary=`Workflow browser ${suffix}`;
  async function login(index:number){
    await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    if(index===2)await page.getByRole('button',{name:'Ticket Queue',exact:true}).click();
    await expect(page.getByRole('heading',{name:index===1?'My Tickets':'Ticket Queue',exact:true})).toBeVisible();
  }
  async function logout(){await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()}
  async function openStaff(){await page.getByLabel('Search',{exact:true}).fill(summary);await page.getByRole('button',{name:'Apply filters'}).click();await page.getByRole('button',{name:/^Open /}).filter({visible:true}).first().click();await expect(page.getByRole('heading',{name:'Ticket workflow',exact:true})).toBeVisible()}
  async function saveStatus(status:string){await page.getByRole('combobox',{name:'Change status',exact:true}).selectOption(status);if(['RESOLVED','CLOSED','CANCELLED'].includes(status))await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Save changes'}).click();await expect(page.getByRole('combobox',{name:'Change status',exact:true})).toHaveValue('');await expect(page.getByRole('region',{name:'Ticket workflow'})).toContainText(`Status: ${status}`)}
  try {
    for(const role of ['IT_STAFF','REQUESTER','ADMINISTRATOR']){
      const email=`workflow-${role.toLowerCase()}-${suffix}@example.test`,salt=randomBytes(16).toString('hex');
      const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
      const result=await db.query('INSERT INTO "RequesterUser" (name,email,role,"passwordHash","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,false,NOW()) RETURNING id',[role==='IT_STAFF'?'Support Staff':role==='REQUESTER'?'Test Requester':'Test Administrator',email,role,hash]);users.push({id:result.rows[0].id,email});
    }
    const result=await db.query('INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","updatedAt") VALUES ($1,$2,(SELECT id FROM "Category" LIMIT 1),(SELECT id FROM "RelatedSystem" LIMIT 1),$3,$4,\'LOW\',\'LOW\',NOW()) RETURNING id',[`WF-BROWSER-${suffix}`,users[1].id,summary,'The printer is unavailable. Please investigate.']);ticketId=result.rows[0].id;
    await login(0);await openStaff();await page.getByRole('button',{name:'Claim ticket'}).click();await expect(page.getByRole('region',{name:'Ticket workflow'})).toContainText('Owner: Support Staff');
    await page.getByRole('combobox',{name:'IT priority',exact:true}).selectOption('HIGH');await saveStatus('OPEN');
    await page.getByLabel('New internal note').fill('Private diagnosis: inspect the print service.');await page.getByRole('button',{name:'Post internal note'}).click();await expect(page.getByText('Internal note posted.',{exact:true})).toBeVisible();
    await page.getByLabel('New public comment').fill('Please try printing again.');await page.getByRole('button',{name:'Post comment'}).click();await expect(page.getByText('Comment posted.',{exact:true})).toBeVisible();
    await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-staff.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    if(info.project.name==='desktop'){await page.setViewportSize({width:820,height:1180});await page.screenshot({path:'artifacts/lab-03/issue7-tablet-staff.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.setViewportSize({width:1440,height:1000})}
    await logout();await login(1);await page.getByText(summary,{exact:true}).filter({visible:true}).first().click();await expect(page.getByText('Please try printing again.',{exact:true})).toBeVisible();
    await expect(page.getByText('Internal Notes',{exact:true})).toHaveCount(0);await expect(page.getByText('Private diagnosis: inspect the print service.',{exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'This appears resolved'}).click();await expect(page.getByText(/Requester reported apparent resolution/)).toBeVisible();
    await page.getByLabel('New public comment').fill('Printing works now, thanks.');await page.getByRole('button',{name:'Post comment'}).click();await expect(page.getByText('Comment posted.',{exact:true})).toBeVisible();
    await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-requester.png`,fullPage:true});
    await logout();await login(0);await openStaff();await saveStatus('RESOLVED');await saveStatus('REOPENED');await expect(page.getByText(/Requester reported apparent resolution/)).toHaveCount(0);
    await logout();await login(2);await openStaff();await expect(page.getByText('Private diagnosis: inspect the print service.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Save changes'})).toHaveCount(0);await expect(page.getByLabel('New public comment')).toHaveCount(0);await expect(page.getByLabel('New internal note')).toHaveCount(0);
    await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-admin.png`,fullPage:true});await logout();
  }finally{
    if(ticketId){await db.query('DELETE FROM "TicketEntry" WHERE "ticketId"=$1',[ticketId]);await db.query('DELETE FROM "Ticket" WHERE id=$1',[ticketId])}
    for(const user of users){await db.query('DELETE FROM "Session" WHERE "userId"=$1',[user.id]);await db.query('DELETE FROM "RequesterUser" WHERE id=$1',[user.id])}await db.end();
  }
});
