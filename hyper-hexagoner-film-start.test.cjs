'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),E=require('./engine.js');
const P=require('./stage-profiles.js'),D=require('./hyper-hexagoner-910-data.js');
const TAU=2*Math.PI;
let painted=true;
const film={ready:true,WIDTH:576,HEIGHT:360,getFrame:t=>({
 index:Math.round(t*60),rgb:[255,30,130],
 paths:painted?[[0,0,576,0,576,360,0,360]]:[]
})};
const code=fs.readFileSync(__dirname+'/hyper-hexagoner-910.js','utf8');
const mod={exports:{}};
new Function('module','require',code)(mod,p=>
 p==='./engine'?E:p==='./stage-profiles'?P:
 p==='./hyper-hexagoner-910-data'?D:film);
const H=mod.exports,g=new H.HyperHexagonerGame(
 H.create(null,3,8,{order:'video'}));
assert(g.atlasActive);
assert.equal(g.hit(),null,'film background alone cannot kill on spawn');
g.update(.5,0);assert.equal(g.dead,false);
assert.notEqual(g.walls,g._collisionWalls);
g.time=2.3;g.sampleWalls();
const occupied=(2+.5)*TAU/6,open=(4+.5)*TAU/6;
assert(g.hit(occupied),'real visible source wall must still hit');
assert.equal(g.hit(open),null,'open source sector remains safe');
const cached=g.walls;
g.time=2.304;g.sampleWalls();
assert(cached.length>0,'physics must not clear existing film polygons');
film.ready=false;g.sampleWalls();
assert.equal(g.atlasActive,false);
assert.equal(g.walls,g._collisionWalls);
assert(g.hit(occupied),'fallback physics still detects collision');
film.ready=true;painted=false;g.time=2.40;g.sampleWalls();
assert(g.atlasActive);
assert.equal(g.hit(occupied),null,'never die in a visually clear film frame');
console.log('PASS no premature death from filmed background; atlas switching, real hits, visual visibility and cached frame isolation');
