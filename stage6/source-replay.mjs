// Video-grounded stage 6 reference replay. NOT a playable stage or collision model.
// This file is intentionally isolated from the old engine and stages 1-5.
export const sources = Object.freeze([
  {filename:"1595(3).mp4",gameZeroSeconds:570.85,gameEndSeconds:786.95},
  {filename:"1596(3).mp4",gameZeroSeconds:493.47,gameEndSeconds:710.97}
]);
export function parseTape(json) {
  const tape=typeof json==="string"?JSON.parse(json):json;
  if(!tape || tape.format!=="stage6-source-polar-v1") throw Error("Wrong stage 6 tape format");
  for(const k of ["fps","count","angle_bins","radius_bins","screen_width","screen_height","max_radius"]) {
    if(!Number.isFinite(tape[k]) || tape[k]<=0) throw Error("Bad tape field "+k);
  }
  if(!Array.isArray(tape.frames) || tape.frames.length!==tape.count) throw Error("Truncated source tape");
  if(tape.count<60*tape.fps) throw Error("Source tape must cross 60s");
  return tape;
}
export async function loadSource(url) {
  const res=await fetch(url);
  if(!res.ok) throw Error("Source fetch failed: "+res.status);
  const json=await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
  return parseTape(json);
}
export function frameAt(tape,time) {
  if(!Number.isFinite(time) || time<0) throw RangeError("Bad game clock");
  const index=Math.min(tape.count-1,Math.floor(time*tape.fps));
  const b64=tape.frames[index],raw=atob(b64);
  const bytes=Uint8Array.from(raw,ch=>ch.charCodeAt(0));
  return {index,seconds:index/tape.fps,bytes, color:tape.representative_rgb[index],observations:tape.observed_counts[index]};
}
export function occupied(frame,angle,radial,tape) {
  if(angle<0||angle>=tape.angle_bins||radial<0||radial>=tape.radius_bins)return false;
  const i=angle*tape.radius_bins+radial;
  return !!(frame.bytes[i>>3]&(1<<(i&7)));
}
export function drawWalls(ctx,tape,seconds) {
  const frame=frameAt(tape,seconds);
  const A=tape.angle_bins,R=tape.radius_bins,dTheta=Math.PI*2/A,dRadius=tape.max_radius/R;
  ctx.save();
  ctx.translate(ctx.canvas.width/2,ctx.canvas.height/2);
  ctx.scale(ctx.canvas.width/tape.screen_width,ctx.canvas.height/tape.screen_height);
  const color=frame.color||[255,255,255];
  ctx.fillStyle="rgb("+color.map(x=>Math.max(0,Math.min(255,Math.round(x)))).join(",")+")";
  for(let angle=0;angle<A;angle++){
    const t0=angle*dTheta,t1=(angle+1)*dTheta;
    for(let r=0;r<R;){
      if(!occupied(frame,angle,r,tape)){r++;continue;}
      const r0=r;
      while(r<R&&occupied(frame,angle,r,tape))r++;
      const inner=r0*dRadius,outer=r*dRadius;
      ctx.beginPath();
      ctx.moveTo(inner*Math.cos(t0),inner*Math.sin(t0));
      ctx.lineTo(outer*Math.cos(t0),outer*Math.sin(t0));
      ctx.lineTo(outer*Math.cos(t1),outer*Math.sin(t1));
      ctx.lineTo(inner*Math.cos(t1),inner*Math.sin(t1));
      ctx.closePath();ctx.fill();
    }
  }
  ctx.restore();return frame;
}
