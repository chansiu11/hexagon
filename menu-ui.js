/* 1-1: original menu composition, new gameplay lifecycle. No legacy stage execution. */
'use strict';
const {Game,levels}=HexEngine;
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),controls=document.querySelector('#controls'),status=document.querySelector('#status');
let scale=1,ox=0,oy=0,screen='title',selected=0,menuItem=0,game=null,last=0,clock=0,spin=0,flash=0,unlockedNow=false;
const music=new BeatAudio();
let launch=null,pendingAction=null,pressed=null,pressAge=1,hoverAmount=0,uiAge=1;
let displayedHue=32,displayedSat=0,displayedLight=[14,19,93],optionIndex=0,transition=null,selectionSlide=0,slideDirection=1,hovered=null,audioStamp=0,blockedNotice=0;
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function queueAction(fn,bounds=null){if(pendingAction)return;pressed=bounds;pressAge=0;pendingAction={fn,left:settings.motion?.11:0}}
function captureTransition(){if(!settings.motion)return;const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.getContext('2d').drawImage(canvas,0,0);transition={snapshot,age:0}}
function enableAudio(){if(!settings.sound)return;music.enabled=true;music.unlock().then(()=>{music.loadVoices().catch(()=>{});if(screen==='play'&&!music.active)music.play(selected,game?.time||0)}).catch(()=>{status.textContent='소리를 시작하지 못했습니다.'})}
function directKeys(g=game){return g?.directKeys||[]}
function directMove(sector){if(screen==='play'&&game?.selectSector(sector))music.effect('select')}
const keys=new Set(),touches=new Map();let records=Array(levels.length).fill(0),recordsMode2=Array(levels.length).fill(0),recordsMode3=Array(levels.length).fill(0),settings={sound:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,controlMode:1,hyperUnlocked:false};
try{const s=JSON.parse(localStorage.getItem('hexagon-web-v2')||'{}');if(Array.isArray(s.records))records=records.map((_,i)=>Number.isFinite(s.records[i])?Math.max(0,s.records[i]):0);if(Array.isArray(s.recordsMode2))recordsMode2=recordsMode2.map((_,i)=>Number.isFinite(s.recordsMode2[i])?Math.max(0,s.recordsMode2[i]):0);if(Array.isArray(s.recordsMode3))recordsMode3=recordsMode3.map((_,i)=>Number.isFinite(s.recordsMode3[i])?Math.max(0,s.recordsMode3[i]):0);if(s.settings)settings={...settings,sound:s.settings.sound!==false,motion:s.settings.motion!==false,controlMode:s.settings.controlMode===3?3:s.settings.controlMode===2?2:1,hyperUnlocked:s.settings.hyperUnlocked===true}}catch{}
function text(t,x,y,size=24,color="#fff",align="center",max=900){const intro=settings.motion&&screen!=='play'?ease(uiAge/.3):1;ctx.save();ctx.globalAlpha*=intro;VectorFont.draw(ctx,t,x,y+(1-intro)*10,size,color,align,max);ctx.restore()}
function polygon(points,fill,stroke,line=3){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
function hex(r,fill,stroke){polygon(Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*r,Math.sin(i*Math.PI/3)*r]),fill,stroke)}
function save(){try{localStorage.setItem('hexagon-web-v2',JSON.stringify({records,recordsMode2,recordsMode3,settings}))}catch{status.textContent='브라우저 저장 공간에 기록을 저장할 수 없습니다.'}}
function beep(freq=350,duration=.06){music.setEnabled(settings.sound);music.effect(freq<200?'die':freq>500?'start':'select')}
function modeRecords(){return settings.controlMode===3?recordsMode3:settings.controlMode===2?recordsMode2:records}
function bestTime(i){return modeRecords()[i]}
function unlocked(i){return i<3||(i>=3&&i<=5&&(settings.hyperUnlocked||Math.max(records[i-3],recordsMode2[i-3],recordsMode3[i-3])>=60))}
// Optional local unlock only; do not fabricate 60s records or unlock by
// changing the saved best times. A one-time U keypress or a tap on the
// bottom OPTIONS item unlocks the three HYPER stages in every control mode.
function unlockAllHyper(){
 if(settings.hyperUnlocked){status.textContent='하이퍼 모드 3개가 이미 모두 열려 있습니다.';return;}
 settings.hyperUnlocked=true;save();beep(550,.08);
 status.textContent='하이퍼 모드 전체 해금: HYPER HEXAGON / HEXAGONER / HEXAGONEST';
 buildControls();
}
function setControlMode(mode){
 if(![1,2,3].includes(mode)||settings.controlMode===mode)return;
 settings.controlMode=mode;keys.clear();touches.clear();save();
 if(game&&['play','paused'].includes(screen)){game=new Game(selected);game.setControlMode(mode);music.stop();if(screen==='play')music.play(selected,0)}
 status.textContent='조작 모드 '+mode;buildControls();
}
function change(s){
 if(!['play','over'].includes(s))captureTransition();else transition=null;
 uiAge=0;screen=s;keys.clear();touches.clear();
 if(s==='play'){last=performance.now();if(settings.sound){music.beginRun();music.play(selected,game.time)}}
 else music.stop();
 document.body.classList.toggle('playing',s==='play');
 status.textContent=({title:'메인 메뉴',select:levels[selected][0]+' '+levels[selected][1],play:'게임 시작',over:'게임 오버',options:'설정',scores:'최고 기록',credits:'크레딧',paused:'일시정지',quit:'종료'})[s]||s;
 buildControls();
}
function choose(d){selectionSlide=1;slideDirection=d;beep();if(screen==='title')menuItem=(menuItem+d+3)%3;else if(screen==='select'){selected=(selected+d+levels.length)%levels.length;status.textContent=levels[selected][0]+' '+levels[selected][1]+(unlocked(selected)?'':' 잠김')}buildControls()}
function start(){
 if(!unlocked(selected)){beep(110,.2);return}
 if(selected!==0&&!HexEngine.hasPattern(selected)){
  blockedNotice=2.8;status.textContent=levels[selected][0]+' : 새 벽 패턴 준비 중 (맵 '+(selected+1)+')';return;
 }
 try{game=new Game(selected);game.setControlMode(settings.controlMode);unlockedNow=false;flash=0;change('play');enableAudio();beep(550,.1)}
 catch(error){blockedNotice=2.8;status.textContent=error.message}
}
function confirm(){if(screen==='title')change(['select','options','credits'][menuItem]);else if(screen==='select')start();else if(screen==='over')start();else if(screen==='paused')change('play');else if(screen==='quit')change('title');else if(screen==='options')controls.querySelectorAll('button')[optionIndex]?.click()}
function back(){if(screen==='play')change('paused');else if(screen==='paused'||screen==='over'||screen==='scores')change('select');else if(screen==='title')change('quit');else change('title')}
function button(label,x,y,w,h,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label);Object.assign(b.style,{left:(ox+x*scale)+'px',top:(oy+y*scale)+'px',width:w*scale+'px',height:h*scale+'px'});b.onpointerenter=()=>hovered={x,y,w,h};b.onpointerleave=()=>hovered=null;b.onfocus=()=>hovered={x,y,w,h};b.onblur=()=>hovered=null;b.onpointerdown=()=>{pressed={x,y,w,h};pressAge=0};b.onclick=()=>{enableAudio();if(screen==='play'&&settings.controlMode===3){fn();return}beep();queueAction(fn,{x,y,w,h})};controls.append(b)}
function buildControls(){hovered=null;controls.replaceChildren();if(['title','select'].includes(screen)){button('이전',45,420,195,110,()=>choose(-1));button('다음',720,420,195,110,()=>choose(1));button(screen==='title'?['START GAME','OPTIONS','CREDITS'][menuItem]:(unlocked(selected)?'게임 시작':'잠긴 난이도'),screen==='select'?225:270,screen==='select'?270:435,screen==='select'?510:420,screen==='select'?55:68,confirm)}if(screen==='title')button('종료',735,0,225,48,back);if(screen==='select'){button('최고 기록',0,0,400,50,()=>change('scores'));button('메인 메뉴',560,0,400,50,back)}if(['over','complete','paused','quit'].includes(screen)){button(screen==='over'?'다시 시작':screen==='paused'?'계속하기':'계속',250,(screen==='over'||screen==='complete'&&game?.dead)?535:420,460,(screen==='over'||screen==='complete'&&game?.dead)?55:70,confirm);button('메뉴로 돌아가기',630,0,330,50,back)}if(screen==='options'){button('효과음 켜기 끄기',240,160,480,55,()=>{settings.sound=!settings.sound;music.setEnabled(settings.sound);save()});button('회전 효과 켜기 끄기',240,225,480,55,()=>{settings.motion=!settings.motion;save()});button('전체 화면',240,290,480,55,toggleFullscreen);button('조작 모드 변경',240,355,480,55,()=>setControlMode(settings.controlMode%3+1));button(settings.hyperUnlocked?'하이퍼 모드 전체 해금 완료':'하이퍼 모드 전체 해금 (U)',240,420,480,55,unlockAllHyper)}if(screen==='play'&&settings.controlMode===2)button('2 STEPS',18,508,156,58,()=>game?.armDoubleStep());if(screen==='play'&&settings.controlMode===3){controls.dataset.directSides=game.sides;for(let i=0;i<game.sides;i++)button(directKeys()[i]+' 칸으로 이동',95+i*130,520,115,60,()=>directMove(i))}if(['options','scores','credits'].includes(screen))button('돌아가기',650,0,310,50,back);}
function panel(label,y=435,width=380){const over=hovered&&hovered.y<=y+28&&hovered.y+hovered.h>=y+28&&hovered.x<480&&hovered.x+hovered.w>480;const down=pressed&&pressed.y<=y+28&&pressed.y+pressed.h>=y+28&&pressAge<.25;const squash=down?Math.sin(Math.min(1,pressAge/.25)*Math.PI)*.045:0;ctx.save();ctx.translate(480,y+27);ctx.scale(1+(over?hoverAmount*.018:0)-squash,1-squash);ctx.translate(-480,-y-27);polygon([[480-width/2-20,y],[480+width/2+20,y],[480+width/2-8,y+55],[480-width/2+8,y+55]],'#ffffff20','#ffffff50',4);text(label,480,y+16,24,over?'#fff':'#ddd','center',width-20);ctx.restore()}
function arrows(){for(const [x,flip]of[[145,-1],[815,1]]){ctx.save();const over=hovered&&hovered.x<x&&hovered.x+hovered.w>x;const down=pressed&&pressed.x<x&&pressed.x+pressed.w>x&&pressAge<.25;ctx.translate(x+(over?flip*hoverAmount*5:0),472+(down?Math.sin(pressAge/.25*Math.PI)*4:0));ctx.scale(flip*(down?.96:1),down?.96:1);polygon([[-90,-42],[75,-42],[100,50],[-65,50]],'#000');polygon([[-85,-50],[80,-50],[105,42],[-60,42]],'#ffffff28','#ffffff45',5);polygon([[-53,-13],[12,-13],[12,-30],[58,0],[12,30],[12,13],[-53,13]],'#080808');ctx.restore()}}
function header(left,right){if(left){polygon([[0,0],[400,0],[380,42],[0,42]],'#0008','#ffffff25',3);text(left,18,10,20,'#ddd','left',360)}if(right){polygon([[560,0],[960,0],[960,42],[580,42]],'#0008','#ffffff25',3);text(right,940,10,20,'#ddd','right',360)}}
function format(n){return (Number(n)||0).toFixed(2).padStart(5,'0')}
function updatePalette(dt){
 const neutral=['title','options','credits','quit','scores'].includes(screen),mono=selected===5;
 let hue=levels[selected][2];
 if(game&&['play','over','paused'].includes(screen)){const section=game.time/10,index=Math.floor(section);hue+=index*24+24*ease((section-index-.7)/.3)}
 const blend=1-Math.exp(-dt*5),delta=((hue-displayedHue+540)%360)-180;
 displayedHue+=delta*blend;
 const sat=neutral||mono?0:89;displayedSat+=(sat-displayedSat)*blend;
 const lights=neutral?[14,19,93]:mono?[21,45,100]:[12,19,59];
 displayedLight=displayedLight.map((v,i)=>v+(lights[i]-v)*blend);
}
function palette(){return displayedLight.map(l=>'hsl('+displayedHue+' '+displayedSat+'% '+l+'%)')}
function drawBackdrop(dark,light){
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,b=(i+1)*Math.PI/3;
  polygon([[0,0],[Math.cos(a)*1800,Math.sin(a)*1800],[Math.cos(b)*1800,Math.sin(b)*1800]],i%2?dark:light);
 }
}
function draw(){
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191919';ctx.fillRect(0,0,canvas.width,canvas.height);
 const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*ox,dpr*oy);
 ctx.save();ctx.beginPath();ctx.rect(0,0,960,600);ctx.clip();
 const [dark,light,accent]=palette(),playing=['play','over','paused'].includes(screen);
 if(!playing){
  ctx.save();ctx.translate(480,screen==='select'?470:600);if(settings.motion)ctx.rotate(spin);
  drawBackdrop(dark,light);
  if(screen==='select'){hex(100,dark,accent);polygon([[-6,-122],[6,-122],[0,-132]],accent)}
  ctx.restore();
 }else if(game)HexPlayView.draw(ctx,game,{dark,light,accent,screen,format,best:bestTime(selected),uiAge,drawText:text,drawPanel:panel});
 if(screen==='title'){header('','ESC - QUIT');drawLogo('SUPER',220,160,520,100);drawLogo('HEXAGON',305,268,490,65);arrows();ctx.save();ctx.translate(selectionSlide*slideDirection*35,0);panel(['START GAME','OPTIONS','CREDITS'][menuItem]);ctx.restore();text('PRESS SPACE TO SELECT',480,565,23,'#fff')}
 if(screen==='select'){header('TAB - HIGH SCORES','MODE '+settings.controlMode+'  |  ESC - RETURN');ctx.fillStyle='#000';ctx.fillRect(0,95,960,155);text(levels[selected][0],480+selectionSlide*slideDirection*45,115,49,accent);text('DIFFICULTY: '+levels[selected][1],480,177,23,'#ddd');text('BEST TIME: '+format(bestTime(selected)),480,211,23,'#ddd');if(selected>=3&&selected<6)text('HYPER MODE',885,68,16,accent,'right');panel(unlocked(selected)?'PRESS SPACE TO START':'LOCKED',270,470);if(!unlocked(selected))text('SURVIVE 60S IN '+levels[selected-3][0],480,345,17,'#ddd');arrows()}
 if(screen==='options'){ctx.fillStyle='#ffffff10';ctx.fillRect(230,155+optionIndex*65,500,60);header('','ESC - RETURN');text('OPTIONS',480,75,49);panel('MUSIC / SFX: '+(settings.sound?'ON':'OFF'),160,440);panel('ROTATION: '+(settings.motion?'ON':'OFF'),225,440);panel('FULLSCREEN',290,440);panel('CONTROL MODE: '+settings.controlMode+(settings.controlMode===1?' (FREE)':settings.controlMode===2?' (STEP)':' (KEY)'),355,440);panel(settings.hyperUnlocked?'HYPER MODES: ALL UNLOCKED':'UNLOCK ALL HYPER MODES (U)',420,440);text('1: FREE   2: STEP   3: SECTOR KEYS',480,493,16);text(settings.controlMode===3?'A-Z / 0-9 - PRESS THE SHOWN KEY':'LEFT / RIGHT OR A / D - MOVE',480,526,16);text('PRESS U OR TAP LAST OPTION TO UNLOCK',480,555,15)}
