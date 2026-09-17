import { dist, norm, angleDiff, rand } from '../core/math.js';
import { rng } from '../core/rng.js';
import { makeWeapon } from '../combat/weapons.js';
import { drawCharacter } from '../render/character.js';
const TYPES={
 guard:{hp:1,speed:120,weapon:'pistol',fov:1.65,vision:390,hear:1,reaction:.32,color:'#c33b5a',accent:'#ff2e88'},
 brawler:{hp:1,speed:155,weapon:'baton',fov:1.9,vision:330,hear:1.05,reaction:.24,color:'#e07a2b',accent:'#ffb347'},
 shotgunner:{hp:1,speed:112,weapon:'shotgun',fov:1.55,vision:370,hear:1,reaction:.38,color:'#9bbf2e',accent:'#d6ff4a'},
 hunter:{hp:1,speed:145,weapon:'smg',fov:1.75,vision:430,hear:1.1,reaction:.2,color:'#2f9fb5',accent:'#12e0ff'},
 elite:{hp:2,speed:160,weapon:'revolver',fov:2.05,vision:470,hear:1.2,reaction:.14,color:'#7a3bff',accent:'#b06bff'}
};
export class Enemy{
 constructor(x,y,type='guard',waypoints=[]){const c=TYPES[type];Object.assign(this,{x,y,r:12,type,state:'PATROL',a:0,hp:c.hp,maxHp:c.hp,speed:c.speed,fov:c.fov,vision:c.vision,hear:c.hear,reaction:c.reaction,color:c.color,accent:c.accent,animT:0,weapon:makeWeapon(c.weapon),waypoints,wp:0,dead:false,stun:0,attackCd:rand(.1,.5),seenT:0,alertT:0,searchT:0,lastKnown:null,strafe:rng.chance(.5)?-1:1,knockX:0,knockY:0,avoidDir:null,avoidT:0,wpWait:0,burst:0,burstT:0});}
 perceive(g){if(this.dead)return;for(const other of g.enemies){if(other!==this&&other.dead&&!this._sawBody&&dist(this,other)<150&&!g.level.lineBlocked(this,other)){this._sawBody=true;this.state='INVESTIGATE';this.lastKnown={x:other.x,y:other.y};this.searchT=3.5;g.alertNearby(this.x,this.y,190,other);break}}const p=g.player,d=dist(this,p),to=Math.atan2(p.y-this.y,p.x-this.x),inCone=Math.abs(angleDiff(this.a,to))<this.fov*.5;const visible=d<this.vision*(g.player.detectionMul||1)&&inCone&&!g.level.lineBlocked(this,p);if(visible){this.seenT+=g.aiStep;if(this.seenT>=this.reaction){this.state='COMBAT';this.lastKnown={x:p.x,y:p.y};this.alertT=4;g.alertNearby(this.x,this.y,220,p);}}else{this.seenT=Math.max(0,this.seenT-g.aiStep*1.6);if(this.state==='COMBAT'){this.alertT-=g.aiStep;if(this.alertT<=0){this.state='SEARCH';this.searchT=3.5}}}}
 hearNoise(ev,g){if(this.dead)return;const d=dist(this,ev);if(d<ev.radius*this.hear){if(this.state!=='COMBAT'){this.state='INVESTIGATE';this.lastKnown={x:ev.x,y:ev.y};this.searchT=3}if(ev.radius>300)g.alertNearby(this.x,this.y,170,ev)}}
  update(dt,g){
   if(this.dead)return;if(!Number.isFinite(this.attackCd)||this.attackCd<0)this.attackCd=0;if(!Number.isFinite(this.stun)||this.stun<0)this.stun=0;this.attackCd=Math.max(0,this.attackCd-dt);
   const sx=this.x,sy=this.y;
   if(this.stun>0){this.stun-=dt;g.level.moveCircle(this,this.knockX*dt,this.knockY*dt);this.knockX*=.88;this.knockY*=.88;this.stepAnim(sx,sy);return}
   const p=g.player;if(p.dead)return;
   if(this.state==='PATROL'){
     if(this.waypoints.length){
       if(this.wpWait>0)this.wpWait-=dt;
       else{const t=this.waypoints[this.wp],d=dist(this,t);this.moveToward(t,dt,g,.65);if(d<18){this.wp=(this.wp+1)%this.waypoints.length;this.wpWait=rand(.5,1.8)}}
     }else this.a+=dt*.2;
   }
   else if(this.state==='INVESTIGATE'){if(this.lastKnown){this.moveToward(this.lastKnown,dt,g,.82);if(dist(this,this.lastKnown)<24){this.state='SEARCH';this.searchT=2.6}}}
   else if(this.state==='SEARCH'){this.searchT-=dt;if(this.lastKnown){const wob={x:this.lastKnown.x+Math.cos(this.searchT*2+this.x)*55,y:this.lastKnown.y+Math.sin(this.searchT*1.7+this.y)*55};this.moveToward(wob,dt,g,.65)}if(this.searchT<=0)this.state='PATROL';}
   else if(this.state==='COMBAT'){this.combat(dt,g,p)}
   this.updateBurst(dt,g,p);
   this.stepAnim(sx,sy);
 }
 // Walk cycle is driven by actual displacement, so idle enemies do not
 // fidget or walk in place.
  stepAnim(sx,sy){const moved=Math.hypot(this.x-sx,this.y-sy);this.animT=(this.animT||0)+moved*0.16;this._moving=moved>0.05;}
  moveToward(t,dt,g,m=1){
    const probe=26;
    if(this.avoidT>0)this.avoidT-=dt;
    this._pathT=(this._pathT||0)-dt;
    const d0=norm(t.x-this.x,t.y-this.y);
    let n=d0;
    const clear=!g.level.blocked(this.x+d0.x*probe,this.y+d0.y*probe,this.r);
    if(clear){this._path=null;}
    else if(g.nav){
      // Direct route is blocked: follow a throttled A* path through openings.
      if(!this._path||this._pathT<=0){this._path=g.nav.path(this.x,this.y,t.x,t.y);this._pathI=1;this._pathT=.45;}
      if(this._path&&this._path.length){
        while(this._pathI<this._path.length&&dist(this,this._path[this._pathI])<g.nav.cell*.75)this._pathI++;
        const wp=this._path[Math.min(this._pathI,this._path.length-1)];
        if(wp)n=norm(wp.x-this.x,wp.y-this.y);
        if(this._pathI>=this._path.length)this._path=null;
      }
    }
    // Local steering is the fallback when no path is available.
    if(!clear&&!this._path&&g.level.blocked(this.x+n.x*probe,this.y+n.y*probe,this.r)){
      const base=Math.atan2(n.y,n.x);let best=null;
      if(this.avoidDir!==null&&this.avoidT>0){const a=base+this.avoidDir,v={x:Math.cos(a),y:Math.sin(a)};if(!g.level.blocked(this.x+v.x*probe,this.y+v.y*probe,this.r))best={v,off:this.avoidDir};}
      if(!best){const offsets=[.55,-.55,1.05,-1.05,1.55,-1.55];let bs=1e9;for(const off of offsets){const a=base+off,v={x:Math.cos(a),y:Math.sin(a)};if(g.level.blocked(this.x+v.x*probe,this.y+v.y*probe,this.r))continue;const nx=this.x+v.x*probe,ny=this.y+v.y*probe,score=Math.hypot(t.x-nx,t.y-ny)+Math.abs(off)*12;if(score<bs){bs=score;best={v,off};}}if(best){this.avoidDir=best.off;this.avoidT=.4;}}
      if(best)n=best.v;
    }else if(clear)this.avoidT=0;
    this.a=Math.atan2(n.y,n.x);g.level.moveCircle(this,n.x*this.speed*m*dt,n.y*this.speed*m*dt,this.r);
  }
  combat(dt,g,p){
    const w=this.weapon,d=dist(this,p),to=Math.atan2(p.y-this.y,p.x-this.x);this.lastKnown={x:p.x,y:p.y};this.alertT=4;const los=!g.level.lineBlocked(this,p);const pres=g.pressureVal||0;
    // Accurate types lead the player's movement.
    let aim=to;if(this.type==='hunter'||this.type==='elite'){const lead=Math.min(.22,d/980);aim=Math.atan2(p.y+(p.vy||0)*lead-this.y,p.x+(p.vx||0)*lead-this.x);}this.a=aim;
    if(w.kind==='melee'){if(d>36)this.moveToward(p,dt,g,1.05);else if(this.attackCd<=0&&los){this.attackCd=.7;g.enemyMelee(this,p)}}
    else{
      const ideal=this.type==='shotgunner'?175:this.type==='hunter'?260:230;let mx=0,my=0;
      if(!los){const n=norm(p.x-this.x,p.y-this.y);mx=n.x;my=n.y;}                 // close the gap to regain line of sight
      else if(d>ideal+45){const n=norm(p.x-this.x,p.y-this.y);mx=n.x;my=n.y}
      else if(d<ideal-55){const n=norm(this.x-p.x,this.y-p.y);mx=n.x;my=n.y}
      else if(this.role==='flank'){const n=norm(p.x-this.x,p.y-this.y);mx=-n.y*this.strafe;my=n.x*this.strafe}
      else if(this.type==='hunter'){const n=norm(p.x-this.x,p.y-this.y);mx=-n.y*this.strafe;my=n.x*this.strafe}
      g.level.moveCircle(this,mx*this.speed*.65*dt,my*this.speed*.65*dt,this.r);
      if(los&&this.attackCd<=0){this.attackCd=(w.rate*(this.type==='elite'?.85:1)+rand(.03,.12))*(1-pres*.15);g.enemyShoot(this,w,aim+rand(-.05,.05)*(this.type==='elite'?.5:1.2)*(1-pres*.35));if(this.type==='elite'){this.burst=2;this.burstT=.12;}}
    }
  }
 updateBurst(dt,g,p){if(this.burst<=0)return;this.burstT-=dt;if(this.burstT>0)return;this.burst--;this.burstT=.13;if(this.state==='COMBAT'&&p&&!p.dead&&!g.level.lineBlocked(this,p)){const to=Math.atan2(p.y-this.y,p.x-this.x);g.enemyShoot(this,this.weapon,to+rand(-.07,.07));}}
 damage(n,g,angle=0,knock=110){if(this.dead)return;this.hp-=n;this.state='COMBAT';this.stun=.08;this.knockX=Math.cos(angle)*knock;this.knockY=Math.sin(angle)*knock;if(this.hp<=0){this.dead=true;g.onEnemyKilled(this,angle,n)}else{g.fx.blood(this.x,this.y,7,angle);g.shake(2)}}
 stunHit(g,angle,power=180){if(this.dead)return;this.stun=.72;this.state='COMBAT';this.knockX=Math.cos(angle)*power;this.knockY=Math.sin(angle)*power;g.fx.burst(this.x,this.y,7,'#d6d0b7',100,.35,3)}
  draw(ctx,debug=false){if(this.dead)return;
    const arch={guard:'guard',brawler:'brawler',shotgunner:'shotgunner',hunter:'hunter',elite:'elite'}[this.type]||'guard';
    const pose=this.stun>0.35?'stunned':(this.attackCd>0&&this.weapon.kind==='melee'?'melee':(this.state==='COMBAT'?'aim':(this._moving?'walk':'idle')));
    const hpFrac=this.maxHp?this.hp/this.maxHp:1;
    drawCharacter(ctx,{x:this.x,y:this.y,facing:this.a,archetype:arch,pose,phase:this.animT||0,weapon:this.weapon,hitFlash:this.stun>0,recoil:Math.max(0,this.attackCd),hpFrac,limp:hpFrac<=.4,seed:this.x|0});
    if(debug){ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText(this.state,this.x-20,this.y-18)}}
  drawGlow(ctx){if(this.dead)return;const hot=this.state==='COMBAT';const c=Math.cos(this.a),s=Math.sin(this.a);ctx.save();const col=hot?'#ff2e88':this.accent;ctx.fillStyle=col;ctx.fillRect(this.x+c*10-3,this.y+s*10-3,6,6);ctx.restore()}
}
