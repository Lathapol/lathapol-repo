// Copy the isolated Lab 3 test database into a new evidence database, apply the Lab 4 migration,
// and prove every Lab 3 row is preserved, the seed is repeatable, and the rollback restores Lab 3.
// The source databases are never altered.
const {Client}=require('../server/node_modules/pg');
const {parse}=require('../server/node_modules/dotenv');
const {readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const {resolve,join}=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash,randomBytes}=require('node:crypto');
const root=resolve(__dirname,'..');
const source=new URL(parse(readFileSync(join(root,'server/.env'))).DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(source.hostname))throw new Error('Local isolated test configuration required.');
const template='toktickit_lab3_test';
const database=`toktickit_lab4_evidence_${Date.now()}`;
const target=new URL(source);target.pathname='/'+database;
const admin=new URL(source);admin.pathname='/postgres';
const lab3Tables=['RequesterUser','Ticket','Attachment','Category','RelatedSystem','TicketEntry','Session'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const snapshot=async(db,names)=>{const out={};for(const t of names)out[t]=(await db.query(`SELECT * FROM "${t}" ORDER BY ${t==='Session'?'"tokenHash"':'id'}`)).rows;return out};
const migration=readFileSync(join(root,'server/prisma/migrations/20260924000000_lab4_actions_taken/migration.sql'),'utf8');
const rollback='DROP TABLE "ActionTaken"; DROP INDEX "Ticket_updatedAt_idx"; DROP INDEX "Ticket_ownerId_currentStatus_idx";';
async function main(){
  const manager=new Client({connectionString:admin.toString()});await manager.connect();
  await manager.query(`CREATE DATABASE "${database}" TEMPLATE "${template}"`);await manager.end();
  const db=new Client({connectionString:target.toString()});await db.connect();
  try{
    const before=await snapshot(db,lab3Tables);
    await db.query(migration);
    const after=await snapshot(db,lab3Tables);
    if(hash(before)!==hash(after))throw new Error('Migration changed Lab 3 rows or fields.');
    const legacyActions=Number((await db.query('SELECT count(*) FROM "ActionTaken"')).rows[0].count);
    if(legacyActions!==0)throw new Error('Migration must not create actions for legacy tickets.');
    const seedEnv={...process.env,DATABASE_URL:target.toString(),LAB3_INITIAL_PASSWORD:randomBytes(24).toString('base64url')};
    const seed=()=>{const r=spawnSync(process.execPath,['-r','ts-node/register','prisma/seed.ts'],{cwd:join(root,'server'),env:seedEnv,encoding:'utf8'});if(r.status!==0)throw new Error('Seed failed: '+r.stderr)};
    const names=[...lab3Tables.filter(t=>t!=='Session'),'ActionTaken'];
    seed();const once=await snapshot(db,names);seed();const twice=await snapshot(db,names);
    if(hash(once)!==hash(twice))throw new Error('Second seed changed existing rows.');
    const perTicket=(await db.query('SELECT count(a.id)::int AS n FROM "Ticket" t LEFT JOIN "ActionTaken" a ON a."ticketId"=t.id GROUP BY t.id')).rows.map(r=>r.n);
    // Rollback proof: drop the Lab 4 objects, then the Lab 3 tables must equal their original state.
    const fresh=`${database}_rb`;
    const m2=new Client({connectionString:admin.toString()});await m2.connect();
    await m2.query(`CREATE DATABASE "${fresh}" TEMPLATE "${template}"`);await m2.end();
    const rb=new URL(source);rb.pathname='/'+fresh;const rdb=new Client({connectionString:rb.toString()});await rdb.connect();
    let rollbackDigest;
    try{await rdb.query(migration);await rdb.query(rollback);rollbackDigest=hash(await snapshot(rdb,lab3Tables));
      const left=(await rdb.query("SELECT table_name FROM information_schema.tables WHERE table_name='ActionTaken'")).rowCount;
      if(left||rollbackDigest!==hash(before))throw new Error('Rollback did not restore Lab 3 state.');
    }finally{await rdb.end()}
    const report={checkedAt:new Date().toISOString(),sourceTemplate:template,evidenceDatabase:database,
      lab3Counts:Object.fromEntries(lab3Tables.map(t=>[t,before[t].length])),
      lab3DigestBefore:hash(before),lab3DigestAfterMigration:hash(after),lab3RowsPreserved:true,
      legacyActionsCreatedByMigration:legacyActions,
      afterSeedCounts:Object.fromEntries(Object.keys(once).map(t=>[t,once[t].length])),
      ticketsWithZeroOneManyActions:{zero:perTicket.filter(n=>n===0).length,one:perTicket.filter(n=>n===1).length,many:perTicket.filter(n=>n>=3).length},
      firstSeedDigest:hash(once),secondSeedDigest:hash(twice),repeatSeedUnchanged:true,
      rollbackRestoredLab3:true,rollbackDigest};
    mkdirSync(join(root,'artifacts/lab-04'),{recursive:true});
    writeFileSync(join(root,'artifacts/lab-04/issue2-migration.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }finally{await db.end()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
