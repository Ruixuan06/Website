import {handleSecureApi} from './secure-api.mjs';
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow, noarchive','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Strict-Transport-Security':'max-age=31536000'};
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;let response;
 try{
  if(path.startsWith('/api/')){
   if(request.method==='POST'){
    if(Number(request.headers.get('Content-Length')||0)>16000)return Response.json({error:'请求过大'},{status:413});
    const body=await request.text();if(body.length>16000)return Response.json({error:'请求过大'},{status:413});request=new Request(request,{body});
   }
   response=await handleSecureApi(request,env.DB);
  }else{response=await env.ASSETS.fetch(request)}
 }catch{response=Response.json({error:'服务暂时不可用，请稍后重试'},{status:503,headers:{'Cache-Control':'no-store'}})}
 const result=new Response(response.body,response);for(const [key,value]of Object.entries(security))result.headers.set(key,value);return result;
}};
