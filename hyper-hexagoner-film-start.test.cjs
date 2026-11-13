'use strict';
// The 60fps film remains available for offline comparison, but its
// background/core/other-player contours must never become LIVE walls.
// This covers the earlier false-spawn and pass-through bugs together.
const assert=require('node:assert/strict');
const fs=require('node:fs'),E=require('./engine.js');
const P=require('./stage-profiles.js'),D=require('./hyper-hexagoner-910-data.js');
const TAU=2*Math.PI;
let filmLoads=0;
const film={ready:false,WIDTH:576,HEIGHT:360,
 getFrame(){filmLoads++;return {index:0,rgb:[255,30,130],
  paths:[[0,0,576,0,576,360,0,360]]};}};
const code=fs.readFileSync(__dirname+'/hyper-hexagoner-910.js','utf8');
const compiled={exports:{}};
new Function('module','require',code)(compiled,p=>
 p==='./engine'?E:p==='./stage-profiles'?P:
 p==='./hyper-hexagoner-910-data'?D:film);
const H=compiled.exports;
const timeline=H.create(null,3,8,{order:'video'});
const g=new H.HyperHexagonerGame(timeline);
assert.equal(g.atlasActive,false,'video geometry is never the live hitbox');
assert.equal(g.walls,g._collisionWalls,'one shared render/collision list');
assert.equal(filmLoads,0,'do not decode the reference movie during play');
assert.equal(g.hit(),null,'no wall at spawn');
g.update(.5,0);
assert.equal(g.dead,false,'no early death');
assert.equal(g.atlasActive,false);
g.time=2.30;g.sampleWalls();
const occupied=(2+.5)*TAU/6,open=(4+.5)*TAU/6;
assert(g.hit(occupied),'visible physical wall must cause a collision');
assert.equal(g.hit(open),null,'open polygon lane remains safe');
for(const wall of g.walls)
 assert.deepEqual(wall.points,E.wallVisualPoly(wall),
  'all gameplay walls use identical quad geometry for render and hit');
const same=g.walls[0];
const oldRadius=same.r;
g.time=2.31;g.sampleWalls();
assert(Math.abs(same.r-oldRadius+.01*H.SPEED)<.02,
 'wall advances smoothly at its specified radial speed');
film.ready=false;g.sampleWalls();
assert.equal(g.walls,g._collisionWalls);
assert(g.hit(occupied),'no collision changes when atlas becomes unavailable');
film.ready=false;g.sampleWalls();
assert.equal(filmLoads,0,'failed film loading uses source-phrase geometry');
assert(g.hit(occupied),'no collision changes when atlas is unavailable');
console.log('PASS HYPER 9/10: shared visible/hit polygons, center clear, correct wall speed, safe film loading and source-lane collisions');
