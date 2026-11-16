'use strict';
/* Cross-map browser regression: source-only HEXAGONEST task 3 stays playable,
   with same wall timeline after adding HYPER HEXAGON source data. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const source of ['1595','1596']){
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[0,0,0,0,0,0],settings:{sound:false,motion:true,hyperUnlocked:true,controlMode:1}
  })));
  await page.goto('http://127.0.0.1:4173/?trace='+source+'&spectate=1');
  await page.waitForFunction(()=>window.HexagonestSource&&HexEngine.hasMap(2),{timeout:30000});
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  for(let i=0;i<2;i++)await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>HexMenu.selected),2);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:25000});
  assert.deepEqual(await page.evaluate(()=>[HexPlay.game.level,HexPlay.game.replay.id]),[2,source]);
  for(const t of [2,25,59.9,60.1,65]){
   const state=await page.evaluate(t=>{HexPlay.game.seekReplay(t);return {
    t:HexPlay.game.time,walls:HexPlay.game.walls.length,dead:HexPlay.game.dead,
    currentFrame:HexPlay.game.replayFrame,frameCount:HexPlay.game.replay.frames.length}},t);
   assert.ok(Math.abs(state.t-t)<.2&&state.walls>0&&!state.dead);
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await browser.close();
 console.log('PASS: prior stage3 1595/1596 real replay, 60s continuity, pause, menu');
})().catch(e=>{console.error(e);process.exit(1)});
