'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 fs.mkdirSync('test-artifacts',{recursive:true});
 for(const first of ['1595','1596']){
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
    records:[0,0,0,0,0,0],recordsMode2:[0,0,0,0,0,0],recordsMode3:[0,0,0,0,0,0],
    settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
  })));
  await page.goto('http://127.0.0.1:4173/?seed=20261116&first='+first+'&spectate=1&debug=1');
  await page.waitForFunction(()=>HexMenu.screen==='title');
  await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>HexMenu.selected),1);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:25000});
  const initial=await page.evaluate(()=>({level:HexPlay.game.level,kind:HexPlay.game.replay.kind,
   source:HexPlay.game.replay.source,playerSpeed:HexPlay.game.playerSpeed,
   bank:HexPlay.game.replay.bank.all.length,first:HexPlay.game.replay.activePart}));
  assert.equal(initial.level,1);assert.equal(initial.kind,'parts');
  assert.equal(initial.source,first);assert.equal(initial.bank,37);
  assert.ok(initial.playerSpeed>7.3,'HEXAGONER speed must be independently set');
  assert.equal(initial.first,first+'-00');
  for(const t of [1.2,12.1,32,59.9,60.1,75.1,121.5]){
   await page.evaluate(time=>HexPlay.game.update(Math.max(0,time-HexPlay.game.time)),t);
   await page.waitForTimeout(70);
   const obs=await page.evaluate(()=>({time:HexPlay.game.time,dead:HexPlay.game.dead,
    walls:HexPlay.game.walls.length,shape:HexPlay.game.sides,
    transitions:HexPlay.game.replay.transitions,epoch:HexPlay.game.replay.epoch,
    source:HexPlay.game.replay.source,part:HexPlay.game.replay.activePart,
    maxObservedGap:HexPlay.game.replay.maxObservedGap,
    maxSpawnGap:HexPlay.game.replay.maxSpawnGap,
    newWallArrivals:HexPlay.game.replay.outerArrivalEvents,
    camera:HexPlay.game.rotation,zoom:HexPlay.game.zoom}));
   assert.ok(!obs.dead,'spectator must not die at '+t);
   assert.ok(obs.walls>0,'visible walls missing at '+t);
   assert.equal(obs.shape,6);
   assert.ok(Math.abs(obs.time-t)<.17);
   assert.ok(Number.isFinite(obs.zoom)&&Number.isFinite(obs.camera));
   assert.ok(obs.maxObservedGap<1,'wall field gap exceeded 1s in QA seed');
   assert.ok(obs.maxSpawnGap<1,'observed outer-wall arrivals delayed over 1s in QA seed');
   if(t>=12)assert.ok(obs.newWallArrivals>10);
   assert.equal(obs.epoch,obs.time<60?0:1,'epoch must follow the actual running clock');
   if(t>75)assert.ok(obs.transitions>=10);
   if([1.2,59.9,60.1,121.5].includes(t))
    await page.screenshot({path:'test-artifacts/hexagoner-random-'+first+'-'+t+'.png'});
  }
  const old=await page.evaluate(()=>HexPlay.game.time);
  await page.keyboard.press('Digit2');
  await page.waitForFunction(()=>HexPlay.game.controlMode===2);
  assert.ok(await page.evaluate(()=>HexPlay.game.time)>=old-.1);
  await page.keyboard.press('Digit3');
  await page.waitForFunction(()=>HexPlay.game.controlMode===3);
  assert.equal(await page.evaluate(()=>HexPlay.game.replay.kind),'parts');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
  const pause=await page.evaluate(()=>HexPlay.game.time);
  await page.waitForTimeout(90);
  assert.equal(await page.evaluate(()=>HexPlay.game.time),pause);
  await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>HexMenu.screen),'play');
  await page.evaluate(()=>HexPlay.game.kill({id:'qa-visual-death-marker'}));
  await page.waitForFunction(()=>HexMenu.screen==='over');
  const frozen=await page.evaluate(()=>HexPlay.game.time);
  await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>HexPlay.game.time),frozen);
  await page.screenshot({path:'test-artifacts/hexagoner-random-'+first+'-death.png'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:25000});
  assert.ok(await page.evaluate(()=>HexPlay.game.time)<2,'retry makes a fresh phrase session');
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  assert.equal(await page.evaluate(()=>HexPlay.game),null);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await browser.close();
 console.log('PASS: HEXAGONER 37-part random source playback, both opening sources, 60s continuity, HUD, mode change, death/retry and menu');
})().catch(e=>{console.error(e);process.exit(1)});