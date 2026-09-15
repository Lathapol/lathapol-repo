import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(__filename);
const {Client}=localRequire('../../server/node_modules/pg');
const {scryptSync,randomBytes}=localRequire('node:crypto');
const {readFileSync}=localRequire('node:fs');
const config=localRequire('../../server/node_modules/dotenv').parse(readFileSync('server/.env'));
test('admin creates, edits, deactivates and resets an account; user must change password',async({page},info)=>{
  if(new URL(config.DATABASE_URL).pathname!=='/toktickit_lab3_test')throw new Error('Isolated test database required');
  const suffix=Date.now(),email=`admin-ui-${suffix}@example.test`,createdEmail=`created-ui-${suffix}@example.test`,password='Local admin password 123!',initial='Local initial password 456!',reset='Local reset password 789!';
  const salt=randomBytes(16).toString('hex'),hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;
  const db=new Client({connectionString:config.DATABASE_URL});await db.connect();
  await db.query('INSERT INTO "RequesterUser" (name,email,role,"passwordHash","mustChangePassword","updatedAt") VALUES ($1,$2,\'ADMINISTRATOR\',$3,false,NOW())',['Account Administrator',email,hash]);
  const edit=()=>page.getByRole('button',{name:`Edit ${createdEmail}`,exact:true}).filter({visible:true}).first().click();
  try{
    await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'User Management'})).toBeVisible();
    await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByLabel(/^Name/).fill('New Support Account');await page.getByLabel(/^Email/).fill(createdEmail);await page.getByRole('combobox',{name:/^Role/}).selectOption('IT_STAFF');await page.getByLabel(/^Initial password/).fill(initial);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByText(/Account created/)).toBeVisible();
    await page.getByLabel('Search name or email').fill(createdEmail);await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByText('1 accounts',{exact:true})).toBeVisible();
    await page.screenshot({path:`artifacts/lab-03/issue6-${info.project.name}-users.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    if(info.project.name==='desktop'){await page.setViewportSize({width:820,height:1180});await page.screenshot({path:'artifacts/lab-03/issue6-tablet-users.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.setViewportSize({width:1440,height:1000})}
    await edit();await page.getByRole('combobox',{name:/^Role/}).selectOption('REQUESTER');await page.getByLabel('Active account',{exact:true}).uncheck();await expect(page.getByRole('button',{name:'Save account'})).toBeDisabled();await page.getByLabel(/Confirm deactivation/).check();await page.getByRole('button',{name:'Save account'}).click();await expect(page.getByText('Account updated.',{exact:true})).toBeVisible();
    await edit();await page.getByLabel('Active account',{exact:true}).check();await page.getByRole('button',{name:'Save account'}).click();await expect(page.getByText('Account updated.',{exact:true})).toBeVisible();await edit();
    await page.getByLabel(/^New initial password/).fill(reset);await page.getByLabel(/Confirm password reset/).check();await page.getByRole('button',{name:'Set initial password',exact:true}).click();await expect(page.getByText(/Initial password set/)).toBeVisible();await expect(page.getByLabel(/^New initial password/)).toHaveValue('');
    await page.screenshot({path:`artifacts/lab-03/issue6-${info.project.name}-edit.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(createdEmail);await page.getByLabel('Password',{exact:true}).fill(reset);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Change your initial password'})).toBeVisible();await expect(page.getByRole('button',{name:'Users',exact:true})).toHaveCount(0);
    await page.getByLabel('Current password',{exact:true}).fill(reset);await page.getByLabel('New password',{exact:true}).fill('Changed account password 012!');await page.getByLabel('Confirm new password',{exact:true}).fill('Changed account password 012!');await page.getByRole('button',{name:'Change password',exact:true}).click();await expect(page.getByRole('heading',{name:'My Tickets',exact:true})).toBeVisible();
  }finally{
    await db.query('DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "RequesterUser" WHERE email=ANY($1::text[]))',[[email,createdEmail]]);await db.query('DELETE FROM "RequesterUser" WHERE email=ANY($1::text[])',[[email,createdEmail]]);await db.end();
  }
});
