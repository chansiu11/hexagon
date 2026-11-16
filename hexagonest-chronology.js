/* HEXAGONEST 3-1: original-frame chronology audit, independent of any legacy stage generator.
 * Does not fabricate a wall when reference footage or decoded wall data is missing.
 * Source 1595 and source 1596 must be measured and audited separately.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HexagonestChronology=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 function assert(condition,message){if(!condition)throw new Error('HEXAGONEST 3-1: '+message);}
 function audit(source,id){
  assert(source&&Array.isArray(source.frames)&&source.frames.length>1,'missing decoded frames for '+id);
  const fps=source.fps,rate=source.gameRate??1,start=source.gameStartOffset??0;
  assert(finite(fps)&&fps>0&&fps<=60&&finite(rate)&&rate>0&&finite(start)&&start>=0,
   'invalid source clock for '+id);
  const step=rate/fps,frames=source.frames,end=start+(frames.length-1)*step;
  assert(end>60,'the 60s+ footage is missing for '+id);
  assert(start<=.5,'original play start was not aligned with game time zero for '+id);
  const boundary=Math.max(1,Math.min(frames.length-1,Math.ceil((60-start)/step-1e-9)));
  const ids=[],firstSeen=new Map(),lastSeen=new Map(),births=[],shapeChanges=[];
  let lastSides=null,minWallRadius=Infinity,maxWallRadius=0,minZoom=Infinity,maxZoom=0;
  for(let i=0;i<frames.length;i++){
   const frame=frames[i],t=start+i*step;
   assert(frame&&Array.isArray(frame.walls)&&Number.isInteger(frame.sides)&&frame.sides>=3&&
     frame.sides<=12&&finite(frame.angle)&&finite(frame.zoom)&&frame.zoom>0,
     'invalid frame '+i+' of '+id);
   if(lastSides!==null&&lastSides!==frame.sides)
    shapeChanges.push({at:Number(t.toFixed(4)),from:lastSides,to:frame.sides});
   lastSides=frame.sides;
   minZoom=Math.min(minZoom,frame.zoom);maxZoom=Math.max(maxZoom,frame.zoom);
   const here=new Set();
   for(const wall of frame.walls){
    assert(wall&&typeof wall.id==='string'&&wall.id&&Array.isArray(wall.points)&&
      wall.points.length>=3,'untracked wall at frame '+i+' of '+id);
    assert(!here.has(wall.id),'duplicate wall identity at frame '+i+' of '+id);
    here.add(wall.id);
    for(const pt of wall.points){
     assert(Array.isArray(pt)&&pt.length===2&&finite(pt[0])&&finite(pt[1]),
      'invalid wall point at frame '+i+' of '+id);
     const r=Math.hypot(pt[0],pt[1]);
     minWallRadius=Math.min(minWallRadius,r);maxWallRadius=Math.max(maxWallRadius,r);
    }
    if(!firstSeen.has(wall.id)){firstSeen.set(wall.id,t);births.push({id:wall.id,at:t});}
    lastSeen.set(wall.id,t);
   }
   ids.push(here);
  }
  assert(firstSeen.size>0,'no observed HEXAGONEST walls for '+id);
  const crossing=[...ids[boundary-1]].filter(w=>ids[boundary].has(w));
  const before=births.filter(e=>e.at<60),after=births.filter(e=>e.at>=60);
  function largestBirthGap(entries,from,to){
   let previous=from,max=0;
   for(const e of entries){max=Math.max(max,e.at-previous);previous=e.at;}
   return Number(Math.max(max,to-previous).toFixed(4));
  }
  const warnings=[];
  if(!crossing.length&&ids[boundary-1].size&&ids[boundary].size)
   warnings.push('wall identities differ across 60 seconds; inspect source tracking');
  if(!before.length)warnings.push('no new wall observed before 60 seconds');
  if(!after.length)warnings.push('no new wall observed after 60 seconds');
  const preGap=largestBirthGap(before,start,60);
  const postGap=largestBirthGap(after,60,end);
  if(preGap>1||postGap>1)warnings.push('observed source wall arrivals include gaps exceeding 1 second');
  return Object.freeze({
   id:String(id),fps,gameRate:rate,startSecond:start,endSecond:Number(end.toFixed(4)),
   frames:frames.length,frameAt60:boundary,
   actorIds:firstSeen.size,birthsBefore60:before.length,birthsAfter60:after.length,
   actorsContinuousAt60:Object.freeze(crossing),
   firstWallAt:Number(births[0].at.toFixed(4)),
   lastWallObservedAt:Number(Math.max(...lastSeen.values()).toFixed(4)),
   maxArrivalGapBefore60:preGap,maxArrivalGapAfter60:postGap,
   minWallRadius:Number(minWallRadius.toFixed(3)),
   maxWallRadius:Number(maxWallRadius.toFixed(3)),
   zoomRange:Object.freeze([minZoom,maxZoom]),
   shapeChanges:Object.freeze(shapeChanges),
   warnings:Object.freeze(warnings)
  });
 }
 function auditBoth(recordings){
  assert(recordings&&recordings['1595']&&recordings['1596'],
   'both source recordings required for 3-1');
  return Object.freeze({source1595:audit(recordings['1595'],'1595'),
   source1596:audit(recordings['1596'],'1596')});
 }
 return Object.freeze({audit,auditBoth});
});
