'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const p=await browser.newPage({viewport:{width:960,height:600}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/');await p.getByRole('button',{name:'START GAME',exact:true}).click();await p.getByRole('button',{name:'게임 시작',exact:true}).waitFor();await p.getByRole('button',{name:'게임 시작',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('#game').dataset.musicLoaded==='true');
  await p.evaluate(()=>{window.requestAnimationFrame=()=>0});await p.waitForTimeout(70);
  const durations=await p.evaluate(()=>Object.fromEntries([...music.voiceBuffers].map(([k,b])=>[k,b.duration])));assert.equal(Object.keys(durations).length,7);for(const d of Object.values(durations))assert(d>.6&&d<2.1);
  await p.evaluate(()=>{screen='select';music.stop();music.beginRun();window.__heard=[];const original=music.voice.bind(music);music.voice=key=>{window.__heard.push(key);return original(key)}});
  for(const [time,key]of [[10,'line'],[20,'triangle'],[30,'square'],[45,'pentagon'],[60,'hexagon']]){
   await p.evaluate(t=>{music.stop();music.progress(t)},time);await p.waitForTimeout(180);
   assert(await p.evaluate(()=>music.measure()>.005),key+' must produce real decoded audio samples');
  }
  await p.evaluate(()=>{music.stop();music.effect('die')});await p.waitForTimeout(220);assert(await p.evaluate(()=>music.measure()>.005),'death must remain audible after music.stop');
  assert.deepEqual(await p.evaluate(()=>window.__heard),['line','triangle','square','pentagon','hexagon','death']);
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  const variants=await p.evaluate(()=>{music.stop();settings.sound=false;settings.motion=true;selected=0;screen='play';game=new HexHardMode.HardGame(HexHardMode.create(19,120));launch=null;flash=0;transition=null;return [4,6,8,10,11].map(pattern=>({pattern,time:game.timeline.waves.find(w=>w.pattern===pattern).impact-.25}))});
  for(const v of variants){await p.evaluate(t=>{game.time=t;game.sampleWalls();game.rotation=.5;game.tilt=.14;updatePalette(.1);draw()},v.time);await p.screenshot({path:`wall-browser-screenshots/hard-family-${v.pattern}.png`})}
  await p.evaluate(()=>{screen='over';game.dead=true;game.death={};game.time=20;game.sampleWalls();game.rotationSpeed=-3;flash=0});
  for(const age of [.2,.8,.97,1.03,1.10,1.25]){await p.evaluate(t=>{uiAge=t;draw()},age);await p.screenshot({path:`wall-browser-screenshots/hard-death-reference-${age}.png`})}
  assert.deepEqual(errors,[]);console.log('PASS all 7 decoded voice recordings; audible milestone/death PCM after music stops; 5 distinct wall silhouettes and measured death-camera screenshots');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
