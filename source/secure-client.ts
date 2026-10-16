export type Entry={id:string;title:string;category:string;author:string;date:string;done:number;revision:number};
export type Link={room:string;token:string;key:string};
const enc=new TextEncoder(),dec=new TextDecoder();
export function encode(a:Uint8Array){return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(s:string){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export function newLink():Link{return {room:crypto.randomUUID(),token:encode(crypto.getRandomValues(new Uint8Array(32))),key:encode(crypto.getRandomValues(new Uint8Array(32)))}}
export function linkFragment(l:Link){return new URLSearchParams(l).toString()}
export function readLink(hash:string):Link|null{const p=new URLSearchParams(hash.slice(1));const room=p.get('room'),token=p.get('token'),key=p.get('key');return room&&/^[a-f0-9-]{36}$/.test(room)&&token&&/^[A-Za-z0-9_-]{43}$/.test(token)&&key&&/^[A-Za-z0-9_-]{43}$/.test(key)?{room,token,key}:null;}
async function getKey(key:string){return crypto.subtle.importKey('raw',decode(key),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function encrypt(l:Link,item:Omit<Entry,'revision'>){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(l.room+':'+item.id)},await getKey(l.key),enc.encode(JSON.stringify(item)));return {id:item.id,iv:encode(iv),data:encode(new Uint8Array(data))};}
export async function decrypt(l:Link,row:{id:string;iv:string;data:string;revision:number}):Promise<Entry>{const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(row.iv),additionalData:enc.encode(l.room+':'+row.id)},await getKey(l.key),decode(row.data));const item=JSON.parse(dec.decode(data));if(item.id!==row.id||typeof item.title!=='string'||typeof item.category!=='string'||typeof item.author!=='string'||typeof item.date!=='string'||![0,1].includes(item.done))throw Error('Invalid encrypted item');return {...item,revision:row.revision};}
export function apiHeaders(l:Link){return {'Authorization':'Bearer '+l.token,'Content-Type':'application/json'}}
