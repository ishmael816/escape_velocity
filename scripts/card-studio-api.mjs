import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { generateOutputs } from './generate-v31.mjs';
import { same } from '../src/card-studio-model.js';

const revision=text=>createHash('sha256').update(text).digest('hex');
export function createStudioApi(root){
 let writing=false;
 const source=path.join(root,'data/cardpool-v31.json');
 return async function studioApi(req,res){
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){reply(403,{error:'仅本机可编辑'});return;}
  // Reject DNS rebinding and browser requests from any other origin.
  const host=req.headers.host||'';
  if(!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)||req.headers.origin&&req.headers.origin!==`http://${host}`){reply(403,{error:'请从本机同源页面操作'});return;}
  if(req.method==='GET'){
   try{const text=await readFile(source,'utf8');reply(200,{pool:JSON.parse(text),revision:revision(text)});}catch{reply(500,{error:'无法读取本地卡池'});}return;
  }
  if(req.method!=='PUT'){reply(405,{error:'不支持的请求'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){reply(415,{error:'需要 JSON 文件'});return;}
  if(writing){reply(409,{error:'正在保存，请稍后重试'});return;}
  writing=true;
  const staged=[];const originals=new Map();let committed=false;
  try{
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1_000_000){reply(413,{error:'卡池文件超过 1 MB'});return;}}
   let payload;try{payload=JSON.parse(body);}catch{reply(400,{error:'JSON 格式错误'});return;}
   if(!payload||typeof payload!=='object'){reply(400,{error:'请求须为 JSON 对象'});return;}
   const original=await readFile(source,'utf8');
   if(payload.revision!==revision(original)){reply(409,{error:'源卡池已被其他页面或文件修改。请先导出草稿，再重新载入源卡池。'});return;}
   const previous=JSON.parse(original),pool=payload.pool;
   let outputs;try{
    outputs=generateOutputs(pool);
    const metadata=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!['cards','events'].includes(k)));
    if(!same(metadata(previous),metadata(pool)))throw Error('工坊仅修改活动牌和事件牌，请保留原规则与开局配置');
   }catch(error){reply(422,{error:error.message});return;}
   const files={'data/cardpool-v31.json':JSON.stringify(pool,null,2)+'\n',...outputs};
   const backup=`cardpool-${Date.now()}-${randomUUID().slice(0,8)}.json`;
   await mkdir(path.join(root,'data/cardpool-backups'),{recursive:true});
   await writeFile(path.join(root,'data/cardpool-backups',backup),original,{flag:'wx'});
   // Prepare all files before replacing any; rollback on an IO error.
   for(const [relative,text]of Object.entries(files)){
    const target=path.join(root,relative),temp=target+'.'+randomUUID()+'.tmp';
    originals.set(target,await readFile(target));
    staged.push({target,temp});await writeFile(temp,text);
   }
   for(const {target,temp}of staged)await rename(temp,target);
   committed=true;
   reply(200,{pool,revision:revision(files['data/cardpool-v31.json']),backup:'data/cardpool-backups/'+backup});
  }catch(error){
   if(!committed)for(const [target,content]of originals)await writeFile(target,content).catch(()=>{});
   reply(500,{error:'保存失败，已尝试恢复原文件：'+error.message});
  }finally{
   for(const {temp}of staged)await unlink(temp).catch(()=>{});
   writing=false;
  }
 };
}
