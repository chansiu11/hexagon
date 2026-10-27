'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Game,wallVisualPoly}=require('./engine');
const code=fs.readFileSync('./play.js','utf8');
const start=code.lastIndexOf('function drawWallField(');
assert(start>0,'wall painter must be present');
const mock={
 fills:0,paths:0,vertices:0,
 beginPath(){this.paths++;},moveTo(){this.vertices++;},
 lineTo(){this.vertices++;},closePath(){},
 fill(){this.fills++;},set fillStyle(value){this.color=value;}
};
const paint=new Function('ctx','wallVisualPoly',code.slice(start)+'\nreturn drawWallField;')(mock,wallVisualPoly);
let rendered=0;
for(let level=0;level<6;level++){
 const raw=require('./assets/timelines/waves-stage-'+level+'.json');
 const game=new Game(level,raw);
 for(let f=0;f<60*60;f++){
  game.time=f/60;game.sampleWalls();
  mock.fills=0;mock.paths=0;mock.vertices=0;
  paint(game.walls,'#ffe766',game);
  assert.equal(mock.fills,game.walls.length,'wall painter skipped or combined actors, stage '+(level+1)+' at '+(f/60).toFixed(3));
  assert.equal(mock.paths,game.walls.length);
  assert.equal(mock.vertices,game.walls.length*4);
  rendered+=mock.fills;
 }
 console.log('PASS renderer stage '+(level+1)+' 0-60 seconds');
}
assert(rendered>500000,'insufficient wall coverage');
console.log('PASS all '+rendered+' wall actors painted independently');
