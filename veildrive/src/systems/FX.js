import { rand } from '../core/math.js';
import { rng } from '../core/rng.js';
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const NEON = new Set(['#12e0ff', '#ff2e88', '#ff7a1a', '#c6ff2e', '#8b2bff', '#ff1e9c']);
export class FX{
  constructor(){this.p=[];this.decals=[];this.flashes=[];this.after=[];this.corpses=[];this.rings=[];this.casings=[];this.limbs=[];this.bloodEnabled=true;this.quality=1;}
  // Every particle push goes through here so the pool stays bounded no matter
  // which effect created it (bursts, blood, gibs, arterial jets, smoke).
  _pushP(o){if(this.p.length>=900)this.p.splice(0,this.p.length-800);this.p.push(o);}
  burst(x,y,count,color,speed=150,life=.45,size=3){count=Math.max(1,Math.ceil(count*(.35+.65*this.quality)));for(let i=0;i<count;i++){const a=rng.random()*Math.PI*2,s=rand(speed*.25,speed);this._pushP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(life*.5,life),max:life,size:rand(size*.5,size),color,glow:NEON.has(color)});}}
  blood(x,y,amount=10,angle=null){if(!this.bloodEnabled)return;amount=Math.max(3,Math.ceil(amount*(.45+.55*this.quality)));for(let i=0;i<amount;i++){const a=angle==null?rng.random()*Math.PI*2:angle+rand(-.9,.9),s=rand(40,230);this._pushP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.35,.85),max:.85,size:rand(2,6),color:rng.chance(.35)?'#c8102e':'#ff0a3c'});}if(rng.chance(.85))this.pool(x+rand(-14,14),y+rand(-14,14),1);if(angle!=null){const n=3+rng.int(3);for(let i=0;i<n;i++){const d=rand(16,60);this.decals.push({x:x+Math.cos(angle)*d+rand(-8,8),y:y+Math.sin(angle)*d+rand(-8,8),r:rand(5,14),a:rand(.35,.65),painted:false});}}this.trim();}
  gib(x,y,angle,n=10){if(!this.bloodEnabled)return;for(let i=0;i<n;i++){const a=angle+rand(-1.1,1.1),s=rand(60,300);this._pushP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.4,.9),max:.9,size:rand(3,7),color:i%3?'#8e0f22':'#ff0a3c'});}this.pool(x,y,2);}
  pool(x,y,amount=1){for(let i=0;i<Math.max(1,Math.round(amount*4));i++){this.decals.push({x:x+rand(-24,24),y:y+rand(-20,20),r:rand(12,32),a:rand(.5,.8),painted:false});}this.trim();}
  addCorpse(x,y,a,kind='intact'){this.corpses.push({x,y,a,kind,painted:false});while(this.corpses.length>60)this.corpses.shift();}
  // A torn-off limb or head that tumbles, skids and leaves a small pool.
  limb(x,y,angle,kind='arm'){
    if(!this.bloodEnabled)return;
    if(this.limbs.length>=90)this.limbs.shift();
    const a=angle+rand(-1.1,1.1),s=rand(80,240);
    this.limbs.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,a:rand(0,6.283),spin:rand(-11,11),life:rand(.6,1.1),kind});
    this.blood(x+rand(-6,6),y+rand(-6,6),5,angle);
  }
  headPop(x,y,angle){if(!this.bloodEnabled)return;this.limb(x,y,angle,'head');this.arterial(x,y,angle);}
  // A pulsing arterial jet plus a spreading pool: the Hotline Miami signature.
  arterial(x,y,angle){
    if(!this.bloodEnabled)return;
    for(let i=0;i<16;i++){const a=angle+rand(-.5,.5),s=rand(150,430);this._pushP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.4,.9),max:.9,size:rand(2,5),color:'#ff0a3c',glow:false});}
    for(let i=0;i<5;i++){const a=angle+rand(-.4,.4),s=rand(60,150);this._pushP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.5,1),max:1,size:rand(4,8),color:'#8e0f22',glow:false});}
    this.pool(x,y,3);
  }
  trim(){while(this.decals.length>420)this.decals.shift();}
  markAllPainted(){for(const d of this.decals)d.painted=true;for(const c of this.corpses)c.painted=true;}
  unpaintedCount(){let n=0;for(const d of this.decals)if(!d.painted)n++;for(const c of this.corpses)if(!c.painted)n++;return n;}
  flash(x,y,r,color='#f6c37a',life=.07){if(this.flashes.length>=90)this.flashes.shift();this.flashes.push({x,y,r,color,life,max:life})}
  ring(x,y,color='#ff2e88',max=90,life=.34){this.rings.push({x,y,color,max,life,maxLife:life});if(this.rings.length>40)this.rings.shift();}
  ghost(x,y,a){if(this.after.length>=60)this.after.shift();this.after.push({x,y,a,life:.18})}
  // Brass ejected perpendicular to the shot, skidding to a stop on the floor.
  casing(x,y,a){if(this.casings.length>=140)this.casings.shift();const side=rng.chance(.5)?1:-1,ea=a+Math.PI/2*side;this.casings.push({x,y,vx:Math.cos(a)*rand(20,60)+Math.cos(ea)*rand(70,140),vy:Math.sin(a)*rand(20,60)+Math.sin(ea)*rand(70,140),a:rand(0,6.283),spin:rand(-16,16),life:rand(.8,1.4)});}
  smoke(x,y,a){const n=2+rng.int(2);for(let i=0;i<n;i++)this._pushP({x,y,vx:Math.cos(a)*rand(25,70)+rand(-18,18),vy:Math.sin(a)*rand(25,70)+rand(-18,18),life:rand(.3,.6),max:.6,size:rand(2,4.5),color:'#8a8a92',glow:false});}
  update(dt){for(const p of this.p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt);p.life-=dt;}this.p=this.p.filter(p=>p.life>0);for(const c of this.casings){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=Math.pow(.02,dt);c.vy*=Math.pow(.02,dt);c.a+=c.spin*dt;c.life-=dt;}this.casings=this.casings.filter(c=>c.life>0);for(const l of this.limbs){l.x+=l.vx*dt;l.y+=l.vy*dt;l.vx*=Math.pow(.05,dt);l.vy*=Math.pow(.05,dt);l.a+=l.spin*dt;l.life-=dt;}this.limbs=this.limbs.filter(l=>{if(l.life>0)return true;this.decals.push({x:l.x,y:l.y,r:rand(9,17),a:.55,painted:false});this.trim();return false;});for(const f of this.flashes)f.life-=dt;this.flashes=this.flashes.filter(f=>f.life>0);for(const a of this.after)a.life-=dt;this.after=this.after.filter(a=>a.life>0);for(const r of this.rings)r.life-=dt;this.rings=this.rings.filter(r=>r.life>0);}
  drawDecals(ctx){for(const d of this.decals){ctx.globalAlpha=d.a;ctx.fillStyle='#7a0018';ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.65,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  draw(ctx){
    for(const l of this.limbs){
      ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.a);
      const head=l.kind==='head';
      ctx.fillStyle='#4a0010';ctx.fillRect(-(head?5:7),-(head?5:3),(head?10:14),(head?10:6));
      if(head){ctx.fillStyle='#d8a07a';ctx.fillRect(-4,-4,8,8);ctx.fillStyle='#7a0018';ctx.fillRect(-4,2,8,3);}
      else{ctx.fillStyle='#7a0018';ctx.fillRect(-(head?4:6),-2,(head?8:12),4);ctx.fillStyle='#d8a07a';ctx.fillRect(head?4:6,-2,3,4);}
      ctx.restore();
    }
    ctx.fillStyle='#c9a24a';for(const c of this.casings){if(c.life<.2)continue;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.fillRect(-1.6,-1,3.2,2);ctx.restore();}for(const a of this.after){ctx.globalAlpha=a.life/.18*.22;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.a);ctx.fillStyle='#12e0ff';ctx.fillRect(-10,-7,20,14);ctx.restore();}for(const p of this.p){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;}
  drawGlow(ctx){
    for(const f of this.flashes){
      const a=Math.max(0,f.life/f.max);
      const grd=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);
      grd.addColorStop(0,`rgba(255,255,255,${a})`);
      grd.addColorStop(0.4,hexA(f.color,a*0.8));
      grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();
    }
    for(const p of this.p){if(!p.glow)continue;const a=Math.max(0,p.life/p.max);ctx.fillStyle=hexA(p.color,a*.8);ctx.fillRect(p.x-p.size*.75,p.y-p.size*.75,p.size*1.5,p.size*1.5);}
    for(const r of this.rings){const t=1-r.life/r.maxLife,a=Math.max(0,r.life/r.maxLife);ctx.strokeStyle=hexA(r.color,a*.9);ctx.lineWidth=3+3*(1-t);ctx.beginPath();ctx.arc(r.x,r.y,r.max*t,0,Math.PI*2);ctx.stroke();}
  }
}
