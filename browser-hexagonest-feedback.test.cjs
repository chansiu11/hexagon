'use strict';
// End-to-end user-video Hexagonest feedback regression. No original MP4/audio
// is redistributed: the existing user-provided HARD voice samples are reused.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  // Start with a real click so Chrome allows AudioContext playback.
  await page.getByRole('button',{name:'START GAME',exact:true}).click();
  await page.getByRole('button',{name:'게임 시작',exact:true}).waitFor();
  await page.evaluate(()=>{selected=2;buildControls()});
  await page.getByRole('button',{name:'게임 시작',exact:true}).click();
  await page.waitForFunction(()=>game?.hexagonestMode&&music.voiceBuffers.size===7&&
    music.context?.state==='running'&&!!music.source,{timeout:30000});
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0;window.__hexVoices=[];
   const original=music.voice.bind(music);
   music.voice=key=>{window.__hexVoices.push(key);return original(key)};
   music.stop();music.beginRun();
  });
  // The same five milestone/shape-announcer recordings used by HARD must
  // decode and play on Hexagonest. No fictitious polygon morphs are added.
  for(const [t,key] of [[10,'line'],[20,'triangle'],[30,'square'],
                        [45,'pentagon'],[60,'hexagon']]){
   await page.evaluate(at=>{music.stop();music.progress(at)},t);
   await page.waitForTimeout(165);
   assert(await page.evaluate(()=>music.measure()>.005),key+' shape/milestone announcement must be audible');
   assert.equal((await page.evaluate(()=>window.__hexVoices.at(-1))),key);
  }
  const cueCount=await page.evaluate(()=>{music.progress(60);return window.__hexVoices.length});
  assert.equal(cueCount,5,'the same milestone must not produce duplicate voices');
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const [attempt,section] of [[0,24],[1,145]]){
   const hit=await page.evaluate(({section})=>{
    settings.sound=true;settings.motion=true;selected=2;screen='play';
    launch=null;transition=null;flash=0;unlockedNow=false;music.beginRun();
    game=new HexHexagonest.HexagonestGame(HexHexagonest.create(137+section,320));
    game.setControlMode(1);
    const wave=game.timeline.waves.find(w=>w.impact>=section&&w.impact<section+8);
    if(!wave)throw Error('Cannot find recorded collision wave at '+section);
    game.time=wave.impact;game.sampleWalls();
    let collision=null;
    for(const sector of wave.sectors){
     game.angle=game.sectorAngle(sector,6);
     collision=game.hit();if(collision)break;
    }
    if(!collision)throw Error('No real collision geometry at '+wave.impact);
    game.die(collision);
    music.play(2,game.time);
    last=performance.now()-20;
    frame(performance.now());
    return {dead:game.dead,hasContact:!!game.death?.contact,screen,
      level:game.level,voice:window.__hexVoices.at(-1),time:game.time,
      phase:game.time>=120?'monochrome':'color'};
   },{section});
   assert(hit.dead&&hit.hasContact&&hit.level===2,'actual Hexagonest wall collision must be frozen');
   assert(['over','complete'].includes(hit.screen));
   assert.equal(hit.voice,'death','actual game-over path must announce death');
   await page.waitForTimeout(170);
   assert(await page.evaluate(()=>music.measure()>.005),
     'death PCM must remain audible after soundtrack is stopped');
   for(const age of [.16,.80,.98,1.05,1.13,1.26]){
    const state=await page.evaluate(age=>{
     uiAge=age;flash=0;const before=JSON.stringify(game.death),time=game.time;
     const origin=drawHardResult;let resultCalls=0;
     drawHardResult=function(...args){resultCalls++;return origin(...args)};
     try{draw()}finally{drawHardResult=origin}
     return {resultCalls,deathUnchanged:before===JSON.stringify(game.death),
       timeUnchanged:time===game.time,zoom:HexHardFeedback.deathView(game,age).scale};
    },age);
    assert(state.deathUnchanged&&state.timeUnchanged,'freeze the exact collision frame');
    assert.equal(state.resultCalls,age>=1.2?1:0,
      'use HARD-like result screen only after the death camera completes');
    if(age>1.02&&age<1.2)assert(state.zoom>2.8,'rapid zoom must happen after impact');
    if(age>1.2)assert(state.zoom>4,'result camera expands to original-style transition');
    await page.screenshot({path:'wall-browser-screenshots/hexagonest-death-'+attempt+'-'+age+'.png'});
   }
  }
  assert.deepEqual(await page.evaluate(()=>window.__hexVoices),
   ['line','triangle','square','pentagon','hexagon','death','death'],
   'five original announcements and one death voice per collision');
  assert.deepEqual(errors,[],'no JavaScript errors during voice/death replay');
  console.log('PASS Hexagonest original voice recordings, audible death after soundtrack stops, true wall collision, HARD death zoom/flash and six timestamped result screenshots');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
