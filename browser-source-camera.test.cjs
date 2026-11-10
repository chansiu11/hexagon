'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const p=await b.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await p.evaluate(()=>{window.requestAnimationFrame=()=>0});
  const version=await p.evaluate(()=>Array.from(document.scripts).find(s=>s.src.includes('/play.js'))?.src);
  assert(version.includes('source-timeline-v11'),'new camera must be on the deployed site');
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const stage of [0,2]){
   const result=await p.evaluate(stage=>{
    settings.sound=false;settings.motion=true;selected=stage;
    screen='over';launch=null;transition=null;flash=0;uiAge=0;
    const timeline=stage===0?{duration:120,shapeSchedule:[[0,6]],groups:[{at:0,rate:1,tilt:0}],waves:[]}
      :{...HexHexagonest.create(7,12),duration:300,waves:[],groups:[{at:0,rate:0,tilt:0}],sourceAligned:true};
    game=stage===0?new HexHardMode.HardGame(timeline):new HexHexagonest.HexagonestGame(timeline);
    game.time=5.2;game.rotation=stage===0?1.234:987;game.zoom=stage===0?1.1:0;
    game.die({id:'impact-test',renderPoly:[[0,0],[1,0],[1,1],[0,1]]});
    const frozen={...game.deathCamera};
    const original=drawCore;let measured=null;
    drawCore=function(...args){const m=ctx.getTransform();measured=[m.a,m.b,m.c,m.d,m.e,m.f];return original(...args)};
    function grab(age){uiAge=age;measured=null;draw();return measured?.slice()}
    try{
     const first=grab(.05),next=grab(.8),during=grab(1.05);
     return {frozen,first,next,during,angleAfter:HexHardFeedback.deathView(game,.8).rotation,
       zoomAfter:HexHardFeedback.deathView(game,1.05).scale};
    }finally{drawCore=original}
   },stage);
   assert.deepEqual(result.first,result.next,'no beat pulse/rotation or camera transform drift after impact, level '+stage);
   assert.equal(result.angleAfter,result.frozen.rotation);
   assert(result.zoomAfter>2,'independent death enlargement remains, level '+stage);
   assert(Math.abs(result.during[0])>Math.abs(result.first[0])*2 ||
    Math.abs(result.during[1])>Math.abs(result.first[1])*2,'death zoom must still occur');
   await p.screenshot({path:'wall-browser-screenshots/source-camera-freeze-'+stage+'.png'});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS source-camera impact freeze and independent death enlargement on both stages');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
