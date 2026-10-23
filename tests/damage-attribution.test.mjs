import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=(await readFile(new URL('../scripts/memosprites.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const ID='telys-memosprites',HSR='telys-star-rail-ultimates';
function fixture({midi=false}={}){
 const sent=[];let id=0;
 const owner={id:'hero',uuid:'Actor.hero',getFlag:(scope,key)=>scope===ID&&key==='config'?{enabled:true}:{}},source={id:'sprite',uuid:'Scene.map.Token.sprite.Actor.npc',documentName:'Actor',isOwner:true};
 const game={user:{id:'gm',isGM:true,targets:new Set([{uuid:'Scene.map.Token.enemy'}])},actors:[owner],modules:new Map([[HSR,{api:{getConfig:()=>({})}}],['midi-qol',{active:midi}]]),socket:{emit:(_socket,message)=>sent.push(message)}};
 const context=vm.createContext({game,console,Hooks:{on(){},once(){}},foundry:{utils:{randomID:()=>`roll-${++id}`}},setTimeout(){},summonLinks:{summonView:()=>({token:{id:'sprite',actor:source}})}});
 vm.runInContext(code+'\nglobalThis.api={onDndDamage,onMidiDamage};',context);
 return {sent,game,owner,source,api:context.api,roll:()=>({formula:'1d6',total:4,terms:[{faces:6,number:1,results:[{result:4,active:true}]}]})};
}
test('distinct identical-formula damage rolls each apply Toughness while duplicate notifications apply once',()=>{
 const w=fixture(),first=w.roll(),data={subject:{actor:w.source}};
 w.api.onDndDamage([first],data);w.api.onDndDamage([first],data);w.api.onDndDamage([w.roll()],data);
 assert.equal(w.sent.length,2);assert.notEqual(w.sent[0].eventKey,w.sent[1].eventKey);assert.equal(w.sent[0].amount,4);assert.equal(w.sent[0].attackerUuid,w.owner.uuid);
});
test('Midi-managed damage waits for hit targets and deduplicates its two completion hooks',()=>{
 const w=fixture({midi:true}),roll=w.roll();roll.options={[HSR]:{attackElement:{workflowId:'workflow',eventId:'damage:unique'}}};
 w.api.onDndDamage([roll],{subject:{actor:w.source}});assert.equal(w.sent.length,0);
 const workflow={uuid:'workflow',actor:w.source,damageRolls:[roll],hitTargets:w.game.user.targets};
 w.api.onMidiDamage(workflow);w.api.onMidiDamage(workflow);assert.equal(w.sent.length,1);assert.match(w.sent[0].eventKey,/damage:unique/);
});
test('a missed Midi attack never damages Toughness on merely selected targets',()=>{
 const w=fixture({midi:true});w.api.onMidiDamage({uuid:'miss',actor:w.source,damageRolls:[w.roll()],attackRoll:{total:1},hitTargets:new Set(),targets:w.game.user.targets});
 assert.equal(w.sent.length,0);
});
