'use strict';
// Verify ORIGINAL voice clips are kept as fallback, and that ALL stages load
// the cleaned audio while the live BGM is automatically ducked under speech.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.getByRole('button',{name:'START GAME',exact:true}).click();
  await page.getByRole('button',{name:'게임 시작',exact:true}).waitFor();
  await page.getByRole('button',{name:'게임 시작',exact:true}).click();
  await page.waitForFunction(()=>music.voiceBuffers.size===7&&
    music.context?.state==='running'&&!!music.musicBus&&music.source,
    {timeout:30000});

  const recordings=await page.evaluate(async()=>{
   const keys=['begin','line','triangle','square','pentagon','hexagon','death'];
   const list=[];
   for(const key of keys){
    const cleaned=music.voiceBuffers.get(key),url=music.voiceSources.get(key);
    const src=await fetch('assets/voice/'+key+'.mp3');
    if(!src.ok)throw Error('Original source missing: '+key);
    const old=await music.context.decodeAudioData(await src.arrayBuffer());
    const edges=data=>{
     const x=data.getChannelData(0),n=Math.max(1,Math.min(Math.round(.08*data.sampleRate),Math.floor(x.length/6)));
     let sum=0;
     for(let i=0;i<n;i++){sum+=x[i]*x[i]+x[x.length-1-i]*x[x.length-1-i]}
     return Math.sqrt(sum/(2*n));
    };
    list.push({key,url,originalLength:old.duration,cleanedLength:cleaned.duration,
     oldEdge:edges(old),newEdge:edges(cleaned),
     peak:Math.max(...Array.from(cleaned.getChannelData(0)).filter((_,i)=>i%64===0).map(Math.abs))});
   }
   return list;
  });
  assert.equal(recordings.length,7);
  for(const item of recordings){
   assert(item.url.includes('/voice/clean/')&&item.url.includes('voice-clean-v2'),
     item.key+': must load improved sound sample, not historical MP3');
   assert(Math.abs(item.originalLength-item.cleanedLength)<.09,
     item.key+': cleaned speech must retain complete spoken duration');
   assert(item.newEdge<item.oldEdge*.99,
     item.key+': low-level background at clip boundaries should be attenuated');
   assert(item.peak>.05,item.key+': intelligible voice must not be muted');
  }

  const stages=await page.evaluate(async()=>{
   const states=[];
   for(let level=0;level<7;level++){
    music.beginRun();
    await music.load(level);
    music.play(level,0);
    const played=music.voice('line');
    const now=music.context.currentTime;
    states.push({level,track:music.trackPath(level),played,
     bus:!!music.musicBus,source:!!music.source,
     duckedUntil:music.duckUntil-now});
    music.stop();
   }
   return states;
  });
  assert.equal(stages.length,7);
  for(const state of stages){
   assert(state.played&&state.bus&&state.source,
     'all stages must share isolated voice bus: '+state.level);
   assert(state.duckedUntil>.7,
     'live BGM must be ducked for complete voice duration: '+state.level);
  }
  assert.deepEqual(stages.map(s=>s.track),
    ['courtesy','otis','focus','courtesy','otis','focus','courtesy']);

  // Measure the actual WebAudio gain automation during and AFTER the cue.
  await page.evaluate(()=>{music.beginRun();music.play(0,0);music.voice('line')});
  await page.waitForTimeout(160);
  const during=await page.evaluate(()=>music.musicBus.gain.value);
  assert(during<=.25&&during>=.07,
    'the musical backing should drop ~17dB while speech plays (actual gain='+during+')');
  await page.waitForTimeout(1200);
  const restored=await page.evaluate(()=>music.musicBus.gain.value);
  assert(restored>.92,'the soundtrack must return to normal volume after dialogue');
  const death=await page.evaluate(()=>{music.stop();return music.voice('death')});
  assert(death,'death voice must play even when the soundtrack has been stopped');
  await page.waitForTimeout(180);
  assert(await page.evaluate(()=>music.measure()>.005),
    'independent death narration should remain audible with the soundtrack stopped');

  assert.deepEqual(errors,[]);
  console.log('PASS cleaned seven voice files, 7-stage bus routing, original-file backup, quiet-edge reduction, ~17dB BGM duck/restore and audible death narration');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
