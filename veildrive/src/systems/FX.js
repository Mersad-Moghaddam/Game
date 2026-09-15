import { rand } from '../core/math.js';
export class FX{
  constructor(){this.p=[];this.decals=[];this.flashes=[];this.after=[];this.bloodEnabled=true;this.quality=1;}
  burst(x,y,count,color,speed=150,life=.45,size=3){count=Math.max(1,Math.ceil(count*(.35+.65*this.quality)));if(this.p.length>560)this.p.splice(0,this.p.length-500);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=rand(speed*.25,speed);this.p.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(life*.5,life),max:life,size:rand(size*.5,size),color});}}
  blood(x,y,amount=8,angle=null){if(!this.bloodEnabled)return;amount=Math.max(2,Math.ceil(amount*(.45+.55*this.quality)));for(let i=0;i<amount;i++){const a=angle==null?Math.random()*Math.PI*2:angle+rand(-.7,.7),s=rand(35,190);this.p.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.3,.7),max:.7,size:rand(2,5),color:'#8e1930'});}if(Math.random()<.7)this.decals.push({x:x+rand(-12,12),y:y+rand(-12,12),r:rand(5,13),a:rand(.3,.6)});if(this.decals.length>90)this.decals.shift();}
  flash(x,y,r,color='#f6c37a',life=.07){this.flashes.push({x,y,r,color,life,max:life})}
  ghost(x,y,a){this.after.push({x,y,a,life:.18})}
  update(dt){for(const p of this.p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt);p.life-=dt;}this.p=this.p.filter(p=>p.life>0);for(const f of this.flashes)f.life-=dt;this.flashes=this.flashes.filter(f=>f.life>0);for(const a of this.after)a.life-=dt;this.after=this.after.filter(a=>a.life>0);}
  drawDecals(ctx){for(const d of this.decals){ctx.globalAlpha=d.a;ctx.fillStyle='#6f1025';ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.65,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  draw(ctx){for(const a of this.after){ctx.globalAlpha=a.life/.18*.22;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.a);ctx.fillStyle='#52d1ca';ctx.fillRect(-10,-7,20,14);ctx.restore();}for(const p of this.p){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;}
}
