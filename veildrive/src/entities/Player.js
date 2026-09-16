import { norm, clamp } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
export class Player{
  constructor(x,y){this.x=x;this.y=y;this.r=13;this.a=0;this.hp=3;this.maxHp=3;this.moveSpeed=235;this.dashCooldown=.92;this.dashTimer=0;this.dashCd=0;this.dashV={x:0,y:0};this.invuln=0;this.attackCd=0;this.reloadT=0;this.reloadMul=1;this.spreadMul=1;this.meleeMul=1;this.noiseMul=1;this.comboBonus=0;this.execRestoresDash=false;this.ricochet=false;this.maskId='MOTH-0';this.breachBonus=0;this.detectionMul=1;this.thrownBonus=0;this.current=makeWeapon('baton');this.previous=null;this.dead=false;this.hitFlash=0;this.stepT=0;}
  update(dt,g){
    const i=g.input;this.attackCd=Math.max(0,this.attackCd-dt);this.dashCd=Math.max(0,this.dashCd-dt);this.invuln=Math.max(0,this.invuln-dt);this.hitFlash=Math.max(0,this.hitFlash-dt);
    const mw=g.screenToWorld(i.mouse.x,i.mouse.y);this.a=Math.atan2(mw.y-this.y,mw.x-this.x);
    if(this.reloadT>0){this.reloadT-=dt;if(this.reloadT<=0&&this.current.kind==='gun'){const need=this.current.mag-this.current.ammo,take=Math.min(need,this.current.reserve);this.current.ammo+=take;this.current.reserve-=take;g.audio.play('reload')}}
    let x=(i.down('KeyD')?1:0)-(i.down('KeyA')?1:0),y=(i.down('KeyS')?1:0)-(i.down('KeyW')?1:0);const n=norm(x,y);if(!x&&!y){n.x=0;n.y=0}
    if(i.tap('ShiftLeft')||i.tap('ShiftRight'))this.startDash(n,g);
    if(this.dashTimer>0){this.dashTimer-=dt;g.level.moveCircle(this,this.dashV.x*dt,this.dashV.y*dt);g.fx.ghost(this.x,this.y,this.a);}
    else{g.level.moveCircle(this,n.x*this.moveSpeed*dt,n.y*this.moveSpeed*dt);if(x||y){this.stepT-=dt;if(this.stepT<=0){this.stepT=.32;g.emitNoise(this.x,this.y,55*this.noiseMul,'step');g.audio.play('step')}}}
    if(this.current.kind==='gun'){if(i.mouse.left&&this.attackCd<=0&&this.reloadT<=0)this.shoot(g);}
    else if(i.mouse.leftPressed&&this.attackCd<=0)this.melee(g);
    if(i.mouse.rightPressed&&this.attackCd<=0)this.throwCurrent(g);
    if(i.tap('KeyR'))this.reload(g);
    if(i.tap('KeyQ'))this.swap(g);
    if(i.tap('KeyE'))g.interact(false);
    if(i.tap('Space'))g.interact(true);
  }
  startDash(n,g){if(this.dashCd>0||this.reloadT>0)return;let d=n;if(!d.x&&!d.y)d={x:Math.cos(this.a),y:Math.sin(this.a)};this.dashTimer=.13;this.dashCd=this.dashCooldown;this.invuln=.11;this.dashV={x:d.x*610,y:d.y*610};g.audio.play('dash');g.shake(3);}
  shoot(g){const w=this.current;if(w.ammo<=0){this.attackCd=.18;g.audio.play('empty');return}w.ammo--;this.attackCd=w.rate;g.fireWeapon(this,w,this.a);if(w.ammo===0)this.attackCd+=.04;}
  melee(g){this.attackCd=this.current.rate;g.meleeAttack(this,this.current,this.a);}
  reload(g){const w=this.current;if(w.kind!=='gun'||w.ammo>=w.mag||w.reserve<=0||this.reloadT>0)return;this.reloadT=w.reload*this.reloadMul;g.audio.play('reload');}
  throwCurrent(g){if(!this.current||this.current.unthrowable)return;const thrown=this.current;g.throwWeapon(this,thrown,this.a);this.current=this.previous||makeWeapon('fists');this.previous=null;this.attackCd=.38;}
  equip(w,g){if(this.current){this.previous=this.current}this.current=w;g.audio.play('pickup');}
  swap(g){if(!this.previous)return;[this.current,this.previous]=[this.previous,this.current];g.audio.play('ui');}
  damage(n,g,sourceA=0){if(this.invuln>0||this.dead)return;this.hp-=n;this.invuln=.24;this.hitFlash=.15;g.fx.blood(this.x,this.y,5,sourceA+Math.PI);g.shake(6);g.audio.play('hurt');if(this.hp<=0){this.dead=true;g.onPlayerDeath();}}
  draw(ctx){
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a+(this.dead?1.15:0));
    // soft shadow
    ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(-2,5,16,10,0,0,Math.PI*2);ctx.fill();
    // legs / coat silhouette
    ctx.fillStyle='#252932';ctx.fillRect(-10,-8,19,16);ctx.fillStyle='#1c2028';ctx.fillRect(-7,6,5,10);ctx.fillRect(3,6,5,10);
    // faded teal bomber with magenta seam
    ctx.fillStyle=this.hitFlash>0?'#f2e9d2':'#176f70';ctx.fillRect(-12,-9,22,17);ctx.fillStyle='#a33b68';ctx.fillRect(-12,-9,3,17);ctx.fillRect(7,-9,3,17);
    // arms and weapon arm
    ctx.fillStyle='#10131a';ctx.fillRect(5,-5,17,6);ctx.fillRect(-14,-5,7,6);
    // interchangeable original mask silhouettes
    ctx.fillStyle='#d6d0b7';
    if(this.maskId==='RAM-7'){ctx.beginPath();ctx.moveTo(1,-10);ctx.lineTo(13,-10);ctx.lineTo(20,-4);ctx.lineTo(17,9);ctx.lineTo(5,11);ctx.lineTo(-1,3);ctx.closePath();ctx.fill();ctx.strokeStyle='#c19a59';ctx.lineWidth=3;ctx.beginPath();ctx.arc(6,-9,8,2.8,5.1);ctx.stroke();ctx.beginPath();ctx.arc(17,-7,7,4.3,1.3);ctx.stroke();ctx.fillStyle='#19171d';ctx.fillRect(8,-4,5,3);ctx.fillRect(11,3,4,3);}
    else if(this.maskId==='FOX-2'){ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(15,-7);ctx.lineTo(22,0);ctx.lineTo(10,10);ctx.lineTo(-2,5);ctx.closePath();ctx.fill();ctx.fillStyle='#1a181e';ctx.fillRect(8,-4,5,2);ctx.fillRect(14,1,4,2);ctx.fillStyle='#2ea8a2';ctx.fillRect(17,-6,3,9);}
    else if(this.maskId==='RAVEN-3'){ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(13,-7);ctx.lineTo(28,0);ctx.lineTo(13,7);ctx.lineTo(1,9);ctx.lineTo(-2,1);ctx.closePath();ctx.fill();ctx.fillStyle='#17161d';ctx.fillRect(8,-4,6,3);ctx.fillStyle='#7a587e';ctx.fillRect(15,-2,9,3);}
    else{ctx.beginPath();ctx.moveTo(4,-11);ctx.lineTo(15,-6);ctx.lineTo(18,0);ctx.lineTo(14,7);ctx.lineTo(3,10);ctx.lineTo(-2,2);ctx.lineTo(-1,-6);ctx.closePath();ctx.fill();ctx.fillStyle='#17161d';ctx.fillRect(7,-6,5,3);ctx.fillRect(9,3,5,2);ctx.fillRect(1,-2,4,2);ctx.fillStyle='#b62c4e';ctx.fillRect(13,-2,3,5);}
    // weapon
    if(this.current.kind==='gun'){ctx.fillStyle=this.current.color;ctx.fillRect(18,-3,16,5);ctx.fillStyle='#111';ctx.fillRect(17,1,5,6);}else{ctx.fillStyle=this.current.color;ctx.fillRect(16,-2,25,4);}
    ctx.restore();
  }
  drawGlow(ctx){}
}
