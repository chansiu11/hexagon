/* New gameplay-only canvas renderer; menu UI lives in menu-ui.js. */
(function(root){
'use strict';
const {polyForWall,CORE_RADIUS,PLAYER_RADIUS}=root.HexEngine;
function path(ctx,points,fill,stroke,lw=1){
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
}
function regular(n,r){return Array.from({length:n},(_,i)=>[Math.cos(i*Math.PI*2/n)*r,Math.sin(i*Math.PI*2/n)*r])}
function draw(ctx,game,opts){
 const {accent,dark,light,screen,format,best,uiAge,drawText,drawPanel}=opts;
 ctx.save();ctx.translate(480,300);ctx.rotate(game.rotation);ctx.scale(game.zoom,game.zoom);
 for(let i=0;i<game.sides;i++){
  const a=i*Math.PI*2/game.sides,b=(i+1)*Math.PI*2/game.sides;
  path(ctx,[[0,0],[Math.cos(a)*1800,Math.sin(a)*1800],[Math.cos(b)*1800,Math.sin(b)*1800]],i%2?dark:light);
 }
 for(const w of game.walls)path(ctx,polyForWall(w),accent);
 path(ctx,regular(game.sides,CORE_RADIUS),dark,accent,4);
 const x=Math.cos(game.angle)*PLAYER_RADIUS,y=Math.sin(game.angle)*PLAYER_RADIUS;
 const a=game.angle,n=a+Math.PI/2;
 path(ctx,[[x+Math.cos(a)*12,y+Math.sin(a)*12],
  [x-Math.cos(a)*7+Math.cos(n)*7,y-Math.sin(a)*7+Math.sin(n)*7],
  [x-Math.cos(a)*7-Math.cos(n)*7,y-Math.sin(a)*7-Math.sin(n)*7]],accent);
 ctx.restore();
 path(ctx,[[0,0],[276,0],[250,40],[0,40]],'#000');
 drawText('BEST: '+format(best),18,7,26,'#fff','left',230);
 path(ctx,[[622,0],[960,0],[960,65],[782,65],[768,40],[650,40]],'#000');
 drawText('TIME',654,8,27,'#fff','left',112);
 drawText(format(game.time),940,9,44,'#fff','right',150);
 drawText('MODE '+game.controlMode,24,56,16,'#ddd','left');
 if(screen==='play'&&!game.timeline.walls.length)drawText('WALL SEQUENCE PENDING - TASK 1-2',480,568,14,'#ccc');
 if(screen==='play'&&game.controlMode===2)drawPanel(game.doubleStepReady?'READY - 2 STEPS':'2 STEPS - PRESS W / UP',516,450);
 if(screen==='play'&&game.controlMode===3)for(let i=0;i<game.sides;i++)drawText(game.directKeys[i],140+i*130,536,27,'#fff');
 if(screen==='paused'){
  ctx.fillStyle='#0009';ctx.fillRect(0,130,960,260);drawText('PAUSED',480,220,65);drawPanel('PRESS SPACE TO RESUME',435,500);
 }
 if(screen==='over'){
  ctx.fillStyle='#000b';ctx.fillRect(0,414,960,186);
  drawText('GAME OVER',480,426,36);drawText('TIME: '+format(game.time),480,474,24,accent);
  if(uiAge>.5)drawPanel('PRESS SPACE TO RETRY',535,470);
 }
}
root.HexPlayView={draw};
})(window);
