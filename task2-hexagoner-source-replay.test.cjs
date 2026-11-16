/* Node: node --test task2-hexagoner-source-replay.test.cjs
 * These checks establish sample-order and 60-second continuity only.
 * They do NOT claim that six-sector masks recreate every original wall.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const Z=require('node:zlib');
const R=require('./task2-hexagoner-source-replay.js');
const D={
 '1595':require('./task2-hexagoner-1595-data.js'),
 '1596':require('./task2-hexagoner-1596-data.js')
};
for(const id of ['1595','1596']) {
 test(id+': 0-60 and 60+ trace is complete and uncorrupted',async()=>{
  const replay=await R.load(id,D),meta=R.clipMeta[id];
  const raw=Z.inflateSync(Buffer.from(D[id],'base64')).toString('ascii');
  assert.equal(raw.length,meta.frames*5);
  assert.equal(createHash('sha256').update(raw).digest('hex'),meta.sourceSHA256);
  assert.equal(replay.at(0).index,0);
  assert.ok(replay.gameDuration>60);
  const pre=replay.at(59.9),edge=replay.at(60.0),post=replay.at(60.1);
  assert.ok(pre.index<edge.index&&edge.index<post.index);
  assert.equal(post.index-edge.index,1);
  assert.equal(edge.index-pre.index,1);
  assert.equal(pre.video,id);assert.equal(edge.video,id);assert.equal(post.video,id);
  assert.ok(replay.at(60.1).videoTime>replay.at(60).videoTime);
  for (const t of [0,1,10,30,59,60,60.1,70,90]) {
   const frame=replay.at(t);
   assert.equal(frame.masks.length,4);
   assert.ok(frame.masks.every(m=>m>=0&&m<=63));
  }
 });
}
test('source playback never invokes random ordering or legacy HEXAGONER engine',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require.resolve('./task2-hexagoner-source-replay.js'),'utf8');
 assert.doesNotMatch(source,/Math\\.random|hexagoner-video8|hexagoner-parts|require\\(['"]\\.\\/engine/);
 assert.equal(R.SOURCE_CLOCK_RATE,25/24);
 assert.equal(R.SAMPLE_FPS,10);
});
