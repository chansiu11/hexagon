'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('./hard-feedback');
const sandbox={window:{},clearInterval};vm.runInNewContext(fs.readFileSync('audio.js','utf8'),sandbox);
const a=new sandbox.window.BeatAudio(),sources=[];a.master={};a.bass={};a.context={currentTime:5,createGain(){return {gain:{value:1},connect(){return this},disconnect(){}}},createBufferSource(){const n={connect(){return this},disconnect(){},start(){this.started=true},stop(){this.stopped=true}};sources.push(n);return n}};
for(const k of ['begin','line','triangle','square','pentagon','hexagon','death']){assert(fs.statSync('assets/voice/'+k+'.mp3').size>4000);a.voiceBuffers.set(k,{key:k,duration:1})}
a.beginRun();a.effect('start');assert.equal(sources.at(-1).buffer.key,'begin');
for(const t of [9.9,10,10.1,20,30,45,60,60.1])a.progress(t);
assert.deepEqual(sources.map(s=>s.buffer.key),['begin','line','triangle','square','pentagon','hexagon']);
a.decodedBuffers.set('courtesy',{duration:180});const voice=sources.at(-1);a.play(0,60);assert(!voice.stopped,'music correction must not cut a spoken announcement');
a.stop();assert(voice.stopped);a.effect('die');assert.equal(sources.at(-1).buffer.key,'death');assert(sources.at(-1).started);const death=sources.at(-1);a.beginRun();assert(death.stopped,'retry cancels the old death recording');
a.progress(60);assert.equal(sources.at(-1).buffer.key,'hexagon');const count=sources.length;a.progress(60);assert.equal(sources.length,count);
const g={time:104.55,rotation:2,rotationSpeed:-3};const before=JSON.stringify(g);
for(const t of [0,.2,.8,.93])assert.equal(D.deathView(g,t).zoom,1,'no death enlargement before the observed late zoom');
assert(D.deathView(g,1).zoom>2&&D.deathView(g,1).zoom<3);assert(D.deathView(g,1.1).zoom>=5);assert(D.deathView(g,.5).rotation<g.rotation,'keep the actual counterclockwise spin');
assert.equal(JSON.stringify(g),before);assert.equal(D.RESULT_START,1.2);
console.log('PASS original voice cues, one announcement per milestone, audible post-stop death source, safe retry/seek and measured late death zoom');
