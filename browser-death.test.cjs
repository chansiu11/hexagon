'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});await page.waitForTimeout(70);
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const level of [0,6])for(const mode of [1,2,3]){
   const impact=await page.evaluate(({level,mode})=>{
    selected=level;settings.sound=false;settings.motion=false;screen='play';transition=null;launch=null;flash=0;
    const timeline=level===6?{kind:'mixed-pattern',mode:'batched-wall-waves',duration:60,sampleRate:60,shapeSchedule:[[0,6]],morphSeconds:.65,tiltEvents:[[0,.1]],waves:[{id:'fatal',sides:6,sectors:[0],r:75,speed:1,start:0,end:60,thickness:30,smallWalls:[]}]}:null;
    game=new HexEngine.Game(level,timeline);game.angle=Math.PI/6;game.setControlMode(mode);
    if(timeline)game.sampleWalls();else game.walls=[{id:'fatal',r:60,sector:0,sides:6,thickness:30}];
    if(mode===3)game.selectSector(0);else game.update(1/240,0);
    frame(performance.now());
    const original=drawDeathImpact;window.__deathPaints=0;
    drawDeathImpact=function(g){window.__deathPaints++;return original(g)};
    uiAge=.1;flash=0;draw();drawDeathImpact=original;
    return {dead:game.dead,id:game.death?.wallId,painted:window.__deathPaints,transition:!!transition,time:game.time};
   },{level,mode});
   assert(impact.dead&&impact.id===(level===6?'fatal:0:main:0':'fatal')&&impact.painted===1&&!impact.transition,'death must show the actual collision rather than a stale transition image');
   await page.screenshot({path:`wall-browser-screenshots/death-${level}-${mode}-impact.png`});
   const result=await page.evaluate(()=>{
    const before=JSON.stringify(game.death),time=game.time;uiAge=1;flash=0;draw();
    const p=game.death.player.reduce((s,p)=>[s[0]+p[0]/3,s[1]+p[1]/3],[0,0]);
    const pixel=Array.from(ctx.getImageData(Math.round(480+p[0]),Math.round(300+p[1]),1,1).data);
    return {before,after:JSON.stringify(game.death),time,now:game.time,pixel,screen};
   });
   assert.equal(result.before,result.after);assert.equal(result.time,result.now);assert.equal(result.screen,'over');
   assert(result.pixel.slice(0,3).every(v=>v>230),'the dead player remains visible above the lowered results panel');
   await page.screenshot({path:`wall-browser-screenshots/death-${level}-${mode}-result.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS true collision frame, visible dead player and frozen review across normal/random stages and all modes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
