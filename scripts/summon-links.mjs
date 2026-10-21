const ID='telys-memosprites',HSR='telys-star-rail-ultimates';
const pending=new Map();
const authority=()=>game.user?.isGM&&game.users.find(user=>user.isGM&&user.active)?.id===game.user.id;
const flag=(document,scope,key)=>document?.getFlag?.(scope,key)??document?.flags?.[scope]?.[key];
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
  if(active){if(active.status!=='active')return null;return game.scenes.get(active.sceneId)?.tokens.get(active.tokenId)??null;}
  if(!config.summoned||!config.summonedTokenId)return null;
  return game.scenes.map(scene=>scene.tokens.get(config.summonedTokenId)).find(token=>token&&summonOwner(token)?.uuid===actor.uuid)??null;
}
export function summonView(actor,config){
  const token=summonedToken(actor,config),hp=token?.actor?.system?.attributes?.hp;
  const active=Boolean(token?.actor&&Number(hp?.value)>0);
  if(!active)return {token:null,config:{...config,summoned:false}};
  const source=flag(token,ID,'summonerUuid')===actor.uuid||flag(token,ID,'summonerId')===actor.id;
  const portrait=source?(config.portrait||config.image||token.actor.img||token.texture?.src):(token.actor.img||token.texture?.src||config.portrait||config.image);
  return {token,config:{...config,summoned:true,portrait,image:portrait,hp:Math.max(0,Number(hp.value)||0),maxHp:Math.max(1,Number(hp.max)||1),...(!config.enabled?{showResource:false,showAbilities:false}:{}),...(source?{}:{portraitCropX:0,portraitCropY:0,portraitCropScale:100}),_liveHealth:true}};
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
    if(current?.status==='active'&&current.sceneId===token.parent.id&&current.tokenId===token.id)return true;
    if(Number(current?.createdAt)>createdAt)return false;
    await actor.setFlag(ID,'activeSummon',{status:'active',sceneId:token.parent.id,tokenId:token.id,createdAt});
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
export async function reconcileSummons(){
  if(!authority())return;
  for(const actor of game.actors){
    const saved=flag(actor,ID,'activeSummon'),config=flag(actor,ID,'config')??{};
    if(saved?.status==='active'){
      const scene=game.scenes.get(saved.sceneId),token=scene?.tokens.get(saved.tokenId);
      if(!token||token.actor&&Number(token.actor.system?.attributes?.hp?.value)<=0)await clearSummon(actor,token);
    }else if(!saved&&config.summoned){const token=summonedToken(actor,config);if(token)await bindSummon(actor,token);}
  }
}
export function installSummonLinks(refresh){
  const run=work=>Promise.resolve(work).catch(error=>console.error(`${ID} | Summon HUD link`,error)).finally(refresh);
  Hooks.on('createToken',token=>{const actor=summonOwner(token);if(actor)void run(bindSummon(actor,token));});
  Hooks.on('dnd5e.postSummon',(activity,_profile,tokens)=>{const actor=activity.actor??activity.item?.actor,token=tokens?.at(-1);if(actor&&token)void run(bindSummon(actor,token));});
  Hooks.on('updateActor',()=>{refresh();void run(reconcileSummons());});
  Hooks.on('updateToken',()=>{refresh();void run(reconcileSummons());});
  Hooks.on('deleteToken',token=>{refresh();for(const actor of game.actors){const current=flag(actor,ID,'activeSummon');if(current?.sceneId===token.parent?.id&&current?.tokenId===token.id)void run(clearSummon(actor,token));}});
  Hooks.on('deleteScene',()=>void run(reconcileSummons()));
  Hooks.on('canvasReady',()=>{refresh();void run(reconcileSummons());});
  void run(reconcileSummons());
}
