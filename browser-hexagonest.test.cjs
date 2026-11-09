'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await b.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});
  await page.waitForFunction(()=>window.HexHexagonest?.HexagonestGame&&typeof start==='function');
  const rendererUrl=await page.evaluate(()=>
   Array.from(document.scripts).find(s=>s.src.includes('/play.js'))?.src||'');
  assert(rendererUrl.includes('sideon-floor-v9'),
    'public Pages must load the updated Hexagonest continuous-contour renderer');
  const sourceVersions=await page.evaluate(()=>
   Array.from(document.scripts).filter(s=>s.src.includes('hexagonest-')).map(s=>s.src));
  assert(sourceVersions.some(u=>u.includes('hexagonest-video.js?v=hexest-parts-v6')),
    'the source-video part inventory must bypass the old cache');
  assert(sourceVersions.some(u=>u.includes('hexagonest-mode.js?v=alternating-background-v9')),
    'the whole-part replay engine must bypass the old cache');
  // The deployed site must load the complete-video dodge-part generator.
  const calibrated=await page.evaluate(()=>({
   velocities:[HexHexagonest.speedAt(20),HexHexagonest.speedAt(80),HexHexagonest.speedAt(180)],
   colors:HexHexagonest.COLOR_EVENTS?.length,
   openingHues:[3,5,7,11].map(t=>HexHexagonest.palette(t)[0]),
   spinEvents:HexHexagonest.create(19,30).spinEvents?.length,
   familyVersion:HexHexagonest.PATTERN_TRANSITION_VERSION,
   partVersion:HexHexagonest.PART_REPLAY_VERSION,
   observedParts:HexagonestVideo.parts.length,
   longestPart:Math.max(...HexagonestVideo.parts.map(p=>p.events.length)),
   coverage:HexagonestVideo.parts.reduce((sum,p)=>sum+p.events.length,0)
  }));
  assert.deepEqual(calibrated,{velocities:[460,515,505],colors:31,
   openingHues:[260,18,194,58],spinEvents:6,
   familyVersion:'video-family-v4',partVersion:'continuous-dodge-v8',
   observedParts:33,longestPart:37,coverage:360},
   'new unbroken-video-dodge-part script must be deployed');
  const init=await page.evaluate(async()=>{
   settings.sound=false;settings.motion=true;selected=2;screen='select';launch=null;
   await start();
   return {screen,level:game.level,flag:game.hexagonestMode,kind:game.timeline.kind,
    duration:game.timeline.duration,waves:game.timeline.waves.length,controls:game.controlMode};
  });
  assert.equal(init.screen,'play');assert.equal(init.level,2);
  assert(init.flag&&init.kind==='hexagonest-video');
  assert(init.duration>=317&&init.waves>300,'317s source should extend the stage past 60s');
  // Source-informed pauses are real: a particular screenshot can be empty.
  // Verify rhythm on a deterministic 320s excerpt; the user session remains
  // randomly seeded as normal.
  const sourceRhythm=await page.evaluate(()=>{
   const d=HexHexagonest.create(137,320);
   return {count:d.waves.length,opening:d.waves.filter(w=>w.impact<60).length,
    middle:d.waves.filter(w=>w.impact>=60&&w.impact<120).length,
    late:d.waves.filter(w=>w.impact>=120).length};
  });
  assert(sourceRhythm.count>320&&sourceRhythm.count<470,'video-informed density');
  const partIntegrity=await page.evaluate(()=>{
   const V=HexagonestVideo,d=HexHexagonest.create(137,320);
   const groups=new Map();
   for(const w of d.waves){
    if(!groups.has(w.group))groups.set(w.group,[]);
    groups.get(w.group).push(w);
   }
   let longParts=0,identical=0;
   for(const [index,waves] of groups){
    const part=V.parts[waves[0].partId],partInfo=d.partOrder[index];
    if(waves.length>=20)longParts++;
    for(let i=0;i<waves.length;i++){
     const w=waves[i],s=V.events[w.sourceEventIndex];
     if(!s||w.sourceEventIndex!==part.firstEventIndex+i||
        w.pattern!==HexHexagonest.rotateMask(s.mask,w.partRotation,false)||
        Math.abs(w.sourceOffset-(s.videoSeconds-part.sourceStart))>1e-9)
       throw Error('original source video wall changed in part '+index+' at '+i);
     identical++;
    }
    if(partInfo.partId!==part.id||partInfo.played!==waves.length)
     throw Error('dodge chain altered at part '+index);
   }
   const later=d.partOrder.filter(p=>p.era===2).slice(0,21);
   return {longParts,sourceWallsVerified:identical,
    eras:[0,1,2].map(e=>V.parts.filter(p=>p.era===e).length),
    firstLateUnique:new Set(later.map(p=>p.partId)).size,
    latePartsInCycle:later.length};
  });
  assert.deepEqual(partIntegrity.eras,[6,6,21]);
  assert(partIntegrity.longParts>=1&&partIntegrity.sourceWallsVerified>320,
   'full uninterrupted dodge chains should render the actual recorded sequences');
  if(partIntegrity.latePartsInCycle===21)
   assert.equal(partIntegrity.firstLateUnique,21,'random shuffle bag cycles unique parts');
  let nonempty=0;
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const t of [4,10,25,59,61,110,121,180,240,305]){
   const state=await page.evaluate(t=>{
    game.time=t;game.sampleWalls();game.rotation=t*2.0;game.referenceCamera=null;
    screen='play';launch=null;transition=null;flash=0;updatePalette(.05);draw();
    return {time:game.time,walls:game.walls.length,sides:game.sides,
      hue:displayedHue,saturation:displayedSat,lightness:displayedLight.slice(),
      finite:game.walls.every(w=>w.renderPoly&&w.renderPoly.every(p=>p.every(Number.isFinite)))};
   },t);
   assert(state.finite&&state.sides===6,'valid six-sided wall mesh at '+t+'s');
   if(state.walls>=1)nonempty++;
   // Sparse source-video intervals can legitimately show an empty arena.
   if(t>=120)assert.equal(state.saturation,0,'late monochrome mode');
   else if(t>=60)assert.equal(state.saturation,0,'grayscale after 60s');
   else assert(state.saturation>0,'colored opening');
   await page.screenshot({path:'wall-browser-screenshots/hexagonest-'+t+'s.png'});
  }
  assert(nonempty>=6,'source-paced walls should appear in most sampled frames');
  // Count the actual Canvas fill() calls, not just a fabricated geometry
  // prediction: every contiguous six-sided run should become one painted
  // contour, including the 5->0 cyclic seam. Collision geometry is read-only.
  const joinedWalls=await page.evaluate(()=>{
   const g=new HexHexagonest.HexagonestGame(HexHexagonest.create(1,318));
   const saved=ctx.fill,results=[];let wrapped=0,merged=0,distinct=0;
   for(const t of [3,5,10,25,45,70,90,110,150,190,240,305]){
    g.time=t;g.sampleWalls();
    const waves=new Map();
    for(const w of g.walls){
     if(!waves.has(w.waveId))waves.set(w.waveId,[]);
     waves.get(w.waveId).push(w);
    }
    let expected=0;
    for(const panels of waves.values()){
     const sectors=new Set(panels.map(w=>w.sector));
     for(let k=0;k<6;k++)
      if(sectors.has(k)&&!sectors.has((k+5)%6))expected++;
     if(sectors.has(0)&&sectors.has(5))wrapped++;
     if(sectors.size>1)merged++;
    }
    const snapshot=JSON.stringify(g.walls.map(w=>[w.r,w.thickness,w.renderPoly]));
    const collision=g.hit(g.angle)?.id||null;
    let painted=0;
    ctx.fill=function(...args){painted++;return saved.apply(this,args)};
    try{drawWallField(g.walls,'#fff',g)}
    finally{ctx.fill=saved}
    if(painted!==expected)throw Error('Hexagonest run fill mismatch at '+t+': '+painted+' vs '+expected);
    if(snapshot!==JSON.stringify(g.walls.map(w=>[w.r,w.thickness,w.renderPoly]))||
       collision!==(g.hit(g.angle)?.id||null))
     throw Error('Hexagonest rendering mutated collision state at '+t);
    if(painted<g.walls.length)distinct++;
    results.push({t,panels:g.walls.length,painted,expected});
   }
   return {results,wrapped,merged,distinct};
  });
  assert(joinedWalls.wrapped>0,'check wall continuity across the 360-degree sector seam');
  assert(joinedWalls.merged>0&&joinedWalls.distinct>=6,
    'adjacent panels should reduce fill calls without losing collision geometry');
  assert(joinedWalls.results.every(r=>r.painted===r.expected));
  const controls=await page.evaluate(()=>{
   const results=[];
   for(const mode of [1,2,3]){
    game=new HexHexagonest.HexagonestGame(HexHexagonest.create(76,120));
    game.setControlMode(mode);results.push({mode:game.controlMode,stage:game.level,sides:game.sides,changed:mode===3?game.selectSector(3):mode===2?game.stepSector(1):true});
   }
   return results;
  });
  assert.deepEqual(controls.map(c=>c.mode),[1,2,3]);
  assert(controls.every(c=>c.stage===2&&c.sides===6&&c.changed));
  const sources=await page.evaluate(()=>{
   const a=HexHexagonest.create(1,100),b=HexHexagonest.create(2,100);
   const c=HexRandomWaves.create(3,100),d=HexHardMode.create(4,100);
   return {different:JSON.stringify(a.waves)!==JSON.stringify(b.waves),
     otherRandom:c.mode,hard:d.mode};
  });
  assert(sources.different&&sources.hard==='hard-rules');
  assert.deepEqual(errors,[],'browser console JavaScript errors');
  console.log('PASS 317s Hexagonest, 33 non-overlapping long video dodge parts, exact source-mask and ordering integrity, shuffled unique-part bag, connected wall contours and 3 modes');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
