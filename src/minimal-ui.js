import { DAYS, cardLevel, ROUTES, MARKET_LIMITS, getCard, cardPhases, slotKey, slotLabel } from './cards.js';
import * as E from './engine.js';
import { familyOf } from './card-visuals.js';
import { icon } from './icons.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>(n>0?'+':'−')+Math.abs(n);
const metric=(key,value,label)=>`<span class="mini-metric" title="${esc(label)}" aria-label="${esc(label)}">${icon(key,15)}<b>${value}</b></span>`;

// The compact face keeps conditions visible; the full illustrated face remains in details.
export function compactEffects(d,c={}) {
 const {play,settlement:s}=cardPhases(d),lines=[];
 if(d.maturation)lines.push(`${d.maturation.steps} 次后：${d.maturation.initial} → ${d.maturation.mature} 收入`);
 if(d.dice){const groups=new Map();d.dice.faces.forEach((amount,i)=>groups.set(amount,[...(groups.get(amount)||[]),i+1]));lines.push([...groups].map(([amount,faces])=>`${faces.join('/')}点：${signed(amount)}`).join(' · '));}
 if(d.inspirationGenerate)lines.push(`空夜放 ${d.inspirationGenerate} 灵感`);
 if(d.opportunity)lines.push(`${d.inspirationSpend?'消耗 1 灵感 · ':''}看 ${d.opportunity.count} 选 1${d.opportunity.free?' 免费':' 原价购买'}`);
 if(d.inspirationRequired)lines.push(`灵感 ≥${d.inspirationRequired}，不消耗`);
 if(d.handDiscardBonus)lines.push(`弃 1 手牌 → 收入 +${d.handDiscardBonus}`);
 if(d.condition==='lowSanity')lines.push(`理智 ≤${d.lowSanityAt} → 奖金 +${d.conditionalBonus}`);
 if(d.hireFee)lines.push(`${d.hireDrawCount?'看 '+d.hireDrawCount+' 张，':''}招募成长：原价＋执行费＋${d.hireFee}`);
 if(d.unlockWeekend)lines.push('完成后下周永久双休，理智 +2');
 if(d.unlockProtection)lines.push('完成后每周保护 1 张I级牌');
 if(d.parallel)lines.push('白天可与 1 张I级牌 同槽');
 if(d.professional)lines.push('仅上班时段 · 免查岗');
 if(d.offHours)lines.push('仅非上班时段');
 if(d.rule)lines.push(d.rule);
 for(const [k,label]of [['auto','⚙'],['duty','履职'],['principal','本金'],['art','封存灵感']])if(c[k])lines.push(label+' ×'+c[k]);
 const effects=[play.sanity?metric('sanity',signed(play.sanity),'放置理智 '+signed(play.sanity)):'',play.capital?metric('lock',play.capital,'锁定本金 '+play.capital):'',s.pay.money?metric('money','−'+s.pay.money,'每次执行支付 '+s.pay.money):'',s.receive.money?metric('money','+'+s.receive.money,'执行获得 '+s.receive.money+(d.income?'，计入逃离':'，不计入逃离')):'',s.sanity.min?metric('sanity','≥'+s.sanity.min,'结算理智至少 '+s.sanity.min):'',s.sanity.max<10?metric('sanity','≤'+s.sanity.max,'结算理智至多 '+s.sanity.max):'',d.skill?`<span class="skill-gain">完成 → ${esc(d.skill)}</span>`:''];
 return `<div class="mini-effects">${effects.join('')}</div>${lines.length?`<p class="mini-rules">${[...new Set(lines)].map(esc).join('；')}</p>`:''}${d.progressTarget||d.maturation?`<span class="mini-progress">进度 ${c.progress||0}/${d.progressTarget||d.maturation.steps}</span>`:''}`;
}

