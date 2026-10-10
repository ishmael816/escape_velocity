import * as E from '../src/engine.js';
import {CARDS} from '../src/cards.js';
export const make=(options={})=>quiet(E.createGame({playerCount:2,mode:'hotseat',...options}));
export function quiet(g){g.inspection={name:'平静',inspectionCount:0,times:[],rolls:[],blockedTimes:[],gain:{}};return g;}
export function turn(g,id=0){while(g.phase==='planning'&&E.activeBuyer(g)!==id)E.pass(g,E.activeBuyer(g));}
export function lock(g){while(g.phase==='planning')E.pass(g,E.activeBuyer(g));}
export function finish(g){lock(g);E.resolveAll(g);}
export function next(g){for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,false);}E.closeWeek(g);quiet(g);}
export function add(g,p,type){const c={uid:`fixture-${++g.uid}`,type};p.cards.push(c);return c;}
export function skills(p,pattern){p.skills=[];for(const r of new Set(pattern))p.skills.push(...CARDS.filter(d=>d.skill===r).slice(0,[...pattern].filter(x=>x===r).length).map(d=>({uid:'archive-'+d.id,type:d.id})));}
// Prepared midgame boards isolate resolution from purchase sequencing.
export function rig(g,p,plan){p.cards=[];p.schedule={};for(const [type,day,period=0]of plan){const c=add(g,p,type);(p.schedule[`${day}-${period}`]||=[]).push(c.uid);}p.inspirationSlots=(p.inspirationSlots||[]).filter(k=>!(p.schedule[k]||[]).length);E.syncSanity(g,p);}
export function seedFor(faces){for(let seed=1;seed<1000000;seed++){let x=seed;const actual=faces.map(()=>{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return Math.floor(x/4294967296*6)+1;});if(actual.every((n,i)=>n===faces[i]))return seed;}throw Error('No fixture seed');}
