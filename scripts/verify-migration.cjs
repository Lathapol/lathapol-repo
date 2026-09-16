// Restore a Lab 2 backup into a new local evidence database; never alter the source database.
const {Client}=require('../server/node_modules/pg');
const {parse}=require('../server/node_modules/dotenv');
const {readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const {resolve,join}=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash,randomBytes}=require('node:crypto');
const root=resolve(__dirname,'..');
const source=new URL(parse(readFileSync(join(root,'server/.env'))).DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(source.hostname)||source.pathname!=='/toktickit_lab3_test')throw new Error('Local isolated test configuration required.');
const backup=process.argv[2],pgBin=process.argv[3];
if(!backup||!pgBin)throw new Error('Usage: node scripts/verify-migration.cjs <Lab2.dump> <PostgreSQL bin directory>');
const database=`toktickit_lab3_evidence_${Date.now()}`;
const target=new URL(source);target.pathname='/'+database;
const admin=new URL(source);admin.pathname='/postgres';
const tables=['RequesterUser','Ticket','Attachment','Category','RelatedSystem'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function snapshot(db,names,columns){const result={};for(const table of names){const fields=columns?.[table]?.map(c=>'"'+c+'"').join(',')||'*';result[table]=(await db.query(`SELECT ${fields} FROM "${table}" ORDER BY id`)).rows}return result}
async function main(){
  const manager=new Client({connectionString:admin.toString()});await manager.connect();
  await manager.query(`CREATE DATABASE "${database}"`);await manager.end();
  const env={...process.env,PGHOST:source.hostname,PGPORT:source.port||'5432',PGUSER:decodeURIComponent(source.username),PGPASSWORD:decodeURIComponent(source.password)};
  const restored=spawnSync(join(pgBin,process.platform==='win32'?'pg_restore.exe':'pg_restore'),['--dbname',database,'--no-owner','--no-privileges','--exit-on-error',resolve(backup)],{env,encoding:'utf8'});
  if(restored.status!==0)throw new Error('Backup restore failed: '+restored.stderr);
  const db=new Client({connectionString:target.toString()});await db.connect();
  try{
    const columns={};for(const table of tables)columns[table]=(await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1 ORDER BY ordinal_position',[table])).rows.map(r=>r.column_name);
    const before=await snapshot(db,tables,columns);
    await db.query(readFileSync(join(root,'server/prisma/migrations/20260912040000_lab3_auth/migration.sql'),'utf8'));
    const after=await snapshot(db,tables,columns);
    if(hash(before)!==hash(after))throw new Error('Migration changed original rows or fields.');
    const mismatches=Number((await db.query('SELECT count(*) FROM "Ticket" WHERE "itPriority" <> "requestedPriority"')).rows[0].count);
    if(mismatches)throw new Error('Priority backfill mismatch.');
    const seedEnv={...process.env,DATABASE_URL:target.toString(),LAB3_INITIAL_PASSWORD:randomBytes(24).toString('base64url')};
    function seed(){const r=spawnSync(process.execPath,['-r','ts-node/register','prisma/seed.ts'],{cwd:join(root,'server'),env:seedEnv,encoding:'utf8'});if(r.status!==0)throw new Error('Seed failed: '+r.stderr)}
    seed();const once=await snapshot(db,[...tables,'TicketEntry']);seed();const twice=await snapshot(db,[...tables,'TicketEntry']);
    if(hash(once)!==hash(twice))throw new Error('Second seed changed existing rows.');
    const report={checkedAt:new Date().toISOString(),database,sourceBackupSha256:createHash('sha256').update(readFileSync(backup)).digest('hex'),originalCounts:Object.fromEntries(tables.map(t=>[t,before[t].length])),preservedOriginalColumns:true,originalDigest:hash(before),afterMigrationDigest:hash(after),priorityBackfillMismatches:mismatches,seedCounts:Object.fromEntries(Object.keys(once).map(t=>[t,once[t].length])),firstSeedDigest:hash(once),secondSeedDigest:hash(twice),repeatSeedUnchanged:true};
    mkdirSync(join(root,'artifacts/lab-03'),{recursive:true});writeFileSync(join(root,'artifacts/lab-03/issue7-migration.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await db.end()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
