import { ROUTES, cardPhases } from './cards.js';
import { familyOf, hours } from './card-visuals.js';
import { icon } from './icons.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const crops = {money:[20,200],sanity:[430,200],once:[850,200],repeat:[20,660],inspiration:[430,660],clock:[850,660]};
const names = {money:'资金',sanity:'理智',inspiration:'灵感'};

// Crop the generated transparent atlas without redrawing or modifying its artwork.
export function artIcon(name) {
  const [x,y] = crops[name] || crops.inspiration;
  return `<svg class="painted-icon" viewBox="${x} ${y} 400 400" aria-hidden="true"><image href="/assets/card-ui/icons-atlas.png" width="1280" height="1280"/></svg>`;
}
export function badge(name, value, label, extra='') {
  const hasValue=value!==null&&value!==undefined;
  return `<span class="pictogram ${hasValue?'has-quantity':''} ${String(value).length>1?'wide-quantity':''} ${extra}" role="img" aria-label="${esc(label)}" title="${esc(label)}">${artIcon(name)}${hasValue?`<span class="quantity" aria-hidden="true">${numberOverlay(value)}</span>`:''}</span>`;
}
function numberOverlay(value){
  return [...String(value)].map(ch=>{
    const index='0123456789+−≥'.indexOf(ch);
    if(index<0) return esc(ch);
    const x=[85,395,685,975][index%4],y=[78,368,658,948][Math.floor(index/4)];
    return `<svg class="number-glyph" viewBox="${x} ${y} 205 240"><image href="/assets/card-ui/number-overlays.png" width="1280" height="1280"/></svg>`;
  }).join('');
}
function resources(values={},sign='+') {
  return Object.entries(values).filter(([,n])=>n).map(([k,n])=>badge(k,sign+n,`${names[k]} ${sign}${n}`,sign==='−'?'spend':'receive')).join('');
}
function skills(pattern, gain=false) {
  return `<span class="card-skills" title="${gain?'完成获得技能':'购买需要技能'} ${pattern}" aria-label="${gain?'完成获得技能':'购买需要技能'} ${pattern}">${icon(gain?'arrow':'lock',12)}${[...new Set(pattern)].map(r=>`<span class="route-mark family-${ROUTES[r].family}">${icon(ROUTES[r].icon,14)}<b>${[...pattern].filter(x=>x===r).length}</b></span>`).join('')}</span>`;
}
function mechanics(d,c){
 const glyph=(label,body)=>'<span class="mechanic-glyph" role="img" title="'+esc(label)+'" aria-label="'+esc(label)+'">'+body+'</span>';
 const coin=(n)=>badge('money',n,'收入 '+n);
 return '<div class="mechanic-equations">'+[
 d.inspirationGenerate?glyph('可支付费用，在不同空夜各放1枚灵感，共'+d.inspirationGenerate+'枚',icon('moon',20)+' → '+badge('inspiration','+'+d.inspirationGenerate,'放置灵感')):'',
 d.inspirationSpend?glyph('可消耗1灵感，看3，符合技能的1张免费入手',badge('inspiration','−1','消耗灵感')+' → '+icon('layers',20)+'3 → 1'):'',
 d.handDiscardBonus?glyph('可弃1张手牌，本次收入另加'+d.handDiscardBonus,icon('layers',18)+'1 × → '+coin('+'+d.handDiscardBonus)):'',
 d.maturation?glyph('前'+d.maturation.steps+'次成功收入'+d.maturation.initial+'，之后收入'+d.maturation.mature,coin('+'+d.maturation.initial)+' → '+icon('check',16)+coin('+'+d.maturation.mature)):'',
 d.condition==='lowSanity'?glyph('执行时理智≤'+d.lowSanityAt+'，奖金另加'+d.conditionalBonus,badge('sanity','≤'+d.lowSanityAt,'低理智条件')+' → '+coin('+'+d.conditionalBonus)):'',
 d.inspirationRequired?glyph('版图灵感至少 '+d.inspirationRequired+'，不消耗',badge('inspiration','≥'+d.inspirationRequired,'版图灵感门槛')):'',
 d.capitalRatio?glyph('每 '+d.capitalRatio+' 本金结算资金 +1；当前锁定 '+(c?.lockedCapital||0),icon('lock',14)+badge('money',d.capitalRatio,'本金比例')+' → '+coin('+1')+(c?.lockedCapital?'<small>['+c.lockedCapital+']</small>':'')):'',
 d.opportunity&&!d.inspirationSpend?glyph('看 '+d.opportunity.count+' 张，原价买至多 1 张',icon('eye',20)+icon('layers',20)+'<b>'+d.opportunity.count+'</b> → '+icon('shop',20)+'<b>1</b>'):'',
 d.hireDrawCount?glyph('4h暗堆看3张，可招聘其中1张成长；余牌弃置',icon('eye',20)+icon('layers',20)+'3 → '+icon('book',20)+'1'):'',
 d.hireFee?glyph('原价＋全部执行费＋'+d.hireFee+'，买一张4h成长牌直接归档，不返现',badge('money','−'+d.hireFee,'招聘费')+' + '+icon('shop',18)+badge('once',null,'4h成长牌')+' → '+icon('book',20)):'',
 d.boost?glyph('下一张牌收入 +1',icon('arrow',20)+coin('+1')):'',
 d.condition==='inspiration'?glyph('版图灵感至少 '+d.inspirationBonusAt+'：收入 +'+d.conditionalBonus,badge('inspiration','≥'+d.inspirationBonusAt,'版图灵感')+' → '+coin('+'+d.conditionalBonus)):'',
 d.condition==='professional'?glyph('本周此前完成工作活动：收入 +'+d.conditionalBonus,icon('bag',20)+icon('check',16)+' → '+coin('+'+d.conditionalBonus)):'',
 d.condition==='capitalJob'?glyph('本周此前完成压有本金的牌：收入 +'+d.conditionalBonus,icon('lock',16)+coin(null)+icon('check',16)+' → '+coin('+'+d.conditionalBonus)):''
 ].join('')+'</div>';
}
export function cardFace(d,compact=false,c=null) {
  const {purchase,play,settlement}=cardPhases(d),mind=play.sanity;
  const progress=c?.progress||0, target=d.progressTarget, holes=target||d.maturation?.steps;
  const symbolic=d.parallel||d.capitalRatio||d.opportunity||d.hireFee||d.condition||d.boost||d.draft||d.maturation||d.inspirationGenerate||d.inspirationSpend||d.handDiscardBonus;
  const rule=symbolic?'':d.unlockWeekend?'完成后下周起：永久双休，理智+2':d.unlockProtection?'完成后下周起：每周保护一张4h':d.rule;
  const dice=settlement.dice?Object.entries(settlement.dice.faces.reduce((out,n,i)=>((out[n]||=[]).push(i+1),out),{})).map(([n,faces])=>`<span class="dice-outcome"><span class="die-faces" aria-label="骰点 ${faces.join('、')}">${faces.map(f=>`<span aria-hidden="true">${'⚀⚁⚂⚃⚄⚅'[f-1]}</span>`).join('')}</span><span>→</span>${badge('money','+'+n,`结算资金 +${n}`)}</span>`).join(''):'';
  return `<div class="tabletop-face illustrated-face family-${familyOf(d)} duration-${hours(d.size)} ${compact?'compact-face':''} ${mind?'has-mind':''}" style="--card-hours:${hours(d.size)}">
    <header class="printed-title"><span class="route-emblem">${icon(d.icon,14)}</span><strong>${esc(d.name)}</strong></header>
    <div class="mind-corner" data-phase="play" aria-label="打出：理智影响">${mind?badge('sanity',(mind>0?'+':'−')+Math.abs(mind),`打出：理智 ${mind>0?'+':'−'}${Math.abs(mind)}，撤回解除${mind>0?'；须能支付结算费用，不逐周累加':''}`,'reversible'):''}</div>
    ${play.capital||play.capitalRatio||play.parallel||play.professional||play.offHours||play.sundayRelief?`<div class="printed-play" data-phase="play" aria-label="打出：本金与时段">${icon('arrow',12)}${play.sundayRelief?`<span class="mechanic-glyph" title="周日全天且成功付费：额外补偿2点占用压力" aria-label="周日全天理智补偿＋2"><b>7</b>${icon('sun',14)} → ${badge('sanity','+'+play.sundayRelief,'周日全天理智补偿＋'+play.sundayRelief)}</span>`:''}${play.capital||play.capitalRatio?`<span class="capital-mark" title="打出锁定本金，撤回返还">${icon('lock',12)}${badge('money',c?.lockedCapital||play.capital||play.capitalRatio,'打出锁定本金')}</span>`:''}${play.parallel?`<span class="mechanic-glyph" title="仅白天与另一张4h并行">${icon('layers',16)} ∥</span>`:''}${play.offHours?`<span class="mechanic-glyph" title="仅非上班时间" aria-label="仅非上班时间">${icon('moon',16)} / ${icon('sun',16)} ${icon('bag',13)}⊘</span>`:''}${play.professional?`<span class="professional-mark" title="仅工作白天，免查岗">${icon('bag',13)} ${icon('check',12)}</span>`:''}</div>`:''}
    <div class="printed-effects" data-phase="settlement" aria-label="结算效果">${settlement.sanity.min||settlement.sanity.max<10?`<div class="settlement-gates">${settlement.sanity.min?badge('sanity','≥'+settlement.sanity.min,`结算要求理智 ≥${settlement.sanity.min}`):''}${settlement.sanity.max<10?badge('sanity','≤'+settlement.sanity.max,`结算要求理智 ≤${settlement.sanity.max}`):''}${icon('arrow',14)}</div>`:''}<div class="resource-equation">${resources(settlement.pay,'−')}${Object.values(settlement.pay).some(Boolean)&&Object.values(settlement.receive||{}).some(Boolean)?'<span class="effect-arrow" aria-hidden="true">→</span>':''}${target&&Object.values(settlement.receive||{}).some(Boolean)?`<span class="completion-gain" title="完成${target}次后获得" aria-label="完成${target}次后获得">${icon("check",14)}${resources(settlement.receive)}</span>`:resources(settlement.receive)}${d.income?`<span class="income-mark" title="此处正资金计入逃离门槛" aria-label="计入逃离门槛">${icon('exit',13)}</span>`:''}</div>
    ${mechanics(d,c)}
    ${dice?`<div class="dice-table" aria-label="执行时掷一次骰">${dice}</div>`:''}
    ${settlement.skill?skills(settlement.skill,true):''}
    ${d.draft?`<span class="draft-glyph" title="从未亮出的高级牌抽二选一">${icon('layers',14)} 2 → 1</span>`:''}
    ${rule?`<p class="printed-rule">${esc(rule)}</p>`:''}
    ${holes?`<div class="printed-progress" role="img" aria-label="进度 ${progress}/${holes}" title="已推进 ${progress}/${holes}">${Array.from({length:holes},(_,i)=>`<i class="${i<progress?'filled':''}"></i>`).join('')}</div>`:''}</div>
    <div class="lifetime-seal">${badge(d.once?'once':'repeat',target||null,d.once?`一次性，成功 ${target||1} 次后完成离场`:'多次活动，每周可执行')}${d.core?`<span class="permanent-mark" title="完成后成为永久能力">${icon('achievement',12)}</span>`:''}</div>
    <footer class="printed-price" data-phase="purchase" aria-label="购买检测">${icon('shop',12)}${badge('money',purchase.price.money,`购买价格 ${purchase.price.money} 资金`,'purchase-badge')}${purchase.skills?skills(purchase.skills):''}</footer>
  </div>`;
}

