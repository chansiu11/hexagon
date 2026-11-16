/* Rebuilt gameplay/controller renderer. Menus are owned by menu.js. */
(function(root){
'use strict';
const TAU=Math.PI*2,ORBIT=HexEngine.ORBIT;
const canvas=document.querySelector('#game');
const music=new HexAudio();
const inputs=new Set(),touches=new Map();
const directCodes=['KeyQ','KeyW','KeyE','KeyA','KeyS','KeyD','KeyZ','KeyX','KeyC','Digit0','Digit9','Digit8'];
let game=null,mode=1,sound=true,deathPlayed=false,startTicket=0,deathShownAt=0;
let announcedRank=0;
const point=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r];
const textColor='#fff';
function polygon(ctx,points,color,stroke=null,width=2){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(color){ctx.fillStyle=color;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function sectorColor(i,dark,light){return i%2?dark:light}
function drawHexagonerHUD(ctx,opts,accent){
 // Source 1595/1596: film HUD has a coloured rank underline, a narrower
 // high-contrast TIME label, and big *condensed* timer digits.
 // Do not change the distinct stage-0 HEXAGON HUD.
 const elapsed=game.time;
 const ranks=['POINT','LINE','TRIANGLE','SQUARE','SQUARE','PENTAGON'];
 const record=elapsed>=60 && elapsed>(opts.best||0);
 const heading=record?'NEW RECORD':(elapsed>=60?'BEST: '+opts.format(opts.best):ranks[Math.min(5,Math.floor(elapsed/10))]);
 const headingSize=heading.length>9?19:24;
 const headingWidth=Math.min(285,(heading.length*.95-.1)*headingSize);
 polygon(ctx,[[0,0],[Math.max(210,headingWidth+40),0],[Math.max(190,headingWidth+22),40],[0,40]],'#000');
 opts.text(heading,16,4,headingSize,'#fff','left',290);
 if(!record&&elapsed<60){
  ctx.fillStyle=accent;
  ctx.fillRect(16,31,Math.max(70,headingWidth-5),3);
 }
 polygon(ctx,[[622,0],[960,0],[960,64],[785,64],[766,40],[645,40]],'#000');
 opts.text('TIME',655,5,25,'#fff','left',115);
 const ticks=Math.floor(elapsed*100+1e-7);
 const timeText=String(Math.floor(ticks/100))+'.'+String(ticks%100).padStart(2,'0');
 const digitHeight=ticks>=10000?43:48;
 ctx.save();
 // Original timer numerals are markedly narrower than the stage-0 font.
 ctx.translate(960,0);ctx.scale(.70,1);
 opts.text(timeText,-22,4,digitHeight,'#fff','right',275);
 ctx.restore();
}
function drawArena(ctx,colors,opts){
 const [dark,light,accent]=colors;
 const camera=opts.settings.motion?game.rotation:0;
 ctx.save();
 if(game.dead&&deathShownAt){
  const age=Math.max(0,(performance.now()-deathShownAt)/1000);
  const zoom=1+.14*(1-Math.exp(-age*14));
  ctx.translate(480,300);ctx.scale(zoom,zoom);ctx.translate(-480,-300);
 }
 ctx.translate(480,300);
 ctx.rotate(camera);
 if(opts.settings.motion){
  ctx.transform(1,0,Math.sin(game.tilt)*.2,1,0,0);
  // In the HEXAGONER films the large opening core/ship shrinks rapidly into
  // the normal arena. The 20fps wall contour bank stores a clamped camera
  // zoom, so apply a separate visual launch scale instead of scaling the
  // collision orbit or inventing extra wall polygons.
  let introZoom=1;
  if(game.level===1&&game.time<.85){
   const source=game.replay?.kind==='parts'?game.replay.source:game.replay?.id;
   const u=Math.max(0,Math.min(1,game.time/.85));
   const hold=1-u*u*(3-2*u);
   introZoom+=hold*(source==='1596'?2.3:1.3);
  }
  ctx.scale(game.zoom*introZoom,game.zoom*introZoom);
 }
 for(let i=0;i<game.sides;i++){
  const a=i*TAU/game.sides,b=(i+1)*TAU/game.sides;
  polygon(ctx,[[0,0],point(1800,a),point(1800,b)],sectorColor(i,dark,light));
 }
 // Use the same world-space panel points as the engine's hit detection.
 // Submit disconnected panels as independent closed contours (no center seams).
 for(const wall of game.walls){
  ctx.beginPath();
  for(const ring of [wall.points,...(wall.holes||[])]){
   ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
   ctx.closePath();
  }
  ctx.fillStyle=accent;
  ctx.globalAlpha=wall.opacity===undefined?1:Math.max(0,Math.min(1,wall.opacity));
  ctx.fill('evenodd');ctx.globalAlpha=1;
 }
 let core=Array.from({length:game.sides},(_,i)=>point(50,i*TAU/game.sides));
 const changed=game.time-game.shapeChangedAt;
 if(changed>=0&&changed<.16&&game.shapeFrom!==game.shapeTo){
  const t=Math.max(0,Math.min(1,changed/.16));
  const radial=(sides,angle)=>{
   const sector=TAU/sides;
   const phase=((angle%sector)+sector)%sector;
   return 50*Math.cos(Math.PI/sides)/Math.cos(phase-Math.PI/sides);
  };
  core=Array.from({length:60},(_,i)=>{
   const a=i*TAU/60;
   return point(radial(game.shapeFrom,a)*(1-t)+radial(game.shapeTo,a)*t,a);
  });
 }
 polygon(ctx,core,dark,accent,3);
 polygon(ctx,HexEngine.playerPolygon(game.angle),game.dead?'#fff':accent);
 if(game.death){
  const [x,y]=game.death.contact;
  ctx.beginPath();ctx.arc(x,y,9,0,TAU);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
 }
 if(game.controlMode===3&&!game.dead){
  for(let i=0;i<game.sides;i++){
   const a=(i+.5)*TAU/game.sides;
   const [x,y]=point(113,a);
   ctx.save();ctx.translate(x,y);ctx.rotate(-camera);
   ctx.fillStyle='#000a';ctx.fillRect(-17,-17,34,34);
   opts.text(directCodes[i].replace('Key','').replace('Digit',''),-9,-10,14,'#fff','left',24);
   ctx.restore();
  }
 }
 ctx.restore();
 // HEXAGONER has its own source-measured HUD geometry, leaving HEXAGON
 // unchanged. Render after the arena transform so text stays screen-fixed.
 if(game.level===1){drawHexagonerHUD(ctx,opts,accent);}else{
 // Gameplay HUD is intentionally a new implementation. Video-specific
 // proportions, dynamic camera and timed voice cues belong to step 1-3.
 const rankNames=['POINT','LINE','TRIANGLE','SQUARE','SQUARE','PENTAGON'];
 const recordReached=game.level===1&&game.time>=60&&game.time>(opts.best||0);
 const rankTime=Math.min(5,Math.floor(game.time/10));
 const showRank=game.level===1&&!(opts.best>0&&game.time<opts.best)&&game.time<60;
 const levelBanner=game.level===1?(showRank||recordReached):game.time>=59.25&&game.time<61.85;
 if(levelBanner){
  if(game.level===1){
   polygon(ctx,[[0,0],[400,0],[380,41],[0,41]],'#000');
   opts.text(recordReached?'NEW RECORD':rankNames[rankTime],14,7,26,'#fff','left',380);
  }else{
   polygon(ctx,[[0,0],[370,0],[352,73],[0,73]],'#000');
   opts.text('LEVEL UP',14,3,21,'#fff','left',300);
   opts.text('HEXAGON',14,25,42,'#fff','left',330);
  }
 }else{
  polygon(ctx,[[0,0],[276,0],[250,40],[0,40]],'#000');
  opts.text('BEST: '+opts.format(opts.best),18,7,26,'#fff','left',230);
 }
 polygon(ctx,[[622,0],[960,0],[960,65],[782,65],[768,40],[650,40]],'#000');
 opts.text('TIME',654,8,27,'#fff','left',112);
 const centis=Math.floor(game.time*100+1e-7),seconds=Math.floor(centis/100);
 opts.text(String(seconds)+'.'+String(centis%100).padStart(2,'0'),935,7,37,'#fff','right',185);
 if(!levelBanner&&game.level!==1)opts.text('MODE '+mode,78,54,17,'#ddd','left');
 }
 if(game.replay?.kind==='parts'){
  if(new URLSearchParams(location.search).get('debug')==='1')
   opts.text('FILMED PART '+game.replay.activePart+' / '+game.replay.source+' / '+
    (game.time<60?'0–60':'60+')+' / '+game.replay.transitions+' SEAMS',480,570,14,'#fff','center',730);
 }else if(game.replay)
  opts.text('SOURCE '+game.replay.id+' / CHRONOLOGICAL REPLAY',480,570,14,'#fff','center',730);
 if(mode===2&&!game.dead){
  polygon(ctx,[[28,508],[164,508],[174,566],[18,566]],'#000a','#ffffff80',2);
  opts.text(game.doubleStepReady?'READY':'2 STEPS',96,517,21,'#fff');
 }
 if(mode===3&&!game.dead)opts.text('PRESS THE KEY SHOWN IN EACH SECTOR',480,493,16,'#ddd');
}
function replayPalette(g){
 if(!g?.replay)return null;
 const parts=g.replay.kind==='parts';
 const source=parts?g.replay.source:g.replay.id;
 const original=parts?g.replay.recordings[source]:g.replay;
 const pal=original?.palette;
 if(!pal?.colors?.length)return null;
 const sampleIndex=parts?g.replay.sourceFrame:g.replayFrame;
 const i=Math.max(0,Math.min(pal.colors.length-1,
   Math.floor(sampleIndex/original.fps*pal.fps)));
 const sampled=parts&&g.replay.colors?g.replay.colors:pal.colors[i];
 const color=sampled.slice(0,9);
 // Dark pixels from the source-video intro/occlusion were occasionally
 // mislabeled as wall-color pixels. They must never turn the visible ship
 // and central outline black. Opening fallback colors are measured directly
 // from the respective filmed ship/core border.
 if(Math.max(...color.slice(6,9))<90){
  let replacement=null;
  if(original===g.replay&&g.time<1.2 || parts&&g.time<1.2){
   replacement=g.level===1?(source==='1595'?[140,172,60]:[228,36,116]):
    (source==='1595'?[206,54,35]:[200,121,26]);
  }else{
   const n=Math.max(0,Math.min(pal.colors.length-1,i));
   for(let d=1;d<=5&&!replacement;d++){
    for(const j of [n-d,n+d]){
     if(j<0||j>=pal.colors.length)continue;
     const candidate=pal.colors[j].slice(6,9);
     if(Math.max(...candidate)>125)replacement=candidate;
    }
   }
   replacement ||= source==='1595'?[206,54,35]:[200,121,26];
  }
  color.splice(6,3,...replacement);
 }
 return [0,3,6].map(offset=>'rgb('+color.slice(offset,offset+3).join(',')+')');
}
function draw(ctx,opts){
 if(!game)return;
 drawArena(ctx,replayPalette(game)||opts.colors,opts);
 if(opts.screen==='paused'){
  ctx.fillStyle='#0009';ctx.fillRect(0,130,960,260);
  opts.text('PAUSED',480,220,65);opts.panel('PRESS SPACE TO RESUME',435,500);
 }
 if(opts.screen==='complete'){
  ctx.fillStyle='#000c';ctx.fillRect(0,200,960,125);
  opts.text('SOURCE RUN COMPLETE',480,212,35,'#fff');
  opts.text('LAST: '+opts.format(game.time),480,262,28,'#fff');
  opts.header('TAB - HIGH SCORES','ESC - STAGE SELECT');
  opts.panel('PRESS SPACE TO RETRY',535,470);
 }
 if(opts.screen==='over'){
  ctx.fillStyle='#000c';ctx.fillRect(0,200,960,125);
  opts.text('GAME OVER',480,207,43,'#fff');
  opts.text('LAST: '+opts.format(game.time),480,260,29,'#fff');
  opts.header('TAB - HIGH SCORES','ESC - STAGE SELECT');
  opts.panel('PRESS SPACE TO RETRY',535,470);
 }
}
async function start(index,controlMode=1,enabled=true){
 if(!HexEngine.hasMap(index))return false;
 const ticket=++startTicket;
 const map=HexEngine.getMap(index);
 const args=new URLSearchParams(location.search);
 const requested=args.get('trace');
 const raw=['1595','1596'].includes(requested);
 let playback;
 if(index===1){
  // Task 2-2: normal HEXAGONER gameplay uses both distinct films' dodge
  // phrases; ?trace=1595 or ?trace=1596 retains chronological source replay.
  if(raw){
   const [source,palette]=await Promise.all([
    HexReplay.load(requested,map.replays[requested]),HexReplay.loadPalette(requested,1)]);
   source.palette=palette;playback=source;
  }else{
   const [first,second,paletteA,paletteB]=await Promise.all([
    HexReplay.load('1595',map.replays['1595']),HexReplay.load('1596',map.replays['1596']),
    HexReplay.loadPalette('1595',1),HexReplay.loadPalette('1596',1)]);
   first.palette=paletteA;second.palette=paletteB;
   const value=args.get('seed');
   const seed=value===null?(Date.now()^Math.floor(performance.now()*1000)):
    Number.isFinite(Number(value))?Number(value):Date.now();
   playback=HexagonerParts.create({'1595':first,'1596':second},{seed,
    firstSource:['1595','1596'].includes(args.get('first'))?args.get('first'):null,
    playerSpeed:map.playerSpeed});
  }
 }else if(index===2){
  // HEXAGONEST task 3-1: source order ONLY. 3-2 will provide connected
  // random dodge phrases after both complete source runs are measured.
  // Never fall through to the unrelated HEXAGON stage-zero part sampler.
  const id=raw?requested:'1595';
  const option=map.replays?.[id];
  if(!option)throw new Error('HEXAGONEST source video missing: '+id);
  playback=await HexReplay.load(id,option);
 }else if(raw){
  const option=map.replays?.[requested];
  if(!option)throw new Error('Unregistered filmed run '+requested);
  const [source,palette]=await Promise.all([
    HexReplay.load(requested,option),HexReplay.loadPalette(requested)]);
  source.palette=palette;playback=source;
 }else{
  const ids=['1595','1596'];
  const [first,second,paletteA,paletteB]=await Promise.all([
    HexReplay.load(ids[0],map.replays[ids[0]]),
    HexReplay.load(ids[1],map.replays[ids[1]]),
    HexReplay.loadPalette(ids[0]),HexReplay.loadPalette(ids[1])]);
  first.palette=paletteA;second.palette=paletteB;
  const value=args.get('seed');
  const seed=value===null?(Date.now()^Math.floor(performance.now()*1000)):
    Number.isFinite(Number(value))?Number(value):(Date.now()>>>0);
  playback=HexParts.create({'1595':first,'1596':second},{
    seed,firstSource:['1595','1596'].includes(args.get('first'))?args.get('first'):null
  });
 }
 // Pending file loads can finish after returning to stage selection.
 if(ticket!==startTicket)return false;
 clearInput();music.stop();
 game=new HexEngine.ArenaGame(index);mode=controlMode;sound=enabled;
 game.attachReplay(playback,{spectating:args.get('spectate')==='1'});
 // Original source footage starts with the ship above-right of the core.
 // The stored wall coordinates are camera-corrected, so cancel the first
 // recorded camera phase to place the arrow in that same screen sector.
 const initialSource=playback.kind==='parts'?playback.source:playback.id;
 // The HEXAGONER film opens at different ship bearings from stage-1 HEXAGON.
 // Measured in the *screen* plane at the source gameplay start frame.
 // HEXAGONEST filmed ship bearing is not yet measured. Keep the engine's
 // normal initial angle until video measurement, rather than borrowing the
 // ship bearing measured in the HEXAGON / HEXAGONER recordings.
 if(index!==2){
  const sourceScreenAngle=index===1?(initialSource==='1595'?-Math.PI/2:.26):
   (initialSource==='1595'?-1.15:-1.18);
  game.angle=((sourceScreenAngle-game.rotation)%TAU+TAU)%TAU;
 }
 game.setControlMode(mode);game.sampleWalls();
 music.setEnabled(sound);deathPlayed=false;deathShownAt=0;announcedRank=0;
 if(sound)music.unlock().then(()=>{
  if(ticket===startTicket&&game&&!game.dead&&!game.paused){
   music.play(index,game.time);music.voice('begin');
  }
 }).catch(()=>{});
 return true;
}
function stop(){++startTicket;clearInput();music.stop();game=null;deathPlayed=false;deathShownAt=0;}
function pause(){clearInput();game?.pause();music.stop();}
function resume(){game?.resume();if(game&&sound)music.play(game.level,game.time);}
function clearInput(){inputs.clear();touches.clear();}
function setMode(value){if(!game)return false;clearInput();game.setControlMode(value);mode=value;return true;}
function setSound(value){sound=!!value;music.setEnabled(sound);if(!sound)music.stop();else if(game&&!game.dead&&!game.paused)music.unlock().then(()=>music.play(game.level,game.time)).catch(()=>{});}
function selectSound(){music.unlock().then(()=>music.select()).catch(()=>{});}
function onDeath(){
 if(!game?.dead||deathPlayed)return;
 deathPlayed=true;deathShownAt=performance.now();clearInput();music.death();
}
function tick(dt){
 if(!game||game.dead||game.paused||game.timelineEnded)return;
 const left=inputs.has('ArrowLeft')||inputs.has('KeyA')||[...touches.values()].includes(-1);
 const right=inputs.has('ArrowRight')||inputs.has('KeyD')||[...touches.values()].includes(1);
 const priorSides=game.sides,priorTime=game.time;
 game.update(dt,mode===1?Number(right)-Number(left):0);
 if(game.level===1&&sound&&!game.dead){
  const stages=[10,20,30,50,60],voiceNames=['line','triangle','square','pentagon','hexagon'];
  for(let i=announcedRank;i<stages.length;i++){
   if(priorTime<stages[i]&&game.time>=stages[i]){
    music.voice(voiceNames[i]);announcedRank=i+1;
   }
  }
 }
 if(priorSides!==game.sides){
  const name={3:'triangle',4:'square',5:'pentagon',6:'hexagon'}[game.sides];
  if(name&&sound)music.voice(name);
  if(mode===3)root.HexMenu?.buildControls();
 }
 if(game.dead)onDeath();
 canvas.dataset.gameTime=String(game.time);
 canvas.dataset.wallCount=String(game.walls.length);
 canvas.dataset.sourceTrace=game.replay?.kind==='parts'?game.replay.source:game.replay?.id||'';
 canvas.dataset.partId=game.replay?.kind==='parts'?game.replay.activePart:'';
 canvas.dataset.partTransitions=String(game.replay?.transitions||0);
 canvas.dataset.partEpoch=String(game.replay?.epoch??'');
 canvas.dataset.sourceFrame=String(game.replayFrame);
 canvas.dataset.gameState=game.dead?'dead':'running';
}
function keydown(e){
 if(!game||game.dead)return false;
 if(mode===3){
  const i=directCodes.slice(0,game.sides).indexOf(e.code);
  if(i!==-1){e.preventDefault();if(!e.repeat&&!inputs.has(e.code)){inputs.add(e.code);game.selectSector(i);if(game.dead)onDeath()}return true;}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();return true;}
 }
 if(mode===2&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){
  e.preventDefault();
  if(!e.repeat&&!inputs.has(e.code)){
   inputs.add(e.code);game.stepSector(['ArrowLeft','KeyA'].includes(e.code)?-1:1);
   if(game.dead)onDeath();
  }
  return true;
 }
 if(['KeyW','ArrowUp'].includes(e.code)&&mode===2){
  e.preventDefault();
  if(!e.repeat&&!inputs.has(e.code)){inputs.add(e.code);game.armDoubleStep()}
  return true;
 }
 if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)&&mode===1){
  e.preventDefault();inputs.add(e.code);return true;
 }
 if(['Space','Enter','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();return true;}
 return false;
}
function keyup(e){inputs.delete(e.code);}
function pointerdown(e){
 if(!game||game.dead)return;
 canvas.setPointerCapture?.(e.pointerId);
 if(mode===3){
  // On-screen lower direct buttons are handled by the accessible button layer.
  const rect=canvas.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const x=e.clientX-cx,y=e.clientY-cy;
  const scale=Math.min(rect.width/960,rect.height/600);
  const r=Math.hypot(x,y)/scale;
  if(r>=80&&r<=160){
   const a=((Math.atan2(y,x)-game.rotation)%TAU+TAU)%TAU;
   game.selectSector(Math.floor(a/TAU*game.sides));if(game.dead)onDeath();
  }
  return;
 }
 const direction=e.clientX<canvas.getBoundingClientRect().left+canvas.clientWidth/2?-1:1;
 if(mode===2){game.stepSector(direction);if(game.dead)onDeath()}
 else touches.set(e.pointerId,direction);
}
function pointerup(e){touches.delete(e.pointerId);}
function buildControls(button,controls){
 if(!game)return;
 if(mode===2)button('2 STEPS',18,508,156,58,()=>game.armDoubleStep());
 if(mode===3){
  controls.dataset.directSides=String(game.sides);
  for(let i=0;i<game.sides;i++)
   button('SECTOR '+directCodes[i],95+i*130,520,115,60,()=>{game.selectSector(i);if(game.dead)onDeath()});
 }
}
root.HexPlay={get game(){return game},start,stop,pause,resume,clearInput,setMode,setSound,selectSound,
 tick,draw,keydown,keyup,pointerdown,pointerup,buildControls};
})(window);
