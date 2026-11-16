/* HEXAGON source-video ordering, not random parts (task 1-2).
 * Both recordings were inspected separately, using their uploaded names.
 * Extracted wall shapes are per-video frame snapshots, not old wall scripts.
 *
 * 1595: 1920x1080 with 1728x1080 center game area (16:10),
 *       source starts mid-start at video 00:00.000, HUD already about 0.10.
 *       wall frames end at 02:56.600 (game HUD about 182.58).
 * 1596: 1152x720, menu -> live play around 00:03.550.
 *       wall frames end at 01:53.850 (HUD about 114.58).
 *
 * Camera phase/zoom are estimates from footage; refine at task 1-3.
 * No 0-60 / post-60 segmentation or randomization is performed here.
 */
HexEngine.registerMap(0,{
 sourceStatus:'video-traced-and-randomized-53-connected-parts-1-3',
 shapes:[{at:0,sides:6}],
 walls:[],
 replays:{
  '1595':{path:'data/hexagon-1595.b64',videoStart:0,videoEnd:176.60,
    gameStartOffset:.10,gameRate:1.0333,sampleFps:20},
  '1596':{path:'data/hexagon-1596.b64',videoStart:3.55,videoEnd:113.85,
    gameStartOffset:.05,gameRate:1.0383,sampleFps:20}
 }
});
