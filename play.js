'use strict';
const {Game,levels,wallVisualPoly,playerPoly}=HexEngine;
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),controls=document.querySelector('#controls'),status=document.querySelector('#status');
let W=960,H=600,scale=1,ox=0,oy=0,screen='title',selected=0,menuItem=0,game=null,last=0,clock=0,spin=0,paused=false,flash=0,unlockedNow=false,audio;
const music=new BeatAudio();
let launch=null,pendingAction=null,pressed=null,pressAge=1,hoverAmount=0,uiAge=1;let displayedHue=32,displayedSat=0,displayedLight=[14,19,93];
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function queueAction(fn,bounds=null){if(pendingAction)return;pressed=bounds;pressAge=0;pendingAction={fn,left:settings.motion?.11:0}}
let optionIndex=0;let transition=null,selectionSlide=0,slideDirection=1,hovered=null,audioStamp=0;
function captureTransition(){if(!settings.motion)return;const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.getContext('2d').drawImage(canvas,0,0);transition={snapshot,age:0}}
function enableAudio(){music.enabled=settings.sound;music.unlock().then(()=>{if(!music.active&&screen==='play')music.play(selected,game.time)}).catch(()=>{status.textContent='소리를 시작하지 못했습니다. 다시 클릭해 주세요.'})}
const keys=new Set(),touches=new Map();let records=Array(6).fill(0),settings={sound:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches};
try{const s=JSON.parse(localStorage.getItem('hexagon-web-v2')||'{}');if(Array.isArray(s.records))records=records.map((_,i)=>Number.isFinite(s.records[i])?Math.max(0,s.records[i]):0);if(s.settings)settings={...settings,sound:s.settings.sound!==false,motion:s.settings.motion!==false}}catch{}
function text(t,x,y,size=24,color="#fff",align="center",max=900){const intro=settings.motion&&screen!=='play'?ease(uiAge/.3):1;ctx.save();ctx.globalAlpha*=intro;VectorFont.draw(ctx,t,x,y+(1-intro)*10,size,color,align,max);ctx.restore()}
function polygon(points,fill,stroke,line=3){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
function hex(r,fill,stroke){polygon(Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*r,Math.sin(i*Math.PI/3)*r]),fill,stroke)}
function save(){try{localStorage.setItem('hexagon-web-v2',JSON.stringify({records,settings}))}catch{status.textContent='브라우저 저장 공간에 기록을 저장할 수 없습니다.'}}
function beep(freq=350,duration=.06){music.setEnabled(settings.sound);music.effect(freq<200?'die':freq>500?'start':'select')}
function unlocked(i){return i<3||records[i-3]>=60}
function change(s){const starting=s==='play'&&screen==='select';if(!starting)captureTransition();else transition=null;uiAge=0;const previous=screen;if(starting){const reference=selected===0?window.ReferenceCamera:window.StageProfiles?.[selected]?.camera;game.rotation=reference?Math.atan2(reference.frames[0][1],reference.frames[0][0]):spin;launch=settings.motion?{age:0,duration:4/30,rotation:spin}:null;}if(!['play','paused'].includes(s))launch=null;screen=s;if(['paused','over','complete','quit'].includes(s))music.stop();else if(s==='play')music.play(selected,game.time);else music.stop();keys.clear();touches.clear();document.body.classList.toggle('playing',s==='play');status.textContent={title:'메인 메뉴',select:levels[selected][0]+' '+levels[selected][1],play:'게임 시작. 방향키 또는 A D로 이동합니다.',over:'게임 오버',options:'설정',scores:'최고 기록',credits:'크레딧',paused:'일시정지'}[s]||s;buildControls()}
function choose(d){selectionSlide=1;slideDirection=d;beep();if(screen==='title')menuItem=(menuItem+d+3)%3;else if(screen==='select'){selected=(selected+d+6)%6;status.textContent=levels[selected][0]+' '+levels[selected][1]+(unlocked(selected)?'':' 잠김')}buildControls()}
let starting=false;const timelineCache=new Map();
async function loadTimeline(level){
 if(!timelineCache.has(level))timelineCache.set(level,fetch('assets/timelines/'+'waves-stage-'+level+'.json?v=8',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('wall timeline '+r.status);return r.json();}).catch(e=>{timelineCache.delete(level);throw e;}));
 return timelineCache.get(level);
}
async function start(){
 if(starting)return;if(!unlocked(selected)){beep(110,.2);return}
 starting=true;const level=selected,origin=screen;status.textContent='게임 데이터를 불러오는 중입니다.';
 try{const timeline=await loadTimeline(level);if(level!==selected||screen!==origin)return;
 game=new Game(level,timeline);game.sampleWalls();unlockedNow=false;paused=false;flash=0;change('play');beep(550,.1);
 }catch(error){status.textContent='게임 데이터를 불러오지 못했습니다. 다시 시작해 주세요.';console.error(error);}
 finally{starting=false;}
}
function confirm(){if(screen==='title')change(['select','options','credits'][menuItem]);else if(screen==='select')start();else if(screen==='over')start();else if(screen==='paused')change('play');else if(screen==='complete')change('over');else if(screen==='quit')change('title');else if(screen==='options'){const targets=[...controls.querySelectorAll('button')];targets[optionIndex]?.click()}}
function back(){if(screen==='play')change('paused');else if(screen==='paused')change('select');else if(['over','scores','complete'].includes(screen))change('select');else if(screen==='title')change('quit');else change('title')}
function button(label,x,y,w,h,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label);Object.assign(b.style,{left:(ox+x*scale)+'px',top:(oy+y*scale)+'px',width:w*scale+'px',height:h*scale+'px'});b.onpointerenter=()=>hovered={x,y,w,h};b.onpointerleave=()=>hovered=null;b.onfocus=()=>hovered={x,y,w,h};b.onblur=()=>hovered=null;b.onpointerdown=()=>{pressed={x,y,w,h};pressAge=0};b.onclick=()=>{enableAudio();beep();queueAction(fn,{x,y,w,h})};controls.append(b)}
function buildControls(){hovered=null;controls.replaceChildren();if(['title','select'].includes(screen)){button('이전',45,420,195,110,()=>choose(-1));button('다음',720,420,195,110,()=>choose(1));button(screen==='title'?['START GAME','OPTIONS','CREDITS'][menuItem]:(unlocked(selected)?'게임 시작':'잠긴 난이도'),screen==='select'?225:270,screen==='select'?270:435,screen==='select'?510:420,screen==='select'?55:68,confirm)}if(screen==='title')button('종료',735,0,225,48,back);if(screen==='select'){button('최고 기록',0,0,400,50,()=>change('scores'));button('메인 메뉴',560,0,400,50,back)}if(['over','complete','paused','quit'].includes(screen)){button(screen==='over'?'다시 시작':screen==='paused'?'계속하기':'계속',250,420,460,70,confirm);button('메뉴로 돌아가기',630,0,330,50,back)}if(screen==='options'){button('효과음 켜기 끄기',240,190,480,60,()=>{settings.sound=!settings.sound;music.setEnabled(settings.sound);save()});button('회전 효과 켜기 끄기',240,265,480,60,()=>{settings.motion=!settings.motion;save()});button('전체 화면',240,340,480,60,()=>{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();p?.catch(()=>{status.textContent='이 브라우저에서는 전체 화면을 사용할 수 없습니다.'})})}if(['options','scores','credits'].includes(screen))button('돌아가기',650,0,310,50,back);}
function panel(label,y=435,width=380){const over=hovered&&hovered.y<=y+28&&hovered.y+hovered.h>=y+28&&hovered.x<480&&hovered.x+hovered.w>480;const down=pressed&&pressed.y<=y+28&&pressed.y+pressed.h>=y+28&&pressAge<.25;const squash=down?Math.sin(Math.min(1,pressAge/.25)*Math.PI)*.045:0;ctx.save();ctx.translate(480,y+27);ctx.scale(1+(over?hoverAmount*.018:0)-squash,1-squash);ctx.translate(-480,-y-27);polygon([[480-width/2-20,y],[480+width/2+20,y],[480+width/2-8,y+55],[480-width/2+8,y+55]],'#ffffff20','#ffffff50',4);text(label,480,y+16,24,over?'#fff':'#ddd','center',width-20);ctx.restore()}
function arrows(){for(const [x,flip]of[[145,-1],[815,1]]){ctx.save();const over=hovered&&hovered.x<x&&hovered.x+hovered.w>x;const down=pressed&&pressed.x<x&&pressed.x+pressed.w>x&&pressAge<.25;ctx.translate(x+(over?flip*hoverAmount*5:0),472+(down?Math.sin(pressAge/.25*Math.PI)*4:0));ctx.scale(flip*(down?.96:1),down?.96:1);polygon([[-90,-42],[75,-42],[100,50],[-65,50]],'#000');polygon([[-85,-50],[80,-50],[105,42],[-60,42]],'#ffffff28','#ffffff45',5);polygon([[-53,-13],[12,-13],[12,-30],[58,0],[12,30],[12,13],[-53,13]],'#080808');ctx.restore()}}
function header(left,right){if(left){polygon([[0,0],[400,0],[380,42],[0,42]],'#0008','#ffffff25',3);text(left,18,10,20,'#ddd','left',360)}if(right){polygon([[560,0],[960,0],[960,42],[580,42]],'#0008','#ffffff25',3);text(right,940,10,20,'#ddd','right',360)}}
function format(n){return n.toFixed(2).padStart(5,'0')}
function updatePalette(dt){const neutral=['title','options','credits','quit','scores'].includes(screen),mono=selected===5;let hue=levels[selected][2];if(game&&['play','over','paused','complete'].includes(screen)){const section=game.time/10,index=Math.floor(section);hue+=index*24+24*ease((section-index-.7)/.3)}const blend=1-Math.exp(-dt*5);const delta=((hue-displayedHue+540)%360)-180;displayedHue+=delta*blend;const sat=neutral||mono?0:89;displayedSat+=(sat-displayedSat)*blend;const lights=neutral?[14,19,93]:mono?[21,45,100]:[12,19,59];displayedLight=displayedLight.map((v,i)=>v+(lights[i]-v)*blend)}
function palette(){return displayedLight.map(l=>'hsl('+displayedHue+' '+displayedSat+'% '+l+'%)')}

