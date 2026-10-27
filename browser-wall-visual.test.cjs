'use strict';
// Browser raster regression: check real painted wall pixels, 60 Hz at 8-20s
// and screenshot the full 0-60s timeline on all six stages.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=process.env.HEXAGON_URL||'http://127.0.0.1:4173/';
const output=path.join(process.cwd(),'wall-browser-screenshots');
const times=[0,5,8,9,10,11,12,15,17,18,19,20,25,30,40,45,50,55,59];
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.HexEngine?.Game&&typeof draw==='function');
  for(let level=0;level<6;level++){
   await page.evaluate(async i=>{
    const r=await fetch('assets/timelines/waves-stage-'+i+'.json?v=8',{cache:'no-store'});
    if(!r.ok)throw Error('timeline '+i+' returned '+r.status);
    selected=i;game=new HexEngine.Game(i,await r.json());
    game.update=()=>{}; // Rendering-only simulation, suppress simulated death.
    settings.motion=true;settings.sound=false;
    screen='play';launch=null;flash=0;transition=null;
    document.body.classList.add('playing');
   },level);
   const frameAudit=await page.evaluate(level=>{
    const ctx=document.querySelector('#game').getContext('2d');
    const scratch=document.createElement('canvas');scratch.width=scratch.height=1;
    const swatch=scratch.getContext('2d');
    const bounds=[130,160,195,230,275,325,375];
    let pixels=0,errors=0,checkedFrames=0,missingFrames=[];
    const inside=(p,poly)=>{
     let hit=false;
     for(let k=0,j=poly.length-1;k<poly.length;j=k++){
      const a=poly[k],b=poly[j];
      if((a[1]>p[1])!==(b[1]>p[1])&&
         p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
     }
     return hit;
    };
    const edgeDist=(p,a,b)=>{
     const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;
     const t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;
     return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
    };
    // Simulate all 720 consecutive 60-Hz frames on map one, and 30 Hz on
    // the remaining maps. This catches a one-frame-only missing-wall paint.
    const step=level===0?1:2;
    for(let f=8*60;f<=20*60;f+=step){
     game.time=f/60;game.sampleWalls();
     game.referenceCamera=[1,0,0,1,0,0]; // geometry-only camera: independent of pulses
     updatePalette(step/60);draw();
     const [, ,accent]=palette();
     swatch.fillStyle=accent;swatch.fillRect(0,0,1,1);
     const rgb=swatch.getImageData(0,0,1,1).data;
     const data=ctx.getImageData(0,0,960,600).data;
     const polys=game.walls.map(w=>w.points||wallVisualPoly(w,game.fromSides,game.sides,game.morph));
     let expected=0,seen=0;
     for(const rad of bounds)for(let a=0;a<48;a++){
      const th=(a+.37)*Math.PI/24,p=[Math.cos(th)*rad,Math.sin(th)*rad],
       x=Math.round(480+p[0]),y=Math.round(300+p[1]);
      if(x<20||x>939||y<75||y>520)continue;
      const active=polys.filter(poly=>inside(p,poly)&&
       poly.every((u,j)=>edgeDist(p,u,poly[(j+1)%poly.length])>5));
      if(!active.length)continue;
      expected++;pixels++;
      const idx=(y*960+x)*4;
      if(Math.abs(data[idx]-rgb[0])<28&&Math.abs(data[idx+1]-rgb[1])<28&&
         Math.abs(data[idx+2]-rgb[2])<28)seen++;
     }
     checkedFrames++;
     if(expected>=8&&seen/expected<.94){
      errors++;
      if(missingFrames.length<15)
       missingFrames.push({t:+(f/60).toFixed(3),expected,seen});
     }
    }
    return {level:level+1,checkedFrames,pixels,errors,missingFrames};
   },level);
   assert.equal(frameAudit.errors,0,
    'wall pixels not painted correctly: '+JSON.stringify(frameAudit));
   console.log('PASS map '+(level+1)+' '+frameAudit.checkedFrames+
    ' rapid frames and '+frameAudit.pixels+' wall pixel checks');
   // Capture full-coverage 0-60s snapshots; empty end segments are valid
   // when the original recorded timeline contains no walls at that instant.
   for(const time of times){
    await page.evaluate(t=>{
     game.time=t;game.sampleWalls();game.referenceCamera=[1,0,0,1,0,0];
     updatePalette(1/60);draw();
    },time);
    await page.screenshot({path:path.join(output,'stage-'+(level+1)+'-'+time+'s.png')});
   }
  }
  assert.deepEqual(errors,[],'browser JavaScript errors');
  console.log('PASS real Chromium canvas wall frames (six stages)');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
