/* Menus, progression and records are isolated from the play engine. */
(function(root){
'use strict';
const levels=HexEngine.LEVELS, canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const controls=document.querySelector('#controls'),status=document.querySelector('#status');
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const key='hexagon-web-v2';
let screen='title',selected=0,menuItem=0,optionIndex=0,last=0,clock=0,spin=0,uiAge=1;
let scale=1,ox=0,oy=0,hovered=null,pressed=null,pressAge=1,hoverAmount=0,slide=0,slideDirection=1;
let notice='',noticeAge=0,displayedHue=32,displayedSat=0,displayedLight=[14,19,93];
let records=Array(6).fill(0),recordsMode2=Array(6).fill(0),recordsMode3=Array(6).fill(0);
let settings={sound:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,controlMode:1,hyperUnlocked:false};
try{
 const data=JSON.parse(localStorage.getItem(key)||'{}');
 function restore(array){return array.map((_,i)=>Number.isFinite(data?.[array===records?'records':array===recordsMode2?'recordsMode2':'recordsMode3']?.[i])?
  Math.max(0,data[array===records?'records':array===recordsMode2?'recordsMode2':'recordsMode3'][i]):0)}
 // Discard only obsolete seventh-slot data; preserve indices 0..5 unchanged.
 records=restore(records);recordsMode2=restore(recordsMode2);recordsMode3=restore(recordsMode3);
 if(data.settings)settings={...settings,sound:data.settings.sound!==false,
  motion:data.settings.motion!==false,controlMode:[1,2,3].includes(data.settings.controlMode)?data.settings.controlMode:1,
  hyperUnlocked:data.settings.hyperUnlocked===true};
}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify({records,recordsMode2,recordsMode3,settings}))}catch{status.textContent='기록을 저장하지 못했습니다.'}}
function modeRecords(){return settings.controlMode===3?recordsMode3:settings.controlMode===2?recordsMode2:records}
function bestTime(i){return modeRecords()[i]||0}
function unlocked(i){return i<3||(i<6&&(settings.hyperUnlocked||Math.max(records[i-3],recordsMode2[i-3],recordsMode3[i-3])>=60))}
function setStatus(message){status.textContent=message}
function toast(message){notice=message;noticeAge=3.5;setStatus(message)}
function format(n){return Number(n||0).toFixed(2).padStart(5,'0')}
function text(t,x,y,size=24,color='#fff',align='center',max=900){
 const intro=settings.motion&&screen!=='play'?ease(uiAge/.3):1;
 ctx.save();ctx.globalAlpha*=intro;VectorFont.draw(ctx,String(t),x,y+(1-intro)*10,size,color,align,max);ctx.restore();
}
function polygon(points,fill,stroke,line=3){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
}
function hex(r,fill,stroke){polygon(Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*r,Math.sin(i*Math.PI/3)*r]),fill,stroke)}
function panel(label,y=435,width=380){
 const over=hovered&&hovered.y<=y+28&&hovered.y+hovered.h>=y+28&&hovered.x<480&&hovered.x+hovered.w>480;
 const down=pressed&&pressed.y<=y+28&&pressed.y+pressed.h>=y+28&&pressAge<.25;
 const squash=down?Math.sin(Math.min(1,pressAge/.25)*Math.PI)*.045:0;
 ctx.save();ctx.translate(480,y+27);ctx.scale(1+(over?hoverAmount*.018:0)-squash,1-squash);
 ctx.translate(-480,-y-27);
 polygon([[480-width/2-20,y],[480+width/2+20,y],[480+width/2-8,y+55],[480-width/2+8,y+55]],'#ffffff20','#ffffff50',4);
 text(label,480,y+16,24,over?'#fff':'#ddd','center',width-20);ctx.restore();
}
function arrows(){for(const [x,flip]of[[145,-1],[815,1]]){
 ctx.save();const over=hovered&&hovered.x<x&&hovered.x+hovered.w>x;
 const down=pressed&&pressed.x<x&&pressed.x+pressed.w>x&&pressAge<.25;
 ctx.translate(x+(over?flip*hoverAmount*5:0),472+(down?Math.sin(pressAge/.25*Math.PI)*4:0));
 ctx.scale(flip*(down?.96:1),down?.96:1);
 polygon([[-90,-42],[75,-42],[100,50],[-65,50]],'#000');
 polygon([[-85,-50],[80,-50],[105,42],[-60,42]],'#ffffff28','#ffffff45',5);
 polygon([[-53,-13],[12,-13],[12,-30],[58,0],[12,30],[12,13],[-53,13]],'#080808');ctx.restore();
}}
function header(left,right){
 if(left){polygon([[0,0],[400,0],[380,42],[0,42]],'#0008','#ffffff25',3);text(left,18,10,20,'#ddd','left',360)}
 if(right){polygon([[560,0],[960,0],[960,42],[580,42]],'#0008','#ffffff25',3);text(right,940,10,20,'#ddd','right',360)}
}
function drawLogo(word,x,y,width,height){
 ctx.save();const intro=settings.motion?ease(uiAge/.38):1;ctx.globalAlpha*=intro;
 ctx.translate(x,y+(1-intro)*16);ctx.scale(width/(word.length*.95-.1),height);
 VectorFont.draw(ctx,word,0,0,1,'#fff','left');ctx.restore();
}
function paintBackdrop(dark,light,accent){
 ctx.save();ctx.translate(480,screen==='select'?470:600);if(settings.motion)ctx.rotate(spin);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;
  polygon([[0,0],[Math.cos(a)*1800,Math.sin(a)*1800],[Math.cos(b)*1800,Math.sin(b)*1800]],i%2?dark:light)}
 if(screen==='select'){hex(100,dark,accent);polygon([[-6,-122],[6,-122],[0,-132]],accent)}
 ctx.restore();
}
function switchScreen(next){
 if(['play','over','paused'].includes(screen)&&!['play','over','paused'].includes(next))root.HexPlay?.stop();
 if(next==='paused')root.HexPlay?.pause();
 if(screen==='paused'&&next==='play')root.HexPlay?.resume();
 screen=next;uiAge=0;notice='';noticeAge=0;
 document.body.classList.toggle('playing',screen==='play');
 setStatus({title:'메인 메뉴',select:levels[selected][0],options:'설정',scores:'최고 기록',
  credits:'크레딧',play:'게임 시작',over:'게임 오버',paused:'일시정지',quit:'종료'}[screen]||screen);
 buildControls();
}
function choose(d){
 slide=1;slideDirection=d;
 if(screen==='title')menuItem=(menuItem+d+3)%3;
 else if(screen==='select'){selected=(selected+d+6)%6;setStatus(levels[selected][0]+(unlocked(selected)?'':' 잠김'))}
 root.HexPlay?.selectSound();buildControls();
}
function unlockHyper(){
 if(!settings.hyperUnlocked){settings.hyperUnlocked=true;save();root.HexPlay?.selectSound()}
 toast('하이퍼 모드 전체 해금');buildControls();
}
function setMode(mode){
 if(![1,2,3].includes(mode))return;
 settings.controlMode=mode;save();
 if(screen==='play'||screen==='paused'){
  if(root.HexPlay?.start(selected,mode,settings.sound)){switchScreen('play')}
 }
 buildControls();setStatus('조작 모드 '+mode);
}
function start(){
 if(!unlocked(selected)){toast('SURVIVE 60S TO UNLOCK');return}
 if(!HexEngine.hasMap(selected)){toast('PATTERN NOT READY: '+levels[selected][0]);return}
 if(root.HexPlay?.start(selected,settings.controlMode,settings.sound))switchScreen('play');
}
function finishDeath(){
 const g=root.HexPlay?.game;if(!g||screen!=='play')return;
 modeRecords()[selected]=Math.max(bestTime(selected),g.time);save();
 switchScreen('over');
}
function back(){
 if(screen==='play')switchScreen('paused');
 else if(screen==='paused'||screen==='over'||screen==='scores')switchScreen('select');
 else if(screen==='title')switchScreen('quit');else switchScreen('title');
}
function confirm(){
 if(screen==='title')switchScreen(['select','options','credits'][menuItem]);
 else if(screen==='select')start();
 else if(screen==='over')start();
 else if(screen==='paused')switchScreen('play');
 else if(screen==='quit')switchScreen('title');
 else if(screen==='options')optionActions[optionIndex]();
}
async function toggleFullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
  else toast('전체 화면을 지원하지 않습니다.');}
 catch{toast('전체 화면 전환 실패')}
}
const optionActions=[
 ()=>{settings.sound=!settings.sound;root.HexPlay?.setSound(settings.sound);save()},
 ()=>{settings.motion=!settings.motion;save()},
 toggleFullscreen,()=>setMode(settings.controlMode%3+1),unlockHyper
];
function button(label,x,y,w,h,fn){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label);
 Object.assign(b.style,{left:ox+x*scale+'px',top:oy+y*scale+'px',width:w*scale+'px',height:h*scale+'px'});
 b.onpointerenter=()=>hovered={x,y,w,h};b.onpointerleave=()=>hovered=null;
 b.onfocus=()=>hovered={x,y,w,h};b.onblur=()=>hovered=null;
 b.onpointerdown=()=>{pressed={x,y,w,h};pressAge=0};
 b.onclick=()=>{root.HexPlay?.selectSound();fn()};controls.append(b);
}
function buildControls(){
 hovered=null;controls.replaceChildren();delete controls.dataset.directSides;
 if(screen==='title'||screen==='select'){
  button('이전',45,420,195,110,()=>choose(-1));
  button('다음',720,420,195,110,()=>choose(1));
  button(screen==='title'?['START GAME','OPTIONS','CREDITS'][menuItem]:(unlocked(selected)?'게임 시작':'잠긴 난이도'),
   screen==='select'?225:270,screen==='select'?270:435,screen==='select'?510:420,screen==='select'?55:68,confirm);
 }
 if(screen==='title')button('종료',735,0,225,48,back);
 if(screen==='select'){button('최고 기록',0,0,400,50,()=>switchScreen('scores'));button('메인 메뉴',560,0,400,50,back)}
 if(screen==='over'||screen==='paused'||screen==='quit'){
  button(screen==='over'?'다시 시작':screen==='paused'?'계속하기':'계속',250,screen==='over'?535:420,460,screen==='over'?55:70,confirm);
  button('메뉴로 돌아가기',630,0,330,50,back);
 }
 if(screen==='options'){
  ['효과음 켜기 끄기','회전 효과 켜기 끄기','전체 화면','조작 모드 변경',
   settings.hyperUnlocked?'하이퍼 모드 전체 해금 완료':'하이퍼 모드 전체 해금 (U)']
   .forEach((label,i)=>button(label,240,160+i*65,480,55,optionActions[i]));
 }
 if(screen==='play')root.HexPlay?.buildControls(button,controls);
 if(['options','scores','credits'].includes(screen))button('돌아가기',650,0,310,50,back);
}
function drawMenu(dark,light,accent){
 paintBackdrop(dark,light,accent);
 if(screen==='title'){
  header('','ESC - QUIT');drawLogo('SUPER',220,160,520,100);drawLogo('HEXAGON',305,268,490,65);
  arrows();ctx.save();ctx.translate(slide*slideDirection*35,0);
  panel(['START GAME','OPTIONS','CREDITS'][menuItem]);ctx.restore();
  text('PRESS SPACE TO SELECT',480,565,23,'#fff');
 }
 if(screen==='select'){
  header('TAB - HIGH SCORES','MODE '+settings.controlMode+'  |  ESC - RETURN');
  ctx.fillStyle='#000';ctx.fillRect(0,95,960,155);
  text(levels[selected][0],480+slide*slideDirection*45,115,49,accent);
  text('DIFFICULTY: '+levels[selected][1],480,177,23,'#ddd');
  text('BEST TIME: '+format(bestTime(selected)),480,211,23,'#ddd');
  if(selected>=3&&selected<6)text('HYPER MODE',885,68,16,accent,'right');
  panel(unlocked(selected)?'PRESS SPACE TO START':'LOCKED',270,470);
  if(!unlocked(selected))text('SURVIVE 60S IN '+levels[selected-3][0],480,345,17,'#ddd');
  arrows();
 }
 if(screen==='options'){
  ctx.fillStyle='#ffffff10';ctx.fillRect(230,155+optionIndex*65,500,60);
  header('','ESC - RETURN');text('OPTIONS',480,75,49);
  panel('MUSIC / SFX: '+(settings.sound?'ON':'OFF'),160,440);
  panel('ROTATION: '+(settings.motion?'ON':'OFF'),225,440);
  panel('FULLSCREEN',290,440);
  panel('CONTROL MODE: '+settings.controlMode+(settings.controlMode===1?' (FREE)':settings.controlMode===2?' (STEP)':' (KEY)'),355,440);
  panel(settings.hyperUnlocked?'HYPER MODES: ALL UNLOCKED':'UNLOCK ALL HYPER MODES (U)',420,440);
  text('1: FREE   2: STEP   3: SECTOR KEYS',480,493,16);
  text(settings.controlMode===3?'A-Z / 0-9 - PRESS THE SHOWN KEY':'LEFT / RIGHT OR A / D - MOVE',480,526,16);
  text('PRESS U OR TAP LAST OPTION TO UNLOCK',480,555,15);
 }
 if(screen==='scores'){
  header('','ESC - RETURN');text('HIGH SCORES - MODE '+settings.controlMode,480,85,42);
  text('1 / 2 / 3 - SWITCH MODE',480,137,18,'#ccc');
  levels.forEach((l,i)=>{
   text((i>=3&&i<6?'HYPER ':'')+l[0],95,185+i*53,19,'#ddd','left',540);
   text(format(bestTime(i)),865,185+i*53,24,'#fff','right');
  });
 }
 if(screen==='credits'){
  header('','ESC - RETURN');text('CREDITS',480,105,50);text('ORIGINAL GAME',480,205,21,'#aaa');
  text('TERRY CAVANAGH',480,250,32);text('ORIGINAL MUSIC - CHIPZEL',480,320,22);
  text('UNOFFICIAL WEB RECREATION',480,410,22);text('MUSIC BY CHIPZEL',480,455,17,'#aaa');
 }
 if(screen==='quit'){text('THANKS FOR PLAYING',480,210,40);text('CLOSE THIS TAB TO EXIT',480,300,23);panel('RETURN TO MENU',435,400)}
}
function draw(){
 const dpr=Math.min(devicePixelRatio||1,2);
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191919';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*ox,dpr*oy);
 ctx.save();ctx.beginPath();ctx.rect(0,0,960,600);ctx.clip();
 const colors=displayedLight.map(l=>'hsl('+displayedHue+' '+displayedSat+'% '+l+'%)');
 if(['play','over','paused'].includes(screen)){
  root.HexPlay?.draw(ctx,{screen,colors,settings,scale,ox,oy,dpr,text,polygon,header,panel,best:bestTime(selected),format});
 }else drawMenu(...colors);
 if(noticeAge>0){polygon([[135,498],[825,498],[815,548],[145,548]],'#000d','#ffffff50',2);
  text(notice,480,509,20,'#fff','center',620)}
 ctx.restore();
}
function paletteUpdate(dt){
 const neutral=['title','options','credits','quit','scores'].includes(screen);
 const mono=selected===5;
 let hue=levels[selected][2],sat=neutral||mono?0:89;
 if(!neutral&&screen==='play'&&root.HexPlay?.game){
  const s=root.HexPlay.game.time/10;hue+=Math.floor(s)*24+24*ease((s%1-.7)/.3);
 }
 const blend=1-Math.exp(-dt*5),delta=((hue-displayedHue+540)%360)-180;
 displayedHue+=delta*blend;displayedSat+=(sat-displayedSat)*blend;
 const lights=neutral?[14,19,93]:mono?[21,45,100]:[12,19,59];
 displayedLight=displayedLight.map((v,i)=>v+(lights[i]-v)*blend);
}
function resize(){
 const dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
 scale=Math.min(innerWidth/960,innerHeight/600);
 ox=(innerWidth-960*scale)/2;oy=(innerHeight-600*scale)/2;
 buildControls();draw();
}
function frame(t){
 const dt=Math.max(0,Math.min(.05,(t-last)/1000||0));last=t;
 clock+=dt;uiAge+=dt;pressAge+=dt;noticeAge=Math.max(0,noticeAge-dt);
 hoverAmount+=(Number(!!hovered)-hoverAmount)*(1-Math.exp(-dt*16));
 if(settings.motion)spin+=dt*.18;
 slide=Math.max(0,slide-dt*5);
 if(screen==='play'){root.HexPlay?.tick(dt);if(root.HexPlay?.game?.dead)finishDeath()}
 paletteUpdate(dt);draw();requestAnimationFrame(frame);
}
addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.code==='Backquote'){e.preventDefault();if(!e.repeat)toggleFullscreen();return;}
 if(screen==='options'&&e.code==='KeyU'){e.preventDefault();if(!e.repeat)unlockHyper();return;}
 if(['Digit1','Digit2','Digit3'].includes(e.code)){
  if(screen!=='play'||settings.controlMode!==3){e.preventDefault();if(!e.repeat)setMode(Number(e.code.slice(-1)));return}
 }
 if(screen==='play'&&root.HexPlay?.keydown(e))return;
 if(['ArrowLeft','ArrowRight','Space','Escape','Tab','KeyA','KeyD','Enter','ArrowUp','ArrowDown'].includes(e.code)){
  if(e.code==='Tab'&&screen!=='select')return;
  e.preventDefault();if(e.repeat)return;
  if(e.code==='Escape'){back();return}
  if(screen==='options'&&['ArrowUp','ArrowDown'].includes(e.code)){
   optionIndex=(optionIndex+(e.code==='ArrowUp'?4:1))%5;return;
  }
  if(e.code==='Tab'&&screen==='select'){switchScreen('scores');return}
  if(['Space','Enter'].includes(e.code)){confirm();return}
  if(['title','select'].includes(screen)&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))
   choose(['ArrowLeft','KeyA'].includes(e.code)?-1:1);
 }
});
addEventListener('keyup',e=>root.HexPlay?.keyup(e));
canvas.addEventListener('pointerdown',e=>{if(screen==='play')root.HexPlay?.pointerdown(e)});
canvas.addEventListener('pointerup',e=>root.HexPlay?.pointerup(e));
canvas.addEventListener('pointercancel',e=>root.HexPlay?.pointerup(e));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function suspend(){if(screen==='play')switchScreen('paused');root.HexPlay?.clearInput()}
addEventListener('blur',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});
addEventListener('resize',resize);
root.HexMenu={
 get screen(){return screen},get selected(){return selected},get records(){return records.slice()},
 get settings(){return {...settings}},get best(){return bestTime(selected)},
 choose,confirm,back,start,finishDeath,buildControls,select(index){if(Number.isInteger(index)&&index>=0&&index<6){selected=index;buildControls()}},
 setMode,save,toast,resize
};
resize();switchScreen('title');requestAnimationFrame(frame);
})(window);
