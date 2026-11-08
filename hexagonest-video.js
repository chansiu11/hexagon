/* Compact numerical observations from user-provided Hexagonest 317s video.
 * 360 visually estimated ring-crossing events sampled at 15Hz, not the
 * original game's wall RNG or frames. Timestamp: 0.1s; sector mask: 6 bits;
 * width: approximately 4 source-video pixels per unit.
 * Imperfect camera-phase fitting and compression may introduce false hits.
 * No audio or video is embedded or redistributed.
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
const clips=[];
for(let i=0;i<events.length;i++){
 for(let length=1;length<=3&&i+length<=events.length;length++){
  const excerpt=events.slice(i,i+length);
  if(excerpt.at(-1).videoSeconds-excerpt[0].videoSeconds>3.3)break;
  if(excerpt.slice(1).some((e,j)=>e.videoSeconds-excerpt[j].videoSeconds>1.65))break;
  clips.push({id:clips.length,sourceStart:excerpt[0].videoSeconds,events:excerpt});
 }
}
const API={events,clips,source:'UrPXBSh4mqU',videoLength:316.023583};
if(typeof module!=='undefined')module.exports=API;else root.HexagonestVideo=API;
})(typeof window!=='undefined'?window:globalThis);
