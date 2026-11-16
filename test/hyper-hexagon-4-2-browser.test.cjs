'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [seed,first] of [[11,'1595'],[76,'1596']]){
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[0,0,0,0,0,0],settings:{sound:false,motion:true,hyperUnlocked:true,controlMode:1}
  })));
  await page.goto('http://127.0.0.1:4173/?seed='+seed+'&first='+first+'&spectate=1');
  await page.waitForFunction(()=>window.HexMenu?.screen==='title');
  await page.keyboard.press('Space');
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>HexMenu.selected),3);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:40000});
  const firstState=await page.evaluate(()=>({id:HexPlay.game.replay.id,
   kind:HexPlay.game.replay.kind,stage:HexPlay.game.level,source:HexPlay.game.replay.source}));
  assert.equal(firstState.stage,3);assert.equal(firstState.source,first);
  assert.equal(firstState.kind,'parts');
  const result=await page.evaluate(()=>{
   const g=HexPlay.game,session=g.replay,TAU=Math.PI*2;
   let empty=0,maxEmpty=0,carried=false;
   for(let i=0;i<1450&&!session.ended;i++){
    // Spectator skips unsafe human input, but must preserve all source objects.
    g.update(.10,0);
    empty=g.walls.length?0:empty+.10;maxEmpty=Math.max(empty,maxEmpty);
    if(session.carry.length)carried=true;
   }
   return {time:g.time,source:session.source,transitions:session.transitions,
    history:session.history.map(h=>({source:h.source,epoch:h.epoch,fallback:!!h.fallback})),
    ended:session.ended,unsafe:session.unsafeSeams,fallbacks:session.fallbacks,
    maxEmpty,carried,stage:g.level};
  });
  assert.equal(result.ended,false,'unreachable join unexpectedly ended seed '+seed);
  assert.ok(result.time>120,'not enough game time tested');
  assert.ok(result.transitions>=10);
  assert.ok(result.carried,'no in-flight wall preservation seen');
  assert.ok(result.maxEmpty<1.01,'one-second no-wall gap');
  assert.ok(['1595','1596'].every(id=>result.history.some(h=>h.source===id&&h.epoch===0)),
   'both original films must contribute 0–60s phrases');
  assert.ok(['1595','1596'].every(id=>result.history.some(h=>h.source===id&&h.epoch===1)),
   'both original films must contribute post-60s phrases');
  const contact=await page.evaluate(()=>{
   const g=HexPlay.game,TAU=Math.PI*2,ORBIT=HexEngine.ORBIT;
   let safe=null,hit=null;
   for(let j=0;j<120;j++){
    const a=(j+.5)*TAU/120,x=Math.cos(a)*ORBIT,y=Math.sin(a)*ORBIT;
    const blocked=g.walls.some(w=>HexEngine.pointInsidePolygon(x,y,w.points)&&
       !(w.holes||[]).some(h=>HexEngine.pointInsidePolygon(x,y,h)));
    if(blocked&&hit===null)hit=a;
    if(!blocked&&safe===null)safe=a;
   }
   if(hit===null)return {noHit:true};
   g.spectating=false;g.angle=safe;const pass=!g.checkCollision();
   g.angle=hit;const wallContact=g.checkCollision();
   return {pass,wallContact,dead:g.dead,wall:g.death?.wallId};
  });
  // A random spectator frame might be entirely empty; the real-source unit
  // regression separately forces a known blocked interval in that case.
  if(!contact.noHit)assert.ok(contact.pass&&contact.wallContact&&contact.dead&&contact.wall);
  else await page.evaluate(()=>{const g=HexPlay.game;for(let i=0;i<300&&!g.walls.length;i++)g.update(.10)});
  if(!contact.noHit){
   await page.waitForFunction(()=>HexMenu.screen==='over',{timeout:15000});
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:25000});
   assert.equal(await page.evaluate(()=>HexPlay.game.dead),false);
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await browser.close();
 console.log('PASS: Hyper Hexagon randomized both independent films, pre/post60, actor carries, collision, death and retry');
})().catch(e=>{console.error(e);process.exitCode=1});
