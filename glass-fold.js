/* GlassFold background — vanilla WebGL port of the supplied shader. Decorative only. */
(() => {
"use strict";
const V=`
attribute vec2 position; varying vec2 vUv;
void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const F=`
precision highp float;
uniform float u_time,u_scale,u_noise; uniform vec3 u_color1,u_color2,u_color3;
uniform vec2 u_resolution; varying vec2 vUv;
float grain(vec2 st){return fract(sin(dot(st,vec2(12.9898,78.233)))*43758.5453);}
vec2 centered(vec2 uv){vec2 p=uv-.5;p.x*=u_resolution.x/max(u_resolution.y,1.);return p;}
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec3 shade(vec2 uv,float time){
vec2 q=rot(.6)*centered(uv)*2.*u_scale;float t=time*.6,pixel=2.*u_scale/max(u_resolution.y,1.);
vec3 color=mix(u_color2,u_color2*.45,clamp(length(centered(uv))*1.3,0.,1.));
for(int i=0;i<6;i++){float fi=float(i),bend=mod(fi,2.)*2.-1.;
float crease=(fi-2.5)*.4+.26*sin(q.x*(1.05+.12*fi)+fi*1.9+t*(.25+.05*fi))+.1*bend*q.x*q.x;
float s=q.y-crease,pane=smoothstep(-pixel,pixel,s),back=max(s,0.);
float body=exp(-back*1.7),fresnel=exp(-back*8.),rim=exp(-back*80.);
float inner=exp(-pow((back-.045)/.014,2.)),bloom=exp(-abs(s)*20.);
vec3 tint=mix(u_color1,u_color3,clamp(fresnel*.6+.08+.14*sin(fi*2.1+q.x*.8+t*.2),0.,1.));
vec3 light=tint*pane*(body*.42+fresnel*.4)+u_color3*(pane*(rim*.6+inner*.12)+bloom*.1);
color+=light*(1.-color);}
return clamp(color,0.,1.);}
void main(){vec3 color=shade(vUv,u_time);if(u_noise>.001){float g=grain(vUv*200.+u_time*.1);color*=1.-u_noise*.4+u_noise*g*.4;}gl_FragColor=vec4(color,1.);}`;
const rgb=h=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const n=parseInt(h,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));gl.deleteShader(s);return null;}return s;}
function mount(){
if(document.querySelector(".glassfold-backdrop"))return;
const canvas=document.createElement("canvas");canvas.className="glassfold-backdrop";canvas.setAttribute("aria-hidden","true");document.body.prepend(canvas);
const gl=canvas.getContext("webgl",{antialias:false,alpha:false,powerPreference:"low-power"});if(!gl){canvas.classList.add("glassfold-fallback");return;}
const vs=compile(gl,gl.VERTEX_SHADER,V),fs=compile(gl,gl.FRAGMENT_SHADER,F);if(!vs||!fs)return;
const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const pos=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const loc=n=>gl.getUniformLocation(program,n),u={time:loc("u_time"),c1:loc("u_color1"),c2:loc("u_color2"),c3:loc("u_color3"),scale:loc("u_scale"),noise:loc("u_noise"),res:loc("u_resolution")};
const cfg={c1:"#2848b8",c2:"#050817",c3:"#83d9ff",speed:.22,scale:1.05,noise:.075};
let elapsed=0,last=0,raf=0,visible=true;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
function resize(){const d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(innerWidth*d)),h=Math.max(1,Math.round(innerHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);}
function draw(now){const dt=last?Math.min((now-last)/1000,.08):0;last=now;elapsed+=dt*cfg.speed;resize();gl.uniform1f(u.time,elapsed);gl.uniform3fv(u.c1,rgb(cfg.c1));gl.uniform3fv(u.c2,rgb(cfg.c2));gl.uniform3fv(u.c3,rgb(cfg.c3));gl.uniform1f(u.scale,cfg.scale);gl.uniform1f(u.noise,cfg.noise);gl.uniform2f(u.res,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);}
function loop(now){if(!visible)return;draw(now);if(!reduced)raf=requestAnimationFrame(loop);}
function start(){visible=true;last=0;draw(performance.now());if(!reduced)raf=requestAnimationFrame(loop);}
document.addEventListener("visibilitychange",()=>{if(document.hidden){visible=false;cancelAnimationFrame(raf);}else start();});
addEventListener("resize",()=>{if(reduced)draw(performance.now());});start();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();