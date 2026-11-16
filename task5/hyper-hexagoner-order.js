/* Task 5-1: newly measured, preliminary Hyper Hexagoner source-order wall cues.
   NOT the old 910 atlas / filmed geometry; no legacy pattern imports.
   The optical cue list is sampled at 20 Hz, not a pixel-identical wall model. */
(function(root){
'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./rebuilt-engine.js'):root.HexEngine;
const ALPH='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const GAME_RATE=1.04, CROSS_RADIUS=230, SPAWN_RADIUS=650, WALL_SPEED=350;
const sources=[
 {id:'A',name:'1(1).mp4',nominalReference:'1557(20261116-003454).mp4 (upload order, unverified)',videoStart:473.7,videoEnd:568.5,encoded:'AAGqAODgAZjSAaGEAdm0AhDkAjH1AmDDAplMAriBAvkMAxiCA1DMA2kQA+pzBAiIBDiIBERBBFvwBGCCBHqIBIFGBTGgBTQQBWMIBXkjBZMEBbtCBdmwBdyBBhnGBiqgBjDIBkrQBnKOBpjBBriQBzjEB6iBB9kYB/jjCFCgCLDQCNCGCRDQCSjJCXDQCYjNCfEQChFGCjnmCmCBCoFdCqmlCsiICwkwCyGJC0kyC2iBC4ioC6DBC8GZDClpDFFkDIGSDItIDLHBDLigDOGlDRGaDSkBDaoDDargDeJEDfkQDgPCDhwhDjFEDkKQDmCIDtDCDwIGDyLBDzEoD1oMD3mqD6m4EBCQEDiEEFiCEHCREKCQEMjFERjBEXCjEbCIEhjmEoiQEqCBEulOE5l6E7iEFDDOFGKnFICIFLJdFOFgFRCwFVCEFcDjFgjMFiiDFpjRFsiQFwCBFxlYF0iIF5EJF9DEF/iBGCjEGCq4GHp1GLIHGRCEGVERGYDRGaGVGeCFGglSGjCkGnjHGslnGziBG8mkHADoHCigHEFkHHCFHKlJHQCQHUigHbDQHjFPHlqhHoFWHqIgHslNHuIaHxiEH2FWH7EMH9CRIBFMICjQIKEzIQiCITCiIaDEIcCiIfEJIhCgIkCEIliwIpiEIwFvI2kQI8FwI9JBI+DGJCoKJCxwJEwBJIMOJLswJOJDJROEJTvCJVGJJZKcJbOgJdCQJesRJhlCJkVzJmQIJmZEJuDgJurSJylxJyoIJ0mjJ1qEJ19QJ3CCJ4lCJ7KvJ/trKBSEKFsyKG2IKHJBKLYEKNOxKNZCKTVIKULxKYLEKaJjKaaQKeQMKgOhKgZCKmr1KnUIKrqEKtMzKxwMKztiKz4RK5jEK6dIK6liK9DEK+HmLAo1LBUCLDjRLEVgLFfELGHBLGOQLLJLLPMrLPUQLUtvLZrwLcKPLfuwLhtNLiSCLoG0LrH9LrqCLuiZLu1gLvmcLxmHLzuQL1LPL6t7L7SEMALKMBUgMBoRMEqMMGKSMGXBMKt8ML6CMRP1MRaIMYO1MZXCMe0QMfMtMkqtMlVCMpN4MrJEMr1BMvseMv5gM1wdM2WCM8qwM+HMM/QBNCnSNDLkNFmINImDNJOINLs0NNHDNSIPNVpQNWwINYHkNbiBNcLwNenDNhtGNjjhNllJNozWNqQoNqfBNxvMNzpyN4jSN6IMN6rgN9HSOAmaOBMBOEHsOHQaOH1EOJuhOPDIOQkSORIoOSrBOVMSOVVEOYDIOYegOb2IOcoSOdNBOgLEOhrSOkHBOmpMOoojOotQOuCoOwDIOwI3'},
 {id:'B',name:'2(1).mp4',nominalReference:'1594.mp4 (upload order, unverified)',videoStart:403.65,videoEnd:490.15,encoded:'ANCkARDiAWkKAakwAcjKAgkgAnEzAumeA0mtA7ELBBxQBDGkBFsIBIFgBJpEBMLSBOUhBTiIBVDCBVMQBXpIBalHBmkSBpjgBrjUBxiCB3iEB9iBB/DCCDEhCFDMCKFGCPCBCWkDCYl1CbkwCdlFCgFmCilNCoDQCqCECtkQCzjQC1iEC7kIC7xQC9iGC+NIDBsEDCjgDEOCDHjYDHsBDIygDOLQDOkDDQsIDTJnDeDQDjCIDkkGDpFcDrCBDxCIDxmkDytBDzHiD1tID5MwD8LLD+jEEElSEJlwELjOEPCgERiCEYo8EcjgEeKEEgQ4EjGFEqqgEsNBEsiIEvsCEyjQEyzME2nDE5LQE8whE+EGFCJCFDF4FNlnFSlcFZjhFfESFnDRFsG3FxCEF6IbF9jWF/m8GEFFGFlTGKo0GMRCGMiBGOuBGQFEGSNgGVLUGXjCGX8IGbWEGdnyGjkTGtkhGzEuG5FPG/kwHBiDHGEoHLjwHUMQHVENHXKgHZrBHamMHbSCHfigHfsEHglBHjLIHknhHlrQHmiCHopgHrHZHuiCH3GQH3NgH6NBH9jMH9vCIBFhIBMEICiQID3IIHEhIHKQIMJFINCgIOFiIYigIdFKIilcIkjiIrEUIuqOIwNBIwmgIzmYI0pkI2jCI5G4I+FYJACBJCIZJCMgJCSCJCfEJFDIJGnZJIlgJJoQJKfBJK0IJMECJMbgJOpQJOuCJTrQJVsKJV2EJZrQJbsrJgLYJg5gJiIHJluQJmwPJtjQJuoeJurgJxmHJzGZJ1H+J3IHJ4OgJ5IQJ6qPJ/NzKCHEKFqIKGREKHJCKLq4KOmBKSLzKUkEKYR4KYUBKYfGKgaQKhMoKiqBKnrPKn6gKsQMKt5QKuNDK0sPK1XgK6JMK7LSK7fBK/vILAyELBSyLJpiLKEMLK9QLLGBLNnoLQHkLRmCLUHhLZagLarQLcKHLc0ILgsTLiWELmt5Ln3CLsoQLtbhLtrMLyMQLzuKLz5EL5t4L7pBL71CL/tcMAfgMBZBMFPQMGuEMG/IMG/CMNHUMOkBMQZQMRkFMUFFMXGFMZQgMZUMMayBMdHQMfNCMjooMkMBMlGUMnjKMomwMopEMqEKMrmzMupIMutxMvWGM00IM1pxM5qEM7MzM/PMNBtyNCRBNICINImWNMEWNMKBNONoNRCENRKSNSrENU5JNVCgNWjgNWoQNWvCNbMQNfEC'}
];
function decode(encoded){
 const bytes=[];let bits=0,acc=0;
 for(const char of encoded){const v=ALPH.indexOf(char);if(v<0)continue;
  acc=(acc<<6)|v;bits+=6;if(bits>=8){bits-=8;bytes.push((acc>>>bits)&255)}}
 if(bytes.length%3)throw Error('Corrupt optical source data');
 const cues=[];
 for(let i=0;i<bytes.length;i+=3){
  const packed=bytes[i]*65536+bytes[i+1]*256+bytes[i+2];
  const tick=packed>>>11,span=(packed>>>6)&31,mask=packed&63;
  if(!mask||!span)throw Error('Invalid wall cue');
  cues.push(Object.freeze({time:tick/20*GAME_RATE,duration:span/20*GAME_RATE,mask,
   sampleTick:tick}));
 }
 return Object.freeze(cues);
}
for(const source of sources){
 source.cues=decode(source.encoded);source.duration=(source.videoEnd-source.videoStart)*GAME_RATE;
 source.pre60=source.cues.filter(c=>c.time<60).length;
 source.post60=source.cues.length-source.pre60;
 delete source.encoded;Object.freeze(source);
}
Object.freeze(sources);
function getSource(index=0){
 if(!Number.isInteger(index)||index<0||index>1)throw RangeError('Only two observed videos');
 return sources[index];
}
function timeline(index=0){
 const source=getSource(index),walls=[];
 for(const cue of source.cues){
  // At first passage through the 230px measurement ring, the inner wall
  // edge crosses the ring. Extrapolate backwards to an offscreen birth.
  // An event already visible at t=0 is initialized at its measured radius.
  const birth=Math.max(0,cue.time-(SPAWN_RADIUS-CROSS_RADIUS)/WALL_SPEED);
  const radius=CROSS_RADIUS+WALL_SPEED*(cue.time-birth);
  const thickness=Math.min(240,Math.max(12,cue.duration*WALL_SPEED));
  for(let sector=0;sector<6;sector++)if(cue.mask&(1<<sector)){
   walls.push({at:birth,radius,speed:WALL_SPEED,thickness,sector,sides:6});
  }
 }
 return {walls,shapeEvents:[],provenance:'task5-1:optical-20fps:'+source.id+
  ':provisional:not-shape-or-camera-calibrated'};
}
function register(index=0){
 if(!E||typeof E.registerPattern!=='function')return false;
 E.registerPattern(4,()=>timeline(index));return true;
}
// Attach to rebuilt task-1 engine only. Old page engine is intentionally
// untouched until the upstream tasks 1-4 can be based on one commit.
register(0);
const api=Object.freeze({sources,getSource,timeline,register,decode,
 GAME_RATE,CROSS_RADIUS,SPAWN_RADIUS,WALL_SPEED});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.HexHyper5Order=api;
})(typeof window!=='undefined'?window:globalThis);
