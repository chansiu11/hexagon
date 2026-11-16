/* 4-1 HYPER HEXAGON: original chronological wall silhouettes transcribed independently
   from 1595(3).mp4 and 1596(3).mp4. NOT the old procedural stage-1 wall bank.
   ?trace=1595 / ?trace=1596 selects source playback; randomized joining belongs to 4-2.
   These are 60 fps observed video contour samples, NOT exact original wall commands. */
HexEngine.registerMap(3,{
  sourceStatus:'hyper-hexagon-4-1-independent-source-chronology-60fps',
  walls:[],
  shapes:[{at:0,sides:6}],
  replays:{
    '1595':{path:'data/hyper-hexagon-1595.b64',videoStart:382.99,
      videoEnd:472.6233333333,gameStartOffset:0,gameRate:25/24,sampleFps:60,
      sourceFile:'1595(3).mp4'},
    '1596':{path:'data/hyper-hexagon-1596.b64',videoStart:303.32,
      videoEnd:398.6033333333,gameStartOffset:0,gameRate:25/24,sampleFps:60,
      sourceFile:'1596(3).mp4'}
  }
});
