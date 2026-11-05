// Camera state is presentation-only: changing the view never advances a turn.
let focus='market',phaseKey='',handOpen=false,lastWheel=0,wheelTotal=0,lastWheelAt=0;
const node=(tag,cls)=>{const el=document.createElement(tag);el.className=cls;return el;};
export function focusTable(surface){
 focus=surface==='board'?'board':'market';
 const stage=document.querySelector('.tabletop-stage');if(!stage)return;
 stage.dataset.focus=focus;
 document.querySelectorAll('[data-table-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tableFocus===focus)));
}
export function wheelDestination(delta,current){return delta>0?'board':delta<0?'market':current;}
export function mountTabletop(g,p,selected){
 const workspace=document.querySelector('.simple-workspace');if(!workspace)return;
 const main=workspace.querySelector('main'),market=workspace.querySelector('.simple-market'),calendar=workspace.querySelector('.calendar-panel');
 if(!main||!market||!calendar)return;
 const key=`${g.week}:${g.phase}:${g.day}:${!!g.marketRefresh}:${!!g.weekendReserve}`;
 if(key!==phaseKey){focus=g.phase==='planning'&&(g.day<2||g.marketRefresh||g.weekendReserve)?'market':'board';phaseKey=key;}
 if(selected){focus='board';handOpen=false;}
 const bar=node('nav','tabletop-navigation');bar.setAttribute('aria-label','桌面视角');
 bar.innerHTML='<button data-table-focus="market" aria-label="查看公共市场">公共市场</button><button data-table-focus="board" aria-label="查看玩家面板">玩家面板</button><button data-table-hand aria-expanded="false">手牌</button><button data-table-tools aria-expanded="false">库存与记录</button>';
 const stage=node('div','tabletop-stage');stage.dataset.focus=focus;stage.setAttribute('aria-label','桌面：向上滚动查看市场，向下查看玩家面板');
 const board=node('section','player-surface');board.setAttribute('aria-label',p.name+'的玩家版图');
 board.append(calendar);
 const side=node('div','physical-board-side');
 const stock=node('div','board-stock');stock.textContent=`库存货品 ${p.principal||0}　·　履职 ${p.duty||0}`;
 const salary=node('div','board-salary');salary.textContent=`资金 ${p.money}　理智 ${p.sanity} / 10`;
 const archive=node('div','board-archive');archive.textContent=`归档 ${p.skills.length} 张`;
 const reserved=main.querySelector('.reserved-tray');side.append(stock,salary);if(reserved)side.append(reserved);side.append(archive);board.append(side);
 if(p.weekend||p.tempWeekend){const overlay=node('img','saturday-overlay');overlay.src='/assets/tabletop/saturday-'+(p.weekend?'permanent':'temporary')+'.png';overlay.alt=p.weekend?'永久双休':'本周双休';calendar.append(overlay);}
 const hand=main.querySelector('.simple-hand'),drawer=node('section','tabletop-hand-drawer');
 if(hand){drawer.append(hand);const count=hand.querySelector('.section-label>span')?.textContent||'0';bar.querySelector('[data-table-hand]').textContent='手牌 '+count;}
 const cue=main.querySelector('.selection-bar'),relation=main.querySelector('.relation-hint');
 const task=node('div','tabletop-task');if(cue)task.append(cue);if(relation)task.append(relation);
 const refresh=market.querySelector('.market-refresh-choice');if(refresh)task.append(refresh);
 const protection=main.querySelector('.simple-protection');if(protection?.querySelector('select'))task.append(protection);
 const tools=node('details','tabletop-tools'),summary=node('summary','');summary.textContent='库存、理智明细与本周记录';tools.append(summary);
 // Keep placement choices outside the collapsed inventory: these need an answer.
 const editor=main.querySelector('.slot-editor');if(editor&&editor.querySelector('button,input,select'))task.append(editor);
 while(main.firstChild)tools.append(main.firstChild);
 main.remove();stage.append(market,board,drawer);workspace.append(bar,task,stage,tools);
 drawer.hidden=!handOpen;bar.querySelector('[data-table-hand]').setAttribute('aria-expanded',String(handOpen));
 bar.addEventListener('click',e=>{
  const camera=e.target.closest('[data-table-focus]');if(camera){focusTable(camera.dataset.tableFocus);return;}
  if(e.target.closest('[data-table-hand]')){handOpen=!handOpen;drawer.hidden=!handOpen;bar.querySelector('[data-table-hand]').setAttribute('aria-expanded',String(handOpen));}
  if(e.target.closest('[data-table-tools]')){tools.open=!tools.open;e.target.setAttribute('aria-expanded',String(tools.open));if(tools.open)tools.scrollIntoView({behavior:'smooth',block:'nearest'});}
 });
 stage.addEventListener('wheel',e=>{
  // Do not hijack touch zoom, horizontal hand scrolling, or small-screen page scrolling.
  if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||window.innerWidth<760||e.target.closest('.tabletop-hand-drawer,.market-refresh-choice'))return;
  e.preventDefault();const now=Date.now();if(now-lastWheel<650)return;
  if(now-lastWheelAt>180||Math.sign(wheelTotal)!==Math.sign(e.deltaY))wheelTotal=0;
  lastWheelAt=now;wheelTotal+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?400:1);
  if(Math.abs(wheelTotal)<35)return;
  focusTable(wheelDestination(wheelTotal,focus));wheelTotal=0;lastWheel=now;
 },{passive:false});
 stage.addEventListener('click',e=>{
  const surface=e.target.closest('.simple-market')?'market':e.target.closest('.player-surface')?'board':null;
  if(surface&&surface!==focus&&window.innerWidth>=760){e.preventDefault();e.stopPropagation();focusTable(surface);}
 },true);
 focusTable(focus);
}
