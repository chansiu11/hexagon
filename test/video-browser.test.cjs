'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 fs.mkdirSync('test-artifacts',{recursive:true});
 for(const trace of ['1595','1596']){
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    localStorage.setItem('hexagon-web-v2',JSON.stringify({
      records:[1,2,3,4,5,6],settings:{sound:false,motion:true,hyperUnlocked:true,controlMode:1}
    }));
  });
  await page.goto('http://127.0.0.1:4173/?trace='+trace+'&spectate=1');
  await page.waitForFunction(()=>HexMenu.screen==='title');
  await page.keyboard.press('Space');await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:15000});
  assert.equal(await page.evaluate(()=>HexPlay.game.replay.id),trace);
  const points=[.3,21,40,59.95,60.05,75,101];
  for(const time of points){
   await page.evaluate(t=>HexPlay.game.seekReplay(t),time);
   await page.waitForTimeout(35);
   const obs=await page.evaluate(()=>({time:HexPlay.game.time,
      frame:HexPlay.game.replayFrame,
      count:HexPlay.game.walls.length,
      shape:HexPlay.game.sides,
      angle:HexPlay.game.rotation}));
   if(time>=1)assert.ok(obs.count>0,trace+' no visible observed walls at '+time);
   assert.ok(Number.isFinite(obs.angle));
   assert.ok(Math.abs(obs.time-time)<.1);
   if(time===59.95||time===60.05){
     const observedShape=trace==='1595'?4:6;
     assert.equal(obs.shape,observedShape,'match the filmed core at the 60s boundary');
   }
   if([.3,59.95,60.05,101].includes(time))
    await page.screenshot({path:'test-artifacts/'+trace+'-at-'+time+'.png'});
  }
  assert.deepEqual(errors,[]);
  await page.keyboard.press('Digit2');
  await page.waitForFunction(()=>HexMenu.screen==='play'&&
    HexPlay.game?.controlMode===2,{timeout:8000});
  assert.equal(await page.evaluate(()=>HexPlay.game.dead),false);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  assert.equal(await page.evaluate(()=>HexPlay.game),null);
  await page.close();
 }
 await browser.close();
 console.log('PASS: both complete independent source-replay banks, 0-60/60+ rendered frames and pause/menu');
})().catch(e=>{console.error(e);process.exit(1)});
