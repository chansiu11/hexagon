'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const p=await b.newPage({viewport:{width:960,height:600}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await p.evaluate(()=>{window.requestAnimationFrame=()=>0});
  const state=await p.evaluate(async()=>{
   const original=await loadTimeline(1),retry=await loadTimeline(1);
   settings.sound=false;settings.motion=true;selected=1;
   screen='play';transition=null;launch=null;flash=0;uiAge=0;
   game=new HexHexagonerParts.HexagonerGame(original);
   game.setControlMode(1);
   const distinct=original.partOrder.map(x=>x.partId).join(',')!==
    retry.partOrder.map(x=>x.partId).join(',');
   const parts=HexHexagonerParts.deriveParts(original.sourceTimeline);
   const playable=original.waves.every(w=>{
    const src=original.sourceTimeline.waves.find(v=>v.id===w.sourceWaveId);
    return src&&src.r===w.r&&src.speed===w.speed&&src.thickness===w.thickness;
   });
   const views=[];
   for(const time of [5,15,25,45,65]){
    game.time=time;game.sampleWalls();updatePalette(.3);draw();
    views.push({time,walls:game.walls.length,sides:game.sides,
     valid:game.walls.every(w=>Number.isFinite(w.r)&&w.sides===6)});
   }
   game.time=12;game.angle=Math.PI/6;game.sampleWalls=function(){
    this.walls=[{id:'fatal:0',waveId:'fatal',sector:0,sides:6,r:55,thickness:55}];
   };
   game.dead=false;game.update(1/240,0);
   screen='over';uiAge=.1;flash=0;
   draw();const before=game.deathCamera?.rotation,death=game.dead&&!!game.death;
   const first=HexHardFeedback.deathView(game,.1),next=HexHardFeedback.deathView(game,.8),
    zoom=HexHardFeedback.deathView(game,1.05);
   uiAge=1.05;draw();
   const frozen=before===next.rotation&&first.rotation===next.rotation&&
    game.time===game.deathCamera.time;
   return {distinct,parts:parts.length,playable,views,death,frozen,zoom:zoom.scale,
    duration:original.duration,seed:original.seed};
  });
  assert(state.distinct&&state.parts===21&&state.playable,'original 21-part source shuffle');
  assert(state.views.every(v=>v.valid&&v.sides===6),'video-derived wall mesh is finite');
  assert(state.views.filter(v=>v.walls>0).length>=4,'video walls render across all game eras');
  assert(state.death&&state.frozen&&state.zoom>2,'impact is frozen with an independent death zoom');
  assert.deepEqual(errors,[],'no browser JS exceptions');
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  await p.screenshot({path:'wall-browser-screenshots/hexagoner-part-death.png'});
  console.log('PASS Hexagoner video-derived shuffle, 21 intact parts, live canvas and impact freeze');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