export function iconHelp(){return `<div class="icon-help">${[
  [icon('layers',24)+' ∥','并行：与另一张活动共用时段，时间取较长者。最多两张，分别计算理智影响、结算资金与查岗。'],
  [icon('eye',24)+icon('layers',24)+'3 → '+icon('shop',24)+'1','看3买1：选一个时长牌堆查看，原价购买至多一张；其余弃置，下周再安排。'],
  [icon('shop',24)+badge('money',5,'买价示例'),'购买：底栏检查价格与技能，满足后支付买价；理智线不在购买或安排时检查。搜索与招募中的购买同样检查。'],
  [icon('arrow',24)+badge('sanity','+2','理智影响','reversible'),'打出：右上理智 +／− 是日程影响，撤回解除，不逐周累加。正影响须能支付结算费用；查停或团建时失效。夜间另计理智 −1；周日白天排满8h另计理智 −2，只占半天不扣。锁币是打出时投入的本金，撤回返还。'],
  [badge('money','−1','结算支付')+' → '+badge('money','+2','结算获得'),'结算：执行前检查中央理智线，不满足则本周不执行、不收费，牌保留；满足后中央负金币先支付，正金币在周末到账；付不起的重复活动撤回手牌并解除理智影响。看牌、骰子、技能归档也在中央结算区。带出口图标的正资金计入逃离门槛，工资与奖金不计。'],
  [badge('once',null,'一次性'),'票券：成功执行一次后离场。'],
  [badge('once',2,'两次完成'),'票券角标2／3：累计成功相应次数后完成，每次都支付中央费用；奖励与技能在最后一次获得，圆孔放进度指示物。'],
  [badge('repeat',null,'多次'),'循环箭头：跨周保留，重复执行，包括找牌活动。'],
  [badge('inspiration','≥2','版图灵感门槛'),'灵感：仅由卡牌放在空夜，每格最多1枚，放牌清除、不自动补充。≥只检查不消耗；−是消耗。空位不足不生成、不收费。'],
  [badge('sanity','≥2','结算理智线'),'中央理智 ≥2（或 ≤2）只在本张活动执行前检查一次，理智不作为费用。'],
  [badge('sanity','−1','理智影响','reversible'),'右上理智 −1：留在日程就降低状态，撤回或完成时解除。安排后的理智仍不能低于0。']
].map(([symbol,text])=>`<div>${symbol}<p>${text}</p></div>`).join('')}</div>`;}
