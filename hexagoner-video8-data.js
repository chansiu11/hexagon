/* HEXAGONER reference 1557(8).mp4 (tasks 3 and 4, only).
 * 134 near-orbit wall-color peaks in video ~02:01–03:43, 480x300/10fps.
 * Data are estimates from frames, NOT the original game's level assets.
 * Each triplet is [game deciseconds, screen sector mask, old occupancy
 * proxy]; actual radial widths were measured separately and appear in
 * WIDTH_PIXELS (image px at 480x300). No copyrighted media is bundled.
 */
(function(root){'use strict';
const source='14.24.40;1b.15.50;22.35.51;2b.2f.61;34.3e.6c;3d.1f.63;4c.15.4f;54.2a.3e;5c.3d.4e;65.37.5e;6d.1f.61;78.3d.4a;80.2a.4b;88.15.3f;91.3e.69;99.1f.6a;a1.2f.65;ad.2a.4a;b9.37.51;c6.33.5a;d0.3e.68;d9.3b.6e;e1.37.64;eb.37.53;f3.1f.5a;fa.3e.62;103.1f.5e;10b.1f.48;113.2a.51;119.37.64;11f.3b.4f;127.3e.66;130.3d.52;13a.1f.5f;142.2f.5e;14d.2f.60;157.36.61;160.1f.63;169.2a.46;174.3b.64;17b.3b.69;182.2f.60;189.3d.4d;190.35.56;196.37.50;19e.3b.5f;1a5.3e.6d;1ae.3d.5b;1b4.1f.6e;1bb.3b.60;1c6.3d.58;1cd.1f.53;1d4.3d.6d;1db.37.6c;1e2.2f.6c;1ed.3b.52;1f3.3b.5c;1f9.37.5c;200.3d.65;208.3e.67;20f.2f.65;218.1f.65;220.2f.59;226.3b.56;22f.2f.50;236.3b.6f;23d.3e.57;247.3d.62;24f.3b.51;256.2f.65;25f.1f.5e;267.3d.5e;26d.3b.69;275.3d.68;27b.3d.6a;282.37.5b;289.37.54;290.1f.47;29c.3b.4b;2a2.37.3d;2a7.2f.5b;2b0.15.4d;2b9.15.42;2c0.24.3f;2c5.3b.53;2cd.3b.5c;2d4.2f.5d;2dd.3e.66;2e4.1f.6f;2e9.2b.55;2f2.37.65;2f7.3b.5b;2fe.3e.58;306.3e.5e;30c.3d.5f;312.1f.57;318.3d.5f;31e.3b.6e;324.37.65;32c.2f.57;333.9.3b;33f.37.5f;346.3b.46;34c.3e.48;354.1e.57;35f.3e.6d;368.3d.42;36e.2d.3a;374.3e.68;37b.3d.6d;381.3b.51;389.2f.4f;38f.2f.65;395.3e.6b;39b.3d.72;3a1.3b.62;3b2.2f.69;3b8.1f.69;3be.3d.6c;3c5.f.5d;3cf.2e.3e;3d5.37.5f;3e2.3d.5e;3ed.1f.5f;3f3.2f.69;3fa.37.56;402.1b.59;40e.3d.5e;414.3d.61;41a.3e.6c;420.1f.67;426.3b.5e;42d.37.63;43b.1f.48';
const widths='1a.1c.14.16.19.20.12.11.18.12.12.1c.1e.1b.1e.1e.1f.15.19.1b.21.1c.15.14.1d.17.18.1c.1b.14.18.19.1a.14.12.55.51.24.1e.18.1d.18.15.11.1f.1f.1c.17.2f.54.12.f.1c.18.17.19.12.18.1c.18.15.14.13.1a.19.39.4a.1f.1c.18.16.11.1a.17.1e.1c.18.25.d.9.1d.17.c.20.19.15.13.1e.31.49.1b.1e.20.1b.16.10.17.1b.14.10.d.17.10.f.50.4b.11.a.1a.17.10.48.51.54.4f.3a.53.4b.53.27.22.57.4d.1e.17.12.3b.26.4a.51.52.4a.32.18';
const px=widths.split('.').map(s=>parseInt(s,16));
const events=source.split(';').map((s,i)=>{
 const [t,mask,proxy]=s.split('.').map(v=>parseInt(v,16));
 return Object.freeze({id:i,time:t/10,screenMask:mask,widthPx:px[i],occupancyProxy:proxy,
  videoSecond:119.5+(t/10)*24/25});
});
if(events.length!==134||px.length!==134)throw Error('source sample width/event mismatch');
const PRE_HUES=[[0,150],[5,150],[10,148],[15,135],[20,110],[25,72],[30,48],[35,33],[40,30],[45,36],[50,56],[55,85],[59.5,124]];
const POST_HUES=[[60,233],[62,248],[65,270],[69,300],[73,318],[78,330],[84,331],[90,313],[95,289],[100,258],[104,233],[109,226]];
// Half image width scaling: source hexagonal ring has world radius ~50.
// These are median 2-second measured colored center radii divided by 25px,
// not a canvas/fullscreen dimension adjustment.
const CORE_ZOOM=[[60,1.06],[62,.95],[64,1.04],[66,.98],[68,1.13],
 [70,.87],[72,1.00],[74,1.05],[76,1.08],[78,1.00],[80,1.09],[82,1.00],
 [84,1.06],[86,1.01],[88,1.09],[90,.93],[92,1.04],[94,.93],[96,.95],
 [98,.82],[100,1.09],[102,.92],[104,1.11],[106,.9],[108,1.0]];
// Source video ring-radius median at 480x300, one-second intervals.
 // Each value is world zoom *100, independent of canvas size.
 const PRE_ZOOM_100='82,82,111,104,82,84,110,108,79,75,113,113,88,77,84,103,94,77,81,108,94,76,75,100,100,79,77,106,109,91,73,88,95,89,92,92,111,89,79,79,114,95,85,87,95,95,92,93,99,99,95,80,111,112,98,86,93,115,97,77'.split(',').map(Number);
 const POST_ZOOM_100='77,116,104,88,88,118,118,98,99,113,107,87,89,95,105,106,98,113,111,106,93,107,109,99,101,101,108,104,100,100,115,100,93,90,104,107,93,80,80,111,84,84,106,113,97,92,105,111,99,82'.split(',').map(Number);
const API=Object.freeze({EVENTS:Object.freeze(events),PRE_HUES,POST_HUES,CORE_ZOOM,PRE_ZOOM_100,POST_ZOOM_100,
 REFERENCE_VIDEO:'1557(8).mp4',VIDEO_START:119.5,VIDEO_FINISH:223.5,
 SAMPLE_FPS:10,WIDTH_REFERENCE_VIEW:[480,300]});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHexagonerVideo8Data=API;
})(typeof window!=='undefined'?window:globalThis);
