import { cardImage } from './card-images.js';
import { DAYS, cardLevel, ROUTES, MARKET_LIMITS, getCard, cardPhases, slotKey, slotLabel, inspectionText } from './cards.js';
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
 for(const [k,label]of [['auto','⚙'],['duty','履职'],['principal','货品'],['projectDuty','双休进度']])if(c[k])lines.push(label+' ×'+c[k]);
 if(d.mechanic?.artist&&c.uid&&c.art!==undefined)lines.push('✦ ×'+c.art+' · 牌面副业 '+(d.fixedProfit+c.art));
 const effects=[play.sanity?metric('sanity',signed(play.sanity),'放置理智 '+signed(play.sanity)):'',play.capital?metric('lock',play.capital,'锁定占款 '+play.capital):'',s.pay.money?metric('money','−'+s.pay.money,'每次执行支付 '+s.pay.money):'',s.receive.money?metric('money','+'+s.receive.money,'执行获得 '+s.receive.money+(d.income?'，计入逃离':'，不计入逃离')):'',s.sanity.min?metric('sanity','≥'+s.sanity.min,'结算理智至少 '+s.sanity.min):'',s.sanity.max<10?metric('sanity','≤'+s.sanity.max,'结算理智至多 '+s.sanity.max):'',d.skill?`<span class="skill-gain">完成 → ${esc(d.skill)}</span>`:''];
 return `<div class="mini-effects">${effects.join('')}</div>${lines.length?`<p class="mini-rules">${[...new Set(lines)].map(esc).join('；')}</p>`:''}${d.progressTarget||d.maturation?`<span class="mini-progress">进度 ${c.progress||0}/${d.progressTarget||d.maturation.steps}</span>`:''}`;
}

function title(d){return `<button class="card-name" data-action="detail" data-type="${d.id}" title="查看完整卡牌">${esc(d.name)}</button>`;}
function miniCard(g,p,c,market,can,selected){
 const d=getCard(c),reserving=market&&g.weekendReserve?.player===p.id&&!p.bot&&!p.reserved,error=market&&!reserving?E.canBuy(g,p,d):null;
 can=reserving||(can&&(market?E.planningStage(g)==='purchase':E.planningStage(g)==='arrange'));
 const image=cardImage(d),fresh=market&&c.marketAddedWeek===g.week&&c.marketNew&&g.actionCount-c.marketAddedAction<=E.playingPlayers(g).length;
 return `<article class="mini-card ${image?'illustrated-card':''} family-${familyOf(d)} ${selected===c.uid?'chosen':''} ${error?'unavailable':''}" data-hours="${d.hours}" aria-label="${esc(d.name)}">
 ${fresh?'<span class="new-offer">新补入</span>':''}
 ${image?`<button class="card-image-button" data-action="detail" data-type="${d.id}" aria-label="放大查看${esc(d.name)}"><img src="${image}" alt="${esc(d.name)}完整卡面" width="756" height="${d.hours===8?2112:1056}" loading="lazy"></button>`:`<div class="mini-card-head">${title(d)}<span>${cardLevel(d.hours)}</span></div>${compactEffects(d,c)}`}
 ${image&&(d.progressTarget||d.maturation)?`<span class="mini-progress">进度 ${c.progress||0}/${d.progressTarget||d.maturation.steps}</span>`:''}
 <div class="mini-card-foot"><span>${market?metric('money',d.price.money,'购买价格 '+d.price.money):esc(d.name)} ${market&&d.requires?`<span title="购买技能">${esc(d.requires)}</span>`:''}</span><button data-action="${reserving?'reserve':market?'buy':'select'}" data-uid="${c.uid}" ${can&&!error?'':'disabled'} title="${esc(error||'')}" aria-label="${reserving?'保留':market?'购买':'安排'}${esc(d.name)}">${reserving?'保留':market?'购买':selected===c.uid?'取消':'安排'}</button></div>${error?`<small class="buy-reason">${esc(error)}</small>`:''}</article>`;
}

