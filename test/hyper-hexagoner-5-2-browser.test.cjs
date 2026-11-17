'use strict';
/* 5-2 headless Chrome test uses synthetic 60fps footage injected ONLY in this
 * test runner. It is NOT video source parity nor original wall transcription. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
function fixture(id){
 const fps=60,frames=[];
 for(let i=0;i<=68*fps;i++){
  const phase=i%56,wave=Math.floor(i/56),walls=[];
  if(phase<43){
   const r=280-3.55*phase,side=id==='1596'?12:-12;
   walls.push({id:'wave-'+wave,
    points:[[r,side-9],[r+24,side-9],[r+24,side+9],[r,side+9]],holes:[]});
  }
  if(i>=3597&&i<=3612)
   walls.push({id:'boundary-wall',points:[[58,-9],[88,-9],[88,9],[58,9]],holes:[]});
  frames.push({angle:.025*Math.sin(i/100),zoom:1,sides:6,walls});
 }
 return {schemaVersion:1,stageIndex:4,id,fps,frames,videoStart:0,
  videoEnd:68,gameRate:1,gameStartOffset:0,independentlyVerified:true,
  sourceFile:id==='1595'?'1595(4).mp4':'1596(4).mp4'};
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const data={'1595':fixture('1595'),'1596':fixture('1596')};
  fs.mkdirSync('test-artifacts',{recursive:true});
  for(const first of ['1595','1596']){
   const page=await browser.newPage({viewport:{width:960,height:600}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
    records:[0,0,0,0,0,0],settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
   })));
   for(const id of ['1595','1596'])
    await page.route('**/data/hyper-hexagoner-'+id+'.json',
     route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data[id])}));
   await page.goto('http://127.0.0.1:4173/?seed=18&first='+first+'&spectate=1');
   await page.waitForFunction(()=>window.HexMenu?.screen==='title');
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>HexMenu.screen==='select');
   for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
   assert.equal(await page.evaluate(()=>HexMenu.selected),4);
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:20000});
   assert.deepEqual(await page.evaluate(()=>({stage:HexPlay.game.level,
    kind:HexPlay.game.replay.kind,source:HexPlay.game.replay.source})),
    {stage:4,kind:'parts',source:first});
   const run=await page.evaluate(()=>{
    const g=HexPlay.game,session=g.replay;
    g.angle=Math.PI;
    for(let i=0;i<520&&!g.timelineEnded;i++)g.update(.24);
    return {time:g.time,epoch:session.epoch,parts:session.history.length,
      sources:[...new Set(session.history.map(h=>h.source))],
      loops:session.transitions,unsafe:session.unsafeSeams,dead:g.dead,
      wallIds:g.walls.map(w=>w.id),ended:g.timelineEnded};
   });
   assert.ok(run.time>60,'no post60 playback: '+JSON.stringify(run));
   assert.equal(run.epoch,1);
   assert.ok(run.sources.length>=2,'two film segments not used');
   assert.ok(run.loops>4,'no random transitions');
   assert.equal(run.dead,false);
   assert.equal(run.unsafe,0);
   assert.equal(run.ended,false);
   await page.screenshot({path:'test-artifacts/hyper5-2-SYNTHETIC-'+first+'.png'});
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>HexMenu.screen),'paused');
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>HexMenu.screen),'select');
   assert.deepEqual(errors,[]);
   await page.close();
  }
  // Film-specific original chronology is still selectable for diagnosis.
  const page=await browser.newPage({viewport:{width:960,height:600}});
  page.on('pageerror',e=>{throw e});
  await page.addInitScript(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[0,0,0,0,0,0],settings:{sound:false,motion:true,controlMode:1,hyperUnlocked:true}
  })));
  await page.route('**/data/hyper-hexagoner-1595.json',
   route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data['1595'])}));
  await page.goto('http://127.0.0.1:4173/?trace=1595&spectate=1');
  await page.keyboard.press('Space');
  for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>HexMenu.screen==='play',{timeout:20000});
  assert.equal(await page.evaluate(()=>HexPlay.game.replay.id),'1595');
  assert.notEqual(await page.evaluate(()=>HexPlay.game.replay.kind),'parts');
  await page.close();
  console.log('PASS: fifth-stage synthetic Chrome both film parts, 60+, source switches, HUD, pause/menu and chronological diagnostic.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
