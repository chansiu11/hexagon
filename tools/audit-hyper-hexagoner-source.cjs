#!/usr/bin/env node
/* Inspect candidate HYPER HEXAGONER source JSON; no automatic verification.
 * Checks both original chronologies independently and never changes data.
 * Usage: node tools/audit-hyper-hexagoner-source.cjs <1595.json> <1596.json>
 */
'use strict';
const fs=require('node:fs');
const Film=require('../hyper-hexagoner-film.js');

function audit(raw,id){
  const film=Film.parse(raw,id,{allowFixture:true});
  const basic=Film.stats(film);
  const firstSeen=new Map(),lastSeen=new Map();
  let discontinuous=0;
  for(let i=0;i<film.frames.length;i++){
    for(const wall of film.frames[i].walls){
      if(!firstSeen.has(wall.id))firstSeen.set(wall.id,i);
      if(lastSeen.has(wall.id) && lastSeen.get(wall.id)<i-1) discontinuous++;
      lastSeen.set(wall.id,i);
    }
  }
  const launches=[...firstSeen.values()].sort((a,b)=>a-b);
  const gaps=[];
  const toTime=f=>f/film.fps*film.gameRate;
  if(launches.length)gaps.push({from:0,to:toTime(launches[0]),duration:toTime(launches[0])});
  for(let i=1;i<launches.length;i++)gaps.push({
    from:toTime(launches[i-1]),to:toTime(launches[i]),
    duration:toTime(launches[i]-launches[i-1])});
  const longestBirthGap=gaps.reduce((m,g)=>Math.max(m,g.duration),0);
  const endMatches=Math.abs(film.sourceEnd-film.sourceStart -
                            (film.frames.length-1)/film.fps);
  const warnings=[];
  if(!raw.independentlyVerified)warnings.push('Not independently verified against original MP4');
  if(!raw.cameraMeasured)warnings.push('Camera rotation/zoom still uncalibrated');
  if(!film.wallPolygons)warnings.push('No wall polygons extracted');
  if(basic.firstWallSecond===-1 || basic.firstWallSecond>1)
    warnings.push('Opening has no detected approaching wall within 1 game second');
  if(longestBirthGap>1)
    warnings.push('Newly detected walls have a gap exceeding 1 game second; review manually');
  if(basic.longestNoVisibleWallSeconds>1)
    warnings.push('No visible candidate wall for more than 1 game second');
  if(endMatches>.06)
    warnings.push('Video time span differs from recorded frame count');
  if(discontinuous)
    warnings.push(discontinuous+' wall IDs disappear and reappear (tracking instability)');
  if(basic.carriedAcross60===0)
    warnings.push('No actor ID spans 60 seconds; verify source footage at the boundary');
  return Object.freeze({id,sourceFile:raw.sourceFile,
    videoStart:raw.videoStart,videoEnd:raw.videoEnd,
    gameStartOffset:film.gameStartOffset,gameRate:film.gameRate,
    gameEnd:basic.gameEnd,boundaryFrame:basic.boundaryFrame,
    pre60Frames:basic.before60Frames,post60Frames:basic.after60Frames,
    firstDetectedWallSecond:basic.firstWallSecond,
    longestWithoutCandidateWallSeconds:basic.longestNoVisibleWallSeconds,
    longestDetectedBirthGapSeconds:longestBirthGap,
    carriedAcross60:basic.carriedAcross60,
    uniqueWallIds:basic.uniqueTrackedWallIds,
    trackedContourFrames:film.wallPolygons,
    independentlyVerified:raw.independentlyVerified===true,
    cameraMeasured:raw.cameraMeasured===true,
    warnings});
}

function main(argv){
  if(argv.length!==2)
    throw new Error('Provide two independent source JSON files (1595 and 1596)');
  const reports=argv.map((file,i)=>{
    const id=i?'1596':'1595',raw=JSON.parse(fs.readFileSync(file,'utf8'));
    return audit(raw,id);
  });
  process.stdout.write(JSON.stringify({stage:5,reports},null,2)+'\n');
  if(reports.some(r=>r.warnings.length||r.uniqueWallIds===0))
    process.exitCode=2;
}
if(require.main===module){
  try{main(process.argv.slice(2))}catch(err){
    console.error(err.stack||err.message);process.exitCode=1;
  }
}
module.exports={audit};
