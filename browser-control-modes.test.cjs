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
   screen='play';settings.sound=false;game.angle=-Math.PI/2;
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
  await page.reload();
  await page.waitForFunction(()=>window.HexEngine?.Game&&typeof setControlMode==='function');
  assert.deepEqual(await page.evaluate(()=>({mode:settings.controlMode,old:records[0],second:recordsMode2[0]})),
    {mode:1,old:12.34,second:19.5},'mode and separate records must survive reload');
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS browser options switch, digit 1/2 controls, one-step key hold, live-run reset, legacy-save migration and separate persistent records');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
