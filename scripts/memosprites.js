const ID = 'telys-memosprites';
const HSR = 'telys-star-rail-ultimates';
const DEFAULT = {enabled:false, summoned:false, sourceUuid:'', name:'Memosprite', image:'', tabIcon:'', imageX:50,imageY:50,imageScale:100, hp:20,maxHp:20, resourceType:'counter',resource:0,resourceMax:3, abilities:[],showOnHud:true,frameX:95,frameY:-20,frameScale:100,frameWidth:145};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,min,max) => Math.max(min,Math.min(max,Number(v)||0));
const config = actor => ({...DEFAULT,...actor.getFlag(ID,'config'),abilities:(actor.getFlag(ID,'config')?.abilities ?? []).slice(0,5)});
const canEdit = actor => game.user.isGM || actor.isOwner;
async function save(actor, changes) {
  if (!canEdit(actor)) return ui.notifications.warn('You cannot configure this character.');
  const next = {...config(actor),...changes};
  next.resourceMax=clamp(next.resourceMax,1,next.resourceType==='dots'?3:next.resourceType==='percent'?100:999);
  next.resource=clamp(next.resource,0,next.resourceMax);
  next.maxHp=clamp(next.maxHp,1,99999);
  next.hp=clamp(next.hp,0,next.maxHp);
  next.abilities=(next.abilities??[]).slice(0,5);
  await actor.setFlag(ID,'config',next);
  return next;
}
function color(actor) {
  try {
    const elementId=actor.getFlag(HSR,'ultimate')?.elementId;
    const entry=(game.settings.get(HSR,'elements')??[]).find(e=>e.id===elementId);
    return entry?.readyColor || entry?.chargeColor || entry?.color || '#aa9be5';
  } catch { return '#aa9be5'; }
}
function art(c) { return esc(c.image || 'icons/svg/mystery-man.svg'); }
function resourceMarkup(c) {
  if(!c.summoned) return '';
  const value=clamp(c.resource,0,c.resourceMax), max=clamp(c.resourceMax,1,999);
  if(c.resourceType==='dots') return `<div class="tms-dots" aria-label="${value} of ${max} charges">${Array.from({length:Math.min(max,3)},(_,i)=>`<i class="${i<value?'lit':''}"></i>`).join('')}</div>`;
  if(c.resourceType==='percent') return `<div class="tms-fang" style="--fill:${clamp(value,0,100)}%"><span>${Math.round(value)}%</span></div>`;
  return `<div class="tms-counter">${value}/${max}</div>`;
}
function frame(actor,c,{preview=false}={}) {
  const hp=clamp(c.hp/c.maxHp*100,0,100);
  return `<div class="tms-frame ${c.summoned?'is-summoned':'is-idle'}" style="--tms-color:${esc(color(actor))};--art-x:${clamp(c.imageX,-100,200)}%;--art-y:${clamp(c.imageY,-100,200)}%;--art-scale:${clamp(c.imageScale,25,400)/100};--health:${hp}%;--frame-width:${clamp(c.frameWidth,90,330)}px;${preview?'':`--frame-x:${clamp(c.frameX,-300,400)}px;--frame-y:${clamp(c.frameY,-300,200)}px;--frame-scale:${clamp(c.frameScale,30,250)/100};`}">
    <div class="tms-art"><img src="${art(c)}" alt="${esc(c.name)}"></div>
    ${c.summoned?`<svg class="tms-hp" viewBox="0 0 52 104" aria-label="${c.hp} of ${c.maxHp} HP"><path class="tms-hp-track" d="M47 4 C -9 25 -9 79 47 100"/><path class="tms-hp-value" d="M47 4 C -9 25 -9 79 47 100" pathLength="100" style="stroke-dasharray:${hp} 100"/></svg>`:''}
    <strong class="tms-name">${esc(c.name)}</strong>${resourceMarkup(c)}
  </div>`;
}
const label=(text,name,value,type='text',extra='')=>`<label>${text}<input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
function panel(actor) {
 const c=config(actor), gm=game.user.isGM;
 const abilityRows=c.abilities.map((a,i)=>`<div class="tms-ability" data-index="${i}"><header><b>Ability ${i+1}</b>${gm?'<button type="button" data-action="remove-ability" title="Remove ability">×</button>':''}</header>${label('Name','abilityName',a.name||'')}${label('Description','abilityText',a.text||'')}${label('Resource cost','abilityCost',a.cost??1,'number','min="0" max="100"')}${label('Icon','abilityIcon',a.icon||'')}<button type="button" data-action="use-ability" data-index="${i}">Use ${esc(a.name||'ability')}</button></div>`).join('');
 return `<section class="tms-tab tab" data-group="primary" data-tab="tms-memosprite" style="--tms-color:${esc(color(actor))}"><header><h2>Memosprite</h2><button type="button" data-action="summon" ${!c.enabled||!canEdit(actor)?'disabled':''}>${c.summoned?'Unsummon memosprite':'Summon memosprite'}</button></header>
 <div class="tms-layout"><div class="tms-fields"><label class="tms-check"><input type="checkbox" name="enabled" ${c.enabled?'checked':''} ${!gm?'disabled':''}> Has a memosprite?</label>
 <div class="tms-source" data-drop-source><strong>Drag an Actor or Item here</strong><span>${esc(c.sourceUuid||'No source selected')}</span></div>
 ${label('Memosprite name','name',c.name)}${label('Source UUID','sourceUuid',c.sourceUuid)}
 ${label('Tab icon URL','tabIcon',c.tabIcon)}<button type="button" data-pick="tabIcon">Choose tab icon</button>
 ${label('Artwork URL','image',c.image)}<button type="button" data-pick="image">Choose artwork</button>
 <div class="tms-triple">${label('Artwork X','imageX',c.imageX,'number','min="-100" max="200"')}${label('Artwork Y','imageY',c.imageY,'number','min="-100" max="200"')}${label('Artwork scale %','imageScale',c.imageScale,'number','min="25" max="400"')}</div>
 <h3>HP and resource</h3><div class="tms-triple">${label('Current HP','hp',c.hp,'number','min="0"')}${label('Maximum HP','maxHp',c.maxHp,'number','min="1"')}</div>
 <label>Resource display<select name="resourceType"><option value="counter" ${c.resourceType==='counter'?'selected':''}>X/Y counter</option><option value="dots" ${c.resourceType==='dots'?'selected':''}>Up to 3 usage dots</option><option value="percent" ${c.resourceType==='percent'?'selected':''}>Fang percentage</option></select></label>
 <div class="tms-triple">${label('Current resource','resource',c.resource,'number','min="0"')}${label('Maximum resource','resourceMax',c.resourceMax,'number','min="1"')}</div><button type="button" data-action="restore">Restore resource</button>
 <h3>Abilities (up to five)</h3><div data-abilities>${abilityRows}</div>${gm&&c.abilities.length<5?'<button type="button" data-action="add-ability">Add ability</button>':''}
 <h3>Combat HUD frame designer</h3><label class="tms-check"><input type="checkbox" name="showOnHud" ${c.showOnHud?'checked':''} ${!gm?'disabled':''}> Show over this character’s HUD</label>
 <div class="tms-triple">${label('Frame X (px)','frameX',c.frameX,'number')}${label('Frame Y (px)','frameY',c.frameY,'number')}${label('Frame scale %','frameScale',c.frameScale,'number','min="30" max="250"')}${label('Frame width (px)','frameWidth',c.frameWidth,'number','min="90" max="330"')}</div>
 <p>Drag the frame in the preview to position it over the character card; scroll on artwork to zoom its image. Settings save automatically.</p></div>
 <div class="tms-preview"><h3>Frame preview</h3><div class="tms-preview-stage"><div class="tms-preview-host"><img src="${esc(actor.img)}" alt=""><span>${esc(actor.name)}</span></div><div class="tms-preview-frame" style="left:${clamp(c.frameX,-300,400)}px;top:${clamp(c.frameY,-300,200)}px;transform:scale(${clamp(c.frameScale,30,250)/100})">${frame(actor,c,{preview:true})}</div></div></div></div></section>`;
}
function rootOf(app,html) { const h=html?.jquery?html[0]:html; return h instanceof HTMLElement?h:app.element?.[0]??app.element??null; }
function inject(app,html) {
 const actor=app.actor??app.document, root=rootOf(app,html);
 if(actor?.type!=='character'||!root) return;
 const nav=root.querySelector('nav.tabs[data-group="primary"],nav.sheet-tabs[data-group="primary"],.tabs-right nav.tabs');
 const body=root.querySelector('.tab-body,.sheet-body,[data-application-part="body"]');
 if(!nav||!body) return;
 root.querySelectorAll('[data-tab="tms-memosprite"]').forEach(el=>el.remove());
 const control=document.createElement('a');control.className='item control tms-control';control.dataset.action='tab';control.dataset.group='primary';control.dataset.tab='tms-memosprite';control.title='Memosprite';
 const c=config(actor);control.innerHTML=c.tabIcon?`<img src="${art({...c,image:c.tabIcon})}" alt="">`:'<i class="fas fa-ghost"></i>';nav.append(control);
 body.insertAdjacentHTML('beforeend',panel(actor));const tab=body.querySelector('.tms-tab');
 let timer;
 const collect=()=>{const patch={};for(const input of tab.querySelectorAll('[name]:not([name^="ability"])')) patch[input.name]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
 patch.abilities=[...tab.querySelectorAll('.tms-ability')].map(row=>({name:row.querySelector('[name=abilityName]').value,text:row.querySelector('[name=abilityText]').value,cost:Number(row.querySelector('[name=abilityCost]').value)||0,icon:row.querySelector('[name=abilityIcon]').value}));return patch;};
 const preview=()=>{const draft={...config(actor),...collect()};tab.style.setProperty('--tms-color',color(actor));const target=tab.querySelector('.tms-preview-frame');target.style.left=`${draft.frameX}px`;target.style.top=`${draft.frameY}px`;target.style.transform=`scale(${clamp(draft.frameScale,30,250)/100})`;target.innerHTML=frame(actor,draft,{preview:true});};
 const persist=()=>{clearTimeout(timer);timer=setTimeout(()=>save(actor,collect()).catch(console.error),400);};
 tab.addEventListener('input',e=>{if(!canEdit(actor))return;preview();persist();});tab.addEventListener('change',e=>{if(!canEdit(actor))return;preview();persist();});
 tab.addEventListener('click',async e=>{
  const pick=e.target.closest('[data-pick]');if(pick){const key=pick.dataset.pick;new FilePicker({type:'image',current:tab.querySelector(`[name="${key}"]`).value,callback:path=>{tab.querySelector(`[name="${key}"]`).value=path;preview();persist();if(key==='tabIcon')control.innerHTML=`<img src="${esc(path)}" alt="">`;}}).browse();return;}
  const action=e.target.closest('[data-action]');if(!action||action.dataset.action==='tab')return;e.preventDefault();
  const current=await save(actor,collect());if(!current)return;
  switch(action.dataset.action){
   case 'summon':if(!current.enabled)return;await save(actor,{summoned:!current.summoned});break;
   case 'restore':await save(actor,{resource:current.resourceMax,hp:current.maxHp});break;
   case 'add-ability':if(game.user.isGM)await save(actor,{abilities:[...current.abilities,{name:'New ability',text:'',cost:1,icon:''}].slice(0,5)});break;
   case 'remove-ability':if(game.user.isGM)await save(actor,{abilities:current.abilities.filter((_,i)=>i!==Number(action.closest('[data-index]').dataset.index))});break;
   case 'use-ability':{if(!current.summoned)return ui.notifications.warn('Summon the memosprite first.');const a=current.abilities[Number(action.dataset.index)],cost=clamp(a?.cost,0,100);if(!a||current.resource<cost)return ui.notifications.warn('Not enough memosprite resource.');await save(actor,{resource:current.resource-cost});await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<h3>${esc(current.name)}: ${esc(a.name)}</h3><p>${esc(a.text)}</p>`});break;}
  } app.render(false);
 });
 tab.addEventListener('dragover',e=>{if(e.target.closest('[data-drop-source]'))e.preventDefault();});
 tab.addEventListener('drop',async e=>{if(!e.target.closest('[data-drop-source]')||!game.user.isGM)return;e.preventDefault();e.stopPropagation();try{const data=TextEditor.getDragEventData(e),uuid=data.uuid||(data.type&&data.id?`${data.type}.${data.id}`:null),doc=uuid?await fromUuid(uuid):null;if(!doc||!['Actor','Item'].includes(doc.documentName))throw Error('Drop an Actor or Item.');await save(actor,{sourceUuid:doc.uuid,name:doc.name,image:doc.img||config(actor).image});app.render(false);}catch(err){ui.notifications.warn(err.message);}});
 let drag=null;tab.addEventListener('pointerdown',e=>{if(!game.user.isGM||!e.target.closest('.tms-preview-frame')||e.target.closest('button,input'))return;drag={x:e.clientX,y:e.clientY,left:Number(tab.querySelector('[name=frameX]').value),top:Number(tab.querySelector('[name=frameY]').value)};e.target.setPointerCapture(e.pointerId);});
 tab.addEventListener('pointermove',e=>{if(!drag)return;tab.querySelector('[name=frameX]').value=Math.round(drag.left+e.clientX-drag.x);tab.querySelector('[name=frameY]').value=Math.round(drag.top+e.clientY-drag.y);preview();});
 tab.addEventListener('pointerup',()=>{if(drag){drag=null;persist();}});
 tab.addEventListener('wheel',e=>{if(!e.target.closest('.tms-art')||!game.user.isGM)return;e.preventDefault();const input=tab.querySelector('[name=imageScale]');input.value=clamp(Number(input.value)+(e.deltaY<0?5:-5),25,400);preview();persist();},{passive:false});
}
function syncHud(){
 const host=document.querySelector('.tsru-combat-party-hud');if(!host)return;
  for(const card of host.querySelectorAll('.tsru-combat-party-member[data-actor-id]')){
  const actor=game.actors.get(card.dataset.actorId);if(!actor)continue;const c=config(actor);
  const existing=card.querySelector(':scope > .tms-frame');
  if(!(c.enabled&&c.showOnHud)){existing?.remove();continue;}
  const signature=JSON.stringify([c,color(actor)]);
  if(existing?.dataset.signature!==signature){existing?.remove();card.insertAdjacentHTML('beforeend',frame(actor,c));card.querySelector(':scope > .tms-frame').dataset.signature=signature;}
 }
}
let observer, queued=false;
Hooks.once('ready',()=>{
 if(!game.modules.get(HSR)?.active){ui.notifications.error("Tely's Memosprites requires Tely's Star Rail Ultimates.");return;}
 game.modules.get(ID).api={config,save,summon:actor=>save(actor,{summoned:true}),unsummon:actor=>save(actor,{summoned:false})};
 observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncHud();});});observer.observe(document.body,{childList:true,subtree:true});syncHud();
});
Hooks.on('renderActorSheet',inject);
Hooks.on('updateActor',(actor,changes)=>{if(foundry.utils.hasProperty(changes,`flags.${ID}.config`)){for(const app of Object.values(actor.apps??{}))app.render(false);syncHud();}});
