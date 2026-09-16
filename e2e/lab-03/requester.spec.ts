import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const initial='Local test initial 123!',changed='Local test changed 456!';
let email:string;
test.beforeEach(async()=>{
  if(new URL(config.DATABASE_URL).pathname!=='/toktickit_lab3_test')throw new Error('Isolated test database required');
  email=`e2e-${Date.now()}@example.com`;
  const salt=randomBytes(16).toString('hex');
  const hash=`scrypt$${salt}$${scryptSync(initial,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
  const db=new Client({connectionString:config.DATABASE_URL});await db.connect();
  await db.query('INSERT INTO "RequesterUser" (name,email,"passwordHash","updatedAt") VALUES ($1,$2,$3,NOW())',['Browser Test',email,hash]);await db.end();
});
test('login, first change, create with attachment, filter, reload, remove and logout',async({page},info)=>{
  await page.goto('/');
  await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(initial);
  await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-login.png`});
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Change your initial password'})).toBeVisible();
  await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-password-change.png`,fullPage:true});
  await expect(page.getByRole('button',{name:'My Tickets',exact:true})).toHaveCount(0);
  await page.getByLabel('Current password',{exact:true}).fill(initial);await page.getByLabel('New password',{exact:true}).fill(changed);await page.getByLabel('Confirm new password',{exact:true}).fill(changed);
  await page.getByRole('button',{name:'Change password',exact:true}).click();
  await expect(page.getByRole('heading',{name:'My Tickets',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Create Ticket',exact:true}).click();
  await page.getByLabel('Category').selectOption('1');await page.getByLabel('Related System').selectOption('1');
  await page.getByLabel('Summary').fill('Browser workflow verification');await page.getByLabel('Description').fill('Verify authenticated creation and attachment persistence.');
  await page.locator('input[type=file]').setInputFiles({name:'example.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 lab test')});
  await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-create-ticket.png`,fullPage:true});
  await page.getByRole('button',{name:'Submit Ticket'}).click();await expect(page.getByText('Ticket Created',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open ticket',exact:true}).click();await expect(page.getByText('example.pdf',{exact:true})).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();await download;
  await page.getByRole('button',{name:'Remove',exact:true}).click();await page.getByPlaceholder('Reason',{exact:true}).fill('Wrong attachment');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByText('Removed: Wrong attachment')).toBeVisible();
  await page.getByRole('button',{name:'My Tickets',exact:true}).click();await page.getByLabel('Search tickets').fill('Browser workflow verification');await expect(page.getByText('Browser workflow verification',{exact:true}).filter({visible:true}).first()).toBeVisible();
  const ticketLink=page.getByRole('button',{name:/^Open TKT/}).filter({visible:true}).first();
  await ticketLink.focus();await expect(ticketLink).toBeFocused();
  await page.screenshot({path:`artifacts/lab-03/issue7-${info.project.name}-tickets.png`,fullPage:true});
  await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Back to My Tickets'})).toBeVisible();await page.getByRole('button',{name:'My Tickets',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.reload();await expect(page.getByRole('heading',{name:'My Tickets',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
});


