/* Original monochrome Hexagonest frame pulse: 1Hz, sampled at 10Hz.
 * Quarter-pixel core radius data only, no video or original audio.
 */
(function(root){'use strict';
const B64='RYd3d3d3d3d3d3d38xK788uSXzImvOqhIjW788p2ETW86cIgJrvzypQvMUW7Tyjx1nzyx7vzyrTzcjW788uiExW788rB81QmvOugIhe788tm81Q1vOl3IDW7zrMTIc274PNUJrvzyrLzVDW788qyExW7vsFPMia86rAiF7vzysETJNqvREMwJrvzyrQPMWO788l381Q1u_PKlAI1u_PLkxMVve1iMvK28zrNrzmfMjW788tmIDW866IgNbvzyrIgU7vq0SIVufO8ol80F_JvHHfyjzeiBqvslQA1rPPLk08yU7vzzFYgNbzpsyA3m_PKsi8xY7vzy6IwJb3blfNjNbvg8o8c828c8k8su_PKwREmvOrPPG8yNbvzy2YgNfISePK_NcEku99Ccy8xY7vq0SIVufO7shMVu-rRIDW587rTADWs88nRTzJTu_PKhSA1vOukLzImveqX84Bju_PJpPNUNbvzyqMCNbvzzKEEFbvzysERNbzrvzXyfxzynfIfMfPKhSA1u_PK8w8eXyrxzyXzC99Ccy8xY7vzy6LzVDW587uyExW76rMgNbnzvJUAU7vzyaRPMjW788qlASa8vN898x8d83vx7yjzvJUPMWO788mk81Q1u_PMofNUNbvtoRMVu_PKwRE1vOuRbzImu_PKsgJ_PKmB8zRWzsxAIkm-zUEDOb7LUgNXvOqA8ycZvdti80UZvdtE80M5vdtSMDm_PKpy8zQb82k_K_HfL_HL8suezTISOb7NIwM5vdw0808n8dbz_x3yzz9080M5vfQJMiM5vury7x3PK_HPKPNLv0Qz8zQ5vsxAIkm93SMDOb7NIwM5vdtE8ycZvzq-Tzoz8qnzZ_P7Q_M0Ob7qJfNDOb7IZfM0SL7MXzkiSb3dM_NDOb7NIwM66PQLUC8uWq3cNPNDOb3dMCM5vspF80M5vdhl8zQ5vsxAIkm93SMDOb7MMwNZy69FMQIrvfQJgfNUGbzz-lPzQ1e93DMwObzqciA5vOpl80M28jB68s84fy9KqA8iF88th7z0CnDzRRnb3EPzNDm92zIjOb7MJAM5zzu6UBQM82jqYhFJvd0RFTm-ykUBZ73bU_NBWb7LRPMyWbztMgM7rN5vOVBZnOxCAzm961ESOb3dF_NRZ77MNPNDOb3dYPNDOdzK8v8d8l9A8c8n81uvRU868yQrDx1o8m8xhTm-zRXzQzm-zEIDOb87yzAFTyIXfyjzTTE7u90jAznczSTzQVm99ApD80M5vswxUDm87DMDOb3cMxI5vb8x8hJ38n693EPzQzm93m86IyrL9BhE8unumi80NXns5wIFXdurHzVBm8znAiF77LkT8wV7rz-zQwKZ7z-3A_MFec891TBDTd3GMDJ57cgCA3vOp2ETW788p281JVvOrB81QmvOyh80U1vOp2ExXdrJTzcFee6pLzQ1eezJAgVdnyvx9Jry5X3zqecCIXvs1iPzBU8gN88t83gCme64A_MFec7kTzUle86LLzVDW-6pAEN73cUl8yU7vzy2bzUlW865PzVCa86s8880U1vOuE81QfIDjzfynzu_NjZY70CYLzVDauyqEgVd26sfNUF5f2D1H0LzNnd3d3d3d3d3d3d1GoiHh4eIfyVvMpd3d18kWamZh3d3d3d3d3d3d3d3d3d3d3d3d3A',ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function unpack(s,n){
 const bytes=[];let acc=0,bits=0;
 for(const char of s){const v=ABC.indexOf(char);if(v<0)throw Error('Corrupt mono data');acc=acc<<6|v;bits+=6;if(bits>=8){bits-=8;bytes.push(acc>>bits&255)}}
 const out=new Uint8Array(n);out[0]=bytes[0];let pos=0;
 function nib(){const x=bytes[1+(pos>>1)];return pos++&1?x&15:x>>4;}
 for(let i=1;i<n;i++){const v=nib();out[i]=v===15?(nib()<<4)|nib():out[i-1]+v-7}
 return out;
}
const SAMPLES=1998,START=116.2,HZ=10,trace=unpack(B64,SAMPLES);
function radiusAt(t){const p=Math.max(0,Math.min(SAMPLES-1,(t-START)*HZ));const i=Math.floor(p),u=p-i;return 20+(trace[i]*(1-u)+trace[Math.min(SAMPLES-1,i+1)]*u)/4}
const API={radiusAt,zoom:t=>radiusAt(t)/(50*1.08*.8*Math.cos(Math.PI/6)),SAMPLES,START,HZ,VERSION:'source-mono-1hz-v2'};
if(typeof module!=='undefined')module.exports=API;else root.HexHexagonestBeatMono=API;
})(typeof window!=='undefined'?window:globalThis);
