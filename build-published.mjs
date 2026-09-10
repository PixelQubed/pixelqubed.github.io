import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from './build-preview.mjs';
import {argumentsFor,website} from './preview-server.mjs';

export function buildPublished(out){
 if(!out)throw Error('--out is required');
 const content=path.join(website,'public-content'),archive=path.join(content,'handbook-public.tar.gz');
 const release=JSON.parse(fs.readFileSync(path.join(content,'manifest.json'),'utf8'));
 const digest=createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
 if(release.publicOnly!==true||release.basePath!=='/sbox/handbook/'||digest!==release.handbookSha256)throw Error('Public snapshot integrity check failed');
 const tar=args=>{const result=spawnSync('tar',args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.error||result.status!==0)throw Error('Unable to read the public snapshot with local tar');return result.stdout;};
 const members=tar(['-tzf',archive]).trim().split(/\r?\n/);
 if(members.some(name=>!name||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||/^[a-z]:/i.test(name)))throw Error('Unsafe public snapshot member');
 if(tar(['-tvzf',archive]).trim().split(/\r?\n/).some(line=>!['-','d'].includes(line[0])))throw Error('Public snapshot cannot contain links or special files');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'pixelqubed-public-handbook-'));
 tar(['-xzf',archive,'-C',temporary]);
 const manifest=JSON.parse(fs.readFileSync(path.join(temporary,'manifest.json'),'utf8'));
 if(manifest.snapshot.snapshot_id!==release.snapshot)throw Error('Public snapshot identity mismatch');
 // Regenerate the shared chrome from its website copy while retaining the versioned API data/pages.
 fs.copyFileSync(path.join(website,'assets/design.css'),path.join(temporary,'assets/site.css'));
 const result=build({out,handbook:temporary,publicPortfolio:path.join(content,'portfolio')});
 // Publish the supplied verification file at Discord's exact HTTPS endpoint.
 fs.mkdirSync(path.join(out,'.well-known'),{recursive:true});
 fs.copyFileSync(path.join(website,'.well-known/discord/dh=aeea7c4bd2a53f6f656b1c347f1377774f9d244a'),path.join(out,'.well-known/discord'));
 fs.writeFileSync(path.join(out,'.nojekyll'),'');
 fs.writeFileSync(path.join(out,'deployment.json'),JSON.stringify({sourceRevision:process.env.GITHUB_SHA||null,snapshot:release.snapshot,handbookSha256:digest}));
 for(const forbidden of ['editor','library','node_modules','.git','public-content','dev.mjs','portfolio-library.mjs'])if(fs.existsSync(path.join(out,forbidden)))throw Error('Private/source path found in public output');
 return {...result,handbookSha256:digest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildPublished(argumentsFor().out),null,2));
