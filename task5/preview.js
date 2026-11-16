/* Browser-only video-order player for Task 5-1.
   The production menu is deliberately not replaced while tasks 1-4 are on
   incompatible upstream branches. 5-2 will integrate the resolved engine. */
'use strict';
const {Game,polyForWall,CORE_RADIUS}=window.HexEngine;
const sourceData=window.HexHyper5Order;
const cv=document.querySelector('#game'),ctx=cv.getContext('2d');
const one=document.querySelector('#source-a'),two=document.querySelector('#source-b');
const toggle=document.querySelector('#toggle'),restart=document.querySelector('#restart');
const spectator=document.querySelector('#spectate'),seek=document.querySelector('#seek');
const clock=document.querySelector('#clock'),status=document.querySelector('#status');
let sourceIndex=0,game=null,paused=false,last=0,pressed=new Set();
function pick(i){
 sourceIndex=i;
 sourceData.register(i);
 one.setAttribute('aria-pressed',i===0?'true':'false');
 two.setAttribute('aria-pressed',i===1?'true':'false');
 seek.max=sourceData.getSource(i).duration.toFixed(2);
 start(0);
}
function start(time=0){
 game=new Game(4,sourceData.timeline(sourceIndex));
 // Observation mode is intentional: inspect the COMPLETE sequence without
 // a stationary test player dying before the 60s boundary.
 if(spectator.checked)game.checkCollision=()=>false;
 if(time>0){
  game.time=time;
  let i=0;
  while(i<game.timeline.walls.length&&game.timeline.walls[i].at<=time)i++;
  game.nextWall=i;
  game.walls=game.timeline.walls.slice(0,i).map(w=>({...w,
   inner:w.radius-w.speed*(time-w.at)})).filter(w=>w.inner+w.thickness>=CORE_RADIUS-18);
 }
 seek.value=String(time);paused=false;toggle.textContent='일시정지';
 status.textContent=(spectator.checked?'관찰 모드':'실제 충돌 모드')+
 ' · '+game.timeline.walls.length+'구획 · '+game.timeline.provenance;
 last=performance.now();
}
function showText(message,x,y,size=24,color='#fff',align='center',limit=900){
 ctx.save();ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';
 ctx.font='900 '+size+'px Arial Black,Arial,sans-serif';
 ctx.fillText(String(message),x,y,limit);ctx.restore();
}
function panel(message,y){ctx.fillStyle='#000b';ctx.fillRect(250,y,460,52);
 showText(message,480,y+12,19);}
function palette(){
 const t=game.time,s=sourceIndex;
 const bands=s===0?[[224,67],[246,60],[315,70],[229,70]]:
 [[278,65],[332,74],[214,70],[280,55]];
 const [h,sat]=bands[Math.min(3,Math.floor(t/25))];
 return {accent:'hsl('+h+' '+sat+'% 54%)',
 dark:'hsl('+h+' 48% 90%)',light:'#fff'};
}
function draw(){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,960,600);
 const p=palette();
 window.HexPlayView.draw(ctx,game,{...p,screen:game.dead?'over':'play',
  format:n=>(Number(n)||0).toFixed(2),best:0,uiAge:1,drawText:showText,drawPanel:panel});
 if(spectator.checked){ctx.fillStyle='#000b';ctx.fillRect(325,562,310,31);
  showText('SOURCE REPLAY / COLLISION OFF',480,569,15);}
 if(game.dead)showText('WALL COLLISION - PRESS R',480,300,29,'#fff');
 clock.textContent=game.time.toFixed(2)+' / '+sourceData.getSource(sourceIndex).duration.toFixed(2)+'s';
 if(document.activeElement!==seek)seek.value=String(Math.min(game.time,Number(seek.max)));
}
function frame(now){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 if(!paused&&!game.dead){
  const turn=Number(pressed.has('ArrowRight')||pressed.has('KeyD'))-
   Number(pressed.has('ArrowLeft')||pressed.has('KeyA'));
  game.update(dt,turn);
  if(game.time>=sourceData.getSource(sourceIndex).duration){
   paused=true;toggle.textContent='재생';status.textContent='영상 플레이 구간 종료';
  }
 }
 draw();requestAnimationFrame(frame);
}
one.onclick=()=>pick(0);two.onclick=()=>pick(1);
toggle.onclick=()=>{paused=!paused;toggle.textContent=paused?'재생':'일시정지';last=performance.now()};
restart.onclick=()=>start(0);
spectator.onchange=()=>start(Number(seek.value));
seek.oninput=()=>start(Math.min(Number(seek.value),sourceData.getSource(sourceIndex).duration));
addEventListener('keydown',e=>{
 if(['ArrowRight','ArrowLeft','Space','KeyR','Digit1','Digit2'].includes(e.code))e.preventDefault();
 if(e.code==='Space'&&!e.repeat)toggle.click();
 else if(e.code==='KeyR'&&!e.repeat)restart.click();
 else if(e.code==='Digit1'&&!e.repeat)one.click();
 else if(e.code==='Digit2'&&!e.repeat)two.click();
 else pressed.add(e.code);
});
addEventListener('keyup',e=>pressed.delete(e.code));
addEventListener('blur',()=>{pressed.clear();paused=true;toggle.textContent='재생'});
cv.addEventListener('pointerdown',e=>{pressed.add(e.clientX<cv.getBoundingClientRect().left+cv.clientWidth/2?'ArrowLeft':'ArrowRight')});
addEventListener('pointerup',()=>{pressed.delete('ArrowLeft');pressed.delete('ArrowRight')});
pick(new URLSearchParams(location.search).get('source')==='2'?1:0);requestAnimationFrame(frame);
