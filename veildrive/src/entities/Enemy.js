import { dist, norm, angleDiff, rand, clamp } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
const TYPES={
 guard:{hp:2,speed:120,weapon:'pistol',fov:1.65,vision:390,hear:1,reaction:.32,color:'#5a3a44',accent:'#ff2e88'},
 brawler:{hp:2,speed:155,weapon:'baton',fov:1.9,vision:330,hear:1.05,reaction:.24,color:'#4a3f33',accent:'#ff7a1a'},
 shotgunner:{hp:2,speed:112,weapon:'shotgun',fov:1.55,vision:370,hear:1,reaction:.38,color:'#4a3a24',accent:'#c6ff2e'},
 hunter:{hp:2,speed:145,weapon:'smg',fov:1.75,vision:430,hear:1.1,reaction:.2,color:'#2f4440',accent:'#12e0ff'},
 elite:{hp:3,speed:160,weapon:'revolver',fov:2.05,vision:470,hear:1.2,reaction:.14,color:'#45254a',accent:'#8b2bff'}
};
export class Enemy{
 constructor(x,y,type='guard',waypoints=[]){const c=TYPES[type];Object.assign(this,{x,y,r:12,type,state:'PATROL',a:0,hp:c.hp,maxHp:c.hp,speed:c.speed,fov:c.fov,vision:c.vision,hear:c.hear,reaction:c.reaction,color:c.color,accent:c.accent,animT:rand(0,6),weapon:makeWeapon(c.weapon),waypoints,wp:0,dead:false,stun:0,attackCd:rand(.1,.5),seenT:0,alertT:0,searchT:0,lastKnown:null,strafe:Math.random()<.5?-1:1,knockX:0,knockY:0});}
 perceive(g){if(this.dead)return;for(const other of g.enemies){if(other!==this&&other.dead&&!this._sawBody&&dist(this,other)<150&&!g.level.lineBlocked(this,other)){this._sawBody=true;this.state='INVESTIGATE';this.lastKnown={x:other.x,y:other.y};this.searchT=3.5;g.alertNearby(this.x,this.y,190,other);break}}const p=g.player,d=dist(this,p),to=Math.atan2(p.y-this.y,p.x-this.x),inCone=Math.abs(angleDiff(this.a,to))<this.fov*.5;const visible=d<this.vision*(g.player.detectionMul||1)&&inCone&&!g.level.lineBlocked(this,p);if(visible){this.seenT+=g.aiStep;if(this.seenT>=this.reaction){this.state='COMBAT';this.lastKnown={x:p.x,y:p.y};this.alertT=4;g.alertNearby(this.x,this.y,220,p);}}else{this.seenT=Math.max(0,this.seenT-g.aiStep*1.6);if(this.state==='COMBAT'){this.alertT-=g.aiStep;if(this.alertT<=0){this.state='SEARCH';this.searchT=3.5}}}}
 hearNoise(ev,g){if(this.dead)return;const d=dist(this,ev);if(d<ev.radius*this.hear){if(this.state!=='COMBAT'){this.state='INVESTIGATE';this.lastKnown={x:ev.x,y:ev.y};this.searchT=3}if(ev.radius>300)g.alertNearby(this.x,this.y,170,ev)}}
 update(dt,g){if(this.dead)return;this.animT=(this.animT||0)+dt*4;this.attackCd=Math.max(0,this.attackCd-dt);if(this.stun>0){this.stun-=dt;g.level.moveCircle(this,this.knockX*dt,this.knockY*dt);this.knockX*=.88;this.knockY*=.88;return}const p=g.player;if(p.dead)return;
   if(this.state==='PATROL'){if(this.waypoints.length){const t=this.waypoints[this.wp],d=dist(this,t);this.moveToward(t,dt,g,.65);if(d<18)this.wp=(this.wp+1)%this.waypoints.length}else this.a+=dt*.2;}
   else if(this.state==='INVESTIGATE'){if(this.lastKnown){this.moveToward(this.lastKnown,dt,g,.82);if(dist(this,this.lastKnown)<24){this.state='SEARCH';this.searchT=2.6}}}
   else if(this.state==='SEARCH'){this.searchT-=dt;if(this.lastKnown){const wob={x:this.lastKnown.x+Math.cos(this.searchT*2+this.x)*55,y:this.lastKnown.y+Math.sin(this.searchT*1.7+this.y)*55};this.moveToward(wob,dt,g,.65)}if(this.searchT<=0)this.state='PATROL';}
   else if(this.state==='COMBAT'){this.combat(dt,g,p)}
 }
 moveToward(t,dt,g,m=1){let n=norm(t.x-this.x,t.y-this.y);const probe=24;if(g.level.blocked(this.x+n.x*probe,this.y+n.y*probe,this.r)){const base=Math.atan2(n.y,n.x),offsets=[.55,-.55,1.05,-1.05,1.55,-1.55];let best=null,bestScore=1e9;for(const off of offsets){const a=base+off,v={x:Math.cos(a),y:Math.sin(a)};if(g.level.blocked(this.x+v.x*probe,this.y+v.y*probe,this.r))continue;const nx=this.x+v.x*probe,ny=this.y+v.y*probe,score=Math.hypot(t.x-nx,t.y-ny)+Math.abs(off)*12;if(score<bestScore){best=v;bestScore=score}}if(best)n=best}this.a=Math.atan2(n.y,n.x);g.level.moveCircle(this,n.x*this.speed*m*dt,n.y*this.speed*m*dt,this.r)}
 combat(dt,g,p){const w=this.weapon,d=dist(this,p),to=Math.atan2(p.y-this.y,p.x-this.x);this.a=to;this.lastKnown={x:p.x,y:p.y};this.alertT=4;const los=!g.level.lineBlocked(this,p);
   if(w.kind==='melee'){if(d>36)this.moveToward(p,dt,g,1.05);else if(this.attackCd<=0&&los){this.attackCd=.7;g.enemyMelee(this,p)}}
   else {const ideal=this.type==='shotgunner'?175:this.type==='hunter'?260:230;let mx=0,my=0;if(d>ideal+45){const n=norm(p.x-this.x,p.y-this.y);mx=n.x;my=n.y}else if(d<ideal-55){const n=norm(this.x-p.x,this.y-p.y);mx=n.x;my=n.y}else if(this.type==='hunter'){const n=norm(p.x-this.x,p.y-this.y);mx=-n.y*this.strafe;my=n.x*this.strafe}g.level.moveCircle(this,mx*this.speed*.65*dt,my*this.speed*.65*dt,this.r);if(los&&this.attackCd<=0){this.attackCd=w.rate*(this.type==='elite'?.82:1)+rand(.03,.12);g.enemyShoot(this,w,to+rand(-.05,.05)*(this.type==='elite'?.5:1.2));}}
 }
 damage(n,g,angle=0,knock=110){if(this.dead)return;this.hp-=n;this.state='COMBAT';this.stun=.08;this.knockX=Math.cos(angle)*knock;this.knockY=Math.sin(angle)*knock;if(this.hp<=0){this.dead=true;g.onEnemyKilled(this,angle)}else{g.fx.blood(this.x,this.y,4,angle);g.shake(2)}}
 stunHit(g,angle,power=180){if(this.dead)return;this.stun=.72;this.state='COMBAT';this.knockX=Math.cos(angle)*power;this.knockY=Math.sin(angle)*power;g.fx.burst(this.x,this.y,7,'#d6d0b7',100,.35,3)}
 draw(ctx,debug=false){if(this.dead)return;const s=Math.sin(this.animT||0)*1.5;const bulk=this.type==='brawler'?2:0;
   ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a);
   ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(-2,5,14,9,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=COLORS.ink;ctx.fillRect(-9,6+s,5,9);ctx.fillRect(3,6-s,5,9);
   ctx.fillStyle=COLORS.ink;ctx.fillRect(-11-bulk,-9-bulk,21+bulk*2,18+bulk*2);
   ctx.fillStyle=this.color;ctx.fillRect(-9-bulk,-7-bulk,17+bulk*2,14+bulk*2);
   ctx.fillStyle=COLORS.bone;ctx.beginPath();ctx.arc(7,0,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=this.accent;
   if(this.type==='guard')ctx.fillRect(0,-8,12,5);
   else if(this.type==='brawler')ctx.fillRect(2,-8,10,3);
   else if(this.type==='shotgunner')ctx.fillRect(-9,-8,18,4);
   else if(this.type==='hunter'){ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(14,-9);ctx.lineTo(7,2);ctx.closePath();ctx.fill()}
   else if(this.type==='elite')ctx.fillRect(6,-4,7,8);
   ctx.fillStyle=this.state==='COMBAT'?COLORS.hotPink:'#3a2a33';ctx.fillRect(9,-2,5,4);
   if(this.weapon.kind==='gun'){ctx.fillStyle=this.weapon.color;ctx.fillRect(16,-2,15,4)}else{ctx.fillStyle=this.weapon.color;ctx.fillRect(14,-2,24,4)}
   ctx.restore();
   if(debug){ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText(this.state,this.x-20,this.y-18)}}
 drawGlow(ctx){if(this.dead)return;const hot=this.state==='COMBAT';ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a);ctx.fillStyle=hot?'#ff2e88':this.accent;ctx.fillRect(9,-2,6,2);ctx.fillRect(9,2,6,2);ctx.restore()}
}
