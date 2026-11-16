'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:960,height:600}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[10,20,30,40,50,60],recordsMode2:[1,2,3,4,5,6],
   recordsMode3:[4,3,2,1,0,0],
   settings:{sound:false,motion:true,hyperUnlocked:true,controlMode:1}
  }));
 });
 fs.mkdirSync('test-artifacts',{recursive:true});
 await page.goto('http://127.0.0.1:4173/?seed=20261116&spectate=1&debug=1');
 await page.waitForFunction(()=>window.HexMenu?.screen==='title');
 await page.keyboard.press('Space');await page.keyboard.press('Space');
 await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:16000});
 const first=await page.evaluate(()=>({kind:HexPlay.game.replay.kind,
   part:HexPlay.game.replay.activePart,record:HexMenu.records.slice()}));
 assert.equal(first.kind,'parts');assert.equal(first.record.length,6);
 assert.match(first.part,/^(1595|1596)-00$/);
 const checks=[4.6,15,37,59.96,60.04,75,99,135];
 const snapshot=[];
 for(const time of checks){
  await page.evaluate(t=>{
   const game=HexPlay.game;
   game.update(Math.max(0,t-game.time));
  },time);
  await page.waitForTimeout(40);
  const obs=await page.evaluate(()=>({time:HexPlay.game.time,
   walls:HexPlay.game.walls.length,sides:HexPlay.game.sides,
   camera:HexPlay.game.rotation,zoom:HexPlay.game.zoom,
   epoch:HexPlay.game.replay.epoch,
   parts:HexPlay.game.replay.history.length,
   trace:document.querySelector('#game').dataset.sourceTrace,
   part:document.querySelector('#game').dataset.partId,
   dead:HexPlay.game.dead}));
  assert.equal(obs.dead,false);
  assert.ok(obs.walls>0);
  assert.ok([4,5,6].includes(obs.sides));
  assert.ok(Number.isFinite(obs.camera)&&Number.isFinite(obs.zoom));
  assert.ok(Math.abs(obs.time-time)<.15);
  assert.ok(['1595','1596'].includes(obs.trace));
  assert.ok(obs.part.includes(obs.trace));
  if(time>=60.04)assert.equal(obs.epoch,1);
  if([4.6,59.96,60.04,135].includes(time))
   await page.screenshot({path:'test-artifacts/parts-'+time+'.png'});
  snapshot.push(obs);
 }
 assert.ok(snapshot.at(-1).parts>14,'expected many joined source phrases');
 const before=await page.evaluate(()=>HexPlay.game.time);
 await page.keyboard.press('Digit2');
 await page.waitForFunction(()=>HexPlay.game.controlMode===2);
 assert.equal(await page.evaluate(()=>HexPlay.game.replay.kind),'parts');
 assert.ok(await page.evaluate(()=>HexPlay.game.time)>before-.1,'switch mode should not reset elapsed time');
 await page.keyboard.press('Digit3');
 await page.waitForFunction(()=>HexPlay.game.controlMode===3);
 const selected=await page.evaluate(()=>HexPlay.game.time);
 assert.ok(selected>100);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
 const paused=await page.evaluate(()=>HexPlay.game.time);
 await page.waitForTimeout(120);
 assert.equal(await page.evaluate(()=>HexPlay.game.time),paused);
 await page.keyboard.press('Space');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'play');
 await page.evaluate(()=>HexPlay.game.kill({id:'qa-triggered-wall'}));
 await page.waitForFunction(()=>HexMenu.screen==='over');
 assert.equal(await page.evaluate(()=>HexPlay.game.dead),true);
 await page.screenshot({path:'test-artifacts/parts-death.png'});
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>HexMenu.screen==='play');
 assert.ok(await page.evaluate(()=>HexPlay.game.time)<1.5,'retry must reset run only');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
 assert.deepEqual(errors,[]);
 // Regression: the 1596 menu/zoom-in source once produced an invisible
 // collision at 0.13 seconds. Test the actual first 0.45s WITHOUT spectator.
 const fresh=await browser.newPage({viewport:{width:960,height:600}});
 const freshErrors=[];fresh.on('pageerror',e=>freshErrors.push(e.message));
 await fresh.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
  records:[0,0,0,0,0,0],settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
 })));
 await fresh.goto('http://127.0.0.1:4173/?first=1596&seed=20261116');
 await fresh.waitForFunction(()=>HexMenu.screen==='title');
 await fresh.keyboard.press('Space');await fresh.keyboard.press('Space');
 await fresh.waitForFunction(()=>HexMenu.screen==='play',{timeout:16000});
 assert.equal(await fresh.evaluate(()=>HexPlay.game.spectating),false);
 assert.equal(await fresh.evaluate(()=>HexPlay.game.replay.source),'1596');
 await fresh.waitForTimeout(420);
 assert.equal(await fresh.evaluate(()=>HexPlay.game.dead),false);
 await fresh.screenshot({path:'test-artifacts/1596-real-play-opening.png'});
 assert.deepEqual(freshErrors,[]);
 await fresh.close();
 await browser.close();
 console.log('PASS: 53 filmed parts: random selection, long run, time boundary, death/retry, controller, pause/menu');
})().catch(err=>{console.error(err);process.exit(1)});