if(screen==='scores'){header('','ESC - RETURN');text('HIGH SCORES - MODE '+settings.controlMode,480,85,42);text('1 / 2 / 3 - SWITCH MODE',480,137,18,'#ccc');levels.forEach((l,i)=>{text((i>=3&&i<6?'HYPER ':'')+l[0],95,185+i*53,19,'#ddd','left',540);text(format(bestTime(i)),865,185+i*53,24,'#fff','right')})}
if(screen==='credits'){header('','ESC - RETURN');text('CREDITS',480,105,50);text('ORIGINAL GAME',480,205,21,'#aaa');text('TERRY CAVANAGH',480,250,32);text('ORIGINAL MUSIC - CHIPZEL',480,320,22);text('UNOFFICIAL WEB RECREATION',480,410,22);text('MUSIC BY CHIPZEL',480,455,17,'#aaa')}
 if(screen==='quit'){text('THANKS FOR PLAYING',480,210,40);text('CLOSE THIS TAB TO EXIT',480,300,23);panel('RETURN TO MENU',435,400)}
 if(blockedNotice>0&&screen==='select'){ctx.fillStyle='#000d';ctx.fillRect(185,377,590,48);text('WALL PATTERN NOT READY - MAP '+(selected+1),480,389,18,'#fff')}
 if(transition){ctx.save();ctx.globalAlpha=Math.pow(1-transition.age/.24,2);ctx.drawImage(transition.snapshot,0,0,canvas.width,canvas.height,0,0,960,600);ctx.restore()}
 ctx.restore();
}
function resize(){
 const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
 scale=Math.min(innerWidth/960,innerHeight/600);ox=(innerWidth-960*scale)/2;oy=(innerHeight-600*scale)/2;
 buildControls();draw();
}
function frame(t){
 const dt=Math.min(.05,Math.max(0,(t-last)/1000||0));last=t;clock+=dt;uiAge+=dt;pressAge+=dt;
 blockedNotice=Math.max(0,blockedNotice-dt);hoverAmount+=(Number(!!hovered)-hoverAmount)*(1-Math.exp(-dt*16));
 updatePalette(dt);
 if(pendingAction){pendingAction.left-=dt;if(pendingAction.left<=0){const fn=pendingAction.fn;pendingAction=null;fn()}}
 if(settings.motion)spin+=dt*.18;selectionSlide=Math.max(0,selectionSlide-dt*5);
 if(transition){transition.age+=dt;if(transition.age>=.24)transition=null}
 if(screen==='play'&&game){
  const left=keys.has('ArrowLeft')||keys.has('KeyA')||[...touches.values()].includes(-1);
  const right=keys.has('ArrowRight')||keys.has('KeyD')||[...touches.values()].includes(1);
  game.update(dt,settings.controlMode===1?Number(right)-Number(left):0);
  if(game.timeline.walls.length&&game.time>=60&&bestTime(selected)<60){modeRecords()[selected]=game.time;save();unlockedNow=selected<3}
  if(game.dead){if(game.timeline.walls.length){modeRecords()[selected]=Math.max(bestTime(selected),game.time);save()}change('over');beep(90,.3)}
 }
 draw();
 if(clock-audioStamp>.25){
  audioStamp=clock;canvas.dataset.screen=screen;canvas.dataset.gameTime=game?.time.toFixed(3)||'0';
  canvas.dataset.wallSource=game?.timeline.provenance||'none';canvas.dataset.wallCount=String(game?.walls.length||0);
  canvas.dataset.controlMode=String(settings.controlMode);canvas.dataset.map=String(selected+1);
 }
 requestAnimationFrame(frame);
}
async function toggleFullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status.textContent='전체 화면을 사용할 수 없습니다.'}
 catch{status.textContent='전체 화면 전환 실패'}
}
addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.code==='Backquote'){e.preventDefault();if(!e.repeat)toggleFullscreen();return}
 if(screen==='options'&&e.code==='KeyU'){e.preventDefault();if(!e.repeat)unlockAllHyper();return}
 if(screen==='play'&&settings.controlMode===3&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9])$/.test(e.code)){
  e.preventDefault();if(!e.repeat&&!keys.has(e.code)){keys.add(e.code);enableAudio();const sector=game.sectorForKey(e.code);if(sector>=0&&game.selectSector(sector))music.effect('select')}return;
 }
 if(['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();if(!e.repeat)setControlMode(Number(e.code.slice(-1)));return}
 if(screen==='play'&&settings.controlMode===2&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){
  e.preventDefault();if(e.repeat||keys.has(e.code))return;keys.add(e.code);
  if(game.stepSector(['ArrowRight','KeyD'].includes(e.code)?1:-1))music.effect('select');return;
 }
 if(screen==='play'&&['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code)){
  e.preventDefault();if(!e.repeat&&settings.controlMode===2)game.armDoubleStep();keys.add(e.code);return;
 }
 if(['ArrowLeft','ArrowRight','Space','Enter','KeyA','KeyD'].includes(e.code)&&!e.repeat)enableAudio();
 if(['ArrowLeft','ArrowRight','Space','Escape','Tab','KeyA','KeyD','Enter','ArrowUp','ArrowDown'].includes(e.code)){
  if(e.code==='Tab'&&screen!=='select')return;
  e.preventDefault();keys.add(e.code);if(e.repeat)return;
  if(screen==='options'&&['ArrowUp','ArrowDown'].includes(e.code)){optionIndex=(optionIndex+(e.code==='ArrowUp'?4:1))%5;beep();return}
  if(e.code==='Escape')back();
  else if(e.code==='Tab'&&screen==='select')change('scores');
  else if(['Space','Enter'].includes(e.code))queueAction(confirm);
  else if((screen==='title'||screen==='select')&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))choose(['ArrowLeft','KeyA'].includes(e.code)?-1:1);
 }
});
addEventListener('keyup',e=>keys.delete(e.code));
function suspend(){keys.clear();touches.clear();if(screen==='play')change('paused')}
addEventListener('blur',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});
canvas.addEventListener('pointerdown',e=>{
 if(screen!=='play'||!game)return;enableAudio();canvas.setPointerCapture(e.pointerId);
 if(settings.controlMode===3)return;
 const direction=e.clientX<innerWidth/2?-1:1;
 if(settings.controlMode===2){if(game.stepSector(direction))music.effect('select')}
 else touches.set(e.pointerId,direction);
});
canvas.addEventListener('pointerup',e=>touches.delete(e.pointerId));
canvas.addEventListener('pointercancel',e=>touches.delete(e.pointerId));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function drawLogo(word,x,y,width,height){ctx.save();const intro=settings.motion?ease(uiAge/.38):1;ctx.globalAlpha*=intro;ctx.translate(x,y+(1-intro)*16);ctx.scale(width/(word.length*.95-.1),height);VectorFont.draw(ctx,word,0,0,1,'#fff','left');ctx.restore()}
addEventListener('resize',resize);resize();change('title');requestAnimationFrame(frame);