function calendar(g,p,can,selected){
 return `<section class="calendar-panel" aria-label="日程"><div class="calendar-scroll"><div class="simple-calendar">${DAYS.map((day,i)=>{
 const full=E.cardsInSlot(p,{day:i,period:0}).some(c=>getCard(c).hours===8);
 return `<div class="simple-day "><div class="simple-day-name">${day}${i===6&&E.sundayStress(g,p)?'<span>理智 −2</span>':''}</div>${[0,1,2].map(period=>{
 if(full&&period===1)return '';
 const s={day:i,period},cards=E.cardsInSlot(p,s),work=E.workType(p,s),error=selected?E.canPlace(g,p,selected,s):null,available=can&&(!selected||!error),blocked=E.eventBlocksSlot(g,p,s),isFull=period===0&&full;
 return `<div class="simple-slot ${isFull?'all-day':''} ${selected&&available?'available':''} ${blocked?'blocked':''}" data-slot="${slotKey(s)}"><button class="slot-target" data-action="slot" data-day="${i}" data-period="${period}" ${can&&[2,3,4].includes(g.day)?'':'disabled'} aria-label="${slotLabel(s)}${selected?(error?'：'+esc(error):'：可安排'):''}" title="${esc(error||'')}"><span class="slot-label">${isFull?'白天': ['上午','下午','晚上'][period]}</span>${!cards.length?`<span class="slot-empty">${blocked?'团建':period===2?(p.inspirationSlots.includes(slotKey(s))?'✦ ×'+p.inspirationSlots.filter(k=>k===slotKey(s)).length:'休息'):work?'上班':'空闲'}</span>${selected&&available?'<span class="place-label">＋ 放这里</span>':''}`:''}</button>${cards.map(c=>{
 const d=getCard(c),caught=E.activityDanger(g,p,c,s);
 return `<div class="scheduled-card family-${familyOf(d)} ${selected===c.uid?'chosen':''}">${title(d)}${compactEffects(d,c)}${caught?'<small class="buy-reason">本周暂停</small>':''}<div class="scheduled-actions"><button data-action="select" data-uid="${c.uid}" ${can&&g.day===2?'':'disabled'}>${selected===c.uid?'取消':'移动'}</button><button data-action="unplace" data-uid="${c.uid}" ${can&&[2,3,4].includes(g.day)?'':'disabled'}>撤回</button></div></div>`;
 }).join('')}</div>`;
 }).join('')}</div>`;
 }).join('')}</div></div></section>`;
}

export function routeMarket(g,p,can,selected){
 const choosing=g.marketRefresh?.player===p.id&&!p.bot;
 const cell=(c,row,slot)=>c?`<div class="market-cell">${miniCard(g,p,c,true,can,selected)}${row===3&&E.refreshProtected(g,row,slot)?'<small class="market-protected">已保护 · 可购买</small>':choosing&&row===3?`<button class="refresh-single" data-action="market-card" data-route="${slot}">刷新这张</button>`:''}</div>`:'<div class="market-empty">牌源已用尽</div>';
 return `<section class="simple-market"><div class="section-head"><h2>公共市场</h2><span>I 级按流派 · II 级混合</span></div>
 ${g.marketRefresh?`<div class="market-refresh-choice" role="status">周一全员未购牌 · ${esc(g.players[g.marketRefresh.player].name)}可刷新一次。刷新后保护，其他玩家不能再次刷新。${choosing?'<button data-action="market-keep">保留市场</button>':'等待选择。'}</div>`:''}
 <div class="route-market-scroll"><div class="route-market-grid"><div class="market-row-label">I 级</div>${E.MARKET_ROUTES.map(r=>`<div class="route-market-title family-${ROUTES[r].family}">${icon(ROUTES[r].icon,18)} ${esc(ROUTES[r].name)}</div>`).join('')}
 ${E.MARKET_I_ROWS.map(row=>`<div class="market-row-label"><span>I · ${row+1}</span>${E.refreshProtected(g,row)?'<small>已保护</small>':choosing?`<button data-action="market-row" data-row="${row}">刷新</button>`:''}</div>${E.MARKET_ROUTES.map(r=>cell(E.marketCell(g,r,row),row,r)).join('')}`).join('')}
 <div class="market-row-label"><span>II 级</span><small>混合牌堆</small></div>${[0,1,2,3].map(slot=>cell(E.marketCell(g,slot,3),3,slot)).join('')}
 </div></div></section>`;
}

