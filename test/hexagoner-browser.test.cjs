'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 fs.mkdirSync('test-artifacts',{recursive:true});
 for(const id of ['1595','1596']){
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[0,0,0,0,0,0],settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
  })));
  await page.goto('http://127.0.0.1:4173/?trace='+id+'&spectate=1');
  await page.waitForFunction(()=>window.HexMenu?.screen==='title');
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>HexMenu.selected),1);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:20000});
  assert.equal(await page.evaluate(()=>HexPlay.game.level),1);
  assert.equal(await page.evaluate(()=>HexPlay.game.replay.id),id);
  assert.equal(await page.evaluate(()=>HexPlay.game.replay.kind||'chronological'),'chronological');
  for(const t of [.5,12,26,44,59.9,60.1,74,96]){
   await page.evaluate(v=>HexPlay.game.seekReplay(v),t);
   await page.waitForTimeout(50);
   const state=await page.evaluate(()=>({
     time:HexPlay.game.time,index:HexPlay.game.replayFrame,
     walls:HexPlay.game.walls.length,dead:HexPlay.game.dead,
     sides:HexPlay.game.sides,zoom:HexPlay.game.zoom,
     camera:HexPlay.game.rotation
   }));
   assert.ok(!state.dead&&state.walls>0,id+' missing traced walls at '+t);
   assert.ok(Math.abs(state.time-t)<.2);
   assert.ok(Number.isFinite(state.zoom)&&Number.isFinite(state.camera));
   if([.5,59.9,60.1,96].includes(t))
    await page.screenshot({path:'test-artifacts/hexagoner-'+id+'-'+t+'.png'});
  }
  await page.evaluate(()=>HexPlay.game.seekReplay(59.9));
  const before=await page.evaluate(()=>HexPlay.game.replayFrame);
  await page.evaluate(()=>HexPlay.game.update(.2));
  const after=await page.evaluate(()=>HexPlay.game.replayFrame);
  assert.ok(after>before,'60s must not reset footage stream');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  assert.equal(await page.evaluate(()=>HexPlay.game),null);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await browser.close();
 console.log('PASS: HEXAGONER stage 2/6; independent source IDs; 0-60, 60+, and continuous boundary');
})().catch(e=>{console.error(e);process.exit(1)});
