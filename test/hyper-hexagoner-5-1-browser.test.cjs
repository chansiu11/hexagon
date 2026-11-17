'use strict';
/* Stage 5 browser smoke: NETWORK-INTERCEPTED SYNTHETIC FRAMES ONLY.
 * This does not claim the actual HYPER HEXAGONER videos were processed.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');

function fixture(id){
 const fps=60,count=62*fps+1;
 const frames=Array.from({length:count},()=>({angle:0,zoom:1,sides:6,walls:[]}));
 const early={id:'incoming-first',points:[[150,-8],[200,-8],[200,8],[150,8]],holes:[]};
 const crossing={id:'stays-across-sixty',points:[[60,-8],[84,-8],[84,8],[60,8]],holes:[]};
 for(let i=30;i<240;i++)frames[i].walls=[early];
 for(let i=3595;i<3610;i++)frames[i].walls=[crossing];
 return {
  schemaVersion:1,stageIndex:4,id,fps,
  sourceFile:id==='1595'?'1595(4).mp4':'1596(4).mp4',
  videoStart:0,videoEnd:62,
  gameRate:1,gameStartOffset:0,
  independentlyVerified:true, // Test fixture ONLY; not a committed source!
  frames
 };
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 fs.mkdirSync('test-artifacts',{recursive:true});
 try{
  for(const id of ['1595','1596']){
   const page=await browser.newPage({viewport:{width:960,height:600}});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    localStorage.setItem('hexagon-web-v2',JSON.stringify({
     records:[0,0,0,0,0,0],
     settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
    }));
   });
   const mocked=fixture(id);
   await page.route('**/data/hyper-hexagoner-'+id+'.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(mocked)
   }));
   await page.goto('http://127.0.0.1:4173/?trace='+id+'&spectate=1');
   await page.waitForFunction(()=>window.HexMenu?.screen==='title');
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>HexMenu.screen==='select');
   for(let j=0;j<4;j++)await page.keyboard.press('ArrowRight');
   assert.equal(await page.evaluate(()=>HexMenu.selected),4);
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:20000});
   const initial=await page.evaluate(()=>({
    stage:HexPlay.game.level,id:HexPlay.game.replay.id,
    first:HexPlay.game.replay.frames[30].walls[0].id,
    wallCount:HexPlay.game.walls.length,dead:HexPlay.game.dead
   }));
   assert.equal(initial.stage,4);
   assert.equal(initial.id,id);
   assert.equal(initial.dead,false);
   // Source recording should continue across the boundary without popping.
   const boundary=await page.evaluate(()=>{
    const g=HexPlay.game;
    g.seekReplay(59.99);
    const a={frame:g.replayFrame,id:g.walls[0]?.id,count:g.walls.length};
    g.update(.04);
    const b={frame:g.replayFrame,id:g.walls[0]?.id,count:g.walls.length};
    return {a,b,time:g.time,dead:g.dead};
   });
   assert.ok(boundary.a.count>0 && boundary.b.count>0);
   assert.ok(boundary.b.frame>boundary.a.frame);
   assert.equal(boundary.a.id,boundary.b.id);
   assert.equal(boundary.dead,false);
   await page.screenshot({path:'test-artifacts/hyper5-SYNTHETIC-'+id+'.png'});
   // The rendered wall polygon is the same one used by world collision.
   const contact=await page.evaluate(()=>{
    const g=HexPlay.game;
    // Screenshots can take hundreds of milliseconds while requestAnimationFrame
    // keeps playing. Restore the exact measured collision sample BEFORE
    // making both checks synchronously in this single evaluation.
    g.seekReplay(60);
    g.spectating=false;g.angle=Math.PI;
    const safe=!g.checkCollision();
    g.angle=0;const hit=g.checkCollision();
    return {safe,hit,dead:g.dead,wallId:g.death?.wallId};
   });
   assert.ok(contact.safe&&contact.hit&&contact.dead&&contact.wallId);
   await page.waitForFunction(()=>HexMenu.screen==='over',{timeout:20000});
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:20000});
   assert.equal(await page.evaluate(()=>HexPlay.game.dead),false);
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS: synthetic 5th-stage Chrome play, source 1595/1596, crossing 60s, hit/clear, death, restart and menu.');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
