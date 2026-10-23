// Actual Skill spell coordinator and Memosprites HUD in a small Foundry shell.
// Item.use supplies the D&D5e 5.x/6.x summon hooks and synthetic Token Actor.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const core=path.resolve(process.env.ULTIMATES_SOURCE_ROOT||path.join(root,'../ultimates-native-placement'));
const bootstrap=`
const ID='telys-memosprites',HSR='telys-star-rail-ultimates';window.ID=ID;window.HSR=HSR;
const get=(o,p)=>Object.hasOwn(o??{},p)?o[p]:p.split('.').reduce((v,k)=>v?.[k],o);
const collection=rows=>{rows.get=id=>rows.find(row=>row.id===id);return rows};
const hooks=new Map();window.Hooks={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)},once(name,fn){this.on(name,fn)},call(name,...args){let result=true;for(const fn of hooks.get(name)??[])if(fn(...args)===false)result=false;return result},callAll(name,...args){for(const fn of hooks.get(name)??[])fn(...args)}};
window.foundry={utils:{hasProperty:(o,p)=>get(o,p)!==undefined,randomID:()=>crypto.randomUUID()}};
window.notices=[];window.ui={notifications:{info:m=>notices.push(m),warn:m=>notices.push(m),error:m=>notices.push(m)}};
const gm={id:'gm',isGM:true,active:true};
const records=new Map([[HSR,{active:true,api:{}}],[ID,{active:true,api:{}}]]);
window.a={id:'ad',uuid:'Actor.ad',documentName:'Actor',type:'character',name:'AD',img:'/art/ad.svg',isOwner:true,items:collection([]),apps:{},flags:{[ID]:{config:{enabled:true,portrait:'/art/default.svg',image:'/art/default.svg',portraitCropX:22,portraitCropScale:160,showSummonButton:false,showHpArc:false,resourceType:'dots',showResource:true}},[HSR]:{ultimate:{}}},getFlag(scope,key){return this.flags[scope]?.[key]},async setFlag(scope,key,value){(this.flags[scope]??={})[key]=structuredClone(value);Hooks.callAll('updateActor',this,{flags:{[scope]:{[key]:value}}},{});}};
window.scene={id:'map',tokens:collection([])};window.canvas={scene,ready:true};
window.game={user:gm,users:collection([gm]),actors:collection([a]),scenes:collection([scene]),modules:records,settings:{register(){},get(_scope,key){return key==='elements'?[]:undefined}},socket:{on(){},emit(){}}};
window.fromUuidSync=uuid=>game.actors.find(actor=>actor.uuid===uuid);
window.savedConfig=JSON.stringify(a.getFlag(ID,'config'));
const {castSkillSpell}=await import('/core/scripts/ability-spells.mjs');
const {stampSpellSummon}=await import('/core/scripts/ability-summons.mjs');
Hooks.on('dnd5e.summonToken',stampSpellSummon);
window.spawnHP=0;let sequence=0;
const invocation={id:'invocation',uuid:'Actor.ad.Item.invocation',type:'spell',name:'Invocation',actor:a,async use(usage){
 const activity={type:'summon',actor:a,item:this,getUsageToken:()=>({id:'caster'})};
 if(Hooks.call('dnd5e.preUseActivity',activity,usage)===false)return;
 const data={flags:{},texture:{src:'/art/magellenica.svg'}};
 Hooks.callAll('dnd5e.summonToken',activity,{},data,usage.summons);
 const id='summon-'+(++sequence),token={...data,id,uuid:'Scene.map.Token.'+id,parent:scene,_stats:{createdTime:Date.now()},actor:{uuid:'Scene.map.Token.'+id+'.Actor.magellenica',documentName:'Actor',img:'/art/magellenica.svg',system:{attributes:{hp:{value:spawnHP,max:80}}}},getFlag(scope,key){return this.flags[scope]?.[key]}};
 scene.tokens.push(token);window.summon=token;Hooks.callAll('createToken',token);
 // Let the create-token binding write its flag before the post-summon hook.
 await new Promise(resolve=>setTimeout(resolve,0));
 Hooks.callAll('dnd5e.postSummon',activity,{},[token],usage.summons);
 return {summoned:[token]};
}};a.items.push(invocation);
await import('/scripts/memosprites.js');Hooks.callAll('ready');
document.querySelector('#skill').onclick=()=>{window.cast=castSkillSpell(a,{itemId:invocation.id,castId:'skill-'+Date.now()})};
window.setHP=value=>{const hp=summon.actor.system.attributes.hp,previous={...hp};hp.value=value;Hooks.callAll('updateActor',summon.actor,{system:{attributes:{hp:{value}}}},{dnd5e:{hp:previous}})};
window.deleteSummon=()=>{scene.tokens.splice(scene.tokens.indexOf(summon),1);Hooks.callAll('deleteToken',summon)};
window.ready=true;
`;
(async()=>{
 const server=http.createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/memosprites.css"><style>body{margin:0;background:#101927;color:#e3edf8;font:16px Arial;padding:40px}button{padding:10px 18px;margin-bottom:24px;background:#34465c;color:inherit;border:1px solid #869db7;border-radius:5px}.tsru-combat-party-member{position:relative;width:184px;height:150px;background:#263449;border-radius:12px;border-bottom:10px solid #829dc4}.summoner{position:absolute;inset:5px 30px 0 50px;width:100px;height:140px;object-fit:contain}.name{position:absolute;bottom:0;left:10px}</style></head><body><h1>AD · Invocation · Magellenica</h1><button id="skill">AD: Use Skill</button><div class="tsru-combat-party-hud"><article class="tsru-combat-party-member" data-actor-id="ad"><img class="summoner" src="/art/ad.svg"><strong class="name">AD</strong></article></div><script type="module">'+bootstrap+'</script></body></html>');return;
  }
  if(pathname.startsWith('/art/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="'+(pathname.includes('magellenica')?'#387dba':pathname.includes('default')?'#82718e':'#613fa0')+'"/><path d="M50 9 80 38 68 84 30 84 20 38Z" fill="#c1e5ff"/><path d="M30 36 45 48 55 48 70 36 60 61 40 61Z" fill="#294e71"/></svg>');return;}
  const base=pathname.startsWith('/core/')?core:root,relative=pathname.startsWith('/core/')?pathname.slice(5):pathname,file=path.resolve(base,'.'+relative);
  if(!file.startsWith(base+path.sep))throw Error('Invalid path');
  res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/plain');res.end(await fs.readFile(file));
 }catch(error){res.writeHead(404);res.end(error.message)}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:900,height:600}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
   await page.waitForSelector('.tms-frame.is-idle');assert.equal(await page.locator('.tms-hp').count(),0);
   await page.locator('#skill').click();assert.equal(await page.evaluate(()=>cast),true);
   await page.waitForSelector('.tms-frame.is-summoned .tms-hp');
   assert.equal(await page.locator('.tms-portrait img').getAttribute('src'),'/art/magellenica.svg');
   assert.equal(await page.locator('.tms-hp').getAttribute('aria-label'),'0 of 80 HP');
   assert.equal(await page.locator('.tms-dots,.tms-counter,.tms-fang').count(),0,'spells never inherit the saved memosprite resource');
   assert.equal(await page.evaluate(()=>game.modules.get(ID).api.config(a).summoned),true);
   assert.equal(await page.locator('.tms-portrait img').evaluate(node=>getComputedStyle(node).filter.includes('grayscale')),false);
   await page.evaluate(()=>setHP(40));await page.waitForFunction(()=>document.querySelector('.tms-hp')?.getAttribute('aria-label')==='40 of 80 HP');
   assert.match(await page.locator('.tms-hp-value').getAttribute('style'),/50 100/);
   assert.equal(await page.locator('.tms-hp').isVisible(),true,'the saved hidden-arc setting cannot hide live summon HP');
   assert.equal(await page.locator('.tms-hp-value').evaluate(node=>getComputedStyle(node).fill),'none');
   await page.evaluate(()=>{summon.flags[HSR].summonOwner.options={resourceType:'dots',resource:2,resourceMax:3};Hooks.callAll('updateToken',summon)});
   await page.waitForSelector('.tms-dots');assert.equal(await page.locator('.tms-dots i').count(),3);
   assert.equal(await page.locator('.tms-dots i.lit').count(),2);
   const dotsStyle=await page.locator('.tms-dots').evaluate(node=>{const s=getComputedStyle(node);return {border:s.borderTopWidth,background:s.backgroundColor,shadow:s.boxShadow,radius:s.borderTopLeftRadius}});
   assert.deepEqual(dotsStyle,{border:'0px',background:'rgba(0, 0, 0, 0)',shadow:'none',radius:'0px'});
   await page.evaluate(()=>{summon.flags[HSR].summonOwner.options={resourceType:'percent',resource:65,resourceMax:100};Hooks.callAll('updateToken',summon)});
   await page.waitForSelector('.tms-fang');assert.equal(await page.locator('.tms-fang').innerText(),'65%');
   await page.evaluate(()=>{summon.flags[HSR].summonOwner.options={resourceType:'hp',resource:4,resourceMax:10};Hooks.callAll('updateToken',summon)});
   await page.waitForSelector('.tms-counter');assert.equal(await page.locator('.tms-counter').innerText(),'4/10');
   await page.evaluate(()=>{summon.flags[HSR].summonOwner.options={resourceType:'none'};Hooks.callAll('updateToken',summon)});
   await page.waitForFunction(()=>!document.querySelector('.tms-dots,.tms-counter,.tms-fang'));
   // Unrelated chat/menu DOM changes must not schedule a summon-HUD frame.
   await page.evaluate(()=>{
    window.originalRAF=window.requestAnimationFrame;window.summonFrames=0;
    window.requestAnimationFrame=function(callback){summonFrames++;return originalRAF.call(this,callback)};
    const noise=document.createElement('div');noise.id='unrelated';noise.innerHTML='<span>Unrelated update</span>'.repeat(100);document.body.append(noise);
   });
   await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>summonFrames),0);
   await page.evaluate(()=>{window.requestAnimationFrame=originalRAF;document.querySelector('#unrelated').remove();document.querySelector('.tsru-combat-party-hud').innerHTML='<article class="tsru-combat-party-member" data-actor-id="ad"><strong class="name">AD</strong></article>'});
   await page.waitForFunction(()=>document.querySelector('.tms-hp')?.getAttribute('aria-label')==='40 of 80 HP');
   assert.equal(await page.locator('.tms-frame').count(),1,'parent HUD redraw restores exactly one live overlay without polling');
   await page.screenshot({path:path.join(root,'summon-hud-live.png')});
   await page.evaluate(()=>setHP(null));await page.waitForFunction(()=>a.getFlag(ID,'activeSummon').status==='active');
   await page.evaluate(()=>setHP(12));await page.waitForFunction(()=>document.querySelector('.tms-hp')?.getAttribute('aria-label')==='12 of 80 HP');
   await page.evaluate(()=>setHP(0));await page.waitForSelector('.tms-frame.is-idle');assert.equal(await page.locator('.tms-hp').count(),0);
   assert.equal(await page.locator('.tms-portrait img').getAttribute('src'),'/art/default.svg');
   await page.evaluate(()=>setHP(50));assert.equal(await page.evaluate(()=>game.modules.get(ID).api.getSummonView(a).token),null);
   await page.evaluate(()=>{spawnHP=60});await page.locator('#skill').click();assert.equal(await page.evaluate(()=>cast),true);
   await page.waitForFunction(()=>document.querySelector('.tms-hp')?.getAttribute('aria-label')==='60 of 80 HP');
   await page.evaluate(()=>deleteSummon());await page.waitForSelector('.tms-frame.is-idle');
   assert.equal(await page.evaluate(()=>JSON.stringify(a.getFlag(ID,'config'))===savedConfig),true);
   assert.deepEqual(errors,[]);await page.screenshot({path:path.join(root,'summon-hud-idle.png')});
   console.log('PASS: AD Skill casts Invocation; Magellenica keeps its portrait and HP semicircle through initial zero/unprepared HP; live HP, lethal reset, healing isolation, repeat summons, deletion and saved design.');
  }catch(error){await page.screenshot({path:path.join(root,'summon-hud-failure.png')});console.error({errors,state:await page.evaluate(()=>({flags:a.flags,notices}))});throw error;}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
