/* Mode-three physical keyboard bindings: independent of song difficulty. */
(function(root){'use strict';
const POOL='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function createKeys(random=Math.random){
 const keys=[...POOL];
 for(let i=keys.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}
 return keys.slice(0,6);
}
function sectorForCode(keys,code,sides){
 const label=/^Key[A-Z]$/.test(code)?code.slice(3):/^(Digit|Numpad)[0-9]$/.test(code)?code.slice(-1):null;
 if(label===null)return -1;
 const index=keys.indexOf(label);return index>=0&&index<sides?index:-1;
}
const API={POOL,createKeys,sectorForCode};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexDirectControls=API;
})(typeof window!=='undefined'?window:globalThis);
