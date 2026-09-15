export const TAU = Math.PI * 2;
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp = (a,b,t)=>a+(b-a)*t;
export const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const norm = (x,y)=>{ const l=Math.hypot(x,y)||1; return {x:x/l,y:y/l}; };
export const angleDiff = (a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const rand = (a,b)=>a+Math.random()*(b-a);
export const choose = a=>a[(Math.random()*a.length)|0];
export function pointSegDist(px,py,x1,y1,x2,y2){ const vx=x2-x1, vy=y2-y1, wx=px-x1, wy=py-y1; const c1=vx*wx+vy*wy, c2=vx*vx+vy*vy; const t=clamp(c1/(c2||1),0,1); const dx=px-(x1+vx*t), dy=py-(y1+vy*t); return Math.hypot(dx,dy); }
export function circleRect(cx,cy,r,o){ const x=clamp(cx,o.x,o.x+o.w), y=clamp(cy,o.y,o.y+o.h); const dx=cx-x,dy=cy-y; return dx*dx+dy*dy<r*r; }
export function segRect(x1,y1,x2,y2,r){ const steps=Math.max(2,Math.ceil(Math.hypot(x2-x1,y2-y1)/12)); for(let i=0;i<=steps;i++){const t=i/steps,x=lerp(x1,x2,t),y=lerp(y1,y2,t); if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h) return true;} return false; }
