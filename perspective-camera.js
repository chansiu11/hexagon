/* Camera-only perspective warp. World and HUD render in separate layers.
 * A projective plane creates near/far depth without squashing every polygon. */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const SOURCE_MARGIN=.24;
function parameters(game){
 if(!game)return {strength:0};
 const tilt=Number.isFinite(game.tilt)?game.tilt:0;
 const strength=game.hardMode?clamp((Math.abs(tilt)-.35)/.28):
  clamp(Math.abs(tilt)/.24);
 if(game.hexagonestMode&&game.time>=116.2)return {strength:0};
 const sign=Math.sign(tilt)||1;
 return {strength,sign,compression:1-.10*strength,
  beta:sign*.22*strength,yaw:sign*.12*strength,
  roll:sign*.055*strength};
}
function forwardPixel(x,y,w,h,p){
 const half=h*.5,xx=(x-w*.5)/half,yy=(y-h*.5)/half;
 const d=1+p.beta*yy,a=(xx+p.yaw*yy)/d,b=p.compression*yy/d;
 const c=Math.cos(p.roll),s=Math.sin(p.roll);
 return [w*.5+(c*a-s*b)*half,h*.5+(s*a+c*b)*half];
}
const VERT='attribute vec2 a_point; void main(){gl_Position=vec4(a_point,0.,1.);}';
const FRAG='precision highp float;\n'+
'uniform sampler2D u_image;\nuniform vec2 u_target,u_source;\n'+
'uniform float u_compression,u_beta,u_yaw,u_roll;\n'+
'void main(){\n'+
' vec2 dest=vec2(gl_FragCoord.x,u_target.y-gl_FragCoord.y);\n'+
' float h=u_target.y*.5;\n vec2 projected=(dest-u_target*.5)/h;\n'+
' float c=cos(u_roll),s=sin(u_roll);\n'+
' vec2 q=vec2(c*projected.x+s*projected.y,-s*projected.x+c*projected.y);\n'+
' float d=max(.15,u_compression-u_beta*q.y);\n'+
' float y=q.y/d,x=q.x*(1.+u_beta*y)-u_yaw*y;\n'+
' vec2 uv=(u_source*.5+vec2(x,y)*h)/u_source;\n'+
' gl_FragColor=texture2D(u_image,vec2(clamp(uv.x,.001,.999),1.-clamp(uv.y,.001,.999)));\n'+
'}';
function makeShader(gl,type,src){
 const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
 return sh;
}
function create(){
 let surface=null,gl=null,program=null,texture=null,buffer=null,uniform={};
 const fallback=document.createElement('canvas'),fb=fallback.getContext('2d');
 try{
  surface=document.createElement('canvas');
  gl=surface.getContext('webgl',{alpha:false,antialias:false,depth:false,
   stencil:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL unavailable');
  program=gl.createProgram();
  gl.attachShader(program,makeShader(gl,gl.VERTEX_SHADER,VERT));
  gl.attachShader(program,makeShader(gl,gl.FRAGMENT_SHADER,FRAG));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'a_point');
  gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  for(const key of ['image','target','source','compression','beta','yaw','roll'])
   uniform[key]=gl.getUniformLocation(program,'u_'+key);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 }catch(_){gl=null;surface=null;}
 function fallbackRender(source,w,h,p){
  if(fallback.width!==w)fallback.width=w;
  if(fallback.height!==h)fallback.height=h;
  fb.setTransform(1,0,0,1,0,0);fb.clearRect(0,0,w,h);
  fb.fillStyle='#191919';fb.fillRect(0,0,w,h);
  fb.save();fb.translate(w*.5,h*.5);fb.rotate(p.roll);
  const n=130,sy0=source.height*.5-h*.5,sx=source.width*.5-w*.5;
  for(let i=0;i<n;i++){
   const y0=-h*.5+i*h/n,y1=-h*.5+(i+1)*h/n;
   const f=y=>{const v=y/(h*.5),d=1+p.beta*v;
    return [h*.5*p.compression*v/d,w/d,p.yaw*v*h*.5/d];};
   const [a,w0,x0]=f(y0),[b,w1,x1]=f(y1);
   const top=Math.min(a,b),bottom=Math.max(a,b);
   fb.drawImage(source,sx,sy0+y0+h*.5,w,h/n+.05,
    -Math.max(w0,w1)*.5+(x0+x1)*.5,top,
    Math.max(w0,w1),Math.max(1,bottom-top+.6));
  }
  fb.restore();return fallback;
 }
 function render(source,w,h,p){
  if(!gl)return fallbackRender(source,w,h,p);
  try{
   if(surface.width!==w)surface.width=w;
   if(surface.height!==h)surface.height=h;
   gl.viewport(0,0,w,h);gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   gl.uniform1i(uniform.image,0);
   gl.uniform2f(uniform.target,w,h);gl.uniform2f(uniform.source,source.width,source.height);
   gl.uniform1f(uniform.compression,p.compression);
   gl.uniform1f(uniform.beta,p.beta);gl.uniform1f(uniform.yaw,p.yaw);
   gl.uniform1f(uniform.roll,p.roll);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   return surface;
  }catch(_){gl=null;return fallbackRender(source,w,h,p)}
 }
 return {render,get usesWebGL(){return !!gl}};
}
const API={parameters,forwardPixel,create,SOURCE_MARGIN};
if(typeof module!=='undefined')module.exports=API;else root.HexPerspective=API;
})(typeof window!=='undefined'?window:globalThis);
