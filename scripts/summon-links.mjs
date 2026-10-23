const ID='telys-memosprites',HSR='telys-star-rail-ultimates';
const pending=new Map(),observedAlive=new WeakSet();
const authority=()=>game.user?.isGM&&game.users.find(user=>user.isGM&&user.active)?.id===game.user.id;
const flag=(document,scope,key)=>document?.getFlag?.(scope,key)??document?.flags?.[scope]?.[key];
const hitPoints=token=>{const value=token?.actor?.system?.attributes?.hp?.value;return Number.isFinite(value)?value:null;};
function defeated(token,saved){
  const hp=hitPoints(token);
  if(hp>0)observedAlive.add(token);
  // Native summons can start at 0 while their synthetic Actor is prepared.
  // A binding's own flag update must not count as that creature losing HP.
  return hp!==null&&hp<=0&&(saved?.wasAlive!==false||observedAlive.has(token));
}
function resolveActor(uuid,id){
  try{const actor=typeof fromUuidSync==='function'&&uuid?fromUuidSync(uuid):null;if(actor?.documentName==='Actor')return actor;}catch{}
  const world=/^Actor\.([^.]+)$/.exec(String(uuid??''))?.[1]??id;
  return world?game.actors.get(world):null;
}
export function summonOwner(token){
  const meta=flag(token,HSR,'summonOwner')??flag(token,HSR,'abilitySummon');
  if(meta)return resolveActor(meta.casterUuid,meta.casterId);
  const own=flag(token,ID,'summonerUuid'),id=flag(token,ID,'summonerId');
  if(own||id)return resolveActor(own,id);
  const origin=flag(token.actor,'dnd5e','summon')?.origin;
  if(origin){
    try{const item=typeof fromUuidSync==='function'?fromUuidSync(origin):null;if(item?.actor)return item.actor;}catch{}
    return resolveActor(/^Actor\.[^.]+/.exec(origin)?.[0]);
  }
  return null;
}
export function summonedToken(actor,config={}){
  const active=flag(actor,ID,'activeSummon');
  if(active){if(active.status!=='active')return null;const token=game.scenes.get(active.sceneId)?.tokens.get(active.tokenId);return token&&summonOwner(token)?.uuid===actor.uuid?token:null;}
  if(!config.summoned||!config.summonedTokenId)return null;
  return game.scenes.map(scene=>scene.tokens.get(config.summonedTokenId)).find(token=>token&&summonOwner(token)?.uuid===actor.uuid)??null;
}
export function summonView(actor,config){
  const token=summonedToken(actor,config),hp=token?.actor?.system?.attributes?.hp??{};
  const active=Boolean(token?.actor&&!defeated(token,flag(actor,ID,'activeSummon')));
  if(!active)return {token:null,config:{...config,summoned:false}};
  const source=flag(token,ID,'summonerUuid')===actor.uuid||flag(token,ID,'summonerId')===actor.id;
  const meta=flag(token,HSR,'summonOwner')??flag(token,HSR,'abilitySummon');
  const options=game.modules?.get(HSR)?.api?.summoning?.getSummonOptions?.(actor,token)??meta?.options??(source?config:{resourceType:'none'});
  const resourceType=options.resourceType==='counter'?'hp':options.resourceType??'none';
  const resourceMax=resourceType==='dots'?3:resourceType==='percent'?100:Math.max(1,Number(options.resourceMax)||3);
  const resource=Math.min(resourceMax,Math.max(0,Number(flag(token,ID,'resource')??options.resource)||0));
  const portrait=source?(config.portrait||config.image||token.actor.img||token.texture?.src):(token.actor.img||token.texture?.src||config.portrait||config.image);
  return {token,config:{...config,summoned:true,portrait,image:portrait,showPortrait:true,showHpArc:true,hp:Math.max(0,Number(hp.value)||0),maxHp:Math.max(1,Number(hp.max)||1),resourceType,resourceMax,resource,showResource:resourceType!=='none'&&options.showResource!==false,...(!config.enabled?{showAbilities:false}:{}),...(!source?{portraitCropX:0,portraitCropY:0,portraitCropScale:100}:{}),_liveHealth:true}};
}
function enqueue(actor,work){
  const key=actor.uuid,job=(pending.get(key)??Promise.resolve()).catch(()=>{}).then(work);pending.set(key,job);
  return job.finally(()=>{if(pending.get(key)===job)pending.delete(key);});
}
export async function bindSummon(actor,token){
  if(!authority()||!actor||!token?.parent||summonOwner(token)?.uuid!==actor.uuid)return false;
  return enqueue(actor,async()=>{
    if(!token.parent.tokens.get(token.id))return false;
    const current=flag(actor,ID,'activeSummon'),createdAt=Number(token._stats?.createdTime??flag(token,HSR,'summonOwner')?.createdAt??flag(token,HSR,'abilitySummon')?.createdAt)||Date.now();
    const wasAlive=hitPoints(token)>0;
    if(wasAlive)observedAlive.add(token);
    if(current?.status==='active'&&current.sceneId===token.parent.id&&current.tokenId===token.id){
      if(wasAlive&&current.wasAlive===false)await actor.setFlag(ID,'activeSummon',{...current,wasAlive:true});
      return true;
    }
    if(Number(current?.createdAt)>createdAt)return false;
    await actor.setFlag(ID,'activeSummon',{status:'active',sceneId:token.parent.id,tokenId:token.id,createdAt,wasAlive});
    return true;
  });
}
export async function clearSummon(actor,token){
  if(!authority())return false;
  const expected=token?{sceneId:token.parent?.id,tokenId:token.id}:flag(actor,ID,'activeSummon');
  return enqueue(actor,async()=>{
    const current=flag(actor,ID,'activeSummon');
    if(expected?.sceneId&&(current?.sceneId!==expected.sceneId||current?.tokenId!==expected.tokenId))return false;
    if(current?.status==='idle')return false;
    await actor.setFlag(ID,'activeSummon',{status:'idle',createdAt:current?.createdAt??Date.now()});
    return true;
  });
}
export async function reconcileSummons(actors=game.actors){
  if(!authority())return;
  for(const actor of actors){
    const saved=flag(actor,ID,'activeSummon'),config=flag(actor,ID,'config')??{};
    if(saved?.status==='active'){
      const scene=game.scenes.get(saved.sceneId),token=scene?.tokens.get(saved.tokenId);
      if(!token||summonOwner(token)?.uuid!==actor.uuid||token.actor&&defeated(token,saved))await clearSummon(actor,token);
      else if(hitPoints(token)>0&&saved.wasAlive===false)await bindSummon(actor,token);
    }else if(!saved&&config.summoned){const token=summonedToken(actor,config);if(token)await bindSummon(actor,token);}
  }
}
export function installSummonLinks(refresh){
  const run=work=>Promise.resolve(work).catch(error=>console.error(`${ID} | Summon HUD link`,error)).finally(refresh);
  const changed=(changes,path)=>Object.keys(changes??{}).some(key=>key===path||key.startsWith(path+'.'))||path.split('.').reduce((value,key)=>value?.[key],changes)!==undefined;
  const affected=source=>game.actors.filter(actor=>{
    const saved=flag(actor,ID,'activeSummon');if(saved?.status!=='active')return false;
    const token=game.scenes.get(saved.sceneId)?.tokens.get(saved.tokenId);
    return token?.actor&&(token.actor===source||token.actor.uuid===source.uuid);
  });
  Hooks.on('createToken',token=>{const actor=summonOwner(token);if(actor)void run(bindSummon(actor,token));});
  Hooks.on('dnd5e.postSummon',(activity,_profile,tokens)=>{const actor=activity.actor??activity.item?.actor,token=tokens?.at(-1);if(actor&&token)void run(bindSummon(actor,token));});
  Hooks.on('updateActor',(source,changes={},options={})=>{
    const hpChanged=changed(changes,'system.attributes.hp')||changed(changes,'system.attributes.hp.value');
    const linkChanged=changed(changes,`flags.${ID}.activeSummon`)||changed(changes,`flags.${ID}.config`);
    if(!hpChanged&&!linkChanged)return;
    const actors=hpChanged?affected(source):[source];
    // D&D5e supplies the previous HP in its update options. This also detects
    // a lethal change when no render observed the creature's positive HP.
    if(options.dnd5e?.hp?.value>0&&source.system?.attributes?.hp?.value===0){
      for(const actor of actors){const token=summonedToken(actor);if(token)observedAlive.add(token);}
    }
    if(actors.length)void run(reconcileSummons(actors));
  });
  Hooks.on('updateToken',(token,changes={})=>{
    if(!Object.keys(changes).length){refresh();return;}
    // Movement/rotation has no effect on a token's HUD binding or HP.
    if(!['actorId','actorLink','delta','texture','flags'].some(path=>changed(changes,path)))return;
    const actors=game.actors.filter(actor=>{const saved=flag(actor,ID,'activeSummon');return saved?.sceneId===token.parent?.id&&saved?.tokenId===token.id;});
    const owner=summonOwner(token);if(owner&&!actors.includes(owner))actors.push(owner);
    if(actors.length)void run(reconcileSummons(actors));
  });
  Hooks.on('deleteToken',token=>{refresh();for(const actor of game.actors){const current=flag(actor,ID,'activeSummon');if(current?.sceneId===token.parent?.id&&current?.tokenId===token.id)void run(clearSummon(actor,token));}});
  Hooks.on('deleteScene',()=>void run(reconcileSummons()));
  Hooks.on('canvasReady',()=>{refresh();void run(reconcileSummons());});
  void run(reconcileSummons());
}
