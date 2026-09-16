import { norm } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
const MASK_ACCENT = { 'MOTH-0': COLORS.cyan, 'RAM-7': COLORS.orange, 'FOX-2': COLORS.cyan, 'RAVEN-3': COLORS.violet };
export class Player{
  constructor(x,y){this.x=x;this.y=y;this.r=13;this.a=0;this.hp=3;this.maxHp=3;this.moveSpeed=235;this.dashCooldown=.92;this.dashTimer=0;this.dashCd=0;this.dashV={x:0,y:0};this.invuln=0;this.attackCd=0;this.reloadT=0;this.reloadWeapon=null;this.reloadMul=1;this.spreadMul=1;this.meleeMul=1;this.noiseMul=1;this.comboBonus=0;this.execRestoresDash=false;this.ricochet=false;this.maskId='MOTH-0';this.breachBonus=0;this.detectionMul=1;this.thrownBonus=0;this.current=makeWeapon('baton');this.previous=null;this.dead=false;this.hitFlash=0;this.stepT=0;this.animT=0;}
  update(dt,g){
    const i=g.input;this.attackCd=Math.max(0,this.attackCd-dt);this.dashCd=Math.max(0,this.dashCd-dt);this.invuln=Math.max(0,this.invuln-dt);this.hitFlash=Math.max(0,this.hitFlash-dt);
    const mw=g.screenToWorld(i.mouse.x,i.mouse.y);this.a=Math.atan2(mw.y-this.y,mw.x-this.x);
    if(this.reloadT>0){this.reloadT-=dt;if(this.reloadT<=0){const rw=this.reloadWeapon;if(rw&&rw.kind==='gun'&&rw.ammo<rw.mag&&rw.reserve>0){const need=rw.mag-rw.ammo,take=Math.min(need,rw.reserve);rw.ammo+=take;rw.reserve-=take;g.audio.play('reload')}this.reloadWeapon=null}}
    let x=(i.down('KeyD')?1:0)-(i.down('KeyA')?1:0),y=(i.down('KeyS')?1:0)-(i.down('KeyW')?1:0);const n=norm(x,y);const moving=!!(x||y);if(!moving){n.x=0;n.y=0}
    this.animT+=(moving?9:2)*dt;
    if(i.tap('ShiftLeft')||i.tap('ShiftRight'))this.startDash(n,g);
    if(this.dashTimer>0){this.dashTimer-=dt;g.level.moveCircle(this,this.dashV.x*dt,this.dashV.y*dt);g.fx.ghost(this.x,this.y,this.a);}
    else{g.level.moveCircle(this,n.x*this.moveSpeed*dt,n.y*this.moveSpeed*dt);if(moving){this.stepT-=dt;if(this.stepT<=0){this.stepT=.32;g.emitNoise(this.x,this.y,55*this.noiseMul,'step');g.audio.play('step')}}}
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
  reload(g){const w=this.current;if(w.kind!=='gun'||w.ammo>=w.mag||w.reserve<=0||this.reloadT>0)return;this.reloadT=w.reload*this.reloadMul;this.reloadWeapon=w;g.audio.play('reload');}
  throwCurrent(g){if(!this.current||this.current.unthrowable)return;const thrown=this.current;g.throwWeapon(this,thrown,this.a);this.current=this.previous||makeWeapon('fists');this.previous=null;this.attackCd=.38;this.reloadT=0;this.reloadWeapon=null;}
  equip(w,g){if(this.current){this.previous=this.current}this.current=w;this.reloadT=0;this.reloadWeapon=null;g.audio.play('pickup');}
  swap(g){if(!this.previous)return;[this.current,this.previous]=[this.previous,this.current];this.reloadT=0;this.reloadWeapon=null;g.audio.play('ui');}
  damage(n,g,sourceA=0){if(this.invuln>0||this.dead)return;this.hp-=n;this.invuln=.24;this.hitFlash=.15;g.fx.blood(this.x,this.y,5,sourceA+Math.PI);g.shake(6);g.audio.play('hurt');g.renderer?.glitch?.(.6);if(this.hp<=0){this.dead=true;g.onPlayerDeath();}}
  maskAccent(){return MASK_ACCENT[this.maskId]||COLORS.cyan}
  draw(ctx){
    const t=this.animT||0,swing=Math.sin(t)*3,bob=Math.cos(t)*.8,rec=Math.max(0,this.attackCd)*14;
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a+(this.dead?1.15:0));
    ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(-2,5,16,10,0,0,Math.PI*2);ctx.fill();
    // legs (walk swing)
    ctx.fillStyle=COLORS.ink;ctx.fillRect(-8,6+swing,6,11);ctx.fillRect(2,6-swing,6,11);
    // torso outline + bomber
    ctx.fillStyle=COLORS.ink;ctx.fillRect(-13,-10,24,20);
    const flash=this.hitFlash>0;
    ctx.fillStyle=flash?'#ffffff':'#0e7a78';ctx.fillRect(-11,-8+bob*.3,21,16);
    ctx.fillStyle=flash?'#ffffff':COLORS.cyan;ctx.fillRect(-11,-8,3,16);
    ctx.fillStyle=flash?'#ffffff':COLORS.hotPink;ctx.fillRect(7,-8,3,16);
    // arms + weapon arm (recoil)
    ctx.fillStyle=COLORS.ink;ctx.fillRect(4-rec,-5,18,6);ctx.fillRect(-15,-5,8,6);
    // mask
    ctx.fillStyle=COLORS.bone;const acc=this.maskAccent();
    if(this.maskId==='RAM-7'){ctx.beginPath();ctx.moveTo(1,-10);ctx.lineTo(13,-10);ctx.lineTo(20,-4);ctx.lineTo(17,9);ctx.lineTo(5,11);ctx.lineTo(-1,3);ctx.closePath();ctx.fill();ctx.strokeStyle=acc;ctx.lineWidth=3;ctx.beginPath();ctx.arc(6,-9,8,2.8,5.1);ctx.stroke();ctx.beginPath();ctx.arc(17,-7,7,4.3,1.3);ctx.stroke();ctx.fillStyle=COLORS.ink;ctx.fillRect(8,-4,5,3);ctx.fillRect(11,3,4,3);}
    else if(this.maskId==='FOX-2'){ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(15,-7);ctx.lineTo(22,0);ctx.lineTo(10,10);ctx.lineTo(-2,5);ctx.closePath();ctx.fill();ctx.fillStyle=COLORS.ink;ctx.fillRect(8,-4,5,2);ctx.fillRect(14,1,4,2);ctx.fillStyle=acc;ctx.fillRect(17,-6,3,9);}
    else if(this.maskId==='RAVEN-3'){ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(13,-7);ctx.lineTo(28,0);ctx.lineTo(13,7);ctx.lineTo(1,9);ctx.lineTo(-2,1);ctx.closePath();ctx.fill();ctx.fillStyle=COLORS.ink;ctx.fillRect(8,-4,6,3);ctx.fillStyle=acc;ctx.fillRect(15,-2,9,3);}
    else{ctx.beginPath();ctx.moveTo(4,-11);ctx.lineTo(15,-6);ctx.lineTo(18,0);ctx.lineTo(14,7);ctx.lineTo(3,10);ctx.lineTo(-2,2);ctx.lineTo(-1,-6);ctx.closePath();ctx.fill();ctx.fillStyle=COLORS.ink;ctx.fillRect(7,-6,5,3);ctx.fillRect(9,3,5,2);ctx.fillRect(1,-2,4,2);ctx.fillStyle=acc;ctx.fillRect(13,-2,3,6);}
    // weapon
    if(this.current.kind==='gun'){ctx.fillStyle=this.current.color;ctx.fillRect(18-rec,-3,16,5);ctx.fillStyle=COLORS.ink;ctx.fillRect(17-rec,1,5,6);}
    else{ctx.fillStyle=this.current.color;ctx.fillRect(16-rec,-2,25,4);}
    ctx.restore();
  }
  drawGlow(ctx){
    if(this.dead||this.invuln>.18)return;
    const acc=this.maskAccent();
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a);
    ctx.fillStyle=acc;ctx.fillRect(6,-6,7,3);ctx.fillRect(9,3,7,3);
    ctx.fillStyle=COLORS.hotPink;ctx.fillRect(-11,-8,3,16);
    ctx.restore();
  }
}
