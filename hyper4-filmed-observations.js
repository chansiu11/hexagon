/* HYPER HEXAGON 4-1 optical crossing observations — 2026-11-16.
 * Source files were supplied as 1595(2).mp4 / 1596(2).mp4.
 * Samples: 10 Hz, 320x180, 35 px radial ring, color-contrast peaks.
 * Times are HUD seconds (centiseconds); masks are six SCREEN sectors,
 * NOT world-aligned polygons. Data are candidates until calibrated.
 * This file does not borrow any previous HYPER HEXAGON wall script.
 */
(function(root){'use strict';
const RUNS=Object.freeze({
  '1595':{
    file:'1595(2).mp4',videoStart:382.95,videoEnd:473.0,
    duration:93.5,clockRate:25/24,
    // Core shape counts transcribed from independent 5-second frame crops.
    // Boundaries remain approximate until exact morph frames are located.
    shapes:[[0,6],[8,5],[13,6],[18,5],[23,6],[28,4],[33,5],[38,4],
      [48,5],[53,6],[63,5],[68,4],[88,5]],
    before:`219:21 271:54 312:27 354:59 396:45 427:41 510:62 573:31 635:47 729:32 927:62 1156:57 1417:48 1562:15 1688:55 1750:62 1812:61 1875:59 2042:62 2281:14 2333:61 2385:62 2438:47 2583:55 2760:28 2833:49 2906:60 2969:60 3021:59 3073:55 3125:31 3167:60 3333:47 3542:61 3604:59 3656:61 3708:15 3854:55 4021:45 4062:31 4115:39 4167:59 4219:61 4292:14 4344:60 4458:39 4521:15 4854:62 4990:58 5135:47 5302:47 5354:59 5406:31 5438:28 5500:47 5562:31 5625:62 5708:39 5823:55 5906:45 5948:62 5979:59`,
    after:`6062:27 6240:47 6417:27 6458:31 6521:55 6667:55 6833:62 6885:61 6937:39 7031:62 7094:57 7167:51 7250:61 7292:51 7354:15 7396:30 7448:61 7625:48 7771:15 7823:55 7885:55 8031:39 8198:62 8229:39 8281:31 8333:60 8385:59 8438:55 8490:31 8542:31 8615:14 8802:4 8958:61 9021:47 9083:60 9333:55`
  },
  '1596':{
    file:'1596(2).mp4',videoStart:303.51,videoEnd:399.0,
    duration:99.2,clockRate:25/24,
    shapes:[[0,6],[8,5],[13,4],[18,5],[23,6],[33,5],[38,6],[43,5],
      [48,6],[58,5],[63,6],[68,5],[78,4],[83,5],[88,4],[93,5]],
    before:`250:62 312:31 375:62 438:61 583:13 635:62 708:45 740:54 917:47 1094:39 1146:59 1198:50 1260:62 1417:45 1583:31 1646:30 1708:62 1760:45 1812:13 1854:35 1906:59 2083:16 2229:1 2292:16 2344:55 2729:47 2802:9 2865:39 2917:59 2979:61 3146:55 3323:15 3375:62 3438:35 3521:36 3677:41 3833:55 3896:31 3937:27 3979:27 4021:45 4052:45 4292:62 4469:55 4521:47 4583:60 4635:59 4708:60 4760:59 4917:37 4948:59 5146:31 5208:47 5271:59 5354:42 5406:47 5458:54 5490:54 5531:59 5562:54 5740:47 5917:51 5969:47`,
    after:`6021:47 6083:31 6135:46 6198:30 6250:61 6438:61 6573:45 6625:62 6688:47 6771:47 6833:47 6896:9 7042:55 7208:58 7260:31 7312:55 7375:59 7448:50 7583:60 7750:45 7833:59 7885:61 7927:55 7979:15 8031:62 8094:57 8167:59 8344:47 8375:57 8510:15 8562:51 8625:31 8698:15 8750:55 8896:45 9062:15 9156:51 9229:39 9302:60 9521:47 9656:33 9719:47 9792:62 9917:47`
  }
});
function decode(text){
 return text.trim().split(/\s+/).map((p,i)=>{const [t,m]=p.split(':').map(Number);
  if(!Number.isInteger(t)||t<0||!Number.isInteger(m)||m<1||m>62||m===63)throw Error('Bad optical event at '+i);
  return Object.freeze({id:i,time:t/100,screenMask:m});});
}
function events(key){
 const r=RUNS[String(key)];if(!r)throw Error('Unknown source '+key);
 const before=decode(r.before),after=decode(r.after).map(e=>({...e,id:e.id+before.length}));
 const result=[...before,...after];
 for(let i=1;i<result.length;i++)if(result[i].time<=result[i-1].time)throw Error('Non-monotonic source '+key);
 if(before.some(e=>e.time>=60)||after.some(e=>e.time<60))throw Error('Era boundary mismatch '+key);
 return result;
}
function observedSides(key,t){
 const r=RUNS[String(key)];if(!r)throw Error('Unknown source '+key);
 let n=r.shapes[0][1];for(const [at,sides] of r.shapes){if(t<at)break;n=sides;}return n;
}
const API={RUNS,decode,events,observedSides,sourceKeys:['1595','1596'],method:'optical-candidates-10hz'};
if(typeof module!=='undefined')module.exports=API;else root.HexHyper4Observations=API;
})(typeof window!=='undefined'?window:globalThis);
