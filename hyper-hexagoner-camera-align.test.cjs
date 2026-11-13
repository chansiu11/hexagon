'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('./engine.js'),H=require('./hyper-hexagoner-910.js');
const D=require('./hyper-hexagoner-910-data.js');
const F=require('./hyper-hexagoner-filmed-camera-15fps.js');
const A=require('./hyper-hexagoner-wall-atlas.js');
const source=fs.readFileSync(__dirname+'/play.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),TAU=2*Math.PI;
const video=new H.HyperHexagonerGame(H.create(null,17,100,{order:'video'}));
const mod60=x=>(x%60+60)%60,dist60=(a,b)=>Math.abs(mod60(a-b+30)-30);
assert.equal(F.COUNT,1270);
for(const [time,angle] of [[404.4,30],[405.82,46],[407.4,49],[419,36],
 [432,44],[449,30],[467,34],[484,24]]){
 const t=D.gameTimeAtVideo(time);video.time=t;video.sampleWalls();
 assert.deepEqual(video.recordedCamera,H.filmedCameraAt(t));
 const actual=mod60(Math.atan2(video.recordedCamera[1],
  video.recordedCamera[0])*180/Math.PI);
 assert(dist60(actual,angle)<7,'filmed polygon spoke orientation '+time);
 assert(!video.atlasActive&&video.walls===video._collisionWalls);
 assert(video.walls.every(w=>w.points.length===4&&!w.atlasContour));
}
assert(A.isCoreOutline([328,180,308,215,268,215,248,180,268,145,308,145]));
assert(!A.isCoreOutline([330,180,355,180,345,230,310,220]));
video.time=2.30;video.sampleWalls();
const occupied=video.walls.find(w=>w.r<=66&&w.r+w.thickness>=66);
assert(occupied,'wall reaches player orbit');
assert(video.hit((occupied.sector+.5)*TAU/6),'visible wall must kill');
const clear=Array.from({length:360},(_,i)=>i*TAU/360).find(a=>
 !video.walls.some(w=>E.pointInPolygon(E.playerHitPoint(a),w.points)));
assert(clear!==undefined,'test fixture has at least one free lane');
assert.equal(video.hit(clear),null,'visible opening is not blocked');
const radii=new Map(video.walls.map(w=>[w.id,w.r]));
video.time+=1/60;video.sampleWalls();
const continuous=video.walls.find(w=>radii.has(w.id));
assert(continuous&&Math.abs(continuous.r-radii.get(continuous.id)+H.SPEED/60)<.03,
 'drawn wall radius advances continuously');
assert(source.includes('(game.recordedCamera||HexHyper910.cameraAt(game.time,music.pulse))'));
assert(source.includes("!(game.hyperHexagonerSource910&&game.timeline.orderMode==='video')"));
assert(html.indexOf('hyper-hexagoner-filmed-camera-15fps.js')<
 html.indexOf('hyper-hexagoner-910.js'));
const random=new H.HyperHexagonerGame(H.create(null,17,100,{order:'random'}));
assert.deepEqual(random.recordedCamera,H.cameraAt(0));
console.log('PASS HYPER 9/10: filmed 15fps camera spokes, no ghost core, shared drawable/hit quads, continuous wall radial movement');
