'use strict';
const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED}=require('./engine');
const TAU=Math.PI*2;
const eq=(a,b)=>Math.abs((((a-b+Math.PI)%TAU)+TAU)%TAU-Math.PI)<1e-9;

const old=new Game();
assert.equal(old.controlMode,1,'default movement must remain original mode 1');
old.update(1/60,1);
assert(eq(old.angle,-Math.PI/2+PLAYER_SPEED/60),
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
 // Game.update also follows each stage's scheduled polygon shape; only
 // check the no-hold-rotation property for the real starting hexagon.
 if(sides===6){
  g.update(1/60,1);
  assert(eq(g.angle,stepped),'holding a direction must not rotate in mode 2');
 }
 assert(g.stepSector(-1));
 assert(eq(g.angle,original),'one reverse step must return to same sector');
 for(let i=0;i<sides;i++)g.stepSector(1);
 assert(eq(g.angle,original),'a full orbit must wrap after exactly '+sides+' steps');
 g.setControlMode(1);
 assert.equal(g.controlMode,1);
 const before=g.angle;g.update(1/60,1);
 assert(!eq(g.angle,before),'switching back to mode 1 must restore continuous movement');
}
// Mode 2's 180-key becomes a HELD double-step modifier, not a flip.
for(const sides of [6,5,4]){
 const g=new Game();g.sides=sides;g.angle=.5*TAU/sides;g.setControlMode(2);
 const step=TAU/sides,initial=g.angle;
 assert(!g.teleportHalfTurn(),'mode 2 must never teleport 180 degrees');
 assert(eq(g.angle,initial),'mode 2 modifier alone cannot change position');
 assert(g.setDoubleStepHeld(true));
 assert(eq(g.angle,initial),'pressing modifier cannot move');
 assert(g.stepSector(1));assert(eq(g.angle,initial+2*step));
 assert.equal(g.stepEffect.count,2);
 const once=g.angle;
 assert(g.stepSector(1));assert(eq(g.angle,once+2*step),
  'each direction press WHILE held must move two cells');
 g.setDoubleStepHeld(false);
 const released=g.angle;
 assert(g.stepSector(-1));assert(eq(g.angle,released-step),
  'first direction press AFTER release must move one cell');
 assert.equal(g.stepEffect.count,1);
 g.setControlMode(1);
 assert.equal(g.doubleStepHeld,false);
}
const effect=new Game();effect.setControlMode(2);
effect.stepSector(1);assert(effect.stepEffect);
effect.update(.25,0);assert.equal(effect.stepEffect,null,'step visuals must expire');
const originalFlip=new Game();
assert(originalFlip.teleportHalfTurn(),'mode-one flip remains enabled');
assert.equal(originalFlip.doubleStepHeld,false,'mode one cannot activate modifier');
console.log('PASS mode 1 unchanged, mode 2 one sector per press for hexagon/pentagon/square, wraparound and switching');
