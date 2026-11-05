import {getCard,slotLabel} from './cards.js';
import {cardAt,findPlacement,inspirationCount} from './engine.js';
import {selection,tokenSources,tokenNames,playOptions} from './engine-v32.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const select=(id,label,items)=>`<label>${label} <select id="${id}">${items.map(x=>`<option value="${esc(x.key)}">${esc(x.label)}${x.count!==undefined?' ×'+x.count:''}</option>`).join('')}</select></label>`;
const number=(id,label,max)=>`<label>${label} <input id="${id}" type="number" min="0" max="${max}" value="0" step="1"></label>`;
const sources=(p,kind,id)=>select(id,tokenNames[kind]+'来源',tokenSources(p,kind));
const nights=p=>Array.from({length:7},(_,day)=>({key:day+'-2',label:slotLabel({day,period:2})}));
export function markerPanel(g){
 const q=g.opportunity,p=g.players[q.player],c=cardAt(p,q.uid),f=selection(g,p,c);
 return `<div class="marker-form"><p>${esc(p.name)} · ${esc(q.source)}</p>
 ${f.discardHand?select('marker-discard','弃手牌1 → 资金 +'+f.discardHand,p.cards.filter(x=>!findPlacement(p,x.uid)).map(x=>({key:x.uid,label:getCard(x).name}))):''}
 ${f.spend?sources(p,f.spend,'marker-resource'):''}
 ${f.encore&&tokenSources(p,'inspiration').length?select('marker-encore','返场 · 加倍已有灵感（最多添'+f.encore+'枚）',[{key:'',label:'不返场'},...tokenSources(p,'inspiration')]):''}
 ${f.fullSale?`<label><input type="checkbox" id="marker-sell-full"> 满架可卖出 1 件，资金 +${f.fullSale}</label>`:''}
 ${f.optionalInspirationCash||f.optionalInspirationProfit?'<label><input id="marker-use-inspiration" type="checkbox">消耗灵感1，'+(f.optionalInspirationCash?'资金 +'+f.optionalInspirationCash:'副业 +'+f.optionalInspirationProfit)+'</label>'+sources(p,'inspiration','marker-optional-source'):''}
 ${f.inspirationDice?'<label><input id="marker-use-inspiration" type="checkbox">✦ −1 → D6：4–6，资金 +'+f.inspirationDice+'；1–3，+0</label>'+sources(p,'inspiration','marker-optional-source'):''}
 ${f.wholeNight?sources(p,'inspiration','marker-night'):''}
 ${Array.from({length:f.generate},(_,i)=>select('marker-night-'+i,'灵感 '+(i+1),nights(p).filter(x=>f.empty.includes(x.key)))).join('')}
 ${f.convert?number('marker-amount','转为资金的灵感',inspirationCount(p))+conversionInputs(p):''}
 ${f.targetRequired?select('marker-target','相邻目标',f.targets.map(x=>({key:x.uid,label:getCard(x).name}))):''}
 ${f.goods?goodsDestinations(p,f.goods):''}
 ${f.trade?`<p>${f.trade.bundle?'整批 '+f.trade.limit+' 件，付 $'+f.trade.price:'每件 $'+f.trade.price}${f.trade.fullPrice?'；售前装满时 $'+f.trade.fullPrice:''}。出售所得周末到账。</p>${select('marker-trade','方向',(f.trade.mode==='either'?['buy','sell']:[f.trade.mode]).map(key=>({key,label:key==='buy'?'买入':'卖出'})))}${f.trade.bundle?select('marker-quantity','数量',[{key:0,label:'不交易'},{key:f.trade.limit,label:'整批 '+f.trade.limit+' 件'}]):number('marker-quantity','数量（0 为不交易）',f.trade.limit)}${f.trade.mode!=='buy'&&!f.trade.own?Array.from({length:f.trade.limit},(_,i)=>sources(p,'principal','marker-goods-source-'+i)).join(''):''}${f.trade.mode!=='sell'?goodsDestinations(p,f.trade.limit):''}`:''}
 <div><button data-action="opp-marker" ${p.bot?'disabled':''}>执行</button><button data-action="opp-activity-skip" ${p.bot?'disabled':''}>跳过</button></div></div>`;
}
function goodsDestinations(p,n){const targets=[{key:'reserve',label:'库存'},...p.cards.filter(x=>findPlacement(p,x.uid)&&getCard(x).mechanic?.capital).map(x=>({key:x.uid,label:getCard(x).name+' '+(x.principal||0)+'/'+getCard(x).mechanic.capital}))];return Array.from({length:n},(_,i)=>select('marker-goods-target-'+i,'货品 '+(i+1)+' 去向',targets)).join('');}
function conversionInputs(p,prefix='convert'){return '<details><summary>指定灵感来源（不选则按周一到周日）</summary>'+tokenSources(p,'inspiration').map(x=>number('marker-'+prefix+'-'+x.key,x.label,prefix==='art'?1:x.count)).join('')+'</details>';}
function chosenSources(p,prefix){const keys=tokenSources(p,'inspiration').flatMap(x=>Array(Math.max(0,Math.min(x.count,Number(document.getElementById('marker-'+prefix+'-'+x.key)?.value)||0))).fill(x.key));return keys.length?keys:undefined;}
const val=id=>document.getElementById(id)?.value;
export function markerValue(g){const p=g.players[g.opportunity.player],f=selection(g,p,cardAt(p,g.opportunity.uid)),n=Number(val('marker-quantity')||0);return {discardUid:val('marker-discard'),goodsTargets:Array.from({length:f.goods||n},(_,i)=>val('marker-goods-target-'+i)||'reserve'),goodsSources:f.trade&&!f.trade.own?Array.from({length:n},(_,i)=>val('marker-goods-source-'+i)):undefined,encoreNight:val('marker-encore'),sellFull:!!document.getElementById('marker-sell-full')?.checked,useInspiration:!!document.getElementById('marker-use-inspiration')?.checked,optionalSource:val('marker-optional-source'),resource:val('marker-resource'),night:val('marker-night'),nights:Array.from({length:f.generate},(_,i)=>val('marker-night-'+i)),amount:Number(val('marker-amount')||0),convertSources:chosenSources(p,'convert'),target:val('marker-target'),trade:val('marker-trade'),quantity:n};}
export function placementPanel(g,p,uid,s){
 const c=cardAt(p,uid),o=playOptions(p,c,g);
 return `<section class="slot-editor marker-form"><b>${esc(getCard(c).name)} → ${slotLabel(s)}</b>
 ${o.spend?sources(p,o.spend,'marker-play-resource'):''}
 ${o.resources?Object.entries(o.resources).map(([kind,n])=>Array.from({length:n},(_,i)=>sources(p,kind,'marker-play-'+kind+'-'+i)).join('')).join(''):''}
 ${o.capital?number('marker-play-capital','放入货品（优先用库存，不足按 $'+o.goodsPrice+' 购入）',o.capital):''}
 ${o.artist?number('marker-play-art','转入灵感（每个空夜至多1，撤回清空）',Math.min(o.artist,tokenSources(p,'inspiration').length))+conversionInputs(p,'art'):''}
 ${o.salaryTransfer?number('marker-salary-transfer','从工资区转入履职（每枚副业1）',Math.min(o.salaryTransfer,p.duty||0)):''}
 <div><button data-action="place-marker">确认安排</button><button data-action="cancel">取消</button></div></section>`;
}
export function placementValue(p){const resources={};for(const kind of ['inspiration','auto','principal']){const inputs=[...document.querySelectorAll('[id^="marker-play-'+kind+'-"]')];if(inputs.length)resources[kind]=inputs.map(x=>x.value);}return {resources,salaryTransfer:Number(val('marker-salary-transfer')||0),resource:val('marker-play-resource'),capital:Number(val('marker-play-capital')||0),art:Number(val('marker-play-art')||0),artSources:chosenSources(p,'art')};}
