'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:960,height:600}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/');console.log('Loaded page');
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.screen==='title',null,{timeout:6000});
 console.log('Title ready');assert.equal(await page.getByRole('button',{name:'START GAME'}).count(),1);
 await page.getByRole('button',{name:'START GAME'}).click();
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='select',null,{timeout:6000});console.log('Select ready');
 await page.getByRole('button',{name:'게임 시작'}).click();
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='play',null,{timeout:6000});console.log('Play ready');
 const a=await page.evaluate(()=>game.angle);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
 assert.notEqual(await page.evaluate(()=>game.angle),a,'continuous input');
 await page.evaluate(()=>{
  game.angle=Math.PI/6;
  game.timeline=HexEngine.validateTimeline({walls:[{at:game.time,radius:80,speed:120,thickness:35,sector:0,sides:6}]});
  game.nextWall=0;game.walls=[];
 });
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='over',null,{timeout:6000});console.log('Death reached');
 assert.ok((await page.evaluate(()=>game.deathTime))>0);
 await page.getByRole('button',{name:'다시 시작'}).click();
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='play');
 assert.equal(await page.evaluate(()=>game.dead),false);
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='paused',null,{timeout:6000});
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='select',null,{timeout:6000});console.log('Select ready');
 await page.getByRole('button',{name:'다음'}).click();
 await page.waitForFunction(()=>selected===1,null,{timeout:6000});
 await page.getByRole('button',{name:'게임 시작'}).click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('새 벽 패턴 준비 중'),null,{timeout:6000});
 assert.equal(await page.evaluate(()=>screen),'select','Unimplemented map must not start');
 for(let i=0;i<5;i++){await page.getByRole('button',{name:'다음'}).click();await page.waitForFunction(expected=>selected===expected,(i+2)%6,{timeout:6000});}
 assert.equal(await page.evaluate(()=>selected),0,'Navigation must wrap after sixth map');
 
 // A playable-but-patternless 1-1 shell must not fabricate 60-second records.
 const prior=await page.evaluate(()=>records[0]);
 await page.getByRole('button',{name:'게임 시작'}).click();
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='play',null,{timeout:6000});
 await page.evaluate(()=>{game.time=60.5});
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>records[0]),prior,'Empty placeholder may not record a high score');
 // Existing seven-slot saves migrate by keeping the six original slot values.
 await page.evaluate(()=>localStorage.setItem('hexagon-web-v2',
  JSON.stringify({records:[11,22,33,44,55,66,777],recordsMode2:[1,2,3,4,5,6,7],
   recordsMode3:[8,9,10,11,12,13,14],settings:{sound:false,motion:false,controlMode:1,hyperUnlocked:false}})));
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('#game').dataset.screen==='title',null,{timeout:6000});
 assert.deepEqual(await page.evaluate(()=>records),[11,22,33,44,55,66]);
 assert.deepEqual(await page.evaluate(()=>recordsMode2),[1,2,3,4,5,6]);
 assert.deepEqual(await page.evaluate(()=>recordsMode3),[8,9,10,11,12,13]);
 await page.evaluate(()=>save());
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hexagon-web-v2')).records.length),6);
 
 assert.equal(errors.length,0,errors.join('\n'));
 await browser.close();console.log('PASS: menu, engine controls, collision, death, retry, return, 6-map routing and old-save migration');
})().catch(e=>{console.error(e);process.exit(1)});
