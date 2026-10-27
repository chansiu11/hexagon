'use strict';
// Reproducible time-matched geometry comparison. LEFT is measured source-video
// tracking data; RIGHT is current runtime; THIRD overlays both geometries.
// Source tracks are approximate and sparse: NOT the original video pixels.
const fs=require('node:fs');
const path=require('node:path');
const {Game,wallPoly,wallVisualPoly}=require('./engine');
const dir=path.join(__dirname,'wall-source-comparisons');
fs.mkdirSync(dir,{recursive:true});
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const makePath=polygon=>polygon.map(([x,y],i)=>(i?'L':'M')+
 x.toFixed(2)+','+y.toFixed(2)).join(' ')+' Z';
const snapshots=[0,5,8,10,12,15,17.99,18,19.99,20,20.10,20.28,20.45,20.63,21,25,30,40,50,59];
const result=[];
for(let level=0;level<6;level++){
 const source=require('./assets/timelines/rigid-stage-'+level+'.json');
 const waves=require('./assets/timelines/waves-stage-'+level+'.json');
 const game=new Game(level,waves);
 const times=new Set(snapshots);
 for(const [t] of waves.shapeSchedule.slice(1))
  for(const dt of [-.05,0,.10,.28,.45,.63])if(t+dt>=0&&t+dt<60)
   times.add(+(t+dt).toFixed(3));
 for(const time of [...times].sort((a,b)=>a-b)){
  game.time=time;game.sampleWalls();
  const measured=source.walls.filter(w=>time>=w.start&&time<w.end)
   .map(w=>wallPoly(w.r-w.speed*(time-w.start),w.sector,w.thickness,w.sides));
  const runtime=game.walls.map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
  const layer=(polys,stroke,fill)=>polys.map(p=>
   '<path d="'+makePath(p)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1"/>').join('');
  let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="440" viewBox="0 0 1320 440">';
  svg+='<rect width="1320" height="440" fill="#202025"/>';
  const cards=[['VIDEO-TRACED FRAGMENTS',layer(measured,'#ffd9a6','#ff9f3629')],
   ['CURRENT GAME WALLS',layer(runtime,'#aafafa','#48c9ea27')],
   ['OVERLAY: VIDEO ORANGE / WEB CYAN',layer(measured,'#ff9f36','#ff9f3620')+layer(runtime,'#48c9ea','#48c9ea14')]];
  for(let i=0;i<3;i++){
   let x=i*440;
   svg+='<rect x="'+(x+8)+'" y="40" width="420" height="380" fill="#111118" stroke="#555"/>';
   svg+='<text x="'+(x+220)+'" y="27" fill="white" font-family="sans-serif" font-size="16" text-anchor="middle">'+cards[i][0]+'</text>';
   svg+='<g transform="translate('+(x+220)+',230) scale(0.32)">'+cards[i][1]+'</g>';
   svg+='<circle cx="'+(x+220)+'" cy="230" r="14" stroke="white" stroke-width="1.5" fill="#111"/>';
  }
  svg+='<text x="16" y="434" fill="white" font-size="11" font-family="sans-serif">STAGE '+(level+1)+'  '+time.toFixed(3)+'s • '+escape(source.source)+' • digital source trace, not original video frames • '+measured.length+' observed pieces / '+runtime.length+' rendered pieces</text></svg>';
  fs.writeFileSync(path.join(dir,'stage-'+(level+1)+'-'+time.toFixed(3)+'s.svg'),svg);
  result.push({stage:level+1,time:+time.toFixed(3),sourceFragments:measured.length,renderedWalls:runtime.length,fromSides:game.fromSides,toSides:game.sides,morph:game.morph});
 }
}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(result,null,2)+'\n');
console.log('PASS produced '+result.length+' side-by-side source-trace/runtime geometry comparisons');
