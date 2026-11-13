'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync(__dirname+'/play.js','utf8');
const slice=(a,b)=>{
 const i=src.indexOf(a),j=src.indexOf(b,i);
 assert(i>=0&&j>i,'missing function boundary '+a);
 return src.slice(i,j);
};
const body=[
 slice('function hyper910Time(n)','function format(n)'),
 slice('function hyper910HudGeometry(seconds)','function drawHyperHUD()'),
 slice('function drawHyperHUD()','function drawHexagonerHUD()'),
 slice('function drawHyper910ResultOverlay()','function drawMusicLoading(')
].join('\n');
const writes=[],ctx={
 globalAlpha:1,fillStyle:null,
 save(){},restore(){},translate(x,y){writes.push(['translate',x,y])},
 rotate(a){},fillRect(x,y,w,h){writes.push(['fillRect',x,y,w,h])}
};
let game={hyperHexagonerSource910:true,hyperHexagonSource78:false,
 level:4,time:60.59,sides:6,angle:0,
 death:{sides:6,angle:0},deathCamera:{affine:[1,0,0,1,0,0]}};
const selected=4,uiAge=.6,HexHyper910={DEATH_TIMING:{resultStart:.267}},
 HexHardDigits={draw:(ctx,number,x,y,height)=>writes.push(['digits',number,x,y,height])};
const polygon=(points,fill,stroke)=>writes.push(['poly',points,fill,stroke]);
const text=(value,x,y,size,color,align,max)=>writes.push(['text',value,x,y,size,color,align,max]);
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const bestTime=()=>79.24,format=n=>String(n),hex=()=>{};
const header=()=>writes.push(['generic-header']);
const drawBackdrop=()=>writes.push(['draw-bg']);
const run=new Function('ctx','game','selected','uiAge','HexHyper910','HexHardDigits',
 'polygon','text','ease','bestTime','format','hex','header','drawBackdrop',
 body+';return {drawHyperHUD,drawHardResult,hyper910Time,hyper910HudGeometry};');
let f=run(ctx,game,selected,uiAge,HexHyper910,HexHardDigits,polygon,text,ease,
 bestTime,format,hex,header,drawBackdrop);
for(const [secs,expected,left] of [[.1,'0:10',544],[9.99,'9:99',544],
 [10,'10:00',500.5],[60.59,'60:59',500.5],[88.04,'88:04',500.5],
 [100.01,'100:01',457]]){
 assert.equal(f.hyper910Time(secs),expected);
 assert.equal(f.hyper910HudGeometry(secs).x,left);
}
f.drawHyperHUD();
assert(writes.some(x=>x[0]==='digits'&&x[1]===':59'),'centisecond HUD');
assert(writes.some(x=>x[0]==='poly'&&x[1][0][0]===500.5),'widening right tab');
assert(writes.some(x=>x[0]==='text'&&x[1].startsWith('BEST:')),'stored record label');
writes.length=0;game.time=79.25;f.drawHyperHUD();
assert(writes.some(x=>x[0]==='text'&&x[1]==='NEW RECORD'));
writes.length=0;game.time=88.04;f.drawHardResult('#af3ca0','#ed75ac','#fff');
assert(writes.some(x=>x[0]==='poly'&&x[1][0][0]===0&&x[1][0][1]===193),
 'source level panel');
assert(writes.some(x=>x[0]==='poly'&&x[1][0][0]===515&&x[1][0][1]===193),
 'source LAST panel');
assert(writes.some(x=>x[0]==='poly'&&x[1][0][0]===243&&x[1][0][1]===555),
 'source retry panel');
assert(writes.some(x=>x[0]==='text'&&x[1]==='STAGE COMPLETE'));
assert(writes.some(x=>x[0]==='digits'&&x[1]===':04'));
assert(!writes.some(x=>x[0]==='generic-header'),'no generic result panel on source mode');
writes.length=0;
game={...game,hyperHexagonSource78:true,hyperHexagonerSource910:false,level:3,time:40};
f=run(ctx,game,3,uiAge,HexHyper910,HexHardDigits,polygon,text,ease,
 bestTime,format,hex,header,drawBackdrop);
f.drawHardResult('#222','#555','#ddd');
assert(writes.some(x=>x[0]==='generic-header'),'HYPER 7/8 retains own result path');
assert(!writes.some(x=>x[0]==='poly'&&x[1][0][1]===193),
 'source-only panel must not appear on 7/8');
console.log('PASS HYPER 9/10: centisecond HUD, dynamic tabs, new record, filmed result layout, 7/8 isolation');
