import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync,mkdirSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const password='Local actions password 123!';

test('E2E-01 staff add and edit actions, different performers, requester read-only, responsive',async({page},info)=>{
  if(new URL(process.env.DATABASE_URL||config.DATABASE_URL).pathname!=='/toktickit_lab4_test')throw new Error('Isolated Lab 4 test database required');
  const db=new Client({connectionString:process.env.DATABASE_URL||config.DATABASE_URL});await db.connect();
  const users:{id:number;email:string}[]=[];let ticketId:number|undefined;
  const suffix=Date.now(),summary=`Actions browser ${suffix}`,names=['Alex Support','Morgan Support','Test Requester'];
  const shots=`artifacts/lab-04/screenshots/actions-taken`;mkdirSync(shots,{recursive:true});
  async function login(index:number){
    await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.getByRole('heading',{name:index===2?'My Tickets':'Ticket Queue',exact:true})).toBeVisible();
  }
  async function logout(){await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible()}
  async function openTicket(staff:boolean){
    if(staff){await page.getByLabel('Search',{exact:true}).fill(summary);await page.getByRole('button',{name:'Apply filters'}).click();await page.getByRole('button',{name:/^Open /}).filter({visible:true}).first().click()}
    else await page.getByText(summary,{exact:true}).filter({visible:true}).first().click();
    await expect(page.getByRole('region',{name:'Actions Taken'})).toBeVisible();
  }
  const region=()=>page.getByRole('region',{name:'Actions Taken'});
  const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  try {
    for(const [i,role] of (['IT_STAFF','IT_STAFF','REQUESTER'] as const).entries()){
      const email=`actions-${i}-${suffix}@example.test`,salt=randomBytes(16).toString('hex');
      const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
      const result=await db.query('INSERT INTO "RequesterUser" (name,email,role,"passwordHash","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,false,NOW()) RETURNING id',[names[i],email,role,hash]);users.push({id:result.rows[0].id,email});
    }
    const result=await db.query('INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","currentStatus","updatedAt") VALUES ($1,$2,(SELECT id FROM "Category" LIMIT 1),(SELECT id FROM "RelatedSystem" LIMIT 1),$3,$4,\'LOW\',\'LOW\',\'IN_PROGRESS\',NOW()) RETURNING id',[`ACT-BROWSER-${suffix}`,users[2].id,summary,'The mailbox stopped syncing. Please investigate.']);ticketId=result.rows[0].id;

    // First staff member: empty state, validation, add an action by keyboard.
    await login(0);await openTicket(true);
    await expect(region().getByText('No actions recorded yet.')).toBeVisible();
    await region().getByRole('button',{name:'Add action'}).focus();await page.keyboard.press('Enter');
    await expect(region().getByRole('form',{name:'Add action'})).toBeVisible();
    await region().getByRole('button',{name:'Save action'}).click();
    await expect(region().getByText('Enter a description of 1 to 2000 characters.')).toBeVisible();
    await region().getByLabel('Action description').fill('Reset the mailbox profile');await region().getByLabel('Result').fill('Mailbox syncs again');
    await region().getByLabel('Follow-up required').check();await region().getByRole('button',{name:'Save action'}).click();
    await expect(region().getByText(/Enter a follow-up note/)).toBeVisible();
    await region().getByLabel(/Follow-up note/).fill('Check again on Friday');await region().getByLabel(/Attachment notes/).fill('See screenshot mailbox.png');
    await region().getByRole('button',{name:'Save action'}).click();
    await expect(region().getByText('Action added.',{exact:true})).toBeVisible();
    await expect(region().getByText('Reset the mailbox profile')).toBeVisible();await expect(region().getByText('Yes: Check again on Friday')).toBeVisible();await expect(region().getByText(names[0]).first()).toBeVisible();
    await noOverflow();await logout();

    // Second staff member logs a different action and edits the first one; the performer stays the original author.
    await login(1);await openTicket(true);
    await region().getByRole('button',{name:'Add action'}).click();
    await region().getByLabel('Action description').fill('Verified sync on the phone');await region().getByLabel('Result').fill('Confirmed working');
    await region().getByRole('button',{name:'Save action'}).click();await expect(region().getByText('Verified sync on the phone')).toBeVisible();
    await region().getByRole('button',{name:/Edit action by Alex Support/}).click();
    await expect(region().getByRole('form',{name:'Edit action'})).toContainText('Performed by Alex Support');
    await region().getByLabel('Result').fill('Mailbox syncs again (confirmed twice)');await region().getByRole('button',{name:'Save action'}).click();
    await expect(region().getByText('Action updated.',{exact:true})).toBeVisible();
    await expect(region().getByText('Mailbox syncs again (confirmed twice)')).toBeVisible();
    await expect(region().getByText(names[0]).first()).toBeVisible();await expect(region().getByText(names[1]).first()).toBeVisible();
    await noOverflow();await page.screenshot({path:`${shots}/${info.project.name}-staff.png`,fullPage:true});await logout();

    // Requester: same list, read-only.
    await login(2);await openTicket(false);
    await expect(region().getByText('Verified sync on the phone')).toBeVisible();await expect(region().getByText('Reset the mailbox profile')).toBeVisible();
    await expect(region().getByRole('button',{name:'Add action'})).toHaveCount(0);await expect(region().getByRole('button',{name:/Edit action/})).toHaveCount(0);
    await noOverflow();await page.screenshot({path:`${shots}/${info.project.name}-requester.png`,fullPage:true});await logout();

    // Closing the ticket makes the list read-only for staff too.
    await db.query('UPDATE "Ticket" SET "currentStatus"=\'CLOSED\' WHERE id=$1',[ticketId]);
    await login(0);await openTicket(true);
    await expect(region().getByText(/closed or cancelled/)).toBeVisible();await expect(region().getByRole('button',{name:'Add action'})).toHaveCount(0);
    await logout();
  }finally{
    if(ticketId){await db.query('DELETE FROM "ActionTaken" WHERE "ticketId"=$1',[ticketId]);await db.query('DELETE FROM "TicketEntry" WHERE "ticketId"=$1',[ticketId]);await db.query('DELETE FROM "Ticket" WHERE id=$1',[ticketId])}
    for(const user of users){await db.query('DELETE FROM "Session" WHERE "userId"=$1',[user.id]);await db.query('DELETE FROM "RequesterUser" WHERE id=$1',[user.id])}await db.end();
  }
});