export function minimalPage({game:g,playerId,selected,editable,summary,opportunity,finishControls,editor,marketNotice}){
 const p=g.players[playerId],can=editable(p),state=E.sanityState(g,p),pred=g.phase==='planning'&&!p.escaped?E.preview(g,p.id):null,hand=E.unplacedCards(p),skills=E.skillCounts(p),picked=selected&&E.cardAt(p,selected);
 const event=E.eventFor(g,p);
 const phase=g.phase==='planning'?`${E.planningLabel(g)} · ${esc(g.players[E.activeBuyer(g)].name)}行动`:g.phase==='resolving'?'周末结算':g.phase==='ended'?'游戏结束':'本周结果';
 return `<div class="simple-app"><header class="simple-header"><a class="simple-brand" href="/">逃离工位</a><span>第 ${g.week} 周 · ${phase}</span><nav><a href="/card-studio.html">卡牌工坊</a><button data-action="rules">规则</button><details class="more-menu"><summary>更多</summary><div><button data-action="catalogue">卡牌图鉴</button><button data-action="export">导出记录</button><button data-action="settings">新游戏 / 数值</button></div></details></nav></header>
 <div class="simple-players" role="group" aria-label="查看玩家">${g.players.map(q=>`<button class="${q.id===p.id?'active':''}" data-action="player" data-id="${q.id}" aria-pressed="${q.id===p.id}">${esc(q.name)}${q.escaped?' · 已逃离':g.phase==='planning'&&E.activeBuyer(g)===q.id?' · 行动中':''}</button>`).join('')}</div>
 <div class="simple-status"><div class="status-numbers"><span>资金 <b>${p.money}</b></span><span>理智 <b>${p.sanity}</b><small>/10</small><meter min="0" max="10" value="${p.sanity}" aria-label="理智 ${p.sanity}"></meter></span><span title="${pred?'未计查岗和精神状态事件损失、能支付费用时的预计收入；不含工资':'本周实际副业'}">${pred?'预计副业':'本周副业'} <b>${pred?(pred.incomeLow===pred.incomeHigh?pred.incomeHigh:pred.incomeLow+'–'+pred.incomeHigh):p.income}</b></span><span class="escape-target">逃离 ≥${g.config.escapeIncome} 收入 / ≥${g.config.escapeSanity} 理智</span></div><div class="turn-buttons">${g.phase==='planning'?g.weekendReserve?`<button data-action="reserve-skip" ${g.weekendReserve.player===p.id&&!p.bot?'':'disabled'}>跳过锁牌</button>`:`<button data-action="pass" ${can?'':'disabled'}>${g.day===2?'完成调度':g.day<2?'跳过采购':'跳过安排'}</button>${finishControls(p)}`:g.phase==='resolving'&&!g.opportunity?'<button class="primary-button" data-action="resolve">结算本周</button>':''}</div></div>
 <ol class="week-steps" aria-label="每周流程">${['周一 采购','周二 采购','周三 调度','周四 安排','周五 安排','周末 锁牌 / 结算'].map((label,i)=>`<li ${(g.phase==='planning'?Math.min(5,g.day):5)===i?'aria-current="step"':''}>${label}</li>`).join('')}</ol>
 <div class="simple-event"><span><b>${esc(event.name)}</b> · ${esc(event.inspectionCount?inspectionText(event):event.text)}</span><details><summary>详情</summary><p>${esc(event.inspectionCount?inspectionText(event):event.text)}</p><p>抓包的牌本周不收收入、不付执行费用、不推进进度，保留理智影响；每张罚 ${g.config.inspectionFine}。</p>${g.inspectionResolved?`<p>骰子：${g.inspection.rolls.join(' / ')||'无'}</p>`:''}</details></div>
 ${g.opportunity?`<section class="inline-resolution" aria-label="结算选择"><h2>${g.opportunity.stage==='wellbeing'?'事件处理':'活动选择'}</h2>${opportunity(g)}</section>`:['escape','ended'].includes(g.phase)?`<section class="inline-resolution" aria-label="周末结果">${summary()}</section>`:g.phase==='resolving'?`<p class="resolution-note">日程已锁定。一次结算到需要你选择的位置。已处理 ${g.cursor}/${g.timeline.length} 时段。<button data-action="step">逐项结算</button></p>`:''}
 <div class="simple-workspace ${g.phase==='planning'&&(g.day<2||g.marketRefresh||g.weekendReserve)?'market-first':''}"><main><div class="selection-bar" aria-live="polite">${picked?`已选「${esc(getCard(picked).name)}」· 点击绿色时段（${E.findPlacement(p,picked.uid)?'移动免费':'耗 1 次行动'}）<button data-action="cancel">取消</button>`:can?(g.day<2?'从市场或待买区购买一张，也可跳过。':g.day===2?'移动、撤回已有日程，可调整多张；完成后确认。':'安排一张手牌到整周任意合法时段，可先撤回旧牌腾位置。'):p.escaped?'已逃离，本局不再行动。':g.weekendReserve?'周末空闲上午可保留一张市场牌；未买下前不能替换或丢弃。':g.marketRefresh?'请刷新一行I级牌或一张II级牌，也可保留市场。':g.phase==='planning'?'等待当前玩家行动。':'查看本周日程。'}</div>${calendar(g,p,can,selected)}
 <div class="board-meta"><span>库存货品 ${p.principal||0} · 工资区履职 ${p.duty||0}（工资 +${p.duty||0}）</span><span>${p.weekend?'永久双休':p.tempWeekend?'本周双休':'周一至周六上班'}</span><span>晚上 4h 理智 −${g.config.nightStress4} · 周日白天排满 −${g.config.sundayStress??2}</span><details><summary>理智与技能</summary><p>起点 ${state.base} · 自主 +${state.freedom} · 支持 +${state.support} · 压力 −${state.pressure} · 支持费用 ${state.upkeep}</p>${Object.entries(skills).map(([r,n])=>`<p>${ROUTES[r].name} ${n}：${p.skills.filter(c=>getCard(c).skill===r).map(c=>esc(getCard(c).name)).join('、')||'无'}</p>`).join('')}${[...p.upgrades,...p.completedActivities].map(c=>`<button data-action="detail" data-type="${c.type}">${esc(getCard(c).name)}${c.activeFrom>g.week?'（下周生效）':''}</button>`).join('')}</details></div>
 ${p.protectionFrom<=g.week&&!p.escaped?`<div class="simple-protection">${p.protectionChosen?`已保护 ${slotLabel({day:Number(p.protectedSlot[0]),period:Number(p.protectedSlot[2])})}`:!p.actedThisWeek?`<label>保护时段 <select id="protection-slot"><option value="" selected disabled>选择时段与目标牌</option>${DAYS.slice(0,6).flatMap((_,day)=>[0,1].filter(period=>E.workType(p,{day,period})).map(period=>`<option value="${day}-${period}">${slotLabel({day,period})} · ${esc(getCard(E.cardsInSlot(p,{day,period}).find(c=>getCard(c).hours===4&&!getCard(c).professional))?.name||'暂无活动')}</option>`)).join('')}</select></label><button data-action="protect" ${can?'':'disabled'}>保护</button>`:'本周未指定保护'}</div>`:''}
 ${editor(p)}${pred?.warnings.length?`<details class="execution-warnings"><summary>${pred.warnings.length} 项执行限制</summary>${pred.warnings.map(l=>`<p>${esc(l.text)}</p>`).join('')}</details>`:''}
 <section class="reserved-tray" aria-label="待买区"><div class="section-head"><h2>待买区</h2><span>限一张 · 购买后腾空</span></div>${p.reserved?miniCard(g,p,p.reserved,true,can,selected):`<p>${p.weekend?'周六或周日':'周日'}上午空闲时，周末可保留一张市场牌。无需满足价格和技能，购买时照常检查。</p>`}</section>
 <section class="simple-hand" aria-label="未安排手牌"><div class="section-label">手牌 <span>${hand.length}</span></div><div class="simple-hand-grid">${hand.map(c=>miniCard(g,p,c,false,can,selected)).join('')||'<p class="empty-hand">从市场买牌后，选中手牌安排到日程。</p>'}</div></section>
 <details class="simple-log"><summary>本周记录</summary><div>${g.logs.filter(l=>l.week===g.week).slice().reverse().map(l=>`<p><b>${l.player===null?'全体':esc(g.players[l.player].name)}</b> ${esc(l.text)}</p>`).join('')}</div><label>测试笔记<textarea id="notes" rows="3">${esc(g.notes||'')}</textarea></label><button data-action="export">导出记录</button></details></main>
 ${routeMarket(g,p,can,selected)}</div></div>`;
}
