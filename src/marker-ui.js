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
 ${f.spend?sources(p,f.spend,'marker-resource'):''}
 ${f.optionalInspirationCash||f.optionalInspirationProfit?'<label><input id="marker-use-inspiration" type="checkbox">消耗灵感1，'+(f.optionalInspirationCash?'资金 +'+f.optionalInspirationCash:'副业 +'+f.optionalInspirationProfit)+'</label>'+sources(p,'inspiration','marker-optional-source'):''}
 ${f.wholeNight?sources(p,'inspiration','marker-night'):''}
 ${Array.from({length:f.generate},(_,i)=>select('marker-night-'+i,'灵感 '+(i+1),nights(p).filter(x=>f.empty.includes(x.key)))).join('')}
 ${f.convert?number('marker-amount','转为资金的灵感',inspirationCount(p))+conversionInputs(p):''}
 ${f.targetRequired?select('marker-target','相邻目标',f.targets.map(x=>({key:x.uid,label:getCard(x).name}))):''}
 ${f.trade?`<p>当前汇率 $${g.exchangeRate}/本金；本牌成交价 $${Math.max(1,g.exchangeRate+f.trade.delta)}。</p>${select('marker-trade','方向',(f.trade.mode==='either'?['buy','sell']:[f.trade.mode]).map(key=>({key,label:key==='buy'?'买入':'卖出'})))}${number('marker-quantity','数量（0 为不交易）',f.trade.limit)}${sources(p,'principal','marker-capital-source')}${select('marker-capital-target','买入后放到',[{key:'reserve',label:'储备'},...p.cards.filter(x=>findPlacement(p,x.uid)&&getCard(x).mechanic?.capital).map(x=>({key:x.uid,label:getCard(x).name+' '+(x.principal||0)+'/'+getCard(x).mechanic.capital}))])}`:''}
 <div><button data-action="opp-marker" ${p.bot?'disabled':''}>执行</button><button data-action="opp-activity-skip" ${p.bot?'disabled':''}>跳过</button></div></div>`;
}
function conversionInputs(p,prefix='convert'){return '<details><summary>指定灵感来源（不选则按周一到周日）</summary>'+tokenSources(p,'inspiration').map(x=>number('marker-'+prefix+'-'+x.key,x.label,x.count)).join('')+'</details>';}
function chosenSources(p,prefix){const keys=tokenSources(p,'inspiration').flatMap(x=>Array(Math.max(0,Math.min(x.count,Number(document.getElementById('marker-'+prefix+'-'+x.key)?.value)||0))).fill(x.key));return keys.length?keys:undefined;}
const val=id=>document.getElementById(id)?.value;
export function markerValue(g){const p=g.players[g.opportunity.player],f=selection(g,p,cardAt(p,g.opportunity.uid));return {useInspiration:!!document.getElementById('marker-use-inspiration')?.checked,optionalSource:val('marker-optional-source'),resource:val('marker-resource'),night:val('marker-night'),nights:Array.from({length:f.generate},(_,i)=>val('marker-night-'+i)),amount:Number(val('marker-amount')||0),convertSources:chosenSources(p,'convert'),target:val('marker-target'),trade:val('marker-trade'),quantity:Number(val('marker-quantity')||0),capitalSource:val('marker-capital-source'),capitalTarget:val('marker-capital-target')};}
export function placementPanel(g,p,uid,s){
 const c=cardAt(p,uid),o=playOptions(p,c,g);
 return `<section class="slot-editor marker-form"><b>${esc(getCard(c).name)} → ${slotLabel(s)}</b>
 ${o.spend?sources(p,o.spend,'marker-play-resource'):''}
 ${o.capital?number('marker-play-capital','放入本金（优先用储备，不足按 $'+o.rate+' 购入）',o.capital):''}
 ${o.artist?number('marker-play-art','转入灵感（撤回清空）',Math.min(o.artist,inspirationCount(p)))+conversionInputs(p,'art'):''}
 ${o.salaryTransfer?number('marker-salary-transfer','从工资区转入履职（每枚副业1）',Math.min(o.salaryTransfer,p.duty||0)):''}
 ${o.duty?'<label><input id="marker-play-duty" type="checkbox">从工资区附一枚履职：工资 −1，本牌免查岗</label>':''}
 <div><button data-action="place-marker">确认安排</button><button data-action="cancel">取消</button></div></section>`;
}
export function placementValue(p){return {salaryTransfer:Number(val('marker-salary-transfer')||0),resource:val('marker-play-resource'),capital:Number(val('marker-play-capital')||0),art:Number(val('marker-play-art')||0),artSources:chosenSources(p,'art'),duty:!!document.getElementById('marker-play-duty')?.checked};}
