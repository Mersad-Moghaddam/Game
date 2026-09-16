import { circleRect, segRect, dist } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
import { moodColor } from '../render/mood.js';
import { drawWeaponArt } from '../render/weapons-art.js';
import { MISSIONS } from '../data/missions.js';

const hash2 = (x, y) => {
  let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

export class Level{
  constructor(def = MISSIONS[0]){
    this.def = def;
    this.w = def.w; this.h = def.h;
    this.mood = def.mood || 'violet';
    this.walls = []; this.doors = []; this.props = []; this.pickups = []; this.lights = []; this.zones = [];
    this.goal = def.goal || { type: 'eliminate' };
    this.exit = { x: def.exit.x, y: def.exit.y, active: false };
    this.objective = null;
    this.dirty = false;
    for(const w of def.walls) this.walls.push({ x: w.x, y: w.y, w: w.w, h: w.h });
    for(const d of def.doors) this.doors.push({ x: d.x, y: d.y, w: d.w, h: d.h, axis: d.axis || (d.w > d.h ? 'h' : 'v'), open: false, broken: false });
    for(const p of def.props) this.props.push({ x: p.x, y: p.y, w: p.w, h: p.h, type: p.type, solid: p.solid !== false, hp: p.hp || 2, broken: false });
    for(const l of def.lights) this.lights.push({ x: l.x, y: l.y, r: l.r, mood: this.mood });
    for(const p of def.pickups) this.pickups.push({ x: p.x, y: p.y, weapon: makeWeapon(p.weapon) });
    this.zones = [{ x: 0, y: 0, w: this.w, h: this.h, type: 'interior', mood: this.mood }];
    if(this.goal.type === 'retrieve') this.objective = { x: this.goal.x, y: this.goal.y, taken: false, label: this.goal.label || 'OBJECTIVE' };
  }
  markDirty(){ this.dirty = true; this._blockersDirty = true; }
  zoneAt(){ return this.mood; }
  // Cached collision blocker list. Movement and line-of-sight query this many
  // times per frame, so rebuilding it each call caused needless allocation and
  // GC hitching. It is rebuilt only when geometry changes (markDirty).
  blockers(){
    if(this._blockersDirty || !this._blockers){
      this._blockers = [...this.walls, ...this.props.filter(p=>p.solid&&!p.broken), ...this.doors.filter(d=>!d.open&&!d.broken)];
      this._blockersDirty = false;
    }
    return this._blockers;
  }
  // Direction from the spawn toward the entry-room door, used so the player
  // always starts (and respawns) facing the way out.
  entryFacing(){ let best=null,bd=Infinity; for(const d of this.doors){const dd=Math.hypot(d.x+d.w/2-this.def.spawn.x,d.y+d.h/2-this.def.spawn.y);if(dd<bd){bd=dd;best=d}} return best?Math.atan2(best.y+best.h/2-this.def.spawn.y,best.x+best.w/2-this.def.spawn.x):0 }
  findOpen(x, y, r = 12){
    if(!this.blocked(x, y, r)) return { x, y };
    for(let ring = 24; ring <= 260; ring += 24){
      for(let i = 0; i < 12; i++){
        const a = (i / 12) * Math.PI * 2;
        const nx = x + Math.cos(a) * ring, ny = y + Math.sin(a) * ring;
        if(!this.blocked(nx, ny, r)) return { x: nx, y: ny };
      }
    }
    return { x, y };
  }
  blocked(x,y,r=12){if(x-r<0||y-r<0||x+r>this.w||y+r>this.h)return true;return this.blockers().some(o=>circleRect(x,y,r,o));}
  moveCircle(e,dx,dy,r=e.r||12){let nx=e.x+dx;if(!this.blocked(nx,e.y,r))e.x=nx;let ny=e.y+dy;if(!this.blocked(e.x,ny,r))e.y=ny;}
  lineBlocked(a,b){return this.blockers().some(o=>segRect(a.x,a.y,b.x,b.y,o));}
  bulletHit(x1,y1,x2,y2){const blockers=[...this.blockers(),...this.props.filter(p=>p.type==='glass'&&!p.broken)];for(const o of blockers){if(segRect(x1,y1,x2,y2,o))return o}return null;}
  nearestDoor(p,max=64){let best=null,bd=max;for(const d of this.doors){if(d.broken||d.open)continue;const c={x:d.x+d.w/2,y:d.y+d.h/2},dd=dist(p,c);if(dd<bd){best=d;bd=dd}}return best;}
  openDoor(d,kick=false){if(!d)return;d.open=true;if(kick)d.broken=true;this.markDirty();}
  damageProp(o,dmg=1){if(!o||!('hp'in o)||o.broken)return false;o.hp-=dmg;if(o.hp<=0){o.broken=true;o.solid=false;this.markDirty();return true}return false;}
  paintDecal(ctx,d){ctx.globalAlpha=d.a;ctx.fillStyle=COLORS.bloodDark;ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  paintCorpse(ctx,c){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(0,0,c.kind==='opened'?22:15,c.kind==='opened'?16:10,0,0,Math.PI*2);ctx.fill();
    if(c.kind==='opened'){ctx.fillStyle=COLORS.bloodDark;ctx.beginPath();ctx.ellipse(0,0,26,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a1030';ctx.fillRect(-10,-5,20,10);ctx.fillStyle=COLORS.ink;ctx.fillRect(-8,-4,16,8);ctx.fillStyle=COLORS.blood;ctx.fillRect(-4,-6,8,12)}
    else if(c.kind==='decap'){ctx.fillStyle=COLORS.bloodDark;ctx.beginPath();ctx.ellipse(6,0,14,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a1030';ctx.fillRect(-11,-6,20,13);ctx.fillStyle=COLORS.ink;ctx.fillRect(-9,-5,16,11);ctx.fillStyle=COLORS.blood;ctx.beginPath();ctx.arc(7,0,4,0,Math.PI*2);ctx.fill()}
    else{ctx.fillStyle='#2a1030';ctx.fillRect(-11,-7,22,14);ctx.fillStyle=COLORS.ink;ctx.fillRect(-9,-6,18,12);ctx.fillStyle=COLORS.blood;ctx.beginPath();ctx.arc(6,0,5,0,Math.PI*2);ctx.fill()}
    ctx.restore();}
  draw(ctx){this.bake(ctx);}
  bake(ctx){
    ctx.save();
    ctx.fillStyle=COLORS.void;ctx.fillRect(0,0,this.w,this.h);
    const g0=moodColor(this.mood,'ground',0), g1=moodColor(this.mood,'ground2',0);
    ctx.fillStyle=g0;ctx.fillRect(0,0,this.w,this.h);
    for(let y=0,j=0;y<this.h;y+=56,j++){for(let x=0,i=0;x<this.w;x+=56,i++){if((i+j)%2===0)continue;ctx.fillStyle=g1;ctx.fillRect(x,y,54,54)}}
    // neon grid seams
    ctx.save();ctx.strokeStyle=moodColor(this.mood,'wallHi',0);ctx.globalAlpha=.10;ctx.lineWidth=1;
    for(let x=0;x<this.w;x+=112){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.h);ctx.stroke()}
    for(let y=0;y<this.h;y+=112){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.w,y);ctx.stroke()}
    ctx.restore();
    // grime
    ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#000';
    for(let i=0;i<220;i++){const x=hash2(i,41)*this.w,y=hash2(i,43)*this.h,r=2+hash2(i,47)*10;ctx.beginPath();ctx.ellipse(x,y,r,r*.7,0,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    // entry-room dressing: mat, floor sign, kind glyph and an arrow to the door
    const sp=this.def.spawn;
    if(sp){
      ctx.save();
      ctx.fillStyle=moodColor(this.mood,'ground2',0);ctx.fillRect(sp.x-34,sp.y-24,68,48);
      ctx.strokeStyle=moodColor(this.mood,'wallHi',0);ctx.lineWidth=2;ctx.strokeRect(sp.x-34,sp.y-24,68,48);
      ctx.strokeStyle=COLORS.bone;ctx.globalAlpha=.22;ctx.lineWidth=2;
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(sp.x-16,sp.y+i*11);ctx.lineTo(sp.x,sp.y+i*11-6);ctx.lineTo(sp.x+16,sp.y+i*11);ctx.stroke()}
      ctx.globalAlpha=1;
      let best=null,bd=1e9;for(const d of this.doors){const dd=Math.hypot(d.x+d.w/2-sp.x,d.y+d.h/2-sp.y);if(dd<bd){best=d;bd=dd}}
      if(best){const ang=Math.atan2(best.y+best.h/2-sp.y,best.x+best.w/2-sp.x);ctx.save();ctx.translate(sp.x,sp.y);ctx.rotate(ang);ctx.fillStyle=COLORS.cyan;ctx.beginPath();ctx.moveTo(42,0);ctx.lineTo(26,-9);ctx.lineTo(26,9);ctx.closePath();ctx.fill();ctx.fillRect(-6,-3,32,6);ctx.restore()}
      const k=this.def.entryKind;
      ctx.fillStyle=COLORS.cyan;
      if(k==='elevator'){for(let i=0;i<3;i++)ctx.fillRect(sp.x-30+i*6,sp.y+16,4,12)}
      else if(k==='stairs'){for(let i=0;i<3;i++)ctx.fillRect(sp.x-30+i*5,sp.y+16+i*4,9,4)}
      else{ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=2;ctx.strokeRect(sp.x-30,sp.y+16,14,12)}
      ctx.fillStyle=COLORS.ink;ctx.fillRect(sp.x-42,sp.y-48,84,18);
      ctx.strokeStyle=COLORS.hotPink;ctx.lineWidth=1.5;ctx.strokeRect(sp.x-42,sp.y-48,84,18);
      ctx.fillStyle=COLORS.bone;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(this.def.entryLabel||'ENTRY',sp.x,sp.y-35);ctx.textAlign='left';
      ctx.restore();
    }
    // doors
    for(const d of this.doors){if(d.open||d.broken){ctx.strokeStyle=COLORS.orange;ctx.globalAlpha=.5;ctx.setLineDash([6,5]);ctx.strokeRect(d.x+.5,d.y+.5,d.w-1,d.h-1);ctx.setLineDash([]);ctx.globalAlpha=1;continue}ctx.fillStyle=COLORS.wall;ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle=moodColor(this.mood,'wallHi',0);ctx.lineWidth=2;ctx.strokeRect(d.x+3,d.y+3,d.w-6,d.h-6)}
    // walls
    for(const w of this.walls){ctx.fillStyle=COLORS.wall;ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle=COLORS.ink;ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle=COLORS.wall;ctx.fillRect(w.x+2,w.y+2,Math.max(0,w.w-4),Math.max(0,w.h-4));ctx.fillStyle=moodColor(this.mood,'wallHi',0);ctx.fillRect(w.x,w.y,Math.min(6,w.w),w.h);ctx.fillRect(w.x,w.y,w.w,Math.min(6,w.h));
      ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#000';
      for(let i=0;i<3;i++){const px=w.x+hash2(w.x+i,w.y)*w.w,py=w.y+hash2(w.y+i,w.x)*w.h,r=2+hash2(w.x,w.y+i)*4;ctx.fillRect(px,py,r,r)}
      ctx.restore();
    }
    // props
    for(const p of this.props){if(p.broken){if(p.type==='glass'){ctx.fillStyle='rgba(18,224,255,.3)';for(let i=0;i<5;i++)ctx.fillRect(p.x-8+i*5,p.y+3+(i%2)*4,5,2)}continue}
      let c=COLORS.violet;
      if(p.type==='bed')c=COLORS.magenta;else if(p.type==='car')c=COLORS.blue;else if(p.type==='vending')c=COLORS.hotPink;else if(p.type==='barrel')c=COLORS.orange;else if(p.type==='glass')c='rgba(18,224,255,.45)';else if(p.type==='desk'||p.type==='table'||p.type==='sofa')c='#4a1a7a';else if(p.type==='dumpster'||p.type==='bench')c='#2e4a1a';else if(p.type==='cabinet')c='#5a1440';
      ctx.fillStyle=c;ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle=COLORS.ink;ctx.fillRect(p.x,p.y,p.w,2);ctx.fillRect(p.x,p.y,2,p.h);
      ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.strokeRect(p.x+.5,p.y+.5,p.w-1,p.h-1);
      if(p.type==='car'){ctx.fillStyle='rgba(18,224,255,.5)';ctx.fillRect(p.x+8,p.y+8,p.w-24,10)}
      if(p.type==='vending'){ctx.fillStyle=moodColor(this.mood,'glow',0);ctx.globalAlpha=.35;ctx.fillRect(p.x+6,p.y+6,p.w-12,p.h-12);ctx.globalAlpha=1}
      if(p.type==='bench'){ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(p.x+3,p.y+4,p.w-6,3)}
    }
    ctx.restore();
  }
  drawItems(ctx){
    for(const p of this.pickups){if(p.taken)continue;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.3;ctx.fillStyle=p.weapon.color;ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.rotate(-.42);drawWeaponArt(ctx,p.weapon,0.85);ctx.restore();}
    if(this.objective&&!this.objective.taken){ctx.save();ctx.translate(this.objective.x,this.objective.y);ctx.globalAlpha=.3;ctx.fillStyle=COLORS.orange;ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.rotate(-.35);ctx.fillStyle=COLORS.orange;ctx.fillRect(-11,-7,22,14);ctx.fillStyle=COLORS.ink;ctx.fillRect(-7,-4,5,8);ctx.fillRect(2,-4,5,8);ctx.restore();}
    if(this.exit&&this.exit.active){ctx.save();ctx.translate(this.exit.x,this.exit.y);ctx.globalAlpha=.35;ctx.fillStyle=COLORS.cyan;ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=3;ctx.strokeRect(-17,-17,34,34);ctx.fillStyle=COLORS.bone;ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('EXIT',0,4);ctx.textAlign='left';ctx.restore();}
  }
}
