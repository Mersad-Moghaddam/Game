import { rand } from '../core/math.js';
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const NEON = new Set(['#12e0ff', '#ff2e88', '#ff7a1a', '#c6ff2e', '#8b2bff', '#ff1e9c']);
export class FX{
  constructor(){this.p=[];this.decals=[];this.flashes=[];this.after=[];this.corpses=[];this.bloodEnabled=true;this.quality=1;}
  burst(x,y,count,color,speed=150,life=.45,size=3){count=Math.max(1,Math.ceil(count*(.35+.65*this.quality)));if(this.p.length>560)this.p.splice(0,this.p.length-500);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=rand(speed*.25,speed);this.p.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(life*.5,life),max:life,size:rand(size*.5,size),color,glow:NEON.has(color)});}}
  blood(x,y,amount=8,angle=null){if(!this.bloodEnabled)return;amount=Math.max(2,Math.ceil(amount*(.45+.55*this.quality)));for(let i=0;i<amount;i++){const a=angle==null?Math.random()*Math.PI*2:angle+rand(-.7,.7),s=rand(35,190);this.p.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.3,.7),max:.7,size:rand(2,5),color:'#ff0a3c'});}if(Math.random()<.7)this.pool(x+rand(-12,12),y+rand(-12,12),0.5);if(angle!=null){const n=2+(Math.random()*2|0);for(let i=0;i<n;i++){const d=rand(14,46);this.decals.push({x:x+Math.cos(angle)*d+rand(-6,6),y:y+Math.sin(angle)*d+rand(-6,6),r:rand(4,11),a:rand(.3,.55),painted:false});}}this.trim();}
  pool(x,y,amount=1){for(let i=0;i<Math.max(1,Math.round(amount*3));i++){this.decals.push({x:x+rand(-20,20),y:y+rand(-16,16),r:rand(10,26),a:rand(.5,.75),painted:false});}this.trim();}
  addCorpse(x,y,a){this.corpses.push({x,y,a,painted:false});while(this.corpses.length>40)this.corpses.shift();}
  trim(){while(this.decals.length>260)this.decals.shift();}
  markAllPainted(){for(const d of this.decals)d.painted=true;for(const c of this.corpses)c.painted=true;}
  unpaintedCount(){let n=0;for(const d of this.decals)if(!d.painted)n++;for(const c of this.corpses)if(!c.painted)n++;return n;}
  flash(x,y,r,color='#f6c37a',life=.07){this.flashes.push({x,y,r,color,life,max:life})}
  ghost(x,y,a){this.after.push({x,y,a,life:.18})}
  update(dt){for(const p of this.p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt);p.life-=dt;}this.p=this.p.filter(p=>p.life>0);for(const f of this.flashes)f.life-=dt;this.flashes=this.flashes.filter(f=>f.life>0);for(const a of this.after)a.life-=dt;this.after=this.after.filter(a=>a.life>0);}
  drawDecals(ctx){for(const d of this.decals){ctx.globalAlpha=d.a;ctx.fillStyle='#7a0018';ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.65,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  draw(ctx){for(const a of this.after){ctx.globalAlpha=a.life/.18*.22;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.a);ctx.fillStyle='#12e0ff';ctx.fillRect(-10,-7,20,14);ctx.restore();}for(const p of this.p){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;}
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
  }
}
