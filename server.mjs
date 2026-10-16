import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname,dirname} from 'node:path';
import {handleSecureApi} from './secure-api.mjs';
const file=resolve(process.env.TODO_DATABASE||'./private-data/todo.sqlite');mkdirSync(dirname(file),{recursive:true,mode:0o700});
const sqlite=new DatabaseSync(file);sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS private_rooms(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,created INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS encrypted_items(id TEXT PRIMARY KEY,room TEXT NOT NULL,data TEXT NOT NULL,iv TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS encrypted_room ON encrypted_items(room);');
const db={prepare(sql){const statement=sqlite.prepare(sql);let values=[];return {bind(...args){values=args;return this},async first(){return statement.get(...values)||null},async all(){return {results:statement.all(...values)}},async run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}}}}}};
const root=fileURLToPath(new URL('./public',import.meta.url));
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow, noarchive','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const origin=process.env.TODO_ORIGIN||process.env.RENDER_EXTERNAL_URL;const rate=new Map();
// Single-process anonymous abuse control. Use the trusted reverse proxy for distributed limits.
function limited(key,max,windowMs){const now=Date.now();const prev=rate.get(key);if(!prev||prev.until<now){rate.set(key,{n:1,until:now+windowMs});return false}return ++prev.n>max;}
setInterval(()=>{for(const [k,v] of rate)if(v.until<Date.now())rate.delete(k);},60000).unref();
const server=createServer(async(req,res)=>{try{const host=req.headers.host||'localhost';const url=new URL(req.url||'/',origin||'http://'+host);for(const [k,v] of Object.entries(headers))res.setHeader(k,v);
 if(origin?.startsWith('https:'))res.setHeader('Strict-Transport-Security','max-age=31536000');
 if(url.pathname.startsWith('/api/')){
  const peer=req.socket.remoteAddress||'unknown';if(limited('api:'+peer,300,60000)||(url.pathname==='/api/rooms'&&limited('create:'+peer,12,3600000))){res.writeHead(429,{'Retry-After':'60','Cache-Control':'no-store'});return res.end('{"error":"请求过于频繁，请稍后重试"}');}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16000){res.writeHead(413);return res.end()}chunks.push(chunk)}
  const body=Buffer.concat(chunks);const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body})});
  const response=await handleSecureApi(request,db);res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(Buffer.from(await response.arrayBuffer()));
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}
 const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')){res.writeHead(403);return res.end()}
 if(!existsSync(path)){res.writeHead(404);return res.end('Not found')}
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
 res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':extname(path)==='.html'?'no-cache':'public,max-age=86400'});res.end(req.method==='HEAD'?undefined:readFileSync(path));
 }catch{res.writeHead(500,{'Cache-Control':'no-store'});res.end('{"error":"服务暂时不可用"}')}});
server.listen(Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1',()=>console.log('todo list listening on port '+(process.env.PORT||8080)));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{sqlite.close();process.exit(0)}));
