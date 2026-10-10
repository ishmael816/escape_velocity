import {getCard} from './cards.js';
import {hireCandidates} from './engine.js';
import {familyOf} from './card-visuals.js';
import {cardFace} from './card-face.js';
export function opportunityPanel(g){
 const q=g.opportunity;if(!q)return '<p>选择已完成，可以继续结算。</p>';
 const p=g.players[q.player],disabled=p.bot?'disabled':'';
 const header='<p>玩家 '+(p.id+1)+' · '+q.source+' · 资金 '+p.money+'</p>';
 if(q.stage==='lane')return header+'<p>任选一个牌堆，看'+q.count+'张，原价买至多1张。活动留在日程，每周可执行。</p><div class="opportunity-lanes">'+[2,4,8].map(h=>'<button data-action="opp-lane" data-lane="'+h+'" '+disabled+'><b>'+h+'h</b><span>看 '+q.count+'</span></button>').join('')+'</div>';
 const hiring=q.stage==='hire',cards=hiring?hireCandidates(g,p.id):q.options;
 return header+'<p>'+(hiring?'原价＋'+q.fee+'招聘费：直接归档，不执行原效果。':'原价买至多1张，下周再安排；余牌放堆底。')+'</p><div class="opportunity-candidates">'+cards.map(c=>{const d=getCard(c),price=d.price.money+(hiring?q.fee:0);return '<article class="opportunity-card family-'+familyOf(d)+'"><div class="card-paper">'+cardFace(d,false,c)+'</div><button class="primary-button" data-action="'+(hiring?'opp-hire':'opp-buy')+'" data-uid="'+c.uid+'" '+(p.bot||p.money<price?'disabled':'')+'>'+(hiring?'招募':'购买')+' · '+price+' 钱</button></article>';}).join('')+'</div>'+(!cards.length?'<p>没有符合条件的牌。</p>':'')+'<button data-action="'+(hiring?'opp-hire-skip':'opp-skip')+'" '+disabled+'>跳过</button>';
}