function title(d){return `<button class="card-name" data-action="detail" data-type="${d.id}" title="查看完整卡牌">${esc(d.name)}</button>`;}
function miniCard(g,p,c,market,can,selected){
 const d=getCard(c),error=market?E.canBuy(g,p,d):null;
 return `<article class="mini-card family-${familyOf(d)} ${selected===c.uid?'chosen':''}" data-hours="${d.hours}"><div class="mini-card-head">${title(d)}<span title="占用 ${d.hours}h">${cardLevel(d.hours)}</span></div>${compactEffects(d,c)}<div class="mini-card-foot"><span>${market?metric('money',d.price.money,'购买价格 '+d.price.money):d.once?'一次性':'每周'} ${d.requires?`<span title="购买技能">${esc(d.requires)}</span>`:''}</span><button data-action="${market?'buy':'select'}" data-uid="${c.uid}" ${can&&!error?'':'disabled'} title="${esc(error||'')}">${market?'购买':selected===c.uid?'取消':'安排'}</button></div>${error?`<small class="buy-reason">${esc(error)}</small>`:''}</article>`;
}

function calendar(g,p,can,selected){
 return `<section class="calendar-panel" aria-label="日程"><div class="calendar-scroll"><div class="simple-calendar">${DAYS.map((day,i)=>{
 const full=E.cardsInSlot(p,{day:i,period:0}).some(c=>getCard(c).hours===8);
 return `<div class="simple-day ${g.phase==='planning'&&g.day===i?'today':''} ${g.phase==='planning'&&i<g.day?'past':''}"><div class="simple-day-name">${day}${i===6&&E.sundayStress(g,p)?'<span>理智 −2</span>':''}</div>${[0,1,2].map(period=>{
 if(full&&period===1)return '';
 const s={day:i,period},cards=E.cardsInSlot(p,s),work=E.workType(p,s),error=selected?E.canPlace(g,p,selected,s):null,available=can&&(!selected||!error),blocked=E.eventBlocksSlot(g,p,s),isFull=period===0&&full;
 return `<div class="simple-slot ${isFull?'all-day':''} ${selected&&available?'available':''} ${blocked?'blocked':''}" data-slot="${slotKey(s)}"><button class="slot-target" data-action="slot" data-day="${i}" data-period="${period}" ${can&&i>=g.day?'':'disabled'} aria-label="${slotLabel(s)}${selected?(error?'：'+esc(error):'：可安排'):''}" title="${esc(error||'')}"><span class="slot-label">${isFull?'白天': ['上午','下午','晚上'][period]}</span>${!cards.length?`<span class="slot-empty">${blocked?'团建':period===2?(p.inspirationSlots.includes(slotKey(s))?'✦ ×'+p.inspirationSlots.filter(k=>k===slotKey(s)).length:'休息'):work?'上班':'空闲'}</span>${selected&&available?'<span class="place-label">＋ 放这里</span>':''}`:''}</button>${cards.map(c=>{
 const d=getCard(c),caught=E.activityDanger(g,p,c,s);
 return `<div class="scheduled-card family-${familyOf(d)} ${selected===c.uid?'chosen':''}">${title(d)}${compactEffects(d,c)}${caught?'<small class="buy-reason">本周暂停</small>':''}<div class="scheduled-actions"><button data-action="select" data-uid="${c.uid}" ${can&&i>=g.day?'':'disabled'}>${selected===c.uid?'取消':'移动'}</button><button data-action="unplace" data-uid="${c.uid}" ${can&&i>=g.day?'':'disabled'}>撤回</button></div></div>`;
 }).join('')}</div>`;
 }).join('')}</div>`;
 }).join('')}</div></div></section>`;
}

