/* Task 2-1: independently video-traced HEXAGONER wall-order replay.
 * These records contain sampled 20fps vector silhouettes, NOT the old
 * procedural HEXAGONER generator or accurately timed original wall commands.
 * Source time maps 177.96..275.01 (1595) and 119.30..223.80 (1596).
 * Use ?trace=1595 or ?trace=1596 to inspect chronological runs separately.
 * 60 seconds is an ordinary point in each uninterrupted recorded timeline.
 */
HexEngine.registerMap(1,{
 sourceStatus:'source-contour-replay-task2-1-no-random',
 walls:[],
 shapes:[{at:0,sides:6}],
 replays:{
  '1595':{path:'data/hexagoner-1595.b64',videoStart:177.96,videoEnd:275.01,
    gameStartOffset:0,gameRate:25/24,sampleFps:20},
  '1596':{path:'data/hexagoner-1596.b64',videoStart:119.30,videoEnd:223.80,
    gameStartOffset:0,gameRate:25/24,sampleFps:20}
 }
});
