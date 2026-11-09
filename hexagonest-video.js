/* Observed wall-crossing traces from the user-provided 317s Hexagonest MP4.
 * 360 video-derived events, ~0.1s time quantization, approximate six-sector
 * masks and wall thickness. Not the original game's wall RNG or source code.
 * Whole dodge parts stop only at recovery pauses. Extra-thick slabs stay
 * visible longer, so their source chains require longer recovery windows.
 * No video, music, gameplay images or sound are embedded or redistributed.
 */
(function(root){'use strict';
const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const value=c=>ABC.indexOf(c);
const packed='AUkGAi-HAoVHAz9HA4vHBK9HBb9HBgvHBoVHBtvHByqHB-fHCD7HCKVGCQfHCr7HCwfGDkVHDpVHDsqHDuVGD4kND97HEC9HEU9GEg-HElnHEsVHEyVHE1qHE3VHE7kOFG-HFL3HFY-HFe3HFj2HFw9HF5JWGU7HGf3HGm-HGsVHGuqGGxVHG0qHG3VHG7kOHBVOHQ3GHY3GHd-HHqVFHyJNH2VHH5IGH8qHH-VHIGkOIK7HIQ-HIYVHIaqHIgKHIlJOIp7HI07HJASKJGSRJRVyJV3HJa-HJe3HJlqyJ6VyKCVHKGJNKOqyKaWHKe7HKjqyKo3HKuqHKzqHK3VyK7SOLA7HLEfHLNVyLXtHLatHLhqyLmkHMDqHMJqyMQ7HMeqnMiVHMlqHMpJONHVyNU7HNdqyNxVyN63HOGVyOL3HOQ3HOaVyOg3HOk-HOq3HOwqxO02HO82HPEqyPI2HPM2FPsVuP29HP7vHQBVyQGSHQM1HQWVyQaVHQeJOQi3HQqqyQyVHQ3VHQ6qHQ_qwRE-HROfHRUVyRbtHRe2HRgbHRoqyRv5HR9qyTH-HTPSHTVbHTbtFTkqHTpqHTsVHTySOUA-HUE3HULbHUUbHUm9HUsuGU02HU42HU7bHVItHVM9GVT-HVY3HVc-GVkqHVo5HVsvHV79HWQtHWSbHWU2HWXbHWkkKWqtOWw3HXAbHXEtHXH2HXMtGXjVHXm7HXrfHXw7HYY-HYc3GYpJHYyvGY03HY37HZH7HZMPHZTsFZXfHZZ-GZcfHZk2GZntHZs2GZytHZ8tHaE3HaU7Gak2HaobHaw2HbA2HbE6HbINHbN7GbUtHbY2HbdbHbg2HbjsGbovGbr3Hbw9HcStHcX2HccbGce2HcnqGcsqHcuVHc0SNdc9Hd8LHeGvGectPeibLfK9HfPvHfXkHfbtHfdbHfg2HfkyHgA3HgE-GhIJGhMVNhRVNhVVNhbVOhf3Hhk-Hhv-Hh03Hh4-Hh_qOiEtGiIkHiLbHiNtHiQ2HiV7Hif7Hi0VGi4FHi9VHjBkNjFfHjPfHjVfHjffHkHVHkMVHkPSNkU-Gkd-Hkk-HkoSHkuVHk4qGk7kNlT3HlY-Hlc3Hlo7Hls2HmCqNmj3Hmo-HnL3HnRqOnW-Hnb3Hng-HnrfHnw7Hn99HoA6HoHNFoN9HoQ7Hob9HogvHonVOorVNo1VNo5VHo8oHpAoHpDVHpGJNpLvHpQ9HpUvHp2MGp89Gp-7HqDtGqH3HqM-GqQZHqZtHqcbGqgJHrRfHrh3HrrvHrxVHrzVHsS3HsX-Hsc3GsjVOsn3Gss-Hs8vGtA0HtFvHtMqNtRJFtWqOtb3Htg-HtkzHtw2Gt05Ht3-Ht92GuAtHuESHuNVNuRVOug7Hum-HutSKuzSLu-7HvDfHvI7HvT3HvVfHvY9HveqOvjqOvomHvs2H';
const events=[];
for(let i=0;i<packed.length;i+=4){
 const videoSeconds=(value(packed[i])*64+value(packed[i+1]))/10;
 const mask=value(packed[i+2]),width=Math.max(22,value(packed[i+3])*5);
 if(mask===0||mask===63)continue;
 events.push({videoSeconds,mask,width});
}
// A dodge chain continues while successive walls arrive within 1.75s.
// Longer lulls give the player a clear recovery window. A source difficulty
// era boundary starts a new part because the stage's speed/color semantics
// change at 60 and 120 seconds. There is NO arbitrary fixed-length cap:
// long sequences of 20-37 crossings are retained as a single source part.
const DODGE_BREAK_SECONDS=1.75;
const THICK_DODGE_BREAK_SECONDS=2.3;
const THICK_WALL_WIDTH=100;
const eraOf=t=>t<60?0:t<120?1:2;
const openSectors=mask=>Array.from({length:6},(_,i)=>i).filter(i=>!(mask&(1<<i)));
const breakAfter=(prior,next)=>prior.width>THICK_WALL_WIDTH||
 next.width>THICK_WALL_WIDTH?THICK_DODGE_BREAK_SECONDS:DODGE_BREAK_SECONDS;
const parts=[];
let first=0;
for(let i=1;i<=events.length;i++){
 const prior=events[i-1],next=events[i];
 const eraChange=i<events.length&&eraOf(prior.videoSeconds)!==eraOf(next.videoSeconds);
 const recovery=i<events.length&&(next.videoSeconds-prior.videoSeconds)>=breakAfter(prior,next);
 if(i<events.length&&!eraChange&&!recovery)continue;
 const trace=events.slice(first,i),sourceStart=trace[0].videoSeconds,
   sourceEnd=trace[trace.length-1].videoSeconds;
 // The real observed pause between THIS part and the next part is also
 // preserved as an offset, rather than a separately invented tiny join.
 const gapAfter=i<events.length?Math.max(.2,next.videoSeconds-prior.videoSeconds):2;
 parts.push({
  id:parts.length,era:eraOf(sourceStart),
  firstEventIndex:first,lastEventIndex:i-1,
  sourceStart,sourceEnd,duration:sourceEnd-sourceStart,
  gapAfter,boundary:eraChange?'era':recovery?'recovery':'end',
  // Fixed signatures for matching a complete incoming dodge chain to the
  // previous exit. No individual walls are rotated or reordered.
  entryOpenings:openSectors(trace[0].mask),
  exitOpenings:openSectors(trace[trace.length-1].mask),
  entryWidth:trace[0].width,exitWidth:trace[trace.length-1].width,
  events:trace
 });
 first=i;
}
// Compatibility identifier for existing diagnostics; this is now precisely
// the same NON-OVERLAPPING set of full dodge runs, never 984 sliding snippets.
const clips=parts;
const API={events,parts,clips,DODGE_BREAK_SECONDS,THICK_DODGE_BREAK_SECONDS,THICK_WALL_WIDTH,breakAfter,
 source:'UrPXBSh4mqU',videoLength:316.023583};
if(typeof module!=='undefined')module.exports=API;else root.HexagonestVideo=API;
})(typeof window!=='undefined'?window:globalThis);
