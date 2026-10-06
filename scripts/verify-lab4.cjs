// Runs every Lab 4 check in order and records exact commands, exit codes and logs.
// Requires: server/.env (or DATABASE_URL) pointing at the isolated toktickit_lab4_test database,
// the isolated API on :4103 (APP_ORIGIN=http://localhost:5183) and Vite on :5183 (VITE_API_URL=http://localhost:4103).
// See docs/lab-04/tests.md for the exact start-up commands.
const {spawnSync}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),output=join(root,'artifacts/lab-04/verification');
mkdirSync(output,{recursive:true});
const git=spawnSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
if(git.status!==0)throw new Error('Cannot record tested commit.');
const report={testedCommit:git.stdout.trim(),startedAt:new Date().toISOString(),steps:[]};
const steps=[
  ['server-tests','server',['node_modules/jest/bin/jest.js','--runInBand','--testTimeout=15000']],
  ['server-build','server',['node_modules/typescript/bin/tsc','--noEmit']],
  ['client-tests','client',['node_modules/vitest/vitest.mjs','run']],
  ['client-types','client',['node_modules/typescript/bin/tsc','-b']],
  ['client-build','client',['node_modules/vite/bin/vite.js','build']],
  ['migration-check','.',['scripts/verify-lab4-migration.cjs']],
  ['browser-tests-lab4','.',['node_modules/@playwright/test/cli.js','test','--config','playwright.lab4.config.ts']],
  ['browser-tests-lab3-regression','.',['node_modules/@playwright/test/cli.js','test','--config','playwright.lab3.config.ts']],
];
for(const [name,directory,args] of steps){
  console.log(`Running ${name}...`);
  const result=spawnSync(process.execPath,args,{cwd:join(root,directory),encoding:'utf8',env:{...process.env,NO_COLOR:'1'},maxBuffer:32*1024*1024});
  const log=(result.stdout||'')+(result.stderr||'');
  writeFileSync(join(output,name+'.log'),log);
  report.steps.push({name,directory,command:'node '+args.join(' '),exitCode:result.status,log:`artifacts/lab-04/verification/${name}.log`});
  console.log(`${name}: ${result.status===0?'PASS':'FAIL'}`);
  if(result.status!==0){report.finishedAt=new Date().toISOString();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');process.exit(1)}
}
report.finishedAt=new Date().toISOString();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log('All integrated checks passed.');
