'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 fs.mkdirSync('test-artifacts',{recursive:true});
 for(const id of ['1595','1596']){
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('hexagon-web-v2',JSON.stringify({records:[0,0,0,0,0,0],
    settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}}));
  });
  await page.goto('http://127.0.0.1:4173/?trace='+id+'&spectate=1');
  await page.waitForFunction(()=>window.HexMenu?.screen==='title');
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>HexMenu.selected),3);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:25000});
  assert.deepEqual(await page.evaluate(()=>({
   level:HexPlay.game.level,source:HexPlay.game.replay.id,mode:HexPlay.game.replay.kind||'chronological'
  })),{level:3,source:id,mode:'chronological'});
  const times=id==='1595'?[1,16,40,59.9,60.1,75,91]:[1,16,40,59.9,60.1,75,97];
  for(const t of times){
   const result=await page.evaluate(t=>{
    const g=HexPlay.game;
    g.seekReplay(t);
    return {sourceFrame:g.replayFrame,sides:g.sides,wallCount:g.walls.length,
      ended:g.timelineEnded,dead:g.dead,angle:g.rotation,zoom:g.zoom,time:g.time};
   },t);
   assert.ok(result.wallCount>0,id+' no source wall at game '+t);
   assert.ok(!result.ended&&!result.dead);
   assert.ok(Math.abs(result.time-t)<.2);
   assert.ok(Number.isFinite(result.angle)&&Number.isFinite(result.zoom));
   if(t===16||t===60.1){
    await page.waitForTimeout(90);
    await page.screenshot({path:'test-artifacts/hyper-hexagon-'+id+'-'+t+'.png'});
   }
  }
  const continuity=await page.evaluate(()=>{
   const g=HexPlay.game;
   g.seekReplay(59.9);
   const before=g.replayFrame;
   g.update(.2);
   return {before,after:g.replayFrame,time:g.time,dead:g.dead};
  });
  assert.ok(continuity.after>continuity.before,'source restarted at 60 seconds');
  assert.equal(continuity.dead,false);
  const contact=await page.evaluate(()=>{
   const g=HexPlay.game,TAU=Math.PI*2,orbit=HexEngine.ORBIT;
   let position=null;
   for(let i=40;i<g.replay.frames.length-1&&!position;i+=5){
    const walls=g.replay.frames[i].walls;
    let safe=null,hit=null;
    for(let k=0;k<120;k++){
     const a=(k+.5)*TAU/120,x=orbit*Math.cos(a),y=orbit*Math.sin(a);
     const wall=walls.find(w=>HexEngine.pointInsidePolygon(x,y,w.points)&&
       !(w.holes||[]).some(h=>HexEngine.pointInsidePolygon(x,y,h)));
     if(wall&&hit===null)hit=a;
     if(!wall&&safe===null)safe=a;
    }
    if(safe!==null&&hit!==null)position={time:i/g.replay.fps*g.replay.gameRate,safe,hit};
   }
   if(!position)return null;
   g.seekReplay(position.time);g.spectating=false;g.angle=position.safe;
   const safePass=!g.checkCollision();
   g.angle=position.hit;const wallContact=g.checkCollision();
   return {safePass,wallContact,dead:g.dead,deathTime:g.death?.time||0};
  });
  assert.ok(contact?.safePass&&contact?.wallContact&&contact?.dead,
   'real measured wall and opening collision test failed for '+id);
  await page.waitForFunction(()=>HexMenu.screen==='over');
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play');
  assert.equal(await page.evaluate(()=>HexPlay.game.dead),false);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await browser.close();
 console.log('PASS: stage4 both films, first 60 and 60+, uninterrupted 60s, hit/open-lane, death/retry/menu');
})().catch(e=>{console.error(e);process.exitCode=1});
