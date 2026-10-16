// Use the Sites shared build validator and Windows' bundled tar when bash is absent.
import {readFile,mkdir,mkdtemp,realpath} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const [checkout,archive,expectedSha,validatorPath]=process.argv.slice(2);
if(!checkout||!archive||!expectedSha||!validatorPath)throw Error('Expected verified checkout, archive path, pushed SHA and the active Sites prepare-site-build.cjs path.');
const root=await realpath('.'),source=await realpath(checkout),target=path.resolve(archive);
if(!source.startsWith(root+path.sep)||!target.startsWith(root+path.sep))throw Error('Packaging paths must stay within this workspace.');
const run=(exe,args,cwd=root)=>{const r=spawnSync(exe,args,{cwd,encoding:'utf8'});if(r.error||r.status!==0)throw Error(r.error?.message||r.stderr||'Packaging failed');return r.stdout.trim();};
const head=run('git',['rev-parse','HEAD'],source);if(head!==expectedSha||run('git',['status','--porcelain'],source))throw Error('Source must match the verified pushed commit without changes.');
const manifest=JSON.parse(await readFile(path.join(source,'.openai','hosting.json'),'utf8'));
const research=path.join(root,'.research');await mkdir(research,{recursive:true});
const stage=await mkdtemp(path.join(research,'my-room-package-')),destination=path.join(stage,'dist');
// Shared validator may clear only this new, workspace-contained staging destination.
if(!destination.startsWith(research+path.sep)||path.relative(stage,destination)!=='dist')throw Error('Unexpected staging target.');
const validator=await realpath(validatorPath);
if(run(process.execPath,[validator,source,destination])!=='static')throw Error('MY ROOM must be a static Site.');
await mkdir(path.dirname(target),{recursive:true});run('tar.exe',['-C',stage,'-czf',target,'dist']);
const entries=run('tar.exe',['-tzf',target]);if(!entries.split(/\r?\n/).includes('dist/.openai/hosting.json')||!entries.split(/\r?\n/).includes('dist/index.html'))throw Error('Archive manifest or entrypoint is missing.');
console.log(JSON.stringify({project_id:manifest.project_id,checkout_path:source,commit_sha:head,archive:target}));
