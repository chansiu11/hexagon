'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:960,height:600}});
 const failures=[];page.on('pageerror',e=>failures.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[10,20,30,40,50,60,999],recordsMode2:[11,21,31,41,51,61,999],
   recordsMode3:[12,22,32,42,52,62,999],
   settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
  }));
 });
 await page.goto('http://127.0.0.1:4173/?level=7&trace=1595&spectate=1');
 await page.waitForFunction(()=>window.HexMenu?.screen==='title');
 fs.mkdirSync('test-artifacts',{recursive:true});
 await page.screenshot({path:'test-artifacts/title.png'});
 assert.deepEqual(await page.evaluate(()=>HexMenu.records),[10,20,30,40,50,60]);
 assert.equal(await page.evaluate(()=>HexEngine.LEVELS.length),6);
 assert.equal(await page.evaluate(()=>HexEngine.hasMap(6)),false);
 await page.keyboard.press('Space');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
 for(let i=1;i<=6;i++)await page.keyboard.press('ArrowRight');
 assert.equal(await page.evaluate(()=>HexMenu.selected),0,'six maps wrap to zero');
 // Stage 3 HEXAGONEST now has a verified replay; verify an *actually*
 // unavailable stage (index 4), while preserving six-map navigation.
 for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
 assert.equal(await page.evaluate(()=>HexMenu.selected),4);
 await page.keyboard.press('Space');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'select','missing map cannot play wrong map');
 assert.match(await page.locator('#status').textContent(),/PATTERN NOT READY/);
 for(let i=0;i<4;i++)await page.keyboard.press('ArrowLeft');
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>HexMenu.screen==='play');
 assert.equal(await page.evaluate(()=>HexPlay.game.level),0);
 assert.equal(await page.evaluate(()=>HexPlay.game.dead),false);
 await page.screenshot({path:'test-artifacts/play-no-pattern.png'});
 await page.waitForTimeout(120);
 assert.ok(await page.evaluate(()=>HexPlay.game.time>0));
 // Swap only this running test instance to synthetic actor geometry.
 // The registered video stage and both real source recordings remain intact.
 await page.evaluate(()=>{
  const g=HexPlay.game;
  g.map={sourceStatus:'test-only',shapes:[{at:0,sides:6}],
   walls:[{id:'browser-qa',spawnAt:0,radius:150,speed:120,thickness:32,sides:6,blocked:[0]}]};
  g.replay=null;g.replayFrame=-1;g.timelineEnded=false;g.dead=false;g.spectating=false;
  g._wallCursor=0;g._actors=[];g.time=0;g.angle=Math.PI/6;
  g.sampleWalls();
 });
 await page.waitForFunction(()=>HexMenu.screen==='over',{timeout:3500});
 assert.equal(await page.evaluate(()=>HexPlay.game.dead),true);
 const frozen=await page.evaluate(()=>HexPlay.game.time);
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>HexPlay.game.time),frozen);
 await page.screenshot({path:'test-artifacts/death.png'});
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>HexMenu.screen==='play');
 assert.equal(await page.evaluate(()=>HexPlay.game.dead),false);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
 const paused=await page.evaluate(()=>HexPlay.game.time);
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>HexPlay.game.time),paused);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
 assert.equal(await page.evaluate(()=>HexPlay.game),null);
 // A saved seven-element legacy record must remain valid and trim on save.
 await page.keyboard.press('Digit2');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hexagon-web-v2')));
 assert.equal(saved.records.length,6);
 assert.deepEqual(saved.records,[10,20,30,40,50,60]);
 assert.deepEqual(saved.recordsMode2,[11,21,31,41,51,61]);
 assert.equal(saved.settings.controlMode,2);
 assert.deepEqual(failures,[],'No browser page errors');
 console.log('PASS: six-stage menu, stored records, unavailable maps, engine start, movement clock, collision, death, retry, pause, menu return');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