function drawBackdrop(game,dark,light,playing){
 const paint=(sides,opacity)=>{
  ctx.save();ctx.globalAlpha*=opacity;
  for(let i=0;i<sides;i++){
   const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
   polygon([[0,0],[Math.cos(a)*1800,Math.sin(a)*1800],
    [Math.cos(b)*1800,Math.sin(b)*1800]],i%2?dark:light);
  }
  ctx.restore();
 };
 if(!playing||game.morph>=1||game.fromSides===game.sides){
  paint(playing?game.sides:6,1);
 }else{
  // The old stripes remain visible beneath a smoothly fading new pattern.
  // Without this, the entire playfield strobes when one sector disappears.
  const u=game.morph*game.morph*(3-2*game.morph);
  paint(game.fromSides,1);
  paint(game.sides,u);
 }
}
function drawTeleportEffect(g,color){
 const warp=g.teleport;
 if(!warp||!settings.motion)return;
 const u=Math.min(1,warp.age/warp.duration),fade=(1-u)*(1-u);
 ctx.save();
 // White triangular echo remains at the former position; the real player
 // has already arrived at the opposite side and can collide there.
 ctx.globalAlpha=fade*.65;
 polygon(playerPoly(warp.from,g.playerLean),'#fff');
 // Two opposing, short-lived circular traces convey a rapid 180° swap.
 ctx.strokeStyle='#fff';ctx.lineWidth=3.1*(1-u)+.5;
 for(const sign of [-1,1]){
  ctx.save();ctx.globalAlpha=fade*(sign===1?.62:.3);
  ctx.beginPath();
  ctx.arc(0,0,66,warp.from,warp.from+sign*Math.PI*Math.min(1,u*5),sign<0);
  ctx.stroke();ctx.restore();
 }
 const x=Math.cos(g.angle)*66,y=Math.sin(g.angle)*66;
 ctx.globalAlpha=.75*fade;
 ctx.strokeStyle='#fff';ctx.lineWidth=2.7;
 ctx.beginPath();ctx.arc(x,y,7+u*19,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha=.46*fade;
 polygon(playerPoly(g.angle,g.playerLean),color,'#fff',2);
 ctx.restore();
}

function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191919';ctx.fillRect(0,0,canvas.width,canvas.height);const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*ox,dpr*oy);ctx.save();ctx.beginPath();ctx.rect(0,0,960,600);ctx.clip();const [dark,light,accent]=palette();const playing=['play','over','paused','complete'].includes(screen);const launchBlend=launch?1-Math.pow(1-Math.min(1,launch.age/launch.duration),3):1;let cx=480,cy=playing?300:screen==='select'?470:600;const rotation=settings.motion?(playing?game.rotation:spin):0;ctx.save();ctx.translate(cx,cy);const camera=playing&&settings.motion&&!launch?game.referenceCamera:null;if(camera){if(!game.cameraWasActive){game.cameraBlendFrom=game.lastDrawCamera||camera;game.cameraBlendStart=game.time}const u=Math.min(1,(game.time-game.cameraBlendStart)/.15),m=camera.map((v,i)=>game.cameraBlendFrom[i]*(1-u)+v*u);ctx.transform(...m);game.lastDrawCamera=m;game.cameraWasActive=true}else{if(playing&&settings.motion){ctx.rotate(game.tilt*.55);ctx.transform(1,0,Math.sin(game.tilt)*.3,Math.cos(game.tilt*1.65),0,0);ctx.scale(game.zoom,game.zoom)}ctx.rotate(rotation);if(playing){const angle=game.tilt*.55,c=Math.cos(angle),s=Math.sin(angle),shear=Math.sin(game.tilt)*.3,compress=Math.cos(game.tilt*1.65),z=game.zoom,cr=Math.cos(rotation),sr=Math.sin(rotation);const a=c*z,b=s*z,d=(s*shear+c*compress)*z,k=(c*shear-s*compress)*z;game.lastDrawCamera=[a*cr+k*sr,b*cr+d*sr,-a*sr+k*cr,-b*sr+d*cr,0,0];game.cameraWasActive=false}}drawBackdrop(game,dark,light,playing);if(playing){drawWallField(game.walls,accent,game);ctx.save();drawCore(game,launch?referenceStartRadius(launch.age):camera?50:45.8807,dark,accent);ctx.restore();drawTeleportEffect(game,accent);const playerScale=1,orbit=launch?referenceStartRadius(launch.age)+16:66,ux=Math.cos(game.angle),uy=Math.sin(game.angle);polygon(playerPoly(game.angle,game.playerLean).map(([x,y])=>[(x-66*ux)*playerScale+orbit*ux,(y-66*uy)*playerScale+orbit*uy]),game.dead?'#fff':accent)}else if(screen==='select'){hex(100,dark,accent);polygon([[-6,-122],[6,-122],[0,-132]],accent)}ctx.restore();
if(screen==='title'){header('','ESC - QUIT');drawLogo('SUPER',220,160,520,100);drawLogo('HEXAGON',305,268,490,65);arrows();ctx.save();ctx.translate(selectionSlide*slideDirection*35,0);panel(['START GAME','OPTIONS','CREDITS'][menuItem]);ctx.restore();text('PRESS SPACE TO SELECT',480,565,23,'#fff')}
if(screen==='select'){header('TAB - HIGH SCORES','ESC - RETURN TO MENU');ctx.fillStyle='#000';ctx.fillRect(0,95,960,155);text(levels[selected][0],480+selectionSlide*slideDirection*45,115,49,accent);text('DIFFICULTY: '+levels[selected][1],480,177,23,'#ddd');text('BEST TIME: '+format(records[selected]),480,211,23,'#ddd');if(selected>=3)text('HYPER MODE',885,68,16,accent,'right');panel(unlocked(selected)?'PRESS SPACE TO START':'LOCKED',270,470);if(!unlocked(selected))text('SURVIVE 60S IN '+levels[selected-3][0],480,345,17,'#ddd');arrows()}
if(playing){ctx.save();header('BEST: '+format(records[selected]),'');polygon([[670,0],[960,0],[960,65],[815,65],[800,43],[690,43]],'#000b');text(game.time>=60||selected>=3?'HYPER MODE':'TIME',695,9,18,'#fff','left',120);text(format(game.time),942,12,42,'#fff','right',140);if(screen==='play'){if(game.time>=60&&game.time<63)text('LEVEL COMPLETE',480,155,36,'#fff')}if(screen==='over'){ctx.fillStyle='#000b';ctx.fillRect(0,150,960,210);text('GAME OVER',480,175,64);text('TIME: '+format(game.time),480,265,30,accent);text(game.time>=records[selected]?'NEW RECORD':'TRY AGAIN',480,313,22);panel('PRESS SPACE TO RETRY',435,470)}if(screen==='paused'){ctx.fillStyle='#0009';ctx.fillRect(0,130,960,260);text('PAUSED',480,220,65);panel('PRESS SPACE TO RESUME',435,500)}if(screen==='complete'){ctx.fillStyle='#000b';ctx.fillRect(0,130,960,260);text('CONGRATULATIONS',480,180,42);text('LEVEL COMPLETE',480,245,45,accent);text('A NEW HYPER MODE IS AVAILABLE',480,325,20);panel('PRESS SPACE TO CONTINUE',435,500)}ctx.restore()}
if(screen==='options'){ctx.fillStyle='#ffffff10';ctx.fillRect(230,185+optionIndex*75,500,65);header('','ESC - RETURN');text('OPTIONS',480,100,52);panel('MUSIC / SFX: '+(settings.sound?'ON':'OFF'),190,440);panel('ROTATION: '+(settings.motion?'ON':'OFF'),265,440);panel('FULLSCREEN',340,440);text('LEFT RIGHT / A D - MOVE',480,450,19);text('W S / UP DOWN - FLIP 180°',480,490,17)}
if(screen==='scores'){header('','ESC - RETURN');text('HIGH SCORES',480,95,48);levels.forEach((l,i)=>{text((i>=3?'HYPER ':'')+l[0],95,185+i*53,19,'#ddd','left',540);text(format(records[i]),865,185+i*53,24,'#fff','right')})}
if(screen==='credits'){header('','ESC - RETURN');text('CREDITS',480,105,50);text('ORIGINAL GAME',480,205,21,'#aaa');text('TERRY CAVANAGH',480,250,32);text('ORIGINAL MUSIC - CHIPZEL',480,320,22);text('UNOFFICIAL WEB RECREATION',480,410,22);text('MUSIC BY CHIPZEL',480,455,17,'#aaa')}
if(screen==='quit'){text('THANKS FOR PLAYING',480,210,40);text('CLOSE THIS TAB TO EXIT',480,300,23);panel('RETURN TO MENU',435,400)}if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash*.5})`;ctx.fillRect(0,0,960,600)}ctx.restore()}
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;scale=Math.min(innerWidth/960,innerHeight/600);ox=(innerWidth-960*scale)/2;oy=(innerHeight-600*scale)/2;buildControls();draw()}
function frame(t){const dt=Math.min((t-last)/1000||0,.05);last=t;clock+=dt;uiAge+=dt;pressAge+=dt;hoverAmount+=(Number(!!hovered)-hoverAmount)*(1-Math.exp(-dt*16));updatePalette(dt);if(pendingAction){pendingAction.left-=dt;if(pendingAction.left<=0){const fn=pendingAction.fn;pendingAction=null;fn()}}if(launch&&screen==='play'){launch.age+=dt;if(launch.age>=launch.duration)launch=null}if(settings.motion)spin+=dt*.18;selectionSlide=Math.max(0,selectionSlide-dt*5);flash=Math.max(0,flash-dt*3);if(transition){transition.age+=dt;if(transition.age>=.24)transition=null}
if(screen==='play'){const left=keys.has('ArrowLeft')||keys.has('KeyA')||[...touches.values()].includes(-1),right=keys.has('ArrowRight')||keys.has('KeyD')||[...touches.values()].includes(1);
// Gameplay owns the steady timebase. Never pause/jump wall movement to
 // follow fluctuating audio playback latency. Only the sound transport seeks.
 let elapsed=dt;
 if(music.active&&music.context?.state==='running'&&Math.abs(music.position-game.time)>.22)
  music.play(selected,game.time);
game.update(elapsed,Number(right)-Number(left));game.zoom=music.visualZoom(dt);game.referenceCamera=gentleStartCamera(game.recordedCamera||music.referenceCamera(),game.time);if(music.error)status.textContent=music.error;if(game.time>=60&&records[selected]<60){records[selected]=game.time;save();unlockedNow=selected<3;beep(850,.2)}if(game.timelineEnded){music.stop();change('complete');}else if(game.dead){records[selected]=Math.max(records[selected],game.time);save();flash=.35;change(unlockedNow?'complete':'over');beep(90,.3)}}
draw();
if(transition){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=(1-transition.age/.24)**2;ctx.drawImage(transition.snapshot,0,-transition.age*canvas.height*.04);ctx.restore()}
if(clock-audioStamp>.25){audioStamp=clock;canvas.dataset.audioState=music.context?.state||'awaiting-gesture';canvas.dataset.audioRms=music.measure().toFixed(4);canvas.dataset.musicTrack=['Courtesy','Otis','Focus'][selected%3];canvas.dataset.musicLoaded=String(!!music.source);canvas.dataset.pulse=music.pulse.toFixed(4);canvas.dataset.visualMode=game?.referenceCamera?'reference-affine':music.visualMode||'inactive';canvas.dataset.zoom=game?.zoom.toFixed(4)||'1';canvas.dataset.audioError=music.error||'';canvas.dataset.screen=screen;canvas.dataset.gameTime=game?.time.toFixed(3)||'0';canvas.dataset.wallSource=game?.timeline?.mode||'none';canvas.dataset.wallFrame=String(game?.wallFrame??-1);canvas.dataset.musicTime=music.position.toFixed(3);canvas.dataset.sound=settings.sound?'on':'off'}requestAnimationFrame(frame)}
addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey)return;
 if(['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code)&&screen==='play'){
  e.preventDefault();
  if(e.repeat||keys.has(e.code))return;
  keys.add(e.code);
  enableAudio();
  if(game?.teleportHalfTurn())music.effect('warp');
  return;
 }if(['ArrowLeft','ArrowRight','Space','Enter','KeyA','KeyD'].includes(e.code)&&!e.repeat)enableAudio();if(['ArrowLeft','ArrowRight','Space','Escape','Tab','KeyA','KeyD','KeyW','KeyS','Enter','ArrowUp','ArrowDown'].includes(e.code)){if(e.code==='Tab'&&screen!=='select')return;e.preventDefault();keys.add(e.code);if(e.repeat)return;if(screen==='options'&&['ArrowUp','ArrowDown'].includes(e.code)){optionIndex=(optionIndex+(e.code==='ArrowUp'?2:1))%3;beep();return}if(e.code==='Escape')back();else if(e.code==='Tab'&&screen==='select')change('scores');else if(['Space','Enter'].includes(e.code))queueAction(confirm,{x:250,y:screen==='select'?270:435,w:460,h:65});else if((screen==='title'||screen==='select')&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))choose(['ArrowLeft','KeyA'].includes(e.code)?-1:1)}});
addEventListener('keyup',e=>keys.delete(e.code));function suspend(){keys.clear();touches.clear();music.stop();if(screen==='play')change('paused')}addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});canvas.addEventListener('pointerdown',e=>{if(screen!=='play')return;enableAudio();canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,e.clientX<innerWidth/2?-1:1)});canvas.addEventListener('pointerup',e=>touches.delete(e.pointerId));canvas.addEventListener('pointercancel',e=>touches.delete(e.pointerId));canvas.addEventListener('contextmenu',e=>e.preventDefault());addEventListener('resize',resize);resize();change('title');requestAnimationFrame(frame);

function drawLogo(word,x,y,width,height){ctx.save();const intro=settings.motion?ease(uiAge/.38):1;ctx.globalAlpha*=intro;ctx.translate(x,y+(1-intro)*16);ctx.scale(width/(word.length*.95-.1),height);VectorFont.draw(ctx,word,0,0,1,'#fff','left');ctx.restore()}

function drawCore(g,r,fill,stroke){const blend=g.morph*g.morph*(3-2*g.morph);const points=Array.from({length:60},(_,i)=>{const u=i/60;function point(n){const k=u*n,j=Math.floor(k),f=k-j,a=j*Math.PI*2/n,b=(j+1)*Math.PI*2/n;return [Math.cos(a)*(1-f)+Math.cos(b)*f,Math.sin(a)*(1-f)+Math.sin(b)*f]}const a=point(g.fromSides),b=point(g.sides);return [(a[0]*(1-blend)+b[0]*blend)*r,(a[1]*(1-blend)+b[1]*blend)*r]});polygon(points,fill,stroke)}

// Sampled visible radii from user-provided PC video at 3.600, 3.667, 3.700, 3.833 s.
// Video viewport approximately 864 x 540, normalized to 960 x 600.
function referenceStartRadius(t){const frames=[[0,218.6469],[1/30,165.4579],[2/30,120.1629],[3/30,70.1945],[4/30,45.8807]];for(let i=1;i<frames.length;i++){if(t<=frames[i][0]){const [a,x]=frames[i-1],[b,y]=frames[i];return x+(y-x)*(t-a)/(b-a)}}return 45.8807}

// Keep the first second free of perspective tilt; introduce it over the next second.
function gentleStartCamera(m,time){if(!m||time>=2)return m;const angle=Math.atan2(m[1]-m[2],m[0]+m[3]),scale=Math.sqrt(m[0]*m[3]-m[1]*m[2]),c=Math.cos(angle)*scale,s=Math.sin(angle)*scale,neutral=[c,s,-s,c,0,0],x=Math.max(0,time-1),u=x*x*(3-2*x);return m.map((v,i)=>neutral[i]*(1-u)+v*u)}


// A single nonzero fill forms the union: overlapping sectors do not produce
// internal seams or transparent cracks from separate antialiased draw calls.
function drawWallField(walls,color,game){
 ctx.beginPath();
 for(const w of walls){
  if(w.points)continue;
  const points=wallVisualPoly(w,game.fromSides,game.sides,game.morph);
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 }
 ctx.fillStyle=color;ctx.fill('nonzero');
 for(const w of walls)if(w.points){
  ctx.beginPath();for(const ring of [w.points,...w.holes]){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fillStyle=color;ctx.fill('evenodd');
 }
}
