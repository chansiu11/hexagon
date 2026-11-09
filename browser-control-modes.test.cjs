'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.HexEngine?.Game&&typeof setControlMode==='function');
  // Old saves must become mode-one records, not disappear during migration.
  await page.evaluate(()=>{
   localStorage.setItem('hexagon-web-v2',JSON.stringify({
    records:[12.34,23,0,0,0,0],settings:{sound:false,motion:false}
   }));
  });
  await page.reload();
  await page.waitForFunction(()=>window.HexEngine?.Game&&typeof setControlMode==='function');
  assert.deepEqual(await page.evaluate(()=>({old:records[0],second:recordsMode2[0],mode:settings.controlMode})),
   {old:12.34,second:0,mode:1});
  // The fourth OPTIONS entry must actually toggle modes with a click.
  await page.evaluate(()=>change('options'));
  const label=await page.locator('#controls button').allTextContents();
  assert(label.some(s=>s.includes('조작 모드 변경')),'options must expose a mode switch');
  await page.locator('#controls button').filter({hasText:'조작 모드 변경'}).click();
  await page.waitForFunction(()=>settings.controlMode===2);
  assert.equal(await page.evaluate(()=>settings.controlMode),2);
  await page.keyboard.press('Digit1');
  assert.equal(await page.evaluate(()=>settings.controlMode),1);
  await page.keyboard.press('Digit2');
  assert.equal(await page.evaluate(()=>settings.controlMode),2);
  // Simulate a live run, then ensure one press = one side, not a hold.
  await page.evaluate(()=>{
   selected=0;game=new HexEngine.Game(0);game.setControlMode(2);
   screen='play';settings.sound=false;game.angle=-Math.PI/2;buildControls();
  });
  const first=await page.evaluate(()=>game.angle);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(110);
  const next=await page.evaluate(()=>game.angle);
  const angularError=(a,b)=>Math.abs(((a-b+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI);
  assert(angularError(next,first+Math.PI/3)<1e-6,'mode 2 must turn exactly one sector');
  await page.waitForTimeout(110);
  assert.equal(await page.evaluate(()=>game.angle),next,'holding arrow must never step repeatedly');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  assert(angularError(await page.evaluate(()=>game.angle),first)<1e-6);
  // A short press arms one next two-sector move, without any teleport.
  await page.keyboard.press('KeyW');
  const armed=await page.evaluate(()=>({angle:game.angle,ready:game.doubleStepReady,teleport:!!game.teleport}));
  assert.equal(armed.ready,true,'W press must arm one double step');
  assert.equal(armed.teleport,false,'mode two must not teleport');
  assert(angularError(armed.angle,first)<1e-6,'arming must not move');
  await page.keyboard.press('ArrowRight');
  const doubled=await page.evaluate(()=>({angle:game.angle,ready:game.doubleStepReady,count:game.stepEffect?.count}));
  assert(angularError(doubled.angle,armed.angle+2*Math.PI/3)<1e-6);
  assert.equal(doubled.count,2);
  assert.equal(doubled.ready,false,'bonus must be consumed after one direction');
  await page.keyboard.press('ArrowRight');
  const normal=await page.evaluate(()=>({angle:game.angle,count:game.stepEffect?.count}));
  assert(angularError(normal.angle,doubled.angle+Math.PI/3)<1e-6,'second press is one sector');
  assert.equal(normal.count,1);
  // Tap the onscreen button, release, THEN turn: still exactly one double step.
  const button=page.locator('#controls button').filter({hasText:'2 STEPS'});
  assert.equal(await button.count(),1);
  await button.click();
  await page.waitForFunction(()=>game.doubleStepReady===true);
  const afterTap=await page.evaluate(()=>game.angle);
  assert(angularError(afterTap,normal.angle)<1e-6,'button tap must not move');
  await page.keyboard.press('ArrowLeft');
  const afterDouble=await page.evaluate(()=>({angle:game.angle,ready:game.doubleStepReady,count:game.stepEffect?.count}));
  assert(angularError(afterDouble.angle,afterTap-2*Math.PI/3)<1e-6);
  assert.equal(afterDouble.ready,false);
  assert.equal(afterDouble.count,2);
  await page.keyboard.press('ArrowLeft');
  assert(angularError(await page.evaluate(()=>game.angle),afterDouble.angle-Math.PI/3)<1e-6);
  await page.evaluate(()=>{if(game.stepEffect){game.stepEffect.age=.05;draw()}});
  // Pressing 1 in the middle of play must reset run and isolate scores.
  await page.evaluate(()=>{game.time=8;recordsMode2[0]=19.5;records[0]=12.34;save()});
  await page.keyboard.press('Digit1');
  const switched=await page.evaluate(()=>({
   mode:settings.controlMode,time:game.time,old:records[0],second:recordsMode2[0]
  }));
  assert.equal(switched.mode,1);
  assert(switched.time<.2,'switch must restart the active run without transferring time');
  assert.equal(switched.old,12.34);
  assert.equal(switched.second,19.5);
  for(const level of [0,2,6]){
   await page.evaluate(level=>{
    selected=level;settings.sound=false;screen='play';settings.controlMode=1;
    game=level===0?new HexHardMode.HardGame(HexHardMode.create(12,5)):
      level===2?new HexHexagonest.HexagonestGame(HexHexagonest.create(12,5)):
      new HexEngine.Game(6,HexRandomWaves.create(12,5));
    game.setControlMode(1);game.sampleWalls();buildControls();
   },level);
   const before=await page.evaluate(()=>({angle:game.angle,teleport:game.teleport}));
   for(const key of ['KeyW','KeyS','ArrowUp','ArrowDown'])await page.keyboard.press(key);
   const after=await page.evaluate(()=>({angle:game.angle,teleport:game.teleport}));
   assert(angularError(before.angle,after.angle)<1e-6,
    'mode 1 must ignore up/down and W/S at level '+level);
   assert.equal(after.teleport,null,'mode 1 cannot trigger warp at level '+level);
  }
  await page.reload();
  await page.waitForFunction(()=>window.HexEngine?.Game&&typeof setControlMode==='function');
  assert.deepEqual(await page.evaluate(()=>({mode:settings.controlMode,old:records[0],second:recordsMode2[0]})),
    {mode:1,old:12.34,second:19.5},'mode and separate records must survive reload');
  // Mode 3 accepts every Latin letter/number as a physical key binding.
  // Freeze only the test clock so every key sees the same live geometry.
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});
  await page.waitForTimeout(60);
  await page.keyboard.press('Digit3');
  assert.equal(await page.evaluate(()=>settings.controlMode),3);
  const pool='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for(let start=0;start<36;start+=6){
   const bindings=pool.slice(start,start+6).split('');
   await page.evaluate(bindings=>{
    selected=6;screen='play';transition=null;launch=null;flash=0;settings.sound=false;settings.motion=true;
    game=new HexEngine.Game(6,HexRandomWaves.create(77));game.setControlMode(3);game.directKeys=bindings;game.sampleWalls();
    buildControls();draw();
   },bindings);
   for(let i=0;i<6;i++){
    await page.keyboard.press(/[A-Z]/.test(bindings[i])?'Key'+bindings[i]:'Digit'+bindings[i]);
    const state=await page.evaluate(()=>({mode:settings.controlMode,angle:game.angle}));
    assert.equal(state.mode,3,'assigned digits must select lanes rather than switch modes');
    assert(angularError(state.angle,(i+.5)*Math.PI/3)<1e-6,'each shown key must select its own slot');
   }
  }
  require('node:fs').mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const sides of [6,5,4]){
   await page.evaluate(sides=>{
    game=new HexEngine.Game(6,HexRandomWaves.create(77));game.setControlMode(3);
    game.sides=sides;game.fromSides=sides;game.morph=1;game.directKeys=['A','Z','1','2','3','0'];
    game.musicRotation=1.1;game.tilt=.25;game.sampleWalls();game.sides=sides;game.fromSides=sides;
    buildControls();draw();
   },sides);
   const targets=await page.evaluate(()=>game.directTargets);
   assert.equal(targets.length,sides);
   assert.equal(await page.locator('#controls button').count(),sides);
   for(let i=0;i<sides;i++){
    await page.mouse.click(targets[i].x,targets[i].y);
    assert(angularError(await page.evaluate(()=>game.angle),(i+.5)*Math.PI*2/sides)<1e-6,'rotated/tilted world labels must have matching touch targets');
   }
   if(sides===4){
    const before=await page.evaluate(()=>game.angle);await page.keyboard.press('Digit3');
    assert.equal(await page.evaluate(()=>settings.controlMode),3);assert.equal(await page.evaluate(()=>game.angle),before,'hidden fifth key cannot target a square');
   }
   await page.screenshot({path:'wall-browser-screenshots/direct-mode-'+sides+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{resize();buildControls();draw()});
  await page.locator('#controls button').filter({hasText:'Z 칸으로 이동'}).click();
  assert(angularError(await page.evaluate(()=>game.angle),1.5*Math.PI/2)<1e-6,'mobile key dock selects its labelled slot');
  await page.screenshot({path:'wall-browser-screenshots/direct-mode-mobile.png'});
  await page.evaluate(()=>{recordsMode3[6]=22.22;save()});
  await page.reload();await page.waitForFunction(()=>window.HexDirectControls);
  assert.deepEqual(await page.evaluate(()=>({mode:settings.controlMode,third:recordsMode3[6],one:records[0],two:recordsMode2[0]})),
   {mode:3,third:22.22,one:12.34,two:19.5},'mode three records persist without touching the previous modes');
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS browser options switch, digit 1/2 controls, one-step key hold, live-run reset, legacy-save migration and separate persistent records');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
