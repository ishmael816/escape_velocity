import {getCard} from './cards.js';
import {hireCandidates,canBuy,hireCost} from './engine.js';
import {familyOf} from './card-visuals.js';
import {cardFace} from './card-face.js';
export function opportunityPanel(g){
 const q=g.opportunity;if(!q)return '<p>选择已完成，可以继续结算。</p>';
 const p=g.players[q.player],disabled=p.bot?'disabled':'';
 const header='<p>玩家 '+(p.id+1)+' · '+q.source+' · 资金 '+p.money+'</p>';
 if(q.stage==='lane')return header+'<p>任选一个牌堆，看'+q.count+'张，原价买至多1张。'+(getCard(q.sourceType).once?'执行后离场。':'保留在日程，下周可再次执行。')+'</p><div class="opportunity-lanes">'+[4,8].map(h=>'<button data-action="opp-lane" data-lane="'+h+'" '+(disabled||(!g.decks[h].length&&!g.discard[h].length)?'disabled':'')+'><b>'+h+'h</b><span>看 '+q.count+'</span></button>').join('')+'</div>';
 const hiring=q.stage==='hire',cards=hiring?hireCandidates(g,p.id):q.options;
 return header+'<p>'+(hiring?'原价＋全部执行费＋'+q.fee+'：直接归档，不返现。':'原价买至多1张，下周再安排；余牌放堆底。')+'购买仍检查价格和技能。</p><div class="opportunity-candidates">'+cards.map(c=>{const d=getCard(c),price=hiring?hireCost(d,q.fee):d.price.money,error=canBuy(g,p,d,price-d.price.money);return '<article class="opportunity-card family-'+familyOf(d)+'"><div class="card-paper">'+cardFace(d,false,c)+'</div><button class="primary-button" data-action="'+(hiring?'opp-hire':'opp-buy')+'" data-uid="'+c.uid+'" '+(p.bot||error?'disabled':'')+'>'+(hiring?'招募':'购买')+' · '+price+' 钱</button>'+(error?'<small>'+error+'</small>':'')+'</article>';}).join('')+'</div>'+(!cards.length?'<p>没有符合条件的牌。</p>':'')+'<button data-action="'+(hiring?'opp-hire-skip':'opp-skip')+'" '+disabled+'>跳过</button>';
}
