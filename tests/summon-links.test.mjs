import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindSummon,clearSummon,reconcileSummons,summonOwner,summonView} from '../scripts/summon-links.mjs';
const ID='telys-memosprites',HSR='telys-star-rail-ultimates';
function collection(values=[]){values.get=id=>values.find(v=>v.id===id);return values;}
function fixture(){
  const config={enabled:true,portrait:'default.webp',image:'default-art.webp',sourceUuid:'Actor.default',portraitCropX:22,portraitCropY:18,portraitCropScale:160,hp:20,maxHp:20,resource:2,resourceMax:3};
  const actor={documentName:'Actor',id:'hero',uuid:'Actor.hero',flags:{[ID]:{config:structuredClone(config)}},getFlag(scope,key){return this.flags[scope]?.[key]},async setFlag(scope,key,value){(this.flags[scope]??={})[key]=structuredClone(value)}};
  const source={documentName:'Actor',id:'default',uuid:'Actor.default',system:{attributes:{hp:{value:999,max:999}}}};
  const scene={id:'map',tokens:collection()},otherScene={id:'other',tokens:collection()},gm={id:'gm',isGM:true,active:true};
  globalThis.game={user:gm,users:collection([gm]),actors:collection([actor,source]),scenes:collection([scene,otherScene])};
  globalThis.fromUuidSync=uuid=>game.actors.find(a=>a.uuid===uuid);
  const token=(id,hp=40,max=80,time=1000)=>{
    const t={id,uuid:`Scene.${scene.id}.Token.${id}`,parent:scene,actorId:'default',actor:{id:'default',uuid:`Scene.map.Token.${id}.Actor.default`,img:`${id}.webp`,system:{attributes:{hp:{value:hp,max}}}},flags:{[HSR]:{summonOwner:{casterUuid:actor.uuid,casterId:actor.id,createdAt:time}}},getFlag(scope,key){return this.flags[scope]?.[key]}};
    scene.tokens.push(t);return t;
  };
  return {actor,source,scene,otherScene,config,token};
}
test('direct and spell summons map the live token HP and color artwork while preserving the configured design',async()=>{
  const w=fixture(),summon=w.token('creature');await bindSummon(w.actor,summon);
  const view=summonView(w.actor,w.config);
  assert.equal(view.token,summon);assert.equal(view.config.hp,40);assert.equal(view.config.maxHp,80);assert.equal(view.config.portrait,'creature.webp');assert.equal(view.config.summoned,true);
  assert.equal(view.config.portraitCropX,0);assert.equal(view.config.portraitCropScale,100);assert.equal(view.config._liveHealth,true);
  assert.deepEqual(w.actor.flags[ID].config,w.config);assert.equal(w.source.system.attributes.hp.value,999);
  summon.actor.system.attributes.hp.value=17;assert.equal(summonView(w.actor,w.config).config.hp,17);
});
test('0 HP hides the HP arc immediately and restores default portrait and values without resurrecting the binding on healing',async()=>{
  const w=fixture(),summon=w.token('creature');await bindSummon(w.actor,summon);summon.actor.system.attributes.hp.value=0;
  let view=summonView(w.actor,w.config);assert.equal(view.config.summoned,false);assert.equal(view.config.portrait,'default.webp');assert.equal(view.config.hp,20);
  await reconcileSummons();assert.equal(w.actor.flags[ID].activeSummon.status,'idle');summon.actor.system.attributes.hp.value=40;
  view=summonView(w.actor,w.config);assert.equal(view.token,null);assert.equal(view.config.summoned,false);assert.deepEqual(w.actor.flags[ID].config,w.config);
});
test('deleting the active creature resets to defaults even when an older owned summon is still alive',async()=>{
  const w=fixture(),older=w.token('older',25,50,1000),latest=w.token('latest',10,100,2000);await bindSummon(w.actor,older);await bindSummon(w.actor,latest);
  w.scene.tokens.splice(w.scene.tokens.indexOf(latest),1);await clearSummon(w.actor,latest);
  assert.equal(summonView(w.actor,w.config).token,null);assert.equal(summonView(w.actor,w.config).config.portrait,'default.webp');
});
test('old damage/deletion events cannot clear a newer binding and identical token IDs on another scene are isolated',async()=>{
  const w=fixture(),older=w.token('older',25,50,1000),latest=w.token('latest',10,100,2000);await bindSummon(w.actor,older);await bindSummon(w.actor,latest);
  assert.equal(await clearSummon(w.actor,older),false);assert.equal(await clearSummon(w.actor,{...latest,parent:w.otherScene}),false);assert.equal(summonView(w.actor,w.config).token,latest);
});
test('reloading with a stale token or deleted scene clears the stored active reference',async()=>{
  const w=fixture(),summon=w.token('creature');await bindSummon(w.actor,summon);w.scene.tokens.length=0;await reconcileSummons();assert.equal(w.actor.flags[ID].activeSummon.status,'idle');
  w.token('second',30,50,2000);await bindSummon(w.actor,w.scene.tokens[0]);game.scenes.splice(0,1);await reconcileSummons();assert.equal(w.actor.flags[ID].activeSummon.status,'idle');
});
test('two summons based on the same source Actor retain separate synthetic HP and portraits for their owners',async()=>{
  const w=fixture(),other={...w.actor,id:'other',uuid:'Actor.other',flags:{[ID]:{config:structuredClone(w.config)}}};game.actors.push(other);
  const first=w.token('first',11,20,1000),second=w.token('second',75,100,2000);second.flags[HSR].summonOwner.casterUuid=other.uuid;second.flags[HSR].summonOwner.casterId=other.id;
  await bindSummon(w.actor,first);await bindSummon(other,second);
  assert.equal(summonView(w.actor,w.config).config.hp,11);assert.equal(summonView(other,w.config).config.hp,75);
  first.actor.system.attributes.hp.value=0;await reconcileSummons();assert.equal(summonView(other,w.config).config.hp,75);
});
test('memosprite-native summons keep the configured portrait crop but use the token HP',async()=>{
  const w=fixture(),summon=w.token('native');summon.flags[ID]={summonerId:w.actor.id,summonerUuid:w.actor.uuid};await bindSummon(w.actor,summon);
  const view=summonView(w.actor,w.config);assert.equal(view.config.portrait,'default.webp');assert.equal(view.config.portraitCropX,22);assert.equal(view.config.hp,40);
});
test('only the active GM binds documented summon ownership, without guessing from NPC names or shared ownership',async()=>{
  const w=fixture(),summon=w.token('unrelated');delete summon.flags[HSR];assert.equal(summonOwner(summon),null);assert.equal(await bindSummon(w.actor,summon),false);
  summon.flags[HSR]={abilitySummon:{casterId:'hero',casterUuid:'Actor.hero'}};assert.equal(summonOwner(summon),w.actor);
  game.user={id:'player',isGM:false};assert.equal(await bindSummon(w.actor,summon),false);
});
test('server creation time takes priority over a summoning player’s skewed browser clock',async()=>{
  const w=fixture(),older=w.token('older',25,50,9000),newer=w.token('newer',50,60,500);
  older._stats={createdTime:1000};newer._stats={createdTime:2000};
  await bindSummon(w.actor,older);await bindSummon(w.actor,newer);assert.equal(summonView(w.actor,w.config).token,newer);
});
test('a queued stale-reference cleanup cannot clear a newly queued summon',async()=>{
  const w=fixture(),older=w.token('older',25,50,1000),newer=w.token('newer',50,60,2000);await bindSummon(w.actor,older);
  w.scene.tokens.splice(w.scene.tokens.indexOf(older),1);
  await Promise.all([bindSummon(w.actor,newer),reconcileSummons()]);
  assert.equal(summonView(w.actor,w.config).token,newer);
});
