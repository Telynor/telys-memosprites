const ID = 'telys-memosprites';
const HSR = 'telys-star-rail-ultimates';
const DEFAULT_TAB_ICON='<svg class="tms-tab-symbol" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 19.4 11.6 29 15l-9.6 3.4L16 28l-3.4-9.6L3 15l9.6-3.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="16" cy="15" r="4.2" fill="currentColor"/><path d="M24 3v5M21.5 5.5h5M26 23v5M23.5 25.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const DEFAULT = {enabled:false, summoned:false, sourceUuid:'', name:'Memosprite', image:'', portrait:'', portraitCropX:0,portraitCropY:0,portraitCropScale:100, tabIcon:'', imageX:50,imageY:50,imageScale:100, hp:20,maxHp:20, resourceType:'counter',resource:0,resourceMax:3, abilities:[],showOnHud:true,showHudName:true,hideTalentOnHud:true,showPortrait:true,showHpArc:true,showHpNumber:true,showResource:true,showAbilities:true,showSummonButton:true,frameX:28,frameY:4,frameScale:75,frameWidth:145,portraitX:0,portraitY:0,portraitScale:100,hpTextX:0,hpTextY:0,hpTextScale:100,resourceX:0,resourceY:0,resourceScale:100,abilitiesX:0,abilitiesY:0,abilitiesScale:100};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,min,max) => Math.max(min,Math.min(max,Number(v)||0));
const config = actor => ({...DEFAULT,...actor.getFlag(ID,'config'),abilities:(actor.getFlag(ID,'config')?.abilities ?? []).slice(0,5)});
const canEdit = actor => game.user.isGM || actor.isOwner;
const parentConfig = actor => game.modules.get(HSR)?.api?.getConfig?.(actor) ?? actor.getFlag(HSR,'ultimate') ?? {};
const HUD_DEFAULT = {memberWidth:184,memberHeight:150,portraitLeft:0,portraitRight:25,portraitTop:0,portraitBottom:17,hpLeft:22,hpRight:0,hpBottom:20,hpHeight:9,orbRight:7,orbBottom:34,orbSize:54,talentLeft:5,talentBottom:20,talentSize:32,nameLeft:8,nameBottom:0,nameWidth:128};
function hudDesign(){try{return {...HUD_DEFAULT,...game.settings.get(HSR,'combatHudDesign')}}catch{return {...HUD_DEFAULT}}}
function frameScale(c){return clamp(c.frameScale,30,250);}
function boundedFrame(c){const d=hudDesign(),width=clamp(c.frameWidth,90,330)*frameScale(c)/100,height=145*frameScale(c)/100;return {x:clamp(c.frameX,-width+36,d.memberWidth-36),y:clamp(c.frameY,-height+36,d.memberHeight-36)};}
function hudPreview(actor,c,{summoned=true}={}){
 const d=hudDesign(),base=parentConfig(actor),p={...base};
 if(p.enhancedStanceEnabled&&p.enhancedStanceActive){
  for(const [base,enhanced] of [['combatHudPortrait','enhancedHudPortrait'],['talentIcon','enhancedTalentIcon']])if(p[enhanced])p[base]=p[enhanced];
  if(p.enhancedHudPortrait)for(const key of ['X','Y','Scale','Flip'])p[`combatHudPortrait${key}`]=p[`enhancedHudPortrait${key}`];
  if(p.enhancedUltimateEnabled&&p.enhancedUltimateButtonImage)p.ultimateButtonImage=p.enhancedUltimateButtonImage;
 }
 const vars={"member-w":d.memberWidth,"member-h":d.memberHeight,"portrait-l":d.portraitLeft,"portrait-r":d.portraitRight,"portrait-t":d.portraitTop,"portrait-b":d.portraitBottom,"hp-l":d.hpLeft,"hp-r":d.hpRight,"hp-b":d.hpBottom,"hp-h":d.hpHeight,"orb-r":d.orbRight,"orb-b":d.orbBottom,"orb-size":d.orbSize,"talent-l":d.talentLeft,"talent-b":d.talentBottom,"talent-size":d.talentSize,"name-l":d.nameLeft,"name-b":d.nameBottom,"name-w":d.nameWidth};
 const style=Object.entries(vars).map(([k,v])=>`--${k}:${Number(v)||0}px`).join(';');
 const hp=actor.system?.attributes?.hp??{},hpMax=Math.max(1,Number(hp.max)||1),hpValue=clamp(hp.value,0,hpMax),hpPercent=hpValue/hpMax*100,shieldPercent=clamp((Number(hp.temp)||0)/hpMax*100,0,100);
 const energy=clamp((Number(p.current)||0)/Math.max(1,Number(p.max)||100)*100,0,100),portrait=p.combatHudPortrait||actor.img||'icons/svg/mystery-man.svg',orb=p.ultimateButtonImage||p.orbImage||actor.img||'icons/svg/mystery-man.svg';
 const talentMax=Math.max(0,Number(p.talentPointsMax)||0),talentValue=clamp(p.talentPointsCurrent,0,talentMax),talent=p.talentText||talentMax?`<div class="tsru-combat-party-talent" style="--talent-progress:${talentMax?talentValue/talentMax*360:0}deg;--talent-color:${esc(color(actor))}"><img src="${esc(p.talentIcon||actor.img)}" alt=""><strong>${talentValue}/${talentMax}</strong></div>`:'';
 return `<article class="tsru-combat-party-member tms-summoner-card ${shieldPercent?'has-shield':''} ${c.showHudName?'':'tms-hide-hud-name'} ${c.enabled&&c.showOnHud&&c.hideTalentOnHud&&isRemembrance(actor)?'tms-hide-hud-talent':''}" style="${style};--hud-x:${clamp(p.combatHudPortraitX??50,0,100)}%;--hud-y:${clamp(p.combatHudPortraitY??50,0,100)}%;--hud-scale:${clamp(p.combatHudPortraitScale??100,50,300)/100};--hud-flip:${p.combatHudPortraitFlip?-1:1};--tsru-ultimate-x:${clamp(p.ultimateButtonX??50,0,100)}%;--tsru-ultimate-y:${clamp(p.ultimateButtonY??50,0,100)}%;--tsru-ultimate-scale:${clamp(p.ultimateButtonScale??100,50,400)/100};--energy:${energy}%;--energy-color:${esc(color(actor))};--hp:${hpPercent}%;--shield:${shieldPercent}%"><div class="tsru-combat-party-portrait"><img src="${esc(portrait)}" alt=""></div><strong class="tsru-combat-party-name">${esc(actor.name)}</strong><div class="tsru-combat-party-hp"><b class="tsru-combat-party-shield-icon" aria-hidden="true"><i class="fas fa-shield-halved"></i></b><i class="tsru-combat-party-health"></i><span>${hpValue}/${hpMax}</span></div>${talent}<div class="tsru-combat-party-ultimate-wrap"><button type="button" disabled><span class="tsru-hud-orb-fill"></span><img src="${esc(orb)}" alt="">${p.showHudPercent?`<strong>${Math.round(energy)}%</strong>`:''}</button></div>${frame(actor,{...c,summoned})}</article>`;
}
function fitPreview(tab){const stage=tab.querySelector('.tms-preview-stage'),card=tab.querySelector('.tms-preview-card'),d=hudDesign();if(!stage||!card||!stage.clientWidth)return;const zoom=Math.min(2.3,(stage.clientWidth-30)/(d.memberWidth+110),(stage.clientHeight-30)/(d.memberHeight+135));card.style.transform=`scale(${Math.max(.1,zoom)})`;card.dataset.zoom=String(zoom);}
function rawDiceDamage(rolls){
 const seen=new Set(),dice=[];
 const visit=term=>{if(!term||typeof term!=='object'||seen.has(term))return;seen.add(term);if(Array.isArray(term.results)&&(term.faces||term.number))dice.push(term);for(const key of ['dice','terms','rolls','operands','roll','damageRoll']){const nested=term[key];if(Array.isArray(nested))nested.forEach(visit);else visit(nested);}};
 for(const roll of rolls)visit(roll);
 return dice.flatMap(d=>d.results??[]).filter(r=>r?.active!==false&&r?.discarded!==true).reduce((n,r)=>n+(Number(r?.result)||0),0);
}
function sourceSummoner(source){
 if(!source)return null;
 const ids=new Set([source.uuid,source.id,source.getFlag?.('core','sourceId'),source.parent?.uuid].filter(Boolean));
 return game.actors.find(actor=>{const c=config(actor);return c.enabled&&c.summoned&&c.sourceUuid&&ids.has(c.sourceUuid);})??null;
}
const recentDamage=new Set();
function attributeDamage(source,rolls,targets,key){
 const summoner=sourceSummoner(source);if(!summoner||!(game.user.isGM||source.isOwner||summoner.isOwner))return;
 const hsr=parentConfig(summoner),list=Array.from(targets??[]).filter(Boolean);
 const amount=hsr.breakCharacter?rolls.reduce((n,r)=>n+Math.max(0,Number(r?.total)||0),0):rawDiceDamage(rolls);
 if(!amount||!list.length)return;
 const uuids=list.map(t=>t.document?.uuid??t.actor?.uuid??t.uuid).filter(Boolean);
 if(!uuids.length)return;
 const eventKey=`memosprite:${source.uuid}:${key}:${uuids.slice().sort().join(',')}`;
 if(recentDamage.has(eventKey))return;
 recentDamage.add(eventKey);setTimeout(()=>recentDamage.delete(eventKey),120000);
 game.socket.emit(`module.${HSR}`,{type:'applyToughness',sourceUserId:game.user.id,attackerUuid:summoner.uuid,targetUuids:uuids,amount,eventKey});
}
function onDndDamage(rolls,data={}){
 const source=data.subject?.actor??data.subject?.item?.actor??data.subject?.parent?.actor??data.subject?.parent;
 const list=Array.isArray(rolls)?rolls:[rolls];
 if(source?.documentName!=='Actor')return;
 const key=list.map(r=>r?.id??r?._id??r?.formula??'roll').join(':');
 attributeDamage(source,list,game.user?.targets,`dnd5e:${key}`);
}
function onMidiDamage(workflow){
 const source=workflow?.actor;if(source?.documentName!=='Actor')return;
 const rolls=[...new Set([...(Array.isArray(workflow.damageRolls)?workflow.damageRolls:workflow.damageRolls?[workflow.damageRolls]:[]),workflow.damageRoll].filter(Boolean))];
 const targets=workflow.hitTargets?.size?workflow.hitTargets:workflow.targets;
 attributeDamage(source,rolls,targets,`midi:${workflow.uuid??workflow.id??rolls.map(r=>r.id??r.formula).join(':')}`);
}
async function save(actor, changes) {
  if (!canEdit(actor)) return ui.notifications.warn('You cannot configure this character.');
  const next = {...config(actor),...changes};
  next.resourceMax=clamp(next.resourceMax,1,next.resourceType==='dots'?3:next.resourceType==='percent'?100:999);
  next.resource=clamp(next.resource,0,next.resourceMax);
  next.maxHp=clamp(next.maxHp,1,99999);
  next.hp=clamp(next.hp,0,next.maxHp);
  next.frameScale=frameScale(next);
  Object.assign(next,{frameX:boundedFrame(next).x,frameY:boundedFrame(next).y});
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
function sourceActor(c){
 if(!c.sourceUuid?.startsWith('Actor.')&&!c.sourceUuid?.startsWith('Compendium.'))return null;
 try{const document=typeof fromUuidSync==='function'?fromUuidSync(c.sourceUuid):game.actors.get(c.sourceUuid.split('.')[1]);return document?.documentName==='Actor'?document:null;}catch{return null;}
}
function memospriteHealth(c){
 const source=sourceActor(c),attributes=source?.system?.attributes?.hp;
 if(!attributes)return {hp:clamp(c.hp,0,Math.max(1,Number(c.maxHp)||1)),maxHp:Math.max(1,Number(c.maxHp)||1),linked:false};
 const maxHp=Math.max(1,Number(attributes.max)||1);
 return {hp:clamp(attributes.value,0,maxHp),maxHp,linked:true};
}
function resourceMarkup(c) {
  if(!c.summoned||!c.showResource) return '';
  const value=clamp(c.resource,0,c.resourceMax), max=clamp(c.resourceMax,1,999);
  if(c.resourceType==='dots') return `<div class="tms-dots" data-part="resource" aria-label="${value} of ${max} charges">${Array.from({length:Math.min(max,3)},(_,i)=>`<i class="${i<value?'lit':''}"></i>`).join('')}</div>`;
  if(c.resourceType==='percent') return `<div class="tms-fang" data-part="resource" style="--fill:${clamp(value,0,100)}%"><span>${Math.round(value)}%</span></div>`;
  return `<div class="tms-counter" data-part="resource">${value}/${max}</div>`;
}
function frame(actor,c,{preview=false}={}) {
  const health=memospriteHealth(c),hp=clamp(health.hp/health.maxHp*100,0,100);
  const position=boundedFrame(c);
  const layout=['portrait','hpText','resource','abilities'].map(part=>`--${part}-x:${clamp(c[part+'X'],-300,300)}px;--${part}-y:${clamp(c[part+'Y'],-300,300)}px;--${part}-scale:${clamp(c[part+'Scale'],25,300)/100}`).join(';');
  return `<div class="tms-frame ${c.summoned?'is-summoned':'is-idle'}" style="--tms-color:${esc(color(actor))};--frame-width:${clamp(c.frameWidth,90,330)}px;--frame-x:${position.x}px;--frame-y:${position.y}px;--frame-scale:${frameScale(c)/100};--crop-x:${clamp(c.portraitCropX,-150,150)}px;--crop-y:${clamp(c.portraitCropY,-150,150)}px;--crop-scale:${clamp(c.portraitCropScale,25,400)/100};${layout}">
    ${c.showPortrait||c.summoned&&c.showHpArc?`<div class="tms-portrait-unit" data-part="portrait">${c.showPortrait?`<div class="tms-portrait"><img src="${esc(c.portrait||c.image||'icons/svg/mystery-man.svg')}" alt="${esc(c.name)} portrait"></div>`:''}${c.summoned&&c.showHpArc?`<svg class="tms-hp" viewBox="0 0 70 100" aria-label="${health.hp} of ${health.maxHp} HP"><path class="tms-hp-track" d="M36 85 A35 35 0 0 1 36 15"/><path class="tms-hp-value" d="M36 85 A35 35 0 0 1 36 15" pathLength="100" style="stroke-dasharray:${hp} 100;opacity:${hp>0?1:0}"/></svg>`:''}</div>`:''}
    ${c.summoned?`${c.showHpNumber?`<div class="tms-hp-number" data-part="hpText">${Math.round(health.hp)} <small>/ ${Math.round(health.maxHp)}</small></div>`:''}${c.showAbilities?`<div class="tms-ability-icons" data-part="abilities">${(c.abilities||[]).slice(0,5).map(a=>`<span title="${esc(`${a.name||'Ability'}${a.text?`: ${a.text}`:''} (cost ${a.cost??0})`)}">${a.icon?`<img src="${esc(a.icon)}" alt="">`:'✦'}<b>${esc(a.name||'Ability')}</b></span>`).join('')}</div>`:''}`:''}
    ${resourceMarkup(c)}
  </div>`;
}
const label=(text,name,value,type='text',extra='')=>`<label>${text}<input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
function panel(actor) {
 const c=config(actor), gm=game.user.isGM,health=memospriteHealth(c);
 const abilityRows=c.abilities.map((a,i)=>`<div class="tms-ability" data-index="${i}"><header><b>Ability ${i+1}</b>${gm?'<button type="button" data-action="remove-ability" title="Remove ability">×</button>':''}</header>${label('Name','abilityName',a.name||'')}${label('Description','abilityText',a.text||'')}${label('Damage formula (optional)','abilityDamage',a.damage||'')}${label('Resource cost','abilityCost',a.cost??1,'number','min="0" max="100"')}${label('Icon','abilityIcon',a.icon||'')}<button type="button" data-action="use-ability" data-index="${i}">Use ${esc(a.name||'ability')}</button></div>`).join('');
 return `<section class="tms-tab tab" data-group="primary" data-tab="tms-memosprite" style="--tms-color:${esc(color(actor))}"><header><h2>Memosprite</h2><button type="button" data-action="summon" ${!c.enabled||!canEdit(actor)?'disabled':''}>${c.summoned?'Unsummon memosprite':'Summon memosprite'}</button></header>
 <div class="tms-layout"><div class="tms-fields"><label class="tms-check"><input type="checkbox" name="enabled" ${c.enabled?'checked':''} ${!gm?'disabled':''}> Has a memosprite?</label>
 <div class="tms-source" data-drop-source><strong>Drag an Actor or Item here</strong><span>${esc(c.sourceUuid||'No source selected')}</span></div>
 ${label('Memosprite name','tmsMemospriteName',c.name)}${label('Source UUID','sourceUuid',c.sourceUuid)}
 ${label('Tab icon URL','tabIcon',c.tabIcon)}<button type="button" data-pick="tabIcon">Choose tab icon</button>
 ${label('Circular memosprite portrait URL','portrait',c.portrait||c.image)}<button type="button" data-pick="portrait">Choose portrait</button><button type="button" data-action="portrait-editor">Open portrait editor</button>
 <h3>HP and resource</h3><div class="tms-triple">${label('Current HP','hp',health.hp,'number',`min="0" ${health.linked?'disabled':''}`)}${label('Maximum HP','maxHp',health.maxHp,'number',`min="1" ${health.linked?'disabled':''}`)}</div>${health.linked?'<p>HP follows the linked memosprite Actor sheet. Change HP on that Actor.</p>':''}
 <label>Resource display<select name="resourceType"><option value="counter" ${c.resourceType==='counter'?'selected':''}>X/Y counter</option><option value="dots" ${c.resourceType==='dots'?'selected':''}>Up to 3 usage dots</option><option value="percent" ${c.resourceType==='percent'?'selected':''}>Fang percentage</option></select></label>
 <div class="tms-triple">${label('Current resource','resource',c.resource,'number','min="0"')}${label('Maximum resource','resourceMax',c.resourceMax,'number','min="1"')}</div><button type="button" data-action="restore">Restore resource</button>
 <h3>Abilities (up to five)</h3><div data-abilities>${abilityRows}</div>${gm&&c.abilities.length<5?'<button type="button" data-action="add-ability">Add ability</button>':''}
 <h3>Combat HUD frame designer</h3><label class="tms-check"><input type="checkbox" name="showOnHud" ${c.showOnHud?'checked':''} ${!gm?'disabled':''}> Show over this character’s HUD</label><label class="tms-check"><input type="checkbox" name="showHudName" ${c.showHudName?'checked':''} ${!gm?'disabled':''}> Show bottom character name on the HUD</label><label class="tms-check"><input type="checkbox" name="hideTalentOnHud" ${c.hideTalentOnHud?'checked':''} ${!gm?'disabled':''}> Hide summoner Talent on combat HUD for Remembrance</label>
 <label class="tms-check"><input type="checkbox" name="showSummonButton" ${c.showSummonButton?'checked':''} ${!gm?'disabled':''}> Show floating Summon Memosprite button for Remembrance</label><button type="button" data-action="show-summon-widget" ${!canEdit(actor)?'disabled':''}>Show floating summon button now</button>
 <h3>Visible HUD elements</h3>${[['showPortrait','Circular portrait'],['showHpArc','Semicircle HP bar'],['showHpNumber','HP value'],['showResource','Value / percentage / dots'],['showAbilities','Ability row']].map(([key,title])=>`<label class="tms-check"><input type="checkbox" name="${key}" ${c[key]?'checked':''} ${!gm?'disabled':''}> ${title}</label>`).join('')}
 <div class="tms-triple">${label('Frame X (px)','frameX',c.frameX,'number')}${label('Frame Y (px)','frameY',c.frameY,'number')}${label('Frame width (px)','frameWidth',c.frameWidth,'number','min="90" max="330"')}</div>
 <h3>Place each memosprite element</h3>${[['portrait','Portrait + HP arc','showPortrait'],['hpText','HP numbers','showHpNumber'],['resource','Resource counter','showResource'],['abilities','Abilities','showAbilities']].map(([key,title,visible])=>`<div class="tms-part-editor"><strong>${title}</strong><button type="button" data-action="toggle-element" data-element="${visible}" ${!gm?'disabled':''}>${c[visible]?'Remove from HUD':'Restore to HUD'}</button><div class="tms-triple">${label('X (px)',key+'X',c[key+'X'],'number','min="-300" max="300"')}${label('Y (px)',key+'Y',c[key+'Y'],'number','min="-300" max="300"')}${label('Scale %',key+'Scale',c[key+'Scale'],'number','min="25" max="300"')}</div></div>`).join('')}
 <p>Drag an element in the preview to place it. Scroll over an element to scale it; drag empty space in the memosprite frame to move everything together. Settings save automatically.</p></div>
 <div class="tms-preview"><h3>Frame preview</h3><p>Uses ${esc(actor.name)}’s current HSR combat HUD layout. Preview shows the summoned sprite so you can design its HP and resources.</p><label class="tms-frame-scale">Whole memosprite HUD scale <input type="range" name="frameScale" min="30" max="250" value="${c.frameScale}"><output data-frame-scale>${c.frameScale}%</output></label><label class="tms-preview-toggle"><input type="checkbox" data-preview-summoned checked> Preview summoned</label><div class="tms-preview-stage"><div class="tms-preview-card">${hudPreview(actor,c)}</div></div><div class="tms-preview-abilities">${abilitySummary(c)}</div></div></div></section>`;
}
function abilitySummary(c){return c.abilities.length?c.abilities.map(a=>`<div><strong>${a.icon?`<img src="${esc(a.icon)}" alt="">`:'✦'} ${esc(a.name||'Ability')}</strong><span>Cost ${clamp(a.cost,0,100)}${a.damage?` · ${esc(a.damage)} damage`:''}</span>${a.text?`<p>${esc(a.text)}</p>`:''}</div>`).join(''):'<p>Add abilities to show their icons, costs, and descriptions here.</p>';}
function openPortraitEditor(actor, initial){
 const content=`<section class="tms-portrait-editor"><p>Drag the image inside the circular crop; scroll over it to zoom. Drop an Actor or Item to use its image.</p><div class="tms-portrait-crop-stage"><div class="tms-portrait-crop-circle"><img src="${esc(initial.portrait||initial.image||'icons/svg/mystery-man.svg')}" alt="Portrait preview"></div><svg viewBox="0 0 70 100" aria-hidden="true"><path d="M36 15 A35 35 0 0 0 36 85"/></svg></div><label>Portrait image URL<input name="portrait" value="${esc(initial.portrait||initial.image||'')}"></label><button type="button" data-pick-portrait>Choose or upload image</button><div class="tms-portrait-crop-controls">${label('Image X (px)','cropX',initial.portraitCropX,'number','min="-150" max="150"')}${label('Image Y (px)','cropY',initial.portraitCropY,'number','min="-150" max="150"')}${label('Image scale %','cropScale',initial.portraitCropScale,'number','min="25" max="400"')}</div></section>`;
 new Dialog({title:`${actor.name} — Memosprite Portrait`,content,buttons:{save:{icon:'<i class="fas fa-check"></i>',label:'Save Portrait',callback:async html=>{const root=html[0]??html;await save(actor,{portrait:root.querySelector('[name=portrait]').value,portraitCropX:Number(root.querySelector('[name=cropX]').value),portraitCropY:Number(root.querySelector('[name=cropY]').value),portraitCropScale:Number(root.querySelector('[name=cropScale]').value)});for(const app of Object.values(actor.apps??{}))app.render(false);}},cancel:{label:'Cancel'}},default:'save',render:html=>{
  const root=html[0]??html,stage=root.querySelector('.tms-portrait-crop-stage'),image=stage.querySelector('img'),src=root.querySelector('[name=portrait]'),x=root.querySelector('[name=cropX]'),y=root.querySelector('[name=cropY]'),scale=root.querySelector('[name=cropScale]');
  const redraw=()=>{image.src=src.value||'icons/svg/mystery-man.svg';image.style.transform=`translate(${clamp(x.value,-150,150)*3}px,${clamp(y.value,-150,150)*3}px) scale(${clamp(scale.value,25,400)/100})`;};
  root.addEventListener('input',redraw);redraw();
  root.querySelector('[data-pick-portrait]').addEventListener('click',()=>new FilePicker({type:'image',current:src.value,callback:path=>{src.value=path;redraw();}}).browse());
  let drag=null;stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,left:Number(x.value),top:Number(y.value)};stage.setPointerCapture(e.pointerId);});
  stage.addEventListener('pointermove',e=>{if(!drag)return;x.value=Math.round(clamp(drag.left+(e.clientX-drag.x)/3,-150,150));y.value=Math.round(clamp(drag.top+(e.clientY-drag.y)/3,-150,150));redraw();});
  stage.addEventListener('pointerup',()=>{drag=null;});
  stage.addEventListener('wheel',e=>{e.preventDefault();scale.value=clamp(Number(scale.value)+(e.deltaY<0?5:-5),25,400);redraw();},{passive:false});
  stage.addEventListener('dragover',e=>e.preventDefault());stage.addEventListener('drop',async e=>{e.preventDefault();try{const data=TextEditor.getDragEventData(e),doc=data.uuid?await fromUuid(data.uuid):null,path=doc?.img||e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain');if(path&&!path.startsWith('{')){src.value=path;redraw();}}catch(error){ui.notifications.warn(error.message);}});
 }}).render(true);
}
function rootOf(app,html) {
 const h=html?.jquery?html[0]:html;
 const a=app.element?.jquery?app.element[0]:app.element?.[0] instanceof HTMLElement?app.element[0]:app.element;
 const candidates=[h,h?.closest?.('.application, .window-app, [data-appid]'),a].filter(e=>e instanceof HTMLElement);
 return candidates.find(e=>e.querySelector('nav.tabs[data-group="primary"],nav.sheet-tabs[data-group="primary"],.tabs-right nav.tabs')&&e.querySelector('.tab-body,.sheet-body,[data-application-part="body"]'))??candidates[1]??a??h;
}
function inject(app,html) {
 const actor=app.actor??app.document, root=rootOf(app,html);
 if(actor?.type!=='character'||!root) return;
 const nav=root.querySelector('nav.tabs[data-group="primary"],nav.sheet-tabs[data-group="primary"],.tabs-right nav.tabs');
 const body=root.querySelector('.tsru-eidolon-tab[data-tab="tsru-eidolons"]')?.parentElement
   ??root.querySelector('.tab-body')
   ??root.querySelector('.sheet-body')
   ??root.querySelector('[data-application-part="body"]');
 if(!nav||!body) return;
 const existingControl=nav.querySelector('[data-tab="tms-memosprite"]');
 const existingTab=root.querySelector('.tms-tab[data-tab="tms-memosprite"]');
 if(existingControl&&existingTab&&existingTab.parentElement===body){addSettingsShortcut(root,existingControl);return;}
 existingControl?.remove();existingTab?.remove();
 const control=document.createElement('a');control.className='item control tms-control';control.dataset.action='tab';control.dataset.group='primary';control.dataset.tab='tms-memosprite';control.title='Memosprite';
 const c=config(actor);control.innerHTML=c.tabIcon?`<img src="${esc(c.tabIcon)}" alt="">`:DEFAULT_TAB_ICON;
 control.setAttribute('aria-label','Memosprite');control.dataset.tooltip='Memosprite';
 const eidolon=nav.querySelector('[data-tab="tsru-eidolons"]');if(eidolon)eidolon.after(control);else nav.append(control);
 nav.classList.add('tms-scrollable-tabs');
 body.insertAdjacentHTML('beforeend',panel(actor));const tab=body.querySelector('.tms-tab');
 if(!game.user.isGM)tab.querySelectorAll('.tms-fields input,.tms-fields select,[data-pick],[data-action="restore"]').forEach(el=>el.disabled=true);
 const resize=new ResizeObserver(()=>fitPreview(tab));resize.observe(tab.querySelector('.tms-preview-stage'));fitPreview(tab);
 control.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();nav.querySelectorAll('[data-tab]').forEach(el=>el.classList.remove('active'));control.classList.add('active');root.querySelectorAll('.tab[data-group="primary"]').forEach(el=>el.classList.remove('active'));tab.classList.add('active');root.classList.remove('tsru-tab-open','tsru-eidolon-tab-open');root.classList.add('tms-tab-open');if(app.tabGroups)app.tabGroups.primary='tms-memosprite';});
 nav.querySelectorAll('[data-tab]:not([data-tab="tms-memosprite"])').forEach(el=>el.addEventListener('click',()=>{tab.classList.remove('active');root.classList.remove('tms-tab-open');}));
 if(app.tabGroups?.primary==='tms-memosprite')control.click();
 addSettingsShortcut(root,control);
 requestAnimationFrame(()=>{if(root.isConnected)nav.scrollTop=nav.scrollHeight;});
 let timer;
 const collect=()=>{const patch={};for(const input of tab.querySelectorAll('[name]')){if(input.closest('.tms-ability'))continue;const key=input.name==='tmsMemospriteName'?'name':input.name;patch[key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;}
 patch.abilities=[...tab.querySelectorAll('.tms-ability')].map(row=>({name:row.querySelector('[name=abilityName]').value,text:row.querySelector('[name=abilityText]').value,damage:row.querySelector('[name=abilityDamage]').value,cost:Number(row.querySelector('[name=abilityCost]').value)||0,icon:row.querySelector('[name=abilityIcon]').value}));return patch;};
 const preview=()=>{const draft={...config(actor),...collect()};draft.frameScale=frameScale(draft);tab.querySelector('[name=frameScale]').value=draft.frameScale;tab.querySelector('[data-frame-scale]').textContent=`${draft.frameScale}%`;const position=boundedFrame(draft);draft.frameX=position.x;draft.frameY=position.y;tab.querySelector('[name=frameX]').value=position.x;tab.querySelector('[name=frameY]').value=position.y;tab.style.setProperty('--tms-color',color(actor));tab.querySelector('.tms-preview-card').innerHTML=hudPreview(actor,draft,{summoned:tab.querySelector('[data-preview-summoned]').checked});tab.querySelector('.tms-preview-abilities').innerHTML=abilitySummary(draft);fitPreview(tab);};
 const persist=()=>{clearTimeout(timer);timer=setTimeout(()=>save(actor,collect()).catch(console.error),400);};
 tab.addEventListener('input',e=>{if(e.target.matches('[data-preview-summoned]')){preview();return;}if(!canEdit(actor))return;preview();persist();});tab.addEventListener('change',e=>{if(e.target.matches('[data-preview-summoned]')){preview();return;}if(!canEdit(actor))return;preview();persist();});
 tab.addEventListener('click',async e=>{
  const pick=e.target.closest('[data-pick]');if(pick){const key=pick.dataset.pick;new FilePicker({type:'image',current:tab.querySelector(`[name="${key}"]`).value,callback:path=>{tab.querySelector(`[name="${key}"]`).value=path;preview();persist();if(key==='tabIcon')control.innerHTML=`<img src="${esc(path)}" alt="">`;}}).browse();return;}
  const action=e.target.closest('[data-action]');if(!action||action.dataset.action==='tab')return;e.preventDefault();
  const current=await save(actor,collect());if(!current)return;
  switch(action.dataset.action){
   case 'portrait-editor':openPortraitEditor(actor,current);return;
   case 'show-summon-widget':await setWidgetLayout(actor.id,{hidden:false});break;
   case 'toggle-element':if(game.user.isGM){const key=action.dataset.element;await save(actor,{[key]:!current[key]});}break;
   case 'summon':if(!current.enabled)return;await save(actor,{summoned:!current.summoned});break;
   case 'restore':if(game.user.isGM)await save(actor,{resource:current.resourceMax,...(memospriteHealth(current).linked?{}:{hp:current.maxHp})});break;
   case 'add-ability':if(game.user.isGM)await save(actor,{abilities:[...current.abilities,{name:'New ability',text:'',cost:1,icon:''}].slice(0,5)});break;
   case 'remove-ability':if(game.user.isGM)await save(actor,{abilities:current.abilities.filter((_,i)=>i!==Number(action.closest('[data-index]').dataset.index))});break;
   case 'use-ability':{if(!current.summoned)return ui.notifications.warn('Summon the memosprite first.');const a=current.abilities[Number(action.dataset.index)],cost=clamp(a?.cost,0,100);if(!a||current.resource<cost)return ui.notifications.warn('Not enough memosprite resource.');
    let roll=null;if(a.damage){try{roll=await new Roll(a.damage).evaluate();}catch(error){return ui.notifications.error(`Invalid memosprite damage formula: ${error.message}`);}}
    await save(actor,{resource:current.resource-cost});
    if(roll)await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`${current.name} — ${a.name} damage: ${a.text||''}`,flags:{dnd5e:{roll:{type:'damage'}},[ID]:{summonerUuid:actor.uuid,memospriteName:current.name}}});
    else await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<h3>${esc(current.name)}: ${esc(a.name)}</h3><p>${esc(a.text)}</p>`});break;}
  } app.render(false);
 });
 tab.addEventListener('dragover',e=>{if(e.target.closest('[data-drop-source]'))e.preventDefault();});
 tab.addEventListener('drop',async e=>{if(!e.target.closest('[data-drop-source]')||!game.user.isGM)return;e.preventDefault();e.stopPropagation();try{const data=TextEditor.getDragEventData(e),uuid=data.uuid||(data.type&&data.id?`${data.type}.${data.id}`:null),doc=uuid?await fromUuid(uuid):null;if(!doc||!['Actor','Item'].includes(doc.documentName))throw Error('Drop an Actor or Item.');await save(actor,{sourceUuid:doc.uuid,name:doc.name,image:doc.img||config(actor).image});app.render(false);}catch(err){ui.notifications.warn(err.message);}});
 let drag=null;tab.addEventListener('pointerdown',e=>{if(!game.user.isGM||!e.target.closest('.tms-summoner-card>.tms-frame')||e.target.closest('button,input'))return;const part=e.target.closest('[data-part]')?.dataset.part??'frame',xKey=part==='frame'?'frameX':part+'X',yKey=part==='frame'?'frameY':part+'Y';drag={x:e.clientX,y:e.clientY,part,xKey,yKey,left:Number(tab.querySelector(`[name="${xKey}"]`).value),top:Number(tab.querySelector(`[name="${yKey}"]`).value),zoom:(Number(tab.querySelector('.tms-preview-card').dataset.zoom)||1)*(part==='frame'?1:frameScale(collect())/100)};tab.setPointerCapture(e.pointerId);});
 tab.addEventListener('pointermove',e=>{if(!drag)return;let x=drag.left+(e.clientX-drag.x)/drag.zoom,y=drag.top+(e.clientY-drag.y)/drag.zoom;if(drag.part==='frame'){const position=boundedFrame({...collect(),frameX:x,frameY:y});x=position.x;y=position.y;}tab.querySelector(`[name="${drag.xKey}"]`).value=Math.round(clamp(x,-300,300));tab.querySelector(`[name="${drag.yKey}"]`).value=Math.round(clamp(y,-300,300));preview();});
 tab.addEventListener('pointerup',()=>{if(drag){drag=null;persist();}});
 tab.addEventListener('wheel',e=>{const part=e.target.closest('.tms-summoner-card [data-part]')?.dataset.part;if(!part||!game.user.isGM)return;e.preventDefault();const input=tab.querySelector(`[name="${part}Scale"]`);input.value=clamp(Number(input.value)+(e.deltaY<0?5:-5),25,300);preview();persist();},{passive:false});
}
function addSettingsShortcut(root,control){
 const settings=root.querySelector('.tsru-sheet-tab[data-tab="tsru-ultimate"]');
 if(!settings||settings.querySelector('[data-tms-open]'))return;
 const button=document.createElement('button');button.type='button';button.dataset.tmsOpen='';button.className='tms-settings-shortcut';
 button.innerHTML=DEFAULT_TAB_ICON+' Open Memosprite configuration';
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();control.click();});
 settings.prepend(button);
}
function isRemembrance(actor){
 const id=parentConfig(actor).pathId;
 if(!id)return false;
 if(String(id).toLowerCase()==='remembrance')return true;
 try{return (game.settings.get(HSR,'paths')??[]).some(path=>path.id===id&&String(path.name).toLowerCase()==='remembrance');}catch{return false;}
}
function mainCharacter(){
 const chosen=game.settings.get(HSR,'selectedMainCharacterId')||(game.settings.get(HSR,'partySelections')??{})[game.user.id]||game.user.character?.id;
 const actor=game.actors.get(chosen);return actor?.isOwner?actor:null;
}
async function toggleSummon(actor){
 if(!actor||!canEdit(actor))return ui.notifications.warn('You cannot summon this character’s memosprite.');
 const c=config(actor);if(!c.enabled||!isRemembrance(actor))return ui.notifications.warn('This character needs a configured memosprite and the Remembrance path.');
 await save(actor,{summoned:!c.summoned});refreshSummonWidgets();
}
const summonWidgets=new Map();
function widgetLayouts(){return game.settings.get(ID,'summonWidgetLayouts')??{};}
async function setWidgetLayout(actorId,change){await game.settings.set(ID,'summonWidgetLayouts',{...widgetLayouts(),[actorId]:{...widgetLayouts()[actorId],...change}});refreshSummonWidgets();}
function refreshSummonWidgets(){
 if(!game.user||!game.modules.get(HSR)?.active)return;
 const actors=game.user.isGM?game.actors.filter(actor=>actor.type==='character'): [mainCharacter()].filter(Boolean);
 const eligible=new Set();
 for(const actor of actors){const c=config(actor),layout=widgetLayouts()[actor.id]??{};if(!c.enabled||!c.showSummonButton||!isRemembrance(actor)||layout.hidden)continue;eligible.add(actor.id);
  let el=summonWidgets.get(actor.id);
  if(!el){el=document.createElement('div');el.className='tsru-skill-widget tms-summon-widget';el.dataset.actorId=actor.id;
   el.innerHTML='<div class="tsru-skill-drag" title="Move summon button"><i class="fas fa-grip-lines"></i></div><button type="button" class="tsru-skill-button tms-summon-button" draggable="true"><img alt=""></button><div class="tsru-skill-label">Summon</div><button type="button" class="tsru-skill-close" title="Hide summon button"><i class="fas fa-xmark"></i></button><div class="tsru-skill-resize" title="Resize"></div>';
   document.body.append(el);summonWidgets.set(actor.id,el);
   const grip=el.querySelector('.tsru-skill-drag'),resize=el.querySelector('.tsru-skill-resize'),button=el.querySelector('.tms-summon-button');
   let move=null,size=null;
   grip.addEventListener('pointerdown',e=>{e.preventDefault();const r=el.getBoundingClientRect();move={dx:e.clientX-r.left,dy:e.clientY-r.top};grip.setPointerCapture(e.pointerId);});
   grip.addEventListener('pointermove',e=>{if(move){el.style.left=`${clamp(e.clientX-move.dx,0,window.innerWidth-40)}px`;el.style.top=`${clamp(e.clientY-move.dy,0,window.innerHeight-40)}px`;}});
   grip.addEventListener('pointerup',()=>{if(!move)return;move=null;const r=el.getBoundingClientRect();setWidgetLayout(actor.id,{x:Math.round(r.left),y:Math.round(r.top)});});
   resize.addEventListener('pointerdown',e=>{e.preventDefault();size={x:e.clientX,start:el.getBoundingClientRect().width};resize.setPointerCapture(e.pointerId);});
   resize.addEventListener('pointermove',e=>{if(size)el.style.setProperty('--tsru-skill-size',`${clamp(size.start+e.clientX-size.x,64,280)}px`);});
   resize.addEventListener('pointerup',e=>{if(!size)return;const width=clamp(size.start+e.clientX-size.x,64,280);size=null;setWidgetLayout(actor.id,{size:Math.round(width)});});
   el.querySelector('.tsru-skill-close').addEventListener('click',()=>setWidgetLayout(actor.id,{hidden:true}));
   button.addEventListener('click',()=>toggleSummon(actor));
   button.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({type:'TMSAction',action:'summon',actorId:actor.id,actorUuid:actor.uuid}));e.dataTransfer.effectAllowed='copy';});
  }
  el.style.left=`${clamp(layout.x??600,0,window.innerWidth-40)}px`;el.style.top=`${clamp(layout.y??330,0,window.innerHeight-40)}px`;el.style.setProperty('--tsru-skill-size',`${clamp(layout.size??96,64,280)}px`);el.style.setProperty('--tsru-skill-color',color(actor));
  const button=el.querySelector('.tms-summon-button');button.querySelector('img').src=c.portrait||c.image||actor.img||'icons/svg/mystery-man.svg';button.title=`${c.summoned?'Unsummon':'Summon'} ${c.name}`;el.querySelector('.tsru-skill-label').textContent=c.summoned?'Unsummon':'Summon';el.classList.toggle('is-summoned',Boolean(c.summoned));
 }
 for(const [id,el] of summonWidgets)if(!eligible.has(id)){el.remove();summonWidgets.delete(id);}
}
Hooks.once('init',()=>game.settings.register(ID,'summonWidgetLayouts',{scope:'client',config:false,type:Object,default:{}}));
Hooks.on('hotbarDrop',(_bar,data,slot)=>{
 if(data?.type!=='TMSAction'||data.action!=='summon')return true;
 (async()=>{const actor=game.actors.get(data.actorId)??await fromUuid(data.actorUuid);if(!actor||!canEdit(actor)||!isRemembrance(actor))throw Error('Select an owned Remembrance character.');let macro=game.macros.find(m=>m.getFlag(ID,'summonActorId')===actor.id&&m.isOwner);if(!macro)macro=await Macro.create({name:`${actor.name} — Summon Memosprite`,type:'script',img:config(actor).portrait||config(actor).image||actor.img||'icons/svg/mystery-man.svg',command:`return game.modules.get("${ID}")?.api?.toggleSummon(game.actors.get("${actor.id}"));`,flags:{[ID]:{summonActorId:actor.id}}});await game.user.assignHotbarMacro(macro,slot);})().catch(error=>ui.notifications.error(`Could not create Summon Memosprite macro: ${error.message}`));
 return false;
});
function syncHud(){
 const host=document.querySelector('.tsru-combat-party-hud');if(!host)return;
  for(const card of host.querySelectorAll('.tsru-combat-party-member[data-actor-id]')){
  const actor=game.actors.get(card.dataset.actorId);if(!actor)continue;const c=config(actor);
  const existing=card.querySelector(':scope > .tms-frame');
  card.classList.toggle('tms-hide-hud-name',Boolean(c.enabled&&c.showOnHud&&!c.showHudName));
  card.classList.toggle('tms-hide-hud-talent',Boolean(c.enabled&&c.showOnHud&&c.hideTalentOnHud&&isRemembrance(actor)));
  if(!(c.enabled&&c.showOnHud)){existing?.remove();continue;}
  const signature=JSON.stringify([c,memospriteHealth(c),color(actor),hudDesign()]);
  if(existing?.dataset.signature!==signature){existing?.remove();card.insertAdjacentHTML('beforeend',frame(actor,c));card.querySelector(':scope > .tms-frame').dataset.signature=signature;}
 }
}
let observer, queued=false;
Hooks.once('ready',()=>{
 if(!game.modules.get(HSR)?.active){ui.notifications.error("Tely's Memosprites requires Tely's Star Rail Ultimates.");return;}
 game.modules.get(ID).api={config,save,summon:actor=>save(actor,{summoned:true}),unsummon:actor=>save(actor,{summoned:false}),toggleSummon};
 Hooks.on('dnd5e.rollDamageV2',onDndDamage);
 if(game.modules.get('midi-qol')?.active){Hooks.on('midi-qol.damageRollComplete',onMidiDamage);Hooks.on('midi-qol.RollComplete',onMidiDamage);}
 observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncHud();});});observer.observe(document.body,{childList:true,subtree:true});syncHud();refreshSummonWidgets();
});
const sheetObservers=new WeakMap();
function watchSheet(app,html){
 const actor=app.actor??app.document;if(actor?.type!=='character')return;
 const root=rootOf(app,html);if(!(root instanceof HTMLElement))return;
 const previous=sheetObservers.get(app);if(previous?.root!==root){previous?.observer.disconnect();
  let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;if(root.isConnected)inject(app,root);},60);});
  observer.observe(root,{childList:true,subtree:true});sheetObservers.set(app,{root,observer});}
 inject(app,root);setTimeout(()=>inject(app,root),100);setTimeout(()=>inject(app,root),350);
}
Hooks.on('renderActorSheet',watchSheet);
Hooks.on('renderApplicationV2',(app,html)=>{if((app.actor??app.document)?.type==='character')watchSheet(app,html);});
Hooks.on('updateActor',(actor,changes)=>{if(foundry.utils.hasProperty(changes,`flags.${ID}.config`)){for(const app of Object.values(actor.apps??{}))app.render(false);syncHud();refreshSummonWidgets();}else if(foundry.utils.hasProperty(changes,'system.attributes.hp')||Object.keys(changes).some(key=>key.startsWith('system.attributes.hp.'))){for(const summoner of game.actors.filter(a=>config(a).sourceUuid===actor.uuid))for(const app of Object.values(summoner.apps??{}))app.render(false);syncHud();}else if(foundry.utils.hasProperty(changes,`flags.${HSR}.ultimate`)){syncHud();refreshSummonWidgets();}});
Hooks.on('updateSetting',setting=>{if([`${HSR}.combatHudDesign`,`${HSR}.paths`].includes(setting?.key))syncHud();if([`${HSR}.selectedMainCharacterId`,`${HSR}.partySelections`,`${HSR}.paths`,`${ID}.summonWidgetLayouts`].includes(setting?.key))refreshSummonWidgets();});
