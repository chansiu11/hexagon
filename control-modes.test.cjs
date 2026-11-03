'use strict';
const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED}=require('./engine');
const TAU=Math.PI*2;
const eq=(a,b)=>Math.abs((((a-b+Math.PI)%TAU)+TAU)%TAU-Math.PI)<1e-9;

const old=new Game();
assert.equal(old.controlMode,1,'default movement must remain original mode 1');
old.update(1/60,1);
assert(Math.abs(old.angle-(-Math.PI/2+PLAYER_SPEED/60))<1e-8,
 'mode 1 continuous turn must remain unchanged');

for(const sides of [6,5,4]){
 const g=new Game();
 g.sides=sides;g.fromSides=sides;g.morph=1;g.angle=-Math.PI/2;
 g.setControlMode(2);
 const step=TAU/sides;
 const original=g.angle;
 assert.equal(g.controlMode,2);
 assert(g.stepSector(1));
 assert(eq(g.angle,original+step),'one key press must move one side to the right for '+sides);
 const stepped=g.angle;
 g.update(1/60,1);
 assert(eq(g.angle,stepped),'holding a direction must not rotate in mode 2');
 assert(g.stepSector(-1));
 assert(eq(g.angle,original),'one reverse step must return to same sector');
 for(let i=0;i<sides;i++)g.stepSector(1);
 assert(eq(g.angle,original),'a full orbit must wrap after exactly '+sides+' steps');
 g.setControlMode(1);
 assert.equal(g.controlMode,1);
 const before=g.angle;g.update(1/60,1);
 assert(!eq(g.angle,before),'switching back to mode 1 must restore continuous movement');
}
console.log('PASS mode 1 unchanged, mode 2 one sector per press for hexagon/pentagon/square, wraparound and switching');
