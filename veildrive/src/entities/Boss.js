import { dist, norm, rand } from '../core/math.js';
import { rng } from '../core/rng.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
import { drawCharacter } from '../render/character.js';
export class Boss{
  constructor(x,y){this.x=x;this.y=y;this.r=19;this.a=0;this.hp=16;this.maxHp=16;this.dead=false;this.phase=1;this.cool=1;this.mode='gun';this.telegraph=0;this.chargeT=0;this.stun=0;this.weapon=makeWeapon('revolver');this.name='THE PORTER';this.burst=0;}
  update(dt,g){if(this.dead||g.player.dead)return;const p=g.player,d=dist(this,p);this.cool-=dt;if(this.stun>0){this.stun-=dt;return}this.phase=this.hp>10?1:this.hp>5?2:3;
    if(this.phase<3){const n=norm(p.x-this.x,p.y-this.y);this.a=Math.atan2(n.y,n.x);const ideal=this.phase===1?300:245;if(d>ideal+40)g.level.moveCircle(this,n.x*88*dt,n.y*88*dt,this.r);else if(d<ideal-55)g.level.moveCircle(this,-n.x*70*dt,-n.y*70*dt,this.r);
      if(this.cool<=0){if(this.phase===1){this.burst=3;this.cool=1.2;}else{if(rng.chance(.48)){g.spawnHazard(this.x,this.y,this.a);this.cool=1.95}else{this.burst=4;this.cool=1.55}}}
      if(this.burst>0&&this.cool<(1.2-(4-this.burst)*.14)){g.enemyShoot(this,this.weapon,this.a+rand(-.05,.05));this.burst--;}
    }else{
      if(this.mode==='gun'&&this.cool<=0){this.mode='telegraph';this.telegraph=.72;this.a=Math.atan2(p.y-this.y,p.x-this.x);this.cool=1.8;g.audio.play('boss')}
      if(this.mode==='telegraph'){this.telegraph-=dt;if(this.telegraph<=0){this.mode='charge';this.chargeT=.62}}
      else if(this.mode==='charge'){this.chargeT-=dt;const ox=this.x,oy=this.y;g.level.moveCircle(this,Math.cos(this.a)*430*dt,Math.sin(this.a)*430*dt,this.r);if(dist(this,p)<this.r+p.r+3)p.damage(1,g,this.a);if(Math.hypot(this.x-ox,this.y-oy)<4||this.chargeT<=0){this.mode='stunned';this.stun=1.4;this.cool=1.4;g.shake(7);g.fx.burst(this.x,this.y,12,'#e0b258',180,.55,4)}}
      else if(this.mode==='stunned'&&this.stun<=0)this.mode='gun';
    }
  }
  damage(n,g,angle=0){if(this.dead)return;this.phase=this.hp>10?1:this.hp>5?2:3;const vulnerable=this.stun>0||this.phase<3;this.hp-=vulnerable?n:Math.max(.25,n*.35);g.fx.blood(this.x,this.y,6,angle);g.shake(3);if(this.hp<=0){this.dead=true;g.onBossKilled(this)}}
  accent(){return this.phase===3?COLORS.blood:this.phase===2?COLORS.orange:COLORS.violet}
  draw(ctx){if(this.dead)return;const flash=this.stun>0;
    const pose=this.stun>0?'hurt':(this.mode==='charge'?'run':'aim');
    const hpFrac=Math.max(0,this.hp/this.maxHp);
    const wardrobe=this.phase===3?{shirt:'#3a1030',shirtDark:'#180f2c'}:{};
    drawCharacter(ctx,{x:this.x,y:this.y,facing:this.a,archetype:'porter',palette:{...wardrobe,accent:this.accent()},gear:{apron:true,mask:'keyhole',shoulderPads:true},pose,phase:(performance.now()/110)%6.283,weapon:this.weapon,weaponScale:1.3,hitFlash:flash,recoil:this.burst>0?1:0,hpFrac,seed:0xB055});
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(this.x-34,this.y-32,68,6);ctx.fillStyle=COLORS.hotPink;ctx.fillRect(this.x-33,this.y-31,66*(this.hp/this.maxHp),4);
  }
  drawGlow(ctx){if(this.dead)return;const c=Math.cos(this.a),s=Math.sin(this.a);ctx.save();ctx.fillStyle=this.accent();ctx.fillRect(this.x+c*10-4,this.y+s*10-4,8,8);ctx.restore();
    if(this.phase===3&&this.mode==='telegraph'){ctx.strokeStyle='rgba(255,46,136,.9)';ctx.lineWidth=3;ctx.setLineDash([9,7]);ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x+Math.cos(this.a)*430,this.y+Math.sin(this.a)*430);ctx.stroke();ctx.setLineDash([])}
  }
}
