import { ROUTES } from './cards.js';
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
  return `<span class="card-skills" title="${gain?'完成获得技能':'安排需要技能'} ${pattern}" aria-label="${gain?'完成获得技能':'安排需要技能'} ${pattern}">${icon(gain?'arrow':'lock',12)}${[...new Set(pattern)].map(r=>`<span class="route-mark family-${ROUTES[r].family}">${icon(ROUTES[r].icon,14)}<b>${[...pattern].filter(x=>x===r).length}</b></span>`).join('')}</span>`;
}
export function cardFace(d,compact=false,c=null) {
  const progress=c?.progress||0, target=d.progressTarget;
  const rule=d.unlockWeekend?'本周先完成副业；完成后永久双休，工资不变':d.rule;
  const dice=d.dice?Object.entries(d.dice.faces.reduce((out,n,i)=>((out[n]||=[]).push(i+1),out),{})).map(([n,faces])=>`<span class="dice-outcome"><span class="die-faces" aria-label="骰点 ${faces.join('、')}">${faces.map(f=>`<span aria-hidden="true">${'⚀⚁⚂⚃⚄⚅'[f-1]}</span>`).join('')}</span><span>→</span>${badge('money',n,`${d.dice.resource==='salary'?'奖金':'骰面副业收入'} ${n}`)}</span>`).join(''):'';
  return `<div class="tabletop-face illustrated-face family-${familyOf(d)} duration-${hours(d.size)} ${compact?'compact-face':''} ${d.minSanity||d.maxSanity<10||d.stress||d.support?'has-mind':''}" style="--card-hours:${hours(d.size)}">
    <header class="printed-title"><span class="route-emblem">${icon(d.icon,14)}</span><strong>${esc(d.name)}</strong></header>
    <div class="mind-corner">${d.support?badge('sanity','+'+d.support,`付费后本周理智支持 +${d.support}，撤回解除，不逐周累加`,'reversible'):''}${d.maxSanity<10?badge('sanity','≤'+d.maxSanity,`安排和执行要求理智 ≤${d.maxSanity}`):d.minSanity?badge('sanity','≥'+d.minSanity,`安排和执行要求理智 ≥${d.minSanity}`):''}${d.stress?badge('sanity','−'+d.stress,`日程压力 ${d.stress}，撤回解除`,'reversible'):''}</div>
    <div class="printed-effects"><div class="resource-equation">${d.upkeep?badge('money','−'+d.upkeep,`结算前每周支付 ${d.upkeep} 资金维持支持`,'spend'):''}${resources(d.cost,'−')}${Object.keys(d.cost||{}).length&&Object.keys(d.gain||{}).length?'<span class="effect-arrow" aria-hidden="true">→</span>':''}${resources(d.gain)}</div>
    ${dice?`<div class="dice-table" aria-label="执行时掷一次骰">${dice}</div>`:''}
    ${d.professional?`<span class="professional-mark" title="履职，不算摸鱼；仅工作白天可安排">${icon('bag',13)} ${icon('check',12)}</span>`:''}
    ${d.capital?`<span class="capital-mark" title="安排时锁定本金 ${d.capital}，撤回返还">${icon('lock',12)}${badge('money',c?.lockedCapital||d.capital,`锁定本金 ${d.capital}`)}</span>`:''}
    ${d.requires?skills(d.requires):''}${d.skill?skills(d.skill,true):''}
    ${d.draft?`<span class="draft-glyph" title="从未亮出的高级牌抽二选一">${icon('layers',14)} 2 → 1</span>`:''}
    ${rule?`<p class="printed-rule">${esc(rule)}</p>`:''}
    ${target?`<div class="printed-progress" role="img" aria-label="进度 ${progress}/${target}" title="已推进 ${progress}/${target}">${Array.from({length:target},(_,i)=>`<i class="${i<progress?'filled':''}"></i>`).join('')}</div>`:''}</div>
    <div class="lifetime-seal">${badge(d.once?'once':'repeat',target||null,d.once?`一次性，成功 ${target||1} 次后完成离场`:'多次活动，每周可执行')}${d.core?`<span class="permanent-mark" title="完成后成为永久能力">${icon('achievement',12)}</span>`:''}</div>
    <footer class="printed-price">${badge('money',d.price.money,`购买价格 ${d.price.money} 资金`,'purchase-badge')}${d.income?`<span class="income-mark" title="副业收入，计入逃离门槛" aria-label="副业收入">${icon('bag',13)}</span>`:''}</footer>
  </div>`;
}

export function iconHelp(){return `<div class="icon-help">${[
  [badge('money',5,'买价示例'),'底栏金币角标是购买价；效果区的正负角标表示收益、消耗。'],
  [badge('sanity','+2','可逆支持','reversible'),'右上心智 +2 与回转箭头：占用日程提供支持，每周先付效果区金币费用；不累加，撤回解除，查停、团建、4h 熬夜或未付费则失效。'],
  [badge('once',null,'一次性'),'票券：成功执行一次后离场。'],
  [badge('once',3,'三次完成'),'票券角标 3：累计成功三次后离场；圆孔放置当前进度指示物。'],
  [badge('repeat',null,'多次'),'循环箭头：跨周保留，重复执行。'],
  [badge('sanity','≥2','理智门槛'),'右上心智 ≥2：安排后、执行前都须满足。'],
  [badge('sanity','−1','可逆压力','reversible'),'右上心智 −1 与回转小箭头：日程压力，撤回或完成时解除；不会累积恢复收益。']
].map(([symbol,text])=>`<div>${symbol}<p>${text}</p></div>`).join('')}</div>`;}