export function minimalPage({game:g,playerId,selected,editable,summary,opportunity,finishControls,editor,marketNotice}){
 const p=g.players[playerId],can=editable(p),state=E.sanityState(g,p),pred=g.phase==='planning'&&!p.escaped?E.preview(g,p.id):null,hand=E.unplacedCards(p),skills=E.skillCounts(p),picked=selected&&E.cardAt(p,selected);
 const phase=g.phase==='planning'?`${DAYS[g.day]} · ${esc(g.players[E.activeBuyer(g)].name)}行动`:g.phase==='resolving'?'周末结算':g.phase==='ended'?'游戏结束':'本周结果';
 return `<div class="simple-app"><header class="simple-header"><a class="simple-brand" href="/">逃离工位</a><span>第 ${g.week} 周 · ${phase}</span><nav><a href="/card-studio.html">卡牌工坊</a><button data-action="rules">规则</button><details class="more-menu"><summary>更多</summary><div><button data-action="catalogue">卡牌图鉴</button><button data-action="export">导出记录</button><button data-action="settings">新游戏 / 数值</button></div></details></nav></header>
 <div class="simple-players" role="group" aria-label="查看玩家">${g.players.map(q=>`<button class="${q.id===p.id?'active':''}" data-action="player" data-id="${q.id}" aria-pressed="${q.id===p.id}">${esc(q.name)}${q.escaped?' · 已逃离':g.phase==='planning'&&E.activeBuyer(g)===q.id?' · 行动中':''}</button>`).join('')}</div>
 <div class="simple-status"><div class="status-numbers"><span>资金 <b>${p.money}</b></span><span>理智 <b>${p.sanity}</b><small>/10</small><meter min="0" max="10" value="${p.sanity}" aria-label="理智 ${p.sanity}"></meter></span><span title="${pred?'未计查岗和精神状态事件损失、能支付费用时的预计收入；不含工资':'本周实际副业'}">${pred?'预计副业':'本周副业'} <b>${pred?(pred.incomeLow===pred.incomeHigh?pred.incomeHigh:pred.incomeLow+'–'+pred.incomeHigh):p.income}</b></span><span class="escape-target">逃离 ≥${g.config.escapeIncome} 收入 / ≥${g.config.escapeSanity} 理智</span></div><div class="turn-buttons">${g.phase==='planning'?`<button data-action="pass" ${can?'':'disabled'}>躺平</button>${finishControls(p)}`:g.phase==='resolving'&&!g.opportunity?'<button class="primary-button" data-action="resolve">结算本周</button>':''}</div></div>
 <div class="simple-event"><span><b>${esc(g.inspection.name)}</b> · ${esc(g.inspection.text)}</span><details><summary>详情</summary><p>${esc(g.inspection.text)}</p><p>抓包的牌本周暂停，每张罚 ${g.config.inspectionFine}。</p>${g.inspectionResolved?`<p>骰子：${g.inspection.rolls.join(' / ')||'无'}</p>`:''}</details></div>
 ${g.opportunity?`<section class="inline-resolution" aria-label="结算选择"><h2>${g.opportunity.stage==='wellbeing'?'事件处理':'活动选择'}</h2>${opportunity(g)}</section>`:['escape','ended'].includes(g.phase)?`<section class="inline-resolution" aria-label="周末结果">${summary()}</section>`:g.phase==='resolving'?`<p class="resolution-note">日程已锁定。一次结算到需要你选择的位置。已处理 ${g.cursor}/${g.timeline.length} 时段。<button data-action="step">逐项结算</button></p>`:''}
 <div class="simple-workspace"><main><div class="selection-bar" aria-live="polite">${picked?`已选「${esc(getCard(picked).name)}」· 点击绿色时段（${E.findPlacement(p,picked.uid)?'移动免费':'耗 1 次行动'}）<button data-action="cancel">取消</button>`:can?'买牌 / 首次安排耗行动；移动、撤回免费。':p.escaped?'已逃离，本局不再行动。':g.phase==='planning'?'等待当前玩家行动。':'查看本周日程。'}</div>${calendar(g,p,can,selected)}
 <div class="board-meta"><span>本金汇率 $${g.exchangeRate} · 储备本金 ${p.principal||0} · 储备履职 ${p.duty||0}</span><span>${p.weekend?'永久双休':p.tempWeekend?'本周双休':'周一至周六上班'}</span><span>晚上 4h 理智 −${g.config.nightStress4} · 周日白天排满 −${g.config.sundayStress??2}</span><details><summary>理智与技能</summary><p>起点 ${state.base} · 自主 +${state.freedom} · 支持 +${state.support} · 压力 −${state.pressure} · 支持费用 ${state.upkeep}</p>${Object.entries(skills).map(([r,n])=>`<p>${ROUTES[r].name} ${n}：${p.skills.filter(c=>getCard(c).skill===r).map(c=>esc(getCard(c).name)).join('、')||'无'}</p>`).join('')}${[...p.upgrades,...p.completedActivities].map(c=>`<button data-action="detail" data-type="${c.type}">${esc(getCard(c).name)}${c.activeFrom>g.week?'（下周生效）':''}</button>`).join('')}</details></div>
 ${p.protectionFrom<=g.week&&!p.escaped?`<div class="simple-protection">${p.protectionChosen?`已保护 ${slotLabel({day:Number(p.protectedSlot[0]),period:Number(p.protectedSlot[2])})}`:!p.actedThisWeek?`<label>保护时段 <select id="protection-slot"><option value="" selected disabled>选择时段与目标牌</option>${DAYS.slice(0,6).flatMap((_,day)=>[0,1].filter(period=>E.workType(p,{day,period})).map(period=>`<option value="${day}-${period}">${slotLabel({day,period})} · ${esc(getCard(E.cardsInSlot(p,{day,period}).find(c=>getCard(c).hours===4&&!getCard(c).professional))?.name||'暂无活动')}</option>`)).join('')}</select></label><button data-action="protect" ${can?'':'disabled'}>保护</button>`:'本周未指定保护'}</div>`:''}
 ${editor(p)}${pred?.warnings.length?`<details class="execution-warnings"><summary>${pred.warnings.length} 项执行限制</summary>${pred.warnings.map(l=>`<p>${esc(l.text)}</p>`).join('')}</details>`:''}
 <section class="simple-hand" aria-label="未安排手牌"><div class="section-label">手牌 <span>${hand.length}</span></div><div class="simple-hand-grid">${hand.map(c=>miniCard(g,p,c,false,can,selected)).join('')||'<p class="empty-hand">从市场买牌后，选中手牌安排到日程。</p>'}</div></section>
 <details class="simple-log"><summary>本周记录</summary><div>${g.logs.filter(l=>l.week===g.week).slice().reverse().map(l=>`<p><b>${l.player===null?'全体':esc(g.players[l.player].name)}</b> ${esc(l.text)}</p>`).join('')}</div><label>测试笔记<textarea id="notes" rows="3">${esc(g.notes||'')}</textarea></label><button data-action="export">导出记录</button></details></main>
 <aside class="simple-market" aria-label="公共市场"><div class="section-label">市场 <details><summary>刷新规则</summary><p>${esc(marketNotice())}</p></details></div>${Object.entries(MARKET_LIMITS).map(([h])=>`<section aria-label="${cardLevel(h)}市场"><div class="market-caption">${cardLevel(h)} <span>牌堆 ${g.decks[h].length} · 弃牌 ${g.discard[h].length}</span></div><div class="simple-market-grid">${g.market[h].map(c=>miniCard(g,p,c,true,can,selected)).join('')}</div></section>`).join('')}<details class="simple-learning"><summary>购买成长牌</summary><div>${E.learningOffers(g,p.id).map(c=>`<button data-action="learn" data-type="${c.type}" ${can&&!E.canBuy(g,p,getCard(c))?'':'disabled'}>${esc(getCard(c).name)} · ${getCard(c).price.money} 资金</button><button data-action="detail" data-type="${c.type}" aria-label="${esc(getCard(c).name)}详情">详情</button>`).join('')||'暂无可购成长牌'}</div></details></aside></div></div>`;
}
