/* Rebuilt shared gameplay engine (1-1). No legacy wall or stage imports. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HexEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const TAU = Math.PI * 2;
  const LEVELS = Object.freeze([
    Object.freeze(['HEXAGON', 'HARD', 350]),
    Object.freeze(['HEXAGONER', 'HARDER', 28]),
    Object.freeze(['HEXAGONEST', 'HARDEST', 275]),
    Object.freeze(['HYPER HEXAGON', 'HARDER', 185]),
    Object.freeze(['HYPER HEXAGONER', 'HARDEST', 220]),
    Object.freeze(['HYPER HEXAGONEST', 'HARDESTEST', 315])
  ]);
  const registry = new Map();
  const ORBIT = 66;
  const PLAYER_SPEED = 7 * TAU / 360 * 60;
  const wrap = a => ((a % TAU) + TAU) % TAU;
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const lerp = (a,b,t) => a+(b-a)*t;

  function registerMap(index, definition) {
    if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length)
      throw new RangeError('Only levels 0 through 5 exist');
    if (!definition || !Array.isArray(definition.walls) || !Array.isArray(definition.shapes))
      throw new TypeError('Map must provide walls and shapes arrays');
    const ids = new Set();
    const walls = definition.walls.map((entry, i) => {
      const wall = { ...entry };
      if (wall.id === undefined || ids.has(wall.id)) throw new Error('Duplicate/missing wall id at '+i);
      ids.add(wall.id);
      if (![wall.spawnAt,wall.radius,wall.speed,wall.thickness].every(finite) ||
          wall.spawnAt < 0 || wall.radius <= ORBIT || wall.speed <= 0 || wall.thickness <= 0)
        throw new RangeError('Invalid wall geometry/timing: '+wall.id);
      if (!Number.isInteger(wall.sides) || wall.sides < 3 || wall.sides > 12 ||
          !Array.isArray(wall.blocked) ||
          wall.blocked.some(n => !Number.isInteger(n) || n < 0 || n >= wall.sides))
        throw new RangeError('Invalid wall sectors: '+wall.id);
      wall.blocked = [...new Set(wall.blocked)];
      return Object.freeze(wall);
    }).sort((a,b) => a.spawnAt - b.spawnAt);
    const shapes = definition.shapes.map(s=>({...s})).sort((a,b)=>a.at-b.at);
    if (!shapes.length || shapes[0].at !== 0 || shapes.some(s=>!finite(s.at)||s.at<0||!Number.isInteger(s.sides)||s.sides<3||s.sides>12))
      throw new RangeError('Shape schedule must begin at 0 seconds');
    registry.set(index,Object.freeze({
      id:index, name:LEVELS[index][0], sourceStatus:String(definition.sourceStatus||'pending'),
      walls:Object.freeze(walls), shapes:Object.freeze(shapes.map(s=>Object.freeze(s))),
      camera:typeof definition.camera==='function'?definition.camera:null
    }));
  }
  function hasMap(index) {return Number.isInteger(index)&&registry.has(index);}
  function getMap(index) {return registry.get(index)||null;}
  function panelPolygon(radius, thickness, sides, sector) {
    const a=sector*TAU/sides, b=(sector+1)*TAU/sides;
    // Never invert wall polygons after their inner edge moves behind the core.
    const inner=Math.max(20,radius),outer=Math.max(inner,radius+thickness);
    return [
      [inner*Math.cos(a),inner*Math.sin(a)],
      [inner*Math.cos(b),inner*Math.sin(b)],
      [outer*Math.cos(b),outer*Math.sin(b)],
      [outer*Math.cos(a),outer*Math.sin(a)]
    ];
  }
  function pointInsidePolygon(x,y,points) {
    // Exact same panel vertices are used by both Canvas drawing and collision.
    let sign=0;
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
      if (Math.abs(cross)<1e-7) continue;
      const s=Math.sign(cross);
      if(sign && sign!==s) return false;
      sign=s;
    }
    return true;
  }
  function playerPolygon(angle, lean=0) {
    const c=Math.cos(angle),s=Math.sin(angle), x=ORBIT*c,y=ORBIT*s;
    const t=[-s,c],forward=[Math.cos(angle+lean),Math.sin(angle+lean)];
    return [
      [x+forward[0]*12,y+forward[1]*12],
      [x-forward[0]*8+t[0]*6,y-forward[1]*8+t[1]*6],
      [x-forward[0]*8-t[0]*6,y-forward[1]*8-t[1]*6]
    ];
  }
  class ArenaGame {
    constructor(index, optionalDefinition=null) {
      if(!Number.isInteger(index)||index<0||index>=LEVELS.length)
        throw new RangeError('Map 7 has been removed');
      const map=optionalDefinition||registry.get(index);
      if(!map) throw new Error('MAP_UNAVAILABLE: '+LEVELS[index][0]);
      this.map=map;
      this.level=index;
      this.time=0;
      this.angle=TAU/12;
      this.sides=map.shapes[0].sides;
      this.rotation=0;
      this.zoom=1;
      this.tilt=0;
      this.controlMode=1;
      this.doubleStepReady=false;
      this.dead=false;
      this.paused=false;
      this.death=null;
      this.walls=[];
      this._wallCursor=0;
      this._shapeCursor=0;
      this._actors=[];
    }
    setControlMode(mode) {
      if(![1,2,3].includes(mode)) throw new RangeError('Invalid control mode');
      this.controlMode=mode;
      this.doubleStepReady=false;
      if(mode!==1) this.angle=wrap((Math.floor(this.angle/(TAU/this.sides))+.5)*TAU/this.sides);
    }
    currentSector() {return Math.floor(wrap(this.angle)/(TAU/this.sides))%this.sides;}
    armDoubleStep() {
      if(this.dead||this.paused||this.controlMode!==2)return false;
      this.doubleStepReady=true;
      return true;
    }
    stepSector(direction) {
      if(this.dead||this.paused||this.controlMode!==2||!direction)return false;
      const step=this.doubleStepReady?2:1;
      this.doubleStepReady=false;
      this.angle=wrap((this.currentSector()+Math.sign(direction)*step+.5)*TAU/this.sides);
      this.checkCollision();
      return true;
    }
    selectSector(sector) {
      if(this.dead||this.paused||this.controlMode!==3||!Number.isInteger(sector)||sector<0||sector>=this.sides) return false;
      this.angle=wrap((sector+.5)*TAU/this.sides);
      this.checkCollision();
      return true;
    }
    pause(){if(!this.dead)this.paused=true;}
    resume(){if(!this.dead)this.paused=false;}
    kill(wall) {
      if(this.dead)return;
      this.dead=true;
      this.death=Object.freeze({time:this.time,angle:this.angle,wallId:wall.id,
        contact:[ORBIT*Math.cos(this.angle),ORBIT*Math.sin(this.angle)]});
    }
    checkCollision(){
      if(this.dead)return false;
      const x=ORBIT*Math.cos(this.angle),y=ORBIT*Math.sin(this.angle);
      for(const actor of this.walls){
        if(pointInsidePolygon(x,y,actor.points)){this.kill(actor);return true;}
      }
      return false;
    }
    sampleWalls(){
      const map=this.map;
      // Spawn only once and keep each actor alive until it moves completely inside the core.
      while(this._wallCursor<map.walls.length&&map.walls[this._wallCursor].spawnAt<=this.time+1e-9){
        const w=map.walls[this._wallCursor++];
        for(const sector of w.blocked)this._actors.push({id:String(w.id)+':'+sector,w,sector});
      }
      this.walls=[];
      for(const actor of this._actors){
        const w=actor.w;
        const radius=w.radius-w.speed*(this.time-w.spawnAt);
        if(radius+w.thickness<20)continue;
        this.walls.push({id:actor.id,waveId:w.id,sector:actor.sector,sides:w.sides,
          r:radius,thickness:w.thickness,points:panelPolygon(radius,w.thickness,w.sides,actor.sector)});
      }
      this._actors=this._actors.filter(actor=>actor.w.radius+actor.w.thickness-actor.w.speed*(this.time-actor.w.spawnAt)>=20);
    }
    update(delta, turn=0) {
      if(this.dead||this.paused)return;
      if(!finite(delta)||delta<0)throw new RangeError('Invalid time delta');
      // Fixed small substeps catch fast wall crossings without moving actors in jumps.
      const count=Math.max(1,Math.ceil(delta/(1/240)));
      const h=delta/count;
      for(let i=0;i<count&&!this.dead;i++){
        this.time+=h;
        while(this._shapeCursor+1<this.map.shapes.length&&this.map.shapes[this._shapeCursor+1].at<=this.time+1e-9){
          this._shapeCursor++;
          this.sides=this.map.shapes[this._shapeCursor].sides;
        }
        if(this.controlMode===1)this.angle=wrap(this.angle+Math.max(-1,Math.min(1,turn))*PLAYER_SPEED*h);
        if(this.map.camera){
          const cam=this.map.camera(this.time);
          if(cam){this.rotation=finite(cam.rotation)?cam.rotation:this.rotation;
            this.zoom=finite(cam.zoom)?cam.zoom:this.zoom;
            this.tilt=finite(cam.tilt)?cam.tilt:this.tilt;}
        }
        this.sampleWalls();
        this.checkCollision();
      }
    }
    reset(){
      return new ArenaGame(this.level,this.map);
    }
  }
  return Object.freeze({LEVELS,ORBIT,PLAYER_SPEED,registerMap,hasMap,getMap,ArenaGame,
    panelPolygon,pointInsidePolygon,playerPolygon});
});
