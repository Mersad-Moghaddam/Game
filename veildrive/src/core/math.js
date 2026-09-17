export const TAU = Math.PI * 2;
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp = (a,b,t)=>a+(b-a)*t;
export const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const norm = (x,y)=>{ const l=Math.hypot(x,y)||1; return {x:x/l,y:y/l}; };
export const angleDiff = (a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export { rng } from './rng.js';
import { rng } from './rng.js';
export const rand = (a,b)=>rng.range(a,b);
export const choose = a=>rng.pick(a);
// Fixed-timestep accumulator: accumulate real frame time, emit whole fixed
// steps and carry the remainder, capping catch-up so a long stall (tab
// resume) cannot spiral into a huge simulation burst.
export const advance = (acc, frameDt, step, maxSteps = 5) => {
  let a = acc + frameDt, steps = 0;
  while (a >= step && steps < maxSteps) { a -= step; steps++; }
  if (a >= step) a = a % step;
  return { steps, acc: a };
};
export function pointSegDist(px,py,x1,y1,x2,y2){ const vx=x2-x1, vy=y2-y1, wx=px-x1, wy=py-y1; const c1=vx*wx+vy*wy, c2=vx*vx+vy*vy; const t=clamp(c1/(c2||1),0,1); const dx=px-(x1+vx*t), dy=py-(y1+vy*t); return Math.hypot(dx,dy); }
export function circleRect(cx,cy,r,o){ const x=clamp(cx,o.x,o.x+o.w), y=clamp(cy,o.y,o.y+o.h); const dx=cx-x,dy=cy-y; return dx*dx+dy*dy<r*r; }
// Exact segment/rectangle intersection (Liang-Barsky). Point sampling used
// to miss thin walls, letting bullets and line of sight pass through them.
export function segRectEntry(x1,y1,x2,y2,r){
  let t0=0,t1=1;const dx=x2-x1,dy=y2-y1;
  const p=[-dx,dx,-dy,dy],q=[x1-r.x,r.x+r.w-x1,y1-r.y,r.y+r.h-y1];
  for(let i=0;i<4;i++){
    if(p[i]===0){if(q[i]<0)return null;}
    else{const t=q[i]/p[i];if(p[i]<0){if(t>t1)return null;if(t>t0)t0=t;}else{if(t<t0)return null;if(t<t1)t1=t;}}
  }
  return t0;
}
export function segRect(x1,y1,x2,y2,r){ return segRectEntry(x1,y1,x2,y2,r)!==null; }
