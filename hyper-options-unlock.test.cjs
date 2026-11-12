'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync(__dirname+'/play.js','utf8');
const from=js.indexOf('function unlocked(i){');
const to=js.indexOf('function setControlMode(',from);
assert(from>=0&&to>from,'HYPER unlock logic should be visible');
const body=js.slice(from,to);
const records=[12,25,7,0,0,0,0],mode2=records.slice(),mode3=records.slice();
const settings={sound:true,motion:true,controlMode:1,hyperUnlocked:false};
let saved=null,sounds=0,rebuilds=0;
const status={textContent:''};
const save=()=>{saved=JSON.stringify({records,recordsMode2:mode2,recordsMode3:mode3,settings});};
const api=new Function('records','recordsMode2','recordsMode3','settings','save','beep','status','buildControls',
 body+'\nreturn {unlocked,unlockAllHyper};')(
 records,mode2,mode3,settings,save,()=>sounds++,status,()=>rebuilds++);
for(let n=0;n<3;n++)assert.equal(api.unlocked(n),true,'normal levels always accessible');
assert.equal(api.unlocked(6),true,'RANDOM always accessible');
for(let n=3;n<=5;n++)assert.equal(api.unlocked(n),false,'HYPER initially progression-locked');
api.unlockAllHyper();
for(let n=3;n<=5;n++)assert.equal(api.unlocked(n),true,'unlock ALL three HYPER stages');
assert(saved&&JSON.parse(saved).settings.hyperUnlocked===true,'save persistent toggle');
assert.deepEqual(records,[12,25,7,0,0,0,0],'do not falsify gameplay records');
assert.equal(sounds,1);assert.equal(rebuilds,1);
api.unlockAllHyper();assert.equal(sounds,1,'one-time unlock; do not change again');
assert.equal(rebuilds,1,'one-time UI update');
const restored=JSON.parse(saved).settings;
assert.equal(restored.hyperUnlocked,true,'reload keeps unlock');
assert(js.includes("screen==='options'&&e.code==='KeyU'"),
 'U key must work only from options and not steal mode 3 gameplay bindings');
assert(js.includes("240,420,480,55,unlockAllHyper"),
 'bottom option supports touch and keyboard confirmation');
assert(js.includes("))%5;beep()"),'up/down keyboard menu wraps five options');
assert(js.includes('HYPER MODES: ALL UNLOCKED'),
 'settings screen shows the completed state');
console.log('PASS OPTIONS: three HYPER levels unlocked, records unchanged, settings persisted, U key and touch control');
