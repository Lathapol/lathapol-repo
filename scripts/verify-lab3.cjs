// Requires the isolated API on :4103 and Vite on :5183 (see docs/lab-03/tests.md).
const {spawnSync}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),output=join(root,'artifacts/lab-03/verification');
mkdirSync(output,{recursive:true});
const git=spawnSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
if(git.status!==0)throw new Error('Cannot record tested commit.');
const report={testedCommit:git.stdout.trim(),startedAt:new Date().toISOString(),steps:[]};
const steps=[
  ['server-tests','server',['node_modules/jest/bin/jest.js','--runInBand','--testTimeout=15000']],
  ['server-build','server',['node_modules/typescript/bin/tsc']],
  ['client-tests','client',['node_modules/vitest/vitest.mjs','run']],
  ['client-types','client',['node_modules/typescript/bin/tsc','-b']],
  ['client-build','client',['node_modules/vite/bin/vite.js','build']],
  ['browser-tests','.', ['node_modules/@playwright/test/cli.js','test','--config','playwright.lab3.config.ts']],
];
for(const [name,directory,args] of steps){
  console.log(`Running ${name}...`);
  const result=spawnSync(process.execPath,args,{cwd:join(root,directory),encoding:'utf8',env:{...process.env,NO_COLOR:'1'},maxBuffer:10*1024*1024});
  const log=(result.stdout||'')+(result.stderr||'');
  writeFileSync(join(output,name+'.log'),log);
  report.steps.push({name,directory,command:'node '+args.join(' '),exitCode:result.status,log:`artifacts/lab-03/verification/${name}.log`});
  console.log(`${name}: ${result.status===0?'PASS':'FAIL'}`);
  if(result.status!==0){report.finishedAt=new Date().toISOString();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');process.exit(1)}
}
report.finishedAt=new Date().toISOString();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log('All integrated checks passed.');
