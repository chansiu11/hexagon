/* Rebuilt gameplay/controller renderer. Menus are owned by menu.js. */
(function(root){
'use strict';
const TAU=Math.PI*2,ORBIT=HexEngine.ORBIT;
const canvas=document.querySelector('#game');
const music=new HexAudio();
const inputs=new Set(),touches=new Map();
const directCodes=['KeyQ','KeyW','KeyE','KeyA','KeyS','KeyD','KeyZ','KeyX','KeyC','Digit0','Digit9','Digit8'];
let game=null,mode=1,sound=true,deathPlayed=false,startTicket=0,deathShownAt=0;
const point=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r];
const textColor='#fff';
function polygon(ctx,points,color,stroke=null,width=2){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(color){ctx.fillStyle=color;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function sectorColor(i,dark,light){return i%2?dark:light}
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
  ctx.scale(game.zoom,game.zoom);
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
 // Gameplay HUD is intentionally a new implementation. Video-specific
 // proportions, dynamic camera and timed voice cues belong to step 1-3.
 const levelBanner=game.time>=59.25&&game.time<61.85;
 if(levelBanner){
  polygon(ctx,[[0,0],[370,0],[352,73],[0,73]],'#000');
  opts.text('LEVEL UP',14,3,21,'#fff','left',300);
  opts.text('HEXAGON',14,25,42,'#fff','left',330);
 }else{
  polygon(ctx,[[0,0],[276,0],[250,40],[0,40]],'#000');
  opts.text('BEST: '+opts.format(opts.best),18,7,26,'#fff','left',230);
 }
 polygon(ctx,[[622,0],[960,0],[960,65],[782,65],[768,40],[650,40]],'#000');
 opts.text('TIME',654,8,27,'#fff','left',112);
 const centis=Math.floor(game.time*100+1e-7),seconds=Math.floor(centis/100);
 opts.text(String(seconds)+'.'+String(centis%100).padStart(2,'0'),935,7,37,'#fff','right',185);
 opts.text('MODE '+mode,78,54,17,'#ddd','left');
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
 if(g?.replay?.kind==='parts'&&g.replay.colors)
  return [0,3,6].map(offset=>'rgb('+g.replay.colors.slice(offset,offset+3).join(',')+')');
 const pal=g?.replay?.palette;
 if(!pal?.colors?.length)return null;
 const i=Math.min(pal.colors.length-1,Math.max(0,
  Math.floor((g.time-g.replay.gameStartOffset)*pal.fps/g.replay.gameRate+1e-9)));
 const frame=pal.colors[i];
 return [0,3,6].map(offset=>'rgb('+frame.slice(offset,offset+3).join(',')+')');
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
 if(raw){
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
 const sourceScreenAngle=initialSource==='1595'?-1.15:-1.18;
 game.angle=((sourceScreenAngle-game.rotation)%TAU+TAU)%TAU;
 game.setControlMode(mode);game.sampleWalls();
 music.setEnabled(sound);deathPlayed=false;deathShownAt=0;
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
 const priorSides=game.sides;
 game.update(dt,mode===1?Number(right)-Number(left):0);
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
