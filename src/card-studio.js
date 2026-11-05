import {riskText} from './sanity-rules.js';
import source from './cardpool-data.js';
import {adapt, cardLevel, ROUTES} from './cards.js';
import {cardFace, badge} from './card-face.js';
import {icon} from './icons.js';
import {clone, same, changedEntries, validatePool, newCard, parsePool, migrateGoods} from './card-studio-model.js';

const DRAFT='ev-card-studio-v34',root=document.querySelector('#studio');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={repeat:'多次活动',growth:'多次完成后归档',once:'一次性活动'};
let base=clone(source),pool=clone(source),revision=null,local=false,selected=null,group='cards';
let filters={query:'',route:'',hours:'',kind:'',price:'',changed:false,sort:'original'};
let undo=[],redo=[],savedAt='',persistError='',busy=false,rawDirty=false,otherTab=false;
let previewTimer;
const get=()=>pool[group].find(c=>c.id===selected);
const changes=()=>changedEntries(base,pool);
const errorList=()=>validatePool(pool);
function notice(message){const el=document.querySelector('#notification');el.textContent=message;el.classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.classList.remove('show'),5500);}
function confirmAction(title,message,label='确认'){
 return new Promise(resolve=>{const dialog=document.querySelector('#confirm-dialog');document.querySelector('#confirm-title').textContent=title;document.querySelector('#confirm-message').textContent=message;document.querySelector('#confirm-ok').textContent=label;dialog.showModal();
 const close=value=>{dialog.close();dialog.oncancel=null;resolve(value);};document.querySelector('#confirm-ok').onclick=()=>close(true);document.querySelector('#confirm-cancel').onclick=()=>close(false);dialog.oncancel=e=>{e.preventDefault();close(false);};});
}
function persist(){
 savedAt=new Date().toLocaleTimeString('zh-CN',{hour12:false});
 try{if(otherTab)throw Error('草稿已在其他页面更新');localStorage.setItem(DRAFT,JSON.stringify({pool,base,revision,savedAt}));persistError='';}catch{persistError='浏览器保存失败，请立即导出 JSON';}
 updateStatus();
}
function snapshot(){undo.push({pool:clone(pool),selected,group});if(undo.length>80)undo.shift();redo=[];}
function restoreHistory(from,to){if(!from.length)return;to.push({pool:clone(pool),selected,group});const state=from.pop();pool=state.pool;selected=state.selected;group=state.group;rawDirty=false;persist();render();}
function markChange(){persist();clearTimeout(previewTimer);previewTimer=setTimeout(()=>{renderGrid();renderPreview();},100);}
function updateStatus(){
 const el=document.querySelector('#draft-state');if(!el)return;
 const count=changes().length,errors=errorList();
 el.textContent=persistError|| (otherTab?'另一页已更新草稿，请先导出当前修改':count?`${count} 项改动 · 草稿已存 ${savedAt}`:'与源卡池一致');
 el.classList.toggle('warning',!!persistError||otherTab);
 const apply=document.querySelector('[data-action="apply"]');apply.disabled=!local||busy||!count||!!errors.length||rawDirty||otherTab;
 apply.title=!local?'静态网页支持草稿与导出；本地 npm run dev 可同步源码':errors.length?errors[0]:'写入卡池源文件并同步 demo';
 document.querySelector('[data-action="undo"]').disabled=!undo.length;
 document.querySelector('[data-action="redo"]').disabled=!redo.length;
 document.querySelector('#changed-count').textContent=count;
 const problems=document.querySelector('#validation');if(problems){problems.hidden=!errors.length;problems.textContent=errors.slice(0,5).join('\n');}
}
function filtered(){
 const q=filters.query.trim().toLowerCase();let list=pool[group].filter(c=>{
  if(q&&!JSON.stringify(c).toLowerCase().includes(q)&&!(kinds[c.kind]||'').includes(q)&&!(ROUTES[c.route]?.name||'').includes(q))return false;
  if(filters.changed&&!changes().some(x=>x.group===group&&x.id===c.id))return false;
  if(group==='events')return true;
  return (!filters.route||c.route===filters.route)&&(!filters.hours||c.hours===Number(filters.hours))&&(!filters.kind||c.kind===filters.kind)&&(!filters.price||(filters.price==='6+'?c.price>=6:c.price===Number(filters.price)));
 });
 if(filters.sort==='price')list.sort((a,b)=>(a.price||0)-(b.price||0)||a.name.localeCompare(b.name,'zh-CN'));
 if(filters.sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
 if(filters.sort==='hours')list.sort((a,b)=>(a.hours||0)-(b.hours||0));
 return list;
}
function eventFace(c){return `<div class="event-face"><header>${icon('calendar',18)}<strong>${esc(c.name)}</strong></header><div class="event-ornament">${icon(c.inspectionCount?'eye':c.blocked?'bag':c.temporaryWeekend?'sun':'money',58)}</div><div class="event-effect">${c.inspectionCount?`${'⚄ '.repeat(c.inspectionCount)}<p>查岗 ${c.inspectionCount} 轮</p>`:c.blocked?`<b>7 · ${c.blocked.slot==='am'?'上午':'下午'}</b><p>团建占用</p>`:c.temporaryWeekend?'<b>6 + 7</b><p>本周双休</p>':badge('money','+'+(c.cash||0),'发放奖金')}</div>${c.wellbeing?`<p>${esc(riskText(c.wellbeing))}</p>`:''}<footer>公共事件 · ${c.copies} 张</footer></div>`;}
function face(c,event=group==='events'){
 try{return event?eventFace(c):cardFace(adapt(c));}catch{return '<div class="broken-card">字段暂不完整，请检查编辑区。</div>';}
}
function render(){
 root.innerHTML=`<section class="collection-toolbar"><div class="toolbar-heading"><div><div class="eyebrow">THE COLLECTION / v${esc(pool.version)}</div><h1>把下一种可能，写进牌里。</h1></div><div class="file-actions"><button data-action="import">${icon('arrow',15)} 导入</button><button data-action="export">${icon('layers',15)} 导出卡池</button><button data-action="apply" class="primary">应用到本地 demo</button></div></div><div class="save-strip"><span><i class="status-dot"></i><span id="draft-state"></span></span><span>${local?'本地文件已连接':'离线工坊 · 可保存浏览器草稿与导出'}<button class="text-button" data-action="reload">重新载入源卡池</button></span></div></section>
 <div class="workbench ${selected?'editing':''}"><section class="collection"><div class="filter-bar"><div class="collection-tabs"><button data-group="cards" class="${group==='cards'?'active':''}">活动牌 <b>${pool.cards.length}</b></button><button data-group="events" class="${group==='events'?'active':''}">事件牌 <b>${pool.events.length}</b></button></div><label class="search-field">${icon('eye',17)}<input id="search" placeholder="搜索名称、编号、效果…" aria-label="搜索卡牌" value="${esc(filters.query)}"></label><button class="new-button" data-action="new">＋ 新建</button></div>
 <div class="filters"><div class="route-filters" ${group==='events'?'hidden':''}>${[['','全部'],...Object.entries(ROUTES).filter(([r])=>r!=='S').map(([r,d])=>[r,d.name])].map(([r,name])=>`<button data-route="${r}" class="route-filter route-${r||'all'} ${filters.route===r?'active':''}">${r?icon(ROUTES[r].icon,15):'◈'} ${name}</button>`).join('')}</div><div class="filter-selects">${group==='cards'?`<select data-filter="hours" aria-label="筛选等级">${options([['','全部等级'],[4,'I级牌（4h）'],[8,'II级牌（8h）']],filters.hours)}</select><select data-filter="kind" aria-label="筛选持久度">${options([['','全部持久度'],...Object.entries(kinds)],filters.kind)}</select><select data-filter="price" aria-label="筛选价格">${options([['','全部价格'],...Array.from({length:6},(_,n)=>[n,n+' 资金']),['6+','6+ 资金']],filters.price)}</select>`:''}<label class="changed-toggle"><input type="checkbox" id="changed-filter" ${filters.changed?'checked':''}>只看改动 <b id="changed-count">0</b></label></div></div>
 <div class="collection-summary"><span id="results-count"></span><label>排序 <select data-filter="sort" aria-label="排序">${options([['original','卡池顺序'],['price','价格从低到高'],['hours','等级从低到高'],['name','名称']],filters.sort)}</select></label></div><div id="card-grid" class="card-grid"></div><footer class="collection-foot">点选卡牌编辑 · I级牌与II级牌等宽、按高度区分 · 活动牌每种固定 4 张</footer></section>
 <aside class="editor" id="editor" aria-label="卡牌编辑器"></aside></div>
 <footer class="studio-footer"><span>草稿保存在本浏览器 · 应用前自动备份源卡池</span><div><button data-action="undo" title="Ctrl / ⌘ + Z">↶ 撤销</button><button data-action="redo" title="Ctrl / ⌘ + Shift + Z">↷ 重做</button><button data-action="review">查看改动</button></div></footer>`;
 renderGrid();renderEditor();updateStatus();
}
function options(items,value){return items.map(([v,label])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(label)}</option>`).join('');}
function renderGrid(){
 const grid=document.querySelector('#card-grid');if(!grid)return;const list=filtered(),changed=changes();
 document.querySelector('#results-count').innerHTML=`<strong>${list.length}</strong> / ${pool[group].length} 种 <span>· 共 ${list.reduce((n,c)=>n+c.copies,0)} 张</span>`;
 grid.innerHTML=list.length?list.map(c=>`<button class="card-tile ${c.id===selected?'selected':''}" data-card="${esc(c.id)}" aria-label="编辑 ${esc(c.name)}" aria-pressed="${c.id===selected}"><div class="tile-label"><span>${esc(c.id)}</span>${changed.some(x=>x.group===group&&x.id===c.id)?'<em>已修改</em>':`<span>${group==='cards'?kinds[c.kind]:c.copies+' 张'}</span>`}</div>${face(c)}<div class="tile-caption"><span>${group==='cards'?`${ROUTES[c.route]?.name||''} / ${cardLevel(c.hours)}`: '公共事件'}</span><span>编辑 ↗</span></div></button>`).join(''):'<div class="empty-state"><span>◇</span><h2>没有找到这张牌</h2><p>试试其他关键词，或清除筛选。</p><button data-action="clear-filters">清除筛选</button></div>';
}
const read=(c,path)=>path.split('.').reduce((v,k)=>v?.[k],c);
function field(label,path,type='number',extra={}){
 const c=get(),value=path==='sanityImpact'?(c.support||0)-(c.stress||0):read(c,path);
 if(type==='checkbox')return `<label class="check-field"><input type="checkbox" data-field="${path}" ${value?'checked':''}>${label}</label>`;
 return `<label class="field ${extra.wide?'wide':''}"><span>${label}</span>${type==='select'?`<select data-field="${path}">${options(extra.items,value??'')}</select>`:`<input data-field="${path}" type="${type}" value="${esc(value??(type==='number'?0:''))}" ${type==='number'?`min="${extra.min??0}" max="${extra.max??99}" step="1"`: 'maxlength="'+(path==='id'?40:80)+'"'}>`}${extra.hint?`<small>${extra.hint}</small>`:''}</label>`;
}
const num=(label,path,min=0,max=99)=>field(label,path,'number',{min,max});
const check=(label,path)=>field(label,path,'checkbox');
const select=(label,path,items)=>field(label,path,'select',{items});
function section(title,body,open=true){return `<details class="field-section" ${open?'open':''}><summary>${title}</summary><div class="fields">${body}</div></details>`;}
function renderEditor(){
 const el=document.querySelector('#editor'),c=get();
 if(!c){el.innerHTML=`<div class="editor-empty"><div class="empty-seal">${icon('pen',40)}</div><span class="eyebrow">YOUR NEXT ITERATION</span><h2>一张一张，打磨玩法。</h2><p>从左边选一张牌。<br>修改数值，即时查看牌面。<br>灵感和草稿会留在这里。</p><div class="empty-guide"><b>01</b> 选牌与筛选<br><b>02</b> 修改与预览<br><b>03</b> 导出或应用到 demo</div></div>`;return;}
 let form=section('卡牌信息',field('名称','name','text',{wide:true})+field('编号','id','text')+(group==='cards'?select('流派','route',Object.entries(ROUTES).filter(([r])=>r!=='S').map(([r,d])=>[r,d.name])):num('实体张数','copies',1,20)));
 if(group==='cards'){
  form+=section('01 / 购买',num('资金','price')+field('技能要求','requires','text',{hint:'如 AA、BC；留空表示无要求'}));
  form+=section('02 / 打出',select('等级 / 占用时间','hours',[[4,'I级牌（4h）'],[8,'II级牌（8h）']])+num('日程理智 ±','sanityImpact',-10,10)+check('仅工作白天 · 免查岗','professional')+check('仅非上班时间','offHours'));
  form+=section('03 / 结算',num('理智 ≥','minSanity',0,10)+num('理智 ≤','maxSanity',0,10)+num('执行资金 −','cost.money')+num('维持资金 −','upkeep')+num('收入 +（计逃离）','gain.profit')+num('奖金 +（不计逃离）','gain.cash')+num('工资 +（不计逃离）','gain.salary'));
  form+=section('高理智奖励',effectToggle('focus','高理智奖励',c.mechanic?.focus)+(c.mechanic?.focus?num('理智 ≥','mechanic.focus.min',1,10)+Object.entries({profit:'额外副业 +',cash:'额外资金 +',look:'看牌数改为',belowBonus:'下邻加成改为 +'}).filter(([key])=>c.mechanic.focus[key]!==undefined).map(([key,label])=>num(label,'mechanic.focus.'+key,1,key==='look'?12:10)).join('')+(c.dice?check('收益骰掷两次取高','mechanic.focus.reroll'):''):''),!!c.mechanic?.focus);
  form+=section('持久度与归档',select('活动类型','kind',Object.entries(kinds))+(c.kind!=='repeat'?num('成功几次完成','progress',1,12):''));
  form+=section('灵感与过牌',num('每次灵感 +','mechanic.generate',0,7)+num('弃手牌1 → 资金 +','mechanic.discardHand')+effectToggle('opportunity','过牌',c.opportunity)+(c.opportunity?num('查看几张','opportunity.count',1,12)+select('查看范围','opportunity.route',[['','任意流派'],['W','履职'],['A','创意'],['B','技术'],['C','商业']])+check('符合技能免费取 1','opportunity.free'):'')+num('招聘附加费','hireFee'),!!(c.mechanic?.generate||c.mechanic?.discardHand||c.opportunity||c.hireFee));
  form+=section('货品与自动',num('货品容量','mechanic.capital',0,7)+num('基础以外的自动副业 +','mechanic.autoProfit')+check('自动奖励要求货品装满','mechanic.autoRequiresFull')+check('有自动时每次补货1','mechanic.autoRestock')+(c.mechanic?.trade?num('交易价','mechanic.trade.price',1,99)+num('每次最多货品','mechanic.trade.limit',1,7):''),!!(c.mechanic?.capital||c.mechanic?.autoProfit||c.mechanic?.trade));
  if(c.kind==='growth')form+=section('完成奖励',num('资金 +','mechanic.completion.cash')+num('履职 +','mechanic.completion.duty')+check('下周起永久双休','mechanic.completion.weekend')+check('归档后可再次安排','mechanic.replay'),!!c.mechanic?.completion);
  form+='<p class="field-note">指定资源来源、相邻条件等特殊效果可在下方完整 JSON 中修改。</p>';

 }else{
  const type=c.inspectionCount?'inspection':c.blocked?'team':c.temporaryWeekend?'weekend':'bonus';
  form+=section('事件效果',`<label class="field wide"><span>事件类型</span><select id="event-type">${options([['inspection','领导查岗'],['team','周日团建'],['bonus','发放奖金'],['weekend','临时双休']],type)}</select></label>`+(type==='inspection'?num('查岗轮数','inspectionCount',1,6):type==='team'?select('团建时段','blocked.slot',[['am','周日上午'],['pm','周日下午']]):type==='bonus'?num('资金 +','cash',1,99):'<p class="field-note wide">周六临时自由，不提供永久理智加成。</p>'));
  form+=section('精神状态事件',effectToggle('wellbeing','精神状态事件',c.wellbeing)+(c.wellbeing?num('触发理智 ≤','wellbeing.max',0,3)+select('后果','wellbeing.effect',[['hand','自选弃1张手牌'],['hospital','骰定一天全部活动暂停'],['withdraw','撤回1张非正理智多次活动'],['discard','理智0：弃置1张非正理智多次活动']]):''),!!c.wellbeing);
 }
 el.innerHTML=`<div class="editor-top"><span>正在编辑 <b id="editing-id">${esc(c.id)}</b></span><div><button data-action="previous" aria-label="上一张">←</button><button data-action="next" aria-label="下一张">→</button><button data-action="close-editor" aria-label="关闭编辑器">×</button></div></div><div class="editor-scroll"><div class="preview-heading"><span>左侧牌面实时更新</span><button data-action="compare" class="text-button">对比原版</button></div><details class="preview-details"><summary>展开大图预览</summary><div id="live-preview" class="live-preview"></div></details><div id="validation" class="validation" role="status" hidden></div><form id="card-form" onsubmit="return false">${form}</form><details class="raw-section"><summary>完整卡牌 JSON</summary><p>用于检查完整数据。文字说明不会自动变成可执行效果。</p><textarea id="raw-json" spellcheck="false" aria-label="完整卡牌 JSON">${esc(JSON.stringify(c,null,2))}</textarea><button data-action="apply-json">应用 JSON 到这张牌</button><span id="raw-status"></span></details><div class="card-actions"><button data-action="duplicate">复制为新牌</button><button data-action="reset-card">还原本张</button><button data-action="delete" class="danger">删除</button></div></div>`;
 renderPreview();updateStatus();
}
function effectToggle(key,label,value){return `<label class="check-field wide effect-toggle"><input type="checkbox" data-effect="${key}" ${value?'checked':''}>启用${label}</label>`;}
function renderPreview(){const c=get(),el=document.querySelector('#live-preview');if(!c||!el)return;el.innerHTML=face(c);document.querySelector('#editing-id').textContent=c.id;const raw=document.querySelector('#raw-json');if(raw&&!rawDirty)raw.value=JSON.stringify(c,null,2);updateStatus();}
function setPath(obj,path,value){const keys=path.split('.');let target=obj;for(const key of keys.slice(0,-1))target=target[key]??={};target[keys.at(-1)]=value;}
function editField(input){
 const c=get(),path=input.dataset.field;if(!c)return;
 let value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
 if(path==='hours')value=Number(value);
 if(input.type==='number'&&(!input.value||!Number.isFinite(value)))return;
 if(input.type==='number'&&(!Number.isInteger(value)||value<Number(input.min)||value>Number(input.max))){notice(`请输入 ${input.min}–${input.max} 的整数`);input.value=path==='sanityImpact'?(c.support||0)-(c.stress||0):read(c,path)??0;return;}
 snapshot();
 if(path==='sanityImpact'){c.support=Math.max(0,value);c.stress=Math.max(0,-value);}
 else if(path==='id'){
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(value)||[...pool.cards,...pool.events].some(x=>x!==c&&x.id===value)){undo.pop();notice('编号须唯一，且只含字母、数字或横线');input.value=c.id;return;}
  c.id=value;selected=value;
 }else if(path==='opportunity.route'&&!value){delete c.opportunity.route;}else if(path.startsWith('mechanic.')&&value===0&&!path.startsWith('mechanic.trade.')&&!path.startsWith('mechanic.completion.')){delete c.mechanic?.[path.split('.')[1]];}else{setPath(c,path,value);}
 if(path==='hours')c.advanced=value===8;
 if(path==='wellbeing.effect'&&value==='discard')c.wellbeing.max=0;
 if(path==='requires')c.requires=value.toUpperCase().replace(/\s/g,'');
 if(path==='kind'){
  if(value==='repeat'){delete c.progress;delete c.permission;delete c.permanent;if(c.mechanic){delete c.mechanic.completion;delete c.mechanic.replay;delete c.mechanic.finalSpend;}}
  else{delete c.maturation;c.progress=value==='growth'?2:1;if(value==='growth'){delete c.permission;delete c.permanent;}}
 }
 if(path==='permission'){if(value){c.kind='once';c.permanent=true;c.progress=c.progress||2;}else{delete c.permission;delete c.permanent;}}
 if(path==='condition'){if(value){c.conditionalBonus??=1;if(value==='lowSanity')c.lowSanityAt??=2;if(value==='inspiration')c.inspirationBonusAt??=1;}else delete c.condition;}
 rawDirty=false;markChange();
 if(['kind','permission','condition','wellbeing.effect'].includes(path))renderEditor();
}
async function leaveRaw(){return !rawDirty||await confirmAction('有尚未应用的 JSON','继续将丢弃文本框中尚未应用的 JSON；其他字段修改已自动保存。','继续');}
function download(poolToSave){const blob=new Blob([JSON.stringify(poolToSave,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`escape-velocity-cardpool-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function apply(){
 if(!local||busy||errorList().length||rawDirty||otherTab)return;
 const diff=changes();if(!diff.length)return;
 if(!await confirmAction(`应用 ${diff.length} 项改动到 demo？`,diff.slice(0,8).map(x=>`${x.after?x.before?'修改':'新增':'删除'} ${x.after?.name||x.before.name}`).join('、')+'。将更新源数据、网页卡池与卡牌表，先自动保存备份。请刷新游戏并新开一局测试。','应用并备份'))return;
 busy=true;updateStatus();
 try{
  const response=await fetch('/api/cardpool',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,pool})});const data=await response.json();
  if(!response.ok)throw Error(data.error||'应用失败');
  base=clone(data.pool);pool=clone(data.pool);revision=data.revision;persist();render();notice('已更新本地 demo。备份：'+data.backup);
 }catch(error){notice(error.message);}finally{busy=false;updateStatus();}
}
root.addEventListener('input',e=>{
 if(e.target.id==='search'){filters.query=e.target.value;renderGrid();}
 if(e.target.dataset.field&&['text','number'].includes(e.target.type)&&e.target.dataset.field!=='id')editField(e.target);
 if(e.target.id==='raw-json'){rawDirty=true;document.querySelector('#raw-status').textContent=' 尚未应用';updateStatus();}
});
root.addEventListener('change',e=>{
 const t=e.target;
 if(t.dataset.field&&(!['text','number'].includes(t.type)||t.dataset.field==='id'))editField(t);
 if(t.dataset.filter){filters[t.dataset.filter]=t.value;renderGrid();}
 if(t.id==='changed-filter'){filters.changed=t.checked;renderGrid();}
 if(t.dataset.effect==='focus'){snapshot();const c=get();c.mechanic??={};if(t.checked)c.mechanic.focus={min:6,...(c.opportunity?{look:Math.max(1,c.opportunity.count+1)}:{cash:1})};else delete c.mechanic.focus;rawDirty=false;persist();renderEditor();renderGrid();return;}
 if(t.dataset.effect){snapshot();const key=t.dataset.effect;if(t.checked)get()[key]=clone({wellbeing:{max:2,effect:'hospital'},dice:{resource:'profit',faces:[0,0,1,1,2,2]},maturation:{steps:2,initial:1,mature:3},opportunity:{count:3},boost:{amount:1}}[key]);else delete get()[key];rawDirty=false;persist();renderEditor();renderGrid();}
 if(t.id==='event-type'){snapshot();const c=get();for(const key of ['inspectionCount','blocked','cash','temporaryWeekend'])delete c[key];Object.assign(c,{inspection:{inspectionCount:1},team:{inspectionCount:0,blocked:{day:7,slot:'am'}},bonus:{inspectionCount:0,cash:2},weekend:{inspectionCount:0,temporaryWeekend:true}}[t.value]);persist();renderEditor();renderGrid();}
});
root.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t||t.disabled)return;
 if(t.dataset.card){if(!await leaveRaw())return;rawDirty=false;selected=t.dataset.card;root.querySelector('.workbench').classList.add('editing');renderGrid();renderEditor();if(innerWidth<850)document.querySelector('#editor').scrollIntoView({behavior:'smooth'});return;}
 if(t.dataset.group){if(!await leaveRaw())return;rawDirty=false;group=t.dataset.group;selected=null;render();return;}
 if(t.dataset.route!==undefined){if(!await leaveRaw())return;rawDirty=false;filters.route=t.dataset.route;render();return;}
 const a=t.dataset.action;if(!a)return;
 if(a==='export'){if(rawDirty){notice('请先应用或撤销 JSON 文本修改');return;}const errors=errorList();if(errors.length){notice('请先修正：'+errors[0]);return;}download(pool);notice('已导出完整卡池 JSON');return;}
 if(a==='apply'){await apply();return;}
 if(a==='import'){document.querySelector('#import-file').click();return;}
 if(a==='review'){const diff=changes();await confirmAction('待应用的改动',diff.length?diff.map(x=>`${x.after?x.before?'修改':'新增':'删除'} ${x.id} · ${x.after?.name||x.before.name}`).join('\n'):'当前没有改动。','知道了');return;}
 if(a==='compare'){const c=get(),original=base[group].find(x=>x.id===c.id);showCompare(original,c);return;}
 if(a!=='apply-json'&&!await leaveRaw())return;if(a!=='apply-json')rawDirty=false;
 if(a==='undo'){restoreHistory(undo,redo);return;}if(a==='redo'){restoreHistory(redo,undo);return;}
 if(a==='close-editor'){selected=null;render();return;}
 if(a==='clear-filters'){filters={query:'',route:'',hours:'',kind:'',price:'',changed:false,sort:'original'};render();return;}
 if(a==='previous'||a==='next'){const list=filtered();if(!list.length)return;const i=list.findIndex(c=>c.id===selected);selected=list[(i+(a==='next'?1:-1)+list.length)%list.length].id;renderGrid();renderEditor();return;}
 if(a==='new'||a==='duplicate'){
  snapshot();let c;
  if(group==='cards'){c=newCard([...pool.cards,...pool.events],filters.route||get()?.route||'A');if(a==='duplicate')c={...clone(get()),id:c.id,name:get().name+'（副本）'};}
  else{let n=1;while([...pool.events,...pool.cards].some(x=>x.id==='EVENT-'+n))n++;c=a==='duplicate'?{...clone(get()),id:'EVENT-'+n,name:get().name+'（副本）'}:{id:'EVENT-'+n,name:'未命名事件',copies:1,inspectionCount:1};}
  pool[group].push(c);selected=c.id;filters.query='';filters.hours='';filters.kind='';filters.price='';filters.changed=false;persist();render();return;
 }
 if(a==='delete'){const c=get();if(!await confirmAction('删除 '+c.name+'？','从当前草稿移除这张牌，可通过撤销恢复。正式卡池在点击应用后才变化。','删除'))return;snapshot();const i=pool[group].indexOf(c);pool[group].splice(i,1);selected=pool[group][Math.min(i,pool[group].length-1)]?.id;persist();render();return;}
 if(a==='reset-card'){const original=base[group].find(c=>c.id===selected);if(!original){notice('这是一张新牌，可删除或撤销');return;}snapshot();pool[group][pool[group].findIndex(c=>c.id===selected)]=clone(original);persist();renderEditor();renderGrid();return;}
 if(a==='apply-json'){
  try{const c=JSON.parse(document.querySelector('#raw-json').value),candidate=clone(pool),i=pool[group].findIndex(c=>c.id===selected);candidate[group][i]=c;const errors=validatePool(candidate);if(errors.length)throw Error(errors[0]);snapshot();pool=candidate;selected=c.id;rawDirty=false;persist();render();notice('已应用本张 JSON');}catch(error){rawDirty=true;updateStatus();notice(error.message);}return;
 }
 if(a==='reload'){
  if(!await confirmAction('重新载入源卡池？','当前草稿会被替换。需要保留时，请先导出；载入后仍可撤销。','重新载入'))return;
  try{const r=await fetch('/api/cardpool');if(!r.ok)throw Error();const data=await r.json();snapshot();base=clone(data.pool);pool=clone(data.pool);revision=data.revision;local=true;}catch{snapshot();base=clone(source);pool=clone(source);local=false;revision=null;}
  otherTab=false;selected=null;persist();render();
 }
});
function showCompare(original,current){
 const dialog=document.createElement('dialog');dialog.className='compare-dialog';dialog.innerHTML=`<div class="compare-heading"><h2>原版 / 当前草稿</h2><button aria-label="关闭对比">×</button></div><div class="compare-pair"><section><h3>源卡池</h3>${original?face(original):'<p>新建卡牌，暂无原版</p>'}</section><section><h3>当前草稿</h3>${face(current)}</section></div>`;document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.showModal();
}
document.querySelector('#import-file').addEventListener('change',async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try{if(file.size>1_000_000)throw Error('文件不能超过 1 MB');const imported=parsePool(await file.text());if(!await confirmAction('导入卡池',`将用 ${imported.cards.length} 种活动、${imported.events.length} 种事件替换草稿。可撤销；不会立即写入 demo。`,'导入'))return;snapshot();pool={...clone(base),cards:imported.cards,events:imported.events};selected=null;rawDirty=false;persist();render();notice('导入完成');}catch(error){notice(error.message.split('\n')[0]);}
});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='z'&&(e.ctrlKey||e.metaKey)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();restoreHistory(e.shiftKey?redo:undo,e.shiftKey?undo:redo);}});
window.addEventListener('beforeunload',e=>{if(rawDirty||persistError){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key===DRAFT){otherTab=true;updateStatus();notice('另一页面修改了工坊草稿。请导出当前版本，再重新载入，避免覆盖。');}});
async function init(){
 let draft=null;try{draft=JSON.parse(localStorage.getItem(DRAFT)||'null');}catch{notice('原草稿无法读取，已载入正式卡池');}
 try{const r=await fetch('/api/cardpool',{signal:AbortSignal.timeout(3000)});if(r.ok){const data=await r.json();if(!validatePool(data.pool).length){base=clone(data.pool);pool=clone(base);revision=data.revision;local=true;}}}catch{}
 if(draft?.pool&&draft?.base){
  migrateGoods(draft.pool);migrateGoods(draft.base);
  // Invalid intermediate numeric edits are still recoverable drafts.
  if(Array.isArray(draft.pool.cards)&&Array.isArray(draft.pool.events)&&draft.pool.rulesVersion===32){
   if(same(draft.base,base)||!same(draft.pool,draft.base)){
    pool=draft.pool;savedAt=draft.savedAt||'';
    if(!same(draft.base,base)){base=draft.base;revision=draft.revision;notice('已恢复旧草稿；源卡池可能有更新。请先导出草稿，再重新载入。');}
   }
  }
 }
 render();
}
init();
