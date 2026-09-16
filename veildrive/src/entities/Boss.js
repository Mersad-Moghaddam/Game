import { dist, norm, rand } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
export class Boss{
  constructor(x,y){this.x=x;this.y=y;this.r=19;this.a=0;this.hp=18;this.maxHp=18;this.dead=false;this.phase=1;this.cool=1;this.mode='gun';this.telegraph=0;this.chargeT=0;this.stun=0;this.weapon=makeWeapon('revolver');this.name='THE PORTER';this.burst=0;}
  update(dt,g){if(this.dead||g.player.dead)return;const p=g.player,d=dist(this,p);this.cool-=dt;if(this.stun>0){this.stun-=dt;return}this.phase=this.hp>12?1:this.hp>6?2:3;
    if(this.phase<3){const n=norm(p.x-this.x,p.y-this.y);this.a=Math.atan2(n.y,n.x);const ideal=this.phase===1?300:245;if(d>ideal+40)g.level.moveCircle(this,n.x*88*dt,n.y*88*dt,this.r);else if(d<ideal-55)g.level.moveCircle(this,-n.x*70*dt,-n.y*70*dt,this.r);
      if(this.cool<=0){if(this.phase===1){this.burst=3;this.cool=.92;}else{if(Math.random()<.48){g.spawnHazard(this.x,this.y,this.a);this.cool=1.55}else{this.burst=4;this.cool=1.2}}}
      if(this.burst>0&&this.cool<(.92-(4-this.burst)*.11)){g.enemyShoot(this,this.weapon,this.a+rand(-.045,.045));this.burst--;}
    }else{
      if(this.mode==='gun'&&this.cool<=0){this.mode='telegraph';this.telegraph=.52;this.a=Math.atan2(p.y-this.y,p.x-this.x);this.cool=1.55;g.audio.play('boss')}
      if(this.mode==='telegraph'){this.telegraph-=dt;if(this.telegraph<=0){this.mode='charge';this.chargeT=.58}}
      else if(this.mode==='charge'){this.chargeT-=dt;const ox=this.x,oy=this.y;g.level.moveCircle(this,Math.cos(this.a)*520*dt,Math.sin(this.a)*520*dt,this.r);if(dist(this,p)<this.r+p.r+3)p.damage(1,g,this.a);if(Math.hypot(this.x-ox,this.y-oy)<4||this.chargeT<=0){this.mode='stunned';this.stun=1.05;this.cool=1.2;g.shake(7);g.fx.burst(this.x,this.y,12,'#e0b258',180,.55,4)}}
      else if(this.mode==='stunned'&&this.stun<=0)this.mode='gun';
    }
  }
  damage(n,g,angle=0){if(this.dead)return;const vulnerable=this.stun>0||this.phase<3;this.hp-=vulnerable?n:Math.max(.25,n*.35);g.fx.blood(this.x,this.y,6,angle);g.shake(3);if(this.hp<=0){this.dead=true;g.onBossKilled(this)}}
  accent(){return this.phase===3?COLORS.blood:this.phase===2?COLORS.orange:COLORS.violet}
  draw(ctx){if(this.dead)return;const flash=this.stun>0;ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a);
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(-3,8,23,14,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=COLORS.ink;ctx.fillRect(-18,-14,33,29);
    ctx.fillStyle=flash?'#ffffff':(this.phase===3?'#3a1030':'#2a1a44');ctx.fillRect(-16,-12,29,25);
    ctx.fillStyle=this.accent();ctx.fillRect(-14,-14,5,29);
    ctx.fillStyle=COLORS.ink;ctx.fillRect(-8,9,7,13);ctx.fillRect(5,9,7,13);
    // bellhop/keyhole mask
    ctx.fillStyle=COLORS.bone;ctx.beginPath();ctx.moveTo(8,-15);ctx.lineTo(21,-8);ctx.lineTo(22,6);ctx.lineTo(12,15);ctx.lineTo(1,8);ctx.lineTo(0,-7);ctx.closePath();ctx.fill();
    ctx.fillStyle=COLORS.ink;ctx.beginPath();ctx.arc(12,-2,4,0,Math.PI*2);ctx.fill();ctx.fillRect(10,1,4,8);
    ctx.fillStyle=this.accent();ctx.fillRect(18,-8,3,7);
    ctx.fillStyle='#b7a994';ctx.fillRect(17,-2,18,5);
    ctx.restore();
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(this.x-34,this.y-32,68,6);ctx.fillStyle=COLORS.hotPink;ctx.fillRect(this.x-33,this.y-31,66*(this.hp/this.maxHp),4);
  }
  drawGlow(ctx){if(this.dead)return;ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a);ctx.fillStyle=this.accent();ctx.beginPath();ctx.arc(12,-2,4,0,Math.PI*2);ctx.fill();ctx.restore();
    if(this.phase===3&&this.mode==='telegraph'){ctx.strokeStyle='rgba(255,46,136,.9)';ctx.lineWidth=3;ctx.setLineDash([9,7]);ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x+Math.cos(this.a)*430,this.y+Math.sin(this.a)*430);ctx.stroke();ctx.setLineDash([])}
  }
}
