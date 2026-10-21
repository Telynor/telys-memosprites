import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindSummon,clearSummon,reconcileSummons,summonOwner,summonView,installSummonLinks} from '../scripts/summon-links.mjs';
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

test('a new zero-HP spell summon stays linked through its own flag update, then resets only after losing its live HP',async()=>{
  const w=fixture(),hooks=new Map(),summon=w.token('magellenica',0,80),refreshes=[];
  globalThis.Hooks={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)}};
  const fire=(name,...args)=>{for(const fn of hooks.get(name)??[])fn(...args)};
  const settle=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate)};
  const save=w.actor.setFlag;
  w.actor.setFlag=async function(scope,key,value){await save.call(this,scope,key,value);fire('updateActor',this,{flags:{[scope]:{[key]:value}}},{});};
  installSummonLinks(()=>refreshes.push(summonView(w.actor,w.config)));
  fire('createToken',summon);fire('dnd5e.postSummon',{actor:w.actor},{},[summon],{});await settle();
  assert.equal(w.actor.flags[ID].activeSummon.status,'active','saving the binding cannot classify initial 0 HP as a defeat');
  let view=summonView(w.actor,w.config);
  assert.equal(view.token,summon);assert.equal(view.config.portrait,'magellenica.webp');assert.equal(view.config.hp,0);assert.equal(view.config.maxHp,80);
  summon.actor.system.attributes.hp.value=40;
  fire('updateActor',summon.actor,{system:{attributes:{hp:{value:40}}}},{dnd5e:{hp:{value:0}}});await settle();
  assert.equal(summonView(w.actor,w.config).config.hp,40);
  assert.equal(w.actor.flags[ID].activeSummon.wasAlive,true,'observed positive HP survives a client reload');
  summon.actor.system.attributes.hp.value=0;
  fire('updateActor',summon.actor,{system:{attributes:{hp:{value:0}}}},{dnd5e:{hp:{value:40}}});await settle();
  assert.equal(w.actor.flags[ID].activeSummon.status,'idle');assert.equal(summonView(w.actor,w.config).config.portrait,'default.webp');
  summon.actor.system.attributes.hp.value=30;fire('updateActor',summon.actor,{system:{attributes:{hp:{value:30}}}},{});await settle();
  assert.equal(summonView(w.actor,w.config).token,null);assert.deepEqual(w.actor.flags[ID].config,w.config);
  assert.ok(refreshes.some(view=>view.config.portrait==='magellenica.webp'));
});

test('unprepared HP cannot defeat a summon that was previously alive',async()=>{
  const w=fixture(),summon=w.token('creature');await bindSummon(w.actor,summon);
  summon.actor.system.attributes.hp.value=null;await reconcileSummons();
  assert.equal(w.actor.flags[ID].activeSummon.status,'active');
  summon.actor.system.attributes.hp.value=24;assert.equal(summonView(w.actor,w.config).config.hp,24);
});

test('a render can observe live HP before the update hook persists it, without reviving a defeated binding',async()=>{
  const w=fixture(),summon=w.token('creature',0,80);await bindSummon(w.actor,summon);
  assert.equal(summonView(w.actor,w.config).token,summon);
  summon.actor.system.attributes.hp.value=40;assert.equal(summonView(w.actor,w.config).config.hp,40);
  summon.actor.system.attributes.hp.value=0;assert.equal(summonView(w.actor,w.config).token,null);
  await reconcileSummons();assert.equal(w.actor.flags[ID].activeSummon.status,'idle');
});

test('D&D5e previous-HP update metadata detects a lethal hit between renders',async()=>{
  const w=fixture(),hooks=new Map(),summon=w.token('creature',0,80);
  globalThis.Hooks={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)}};
  installSummonLinks(()=>{});await bindSummon(w.actor,summon);
  for(const fn of hooks.get('updateActor'))fn(summon.actor,{system:{attributes:{hp:{value:0}}}},{dnd5e:{hp:{value:40}}});
  for(let i=0;i<8;i++)await new Promise(setImmediate);
  assert.equal(w.actor.flags[ID].activeSummon.status,'idle');
});

test('every summon forces its live HP circle even with a previously hidden arc, and spells inherit no default dots',async()=>{
  const w=fixture(),summon=w.token('spell');Object.assign(w.config,{showHpArc:false,showPortrait:false,showResource:true,resourceType:'dots'});
  await bindSummon(w.actor,summon);const view=summonView(w.actor,w.config);
  assert.equal(view.config.showHpArc,true);assert.equal(view.config.showPortrait,true);
  assert.equal(view.config.resourceType,'none');assert.equal(view.config.showResource,false);
  assert.equal(view.config.hp,40);assert.equal(view.config.maxHp,80);assert.equal(w.config.showHpArc,false);
});

test('explicit resource options on a spell or Skill summon override the memosprite kit without changing other summons',async()=>{
  const w=fixture(),summon=w.token('spell');
  summon.flags[HSR].summonOwner.options={resourceType:'percent',resource:62,resourceMax:100,initiativeMode:'owner'};
  await bindSummon(w.actor,summon);let view=summonView(w.actor,w.config);
  assert.equal(view.config.resourceType,'percent');assert.equal(view.config.resource,62);assert.equal(view.config.resourceMax,100);assert.equal(view.config.showResource,true);
  summon.flags[ID]={resource:35};assert.equal(summonView(w.actor,w.config).config.resource,35);
  summon.flags[HSR].summonOwner.options={resourceType:'dots',resource:2,resourceMax:99};view=summonView(w.actor,w.config);assert.equal(view.config.resourceMax,3);
  delete summon.flags[ID].resource;
  summon.flags[HSR].summonOwner.options={resourceType:'hp',resource:7,resourceMax:10};view=summonView(w.actor,w.config);assert.equal(view.config.resource,7);assert.equal(view.config.hp,40);
  summon.flags[HSR].summonOwner.options={resourceType:'none'};assert.equal(summonView(w.actor,w.config).config.showResource,false);
});

test('unprepared HP data still supplies a visible zero arc without changing the token’s statistics',async()=>{
  const w=fixture(),summon=w.token('new');delete summon.actor.system.attributes.hp;await bindSummon(w.actor,summon);
  const view=summonView(w.actor,w.config);assert.equal(view.config.showHpArc,true);assert.equal(view.config.hp,0);assert.equal(view.config.maxHp,1);
  assert.equal(summon.actor.system.attributes.hp,undefined);
});
