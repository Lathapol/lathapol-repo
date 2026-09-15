import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
const password='Local queue password 123!';
for(const role of ['IT_STAFF','ADMINISTRATOR']) {
 test(`${role} queue filters, pagination and read-only detail`,async({page},info)=>{
  if(new URL(config.DATABASE_URL).pathname!=='/toktickit_lab3_test')throw new Error('Isolated test database required');
  const email=`queue-browser-${role.toLowerCase()}-${Date.now()}@example.test`;
  const salt=randomBytes(16).toString('hex');
  const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
  const db=new Client({connectionString:config.DATABASE_URL});await db.connect();
  const user=await db.query('INSERT INTO "RequesterUser" (name,email,"passwordHash",role,"mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,false,NOW()) RETURNING id',['Queue Reviewer',email,hash,role]);
  try {
   await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
   if(role==='ADMINISTRATOR')await page.getByRole('button',{name:'Ticket Queue',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Ticket Queue',exact:true})).toBeVisible();
   const open=page.getByRole('button',{name:/^Open /}).filter({visible:true}).first();await expect(open).toBeVisible();
   await page.screenshot({path:`artifacts/lab-03/issue4-${info.project.name}-${role}.png`,fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   if(info.project.name==='desktop' && role==='IT_STAFF'){
    await page.setViewportSize({width:820,height:1180});
    await page.screenshot({path:'artifacts/lab-03/issue4-tablet-IT_STAFF.png',fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   }
   await open.focus();await page.keyboard.press('Enter');
   await expect(page.getByRole('button',{name:'Back to Ticket Queue'})).toBeVisible();
   await expect(page.locator('input[type=file]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Remove',exact:true})).toHaveCount(0);
   await page.getByRole('button',{name:'Back to Ticket Queue'}).click();
   await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText(/Page 2 of/)).toBeVisible();
   await page.getByLabel('Search',{exact:true}).fill('no-such-queue-ticket-xyz');await page.getByRole('button',{name:'Apply filters'}).click();await expect(page.getByText(/No tickets match/)).toBeVisible();
   await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.getByRole('button',{name:/^Open /}).filter({visible:true}).first()).toBeVisible();
   await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  }finally{await db.query('DELETE FROM "Session" WHERE "userId"=$1',[user.rows[0].id]);await db.query('DELETE FROM "RequesterUser" WHERE id=$1',[user.rows[0].id]);await db.end();}
 });
}
