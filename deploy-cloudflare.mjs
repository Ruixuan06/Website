import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const cli=new URL('./node_modules/wrangler/bin/wrangler.js',import.meta.url).pathname;
function run(args,quiet=false){const r=spawnSync(process.execPath,[cli,...args],{stdio:quiet?['ignore','pipe','inherit']:'inherit',encoding:'utf8',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)throw Error('Cloudflare command failed: '+args[0]);return r.stdout;}
// Resolve an existing named database before provisioning, so later Git builds reuse it.
const config=JSON.parse(readFileSync('wrangler.json','utf8'));
const rows=JSON.parse(run(['d1','list','--json'],true));
const existing=rows.find(row=>row.name==='todo-list-data');
if(existing){config.d1_databases[0].database_id=existing.uuid;writeFileSync('wrangler.json',JSON.stringify(config,null,2));run(['d1','migrations','apply','DB','--remote']);run(['deploy']);}
else{
 // Wrangler provisions the binding and writes its returned ID to this build checkout.
 run(['deploy']);
 const updated=JSON.parse(readFileSync('wrangler.json','utf8'));
 if(!updated.d1_databases[0].database_id){const provisioned=JSON.parse(run(['d1','list','--json'],true)).find(row=>row.name==='todo-list-data');if(!provisioned)throw Error('Database provisioned without a resolvable ID; inspect Cloudflare bindings before retrying.');updated.d1_databases[0].database_id=provisioned.uuid;writeFileSync('wrangler.json',JSON.stringify(updated,null,2));}
 run(['d1','migrations','apply','DB','--remote']);
}
