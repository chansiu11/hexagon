/* 4-1 HYPER HEXAGON: original chronological wall silhouettes transcribed independently
   from 1594.mp4 (identical to 1595(3).mp4) and 1557(20261116-003454).mp4 (identical to 1596(3).mp4). NOT the old procedural stage-1 wall bank.
   ?trace=1595 / ?trace=1596 selects source playback; 4-2 random joining is the default; ?trace selects full original chronology.
   These are 60 fps observed video contour samples, NOT exact original wall commands. */
HexEngine.registerMap(3,{
  sourceStatus:'hyper-hexagon-4-1-film-sources+4-2-random-dodge-phrases',
  walls:[],
  shapes:[{at:0,sides:6}],
  replays:{
    '1595':{path:'data/hyper-hexagon-1595.b64',videoStart:382.99,
      videoEnd:472.6233333333,gameStartOffset:0,gameRate:25/24,sampleFps:60,
      sourceFile:'1594.mp4'},
    '1596':{path:'data/hyper-hexagon-1596.b64',videoStart:303.32,
      videoEnd:398.6033333333,gameStartOffset:0,gameRate:25/24,sampleFps:60,
      sourceFile:'1557(20261116-003454).mp4'}
  }
});
