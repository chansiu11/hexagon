import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTape,frameAt,occupied,sources} from './source-replay.mjs';

test('video sources have two distinct last-level game-zero offsets',()=>{
 assert.equal(sources.length,2);
 assert.ok(sources[0].gameZeroSeconds>0);
 assert.ok(sources[1].gameZeroSeconds>0);
 assert.notEqual(sources[0].filename,sources[1].filename);
});
test('60-second boundary does not reset the tape',()=>{
 const raw=Buffer.alloc(96*128/8,255).toString('base64');
 const tape=parseTape({format:'stage6-source-polar-v1',fps:15,count:1000,
   angle_bins:96,radius_bins:128,screen_width:320,screen_height:180,max_radius:186,
   frames:Array(1000).fill(raw),representative_rgb:Array(1000).fill([255,255,255]),
   observed_counts:Array(1000).fill(96*128)});
 assert.equal(frameAt(tape,0).index,0);
 assert.equal(frameAt(tape,60-1/15).index,899);
 assert.equal(frameAt(tape,60).index,900);
 assert.equal(frameAt(tape,60+1/15).index,901);
 assert.equal(frameAt(tape,90).index,999);
 assert.equal(occupied(frameAt(tape,60),0,40,tape),true);
});
test('rejects incomplete source data',()=>{
 assert.throws(()=>parseTape({format:'stage6-source-polar-v1',count:1,frames:[]}));
});
