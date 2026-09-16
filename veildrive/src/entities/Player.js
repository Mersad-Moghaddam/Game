import { norm } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
import { drawHuman } from '../render/humanoid.js';
const MASK_ACCENT = { 'MOTH-0': COLORS.cyan, 'RAM-7': COLORS.orange, 'FOX-2': COLORS.cyan, 'RAVEN-3': COLORS.violet };
export class Player{
  constructor(x,y){this.x=x;this.y=y;this.r=13;this.a=0;this.hp=3;this.maxHp=3;this.moveSpeed=270;this.dashCooldown=.6;this.dashTimer=0;this.dashCd=0;this.dashV={x:0,y:0};this.invuln=0;this.attackCd=0;this.reloadT=0;this.reloadWeapon=null;this.reloadMul=1;this.spreadMul=1;this.meleeMul=1;this.noiseMul=1;this.comboBonus=0;this.execRestoresDash=false;this.ricochet=false;this.maskId='MOTH-0';this.breachBonus=0;this.detectionMul=1;this.thrownBonus=0;this.current=makeWeapon('baton');this.previous=null;this.dead=false;this.hitFlash=0;this.stepT=0;this.animT=0;}
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
  startDash(n,g){if(this.dashCd>0||this.reloadT>0)return;let d=n;if(!d.x&&!d.y)d={x:Math.cos(this.a),y:Math.sin(this.a)};this.dashTimer=.13;this.dashCd=this.dashCooldown;this.invuln=.12;this.dashV={x:d.x*640,y:d.y*640};g.audio.play('dash');g.shake(3);}
  shoot(g){const w=this.current;if(w.ammo<=0){this.attackCd=.18;g.audio.play('empty');return}w.ammo--;this.attackCd=w.rate;g.fireWeapon(this,w,this.a);if(w.ammo===0)this.attackCd+=.04;}
  melee(g){this.attackCd=this.current.rate;g.meleeAttack(this,this.current,this.a);}
  reload(g){const w=this.current;if(w.kind!=='gun'||w.ammo>=w.mag||w.reserve<=0||this.reloadT>0)return;this.reloadT=w.reload*this.reloadMul;this.reloadWeapon=w;g.audio.play('reload');}
  throwCurrent(g){if(!this.current||this.current.unthrowable)return;const thrown=this.current;g.throwWeapon(this,thrown,this.a);this.current=this.previous||makeWeapon('fists');this.previous=null;this.attackCd=.38;this.reloadT=0;this.reloadWeapon=null;}
  equip(w,g){if(this.current){this.previous=this.current}this.current=w;this.reloadT=0;this.reloadWeapon=null;g.audio.play('pickup');}
  swap(g){if(!this.previous)return;[this.current,this.previous]=[this.previous,this.current];this.reloadT=0;this.reloadWeapon=null;g.audio.play('ui');}
  damage(n,g,sourceA=0){if(this.invuln>0||this.dead)return;this.hp-=n;this.invuln=.22;this.hitFlash=.15;g.fx.blood(this.x,this.y,5,sourceA+Math.PI);g.shake(6);g.audio.play('hurt');g.renderer?.glitch?.(.6);if(this.hp<=0){this.dead=true;g.onPlayerDeath();}}
  maskAccent(){return MASK_ACCENT[this.maskId]||COLORS.cyan}
  draw(ctx){
    const t=this.animT||0;
    const flash=this.hitFlash>0;
    const pose=this.current.kind==='gun'?'gun':(this.attackCd>0?'melee':'idle');
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a+(this.dead?1.15:0));
    const res=drawHuman(ctx,{phase:t,slim:true,shirt:flash?'#ffffff':'#0e7a78',shirtDark:flash?'#ffffff':'#0a5c5a',pants:'#161a24',pantsDark:'#10131a',accent:flash?'#ffffff':COLORS.hotPink,skin:'#e0a97f',skinDark:'#bd8259',hair:'#1a1524',pose,recoil:Math.max(0,this.attackCd)});
    const h=res.hand;
    if(this.current.kind==='gun'){ctx.fillStyle=this.current.color;ctx.fillRect(h.x-1,h.y-2,19,5);ctx.fillStyle=COLORS.ink;ctx.fillRect(h.x-1,h.y+1,6,6);}
    else{ctx.fillStyle=this.current.color;ctx.fillRect(h.x-3,h.y-2,26,5);}
    this.drawMask(ctx,res.head,flash);
    ctx.restore();
  }
  drawMask(ctx,head,flash){
    const acc=this.maskAccent();
    ctx.save();ctx.translate(head.x,head.y);
    ctx.fillStyle=flash?'#ffffff':COLORS.bone;
    if(this.maskId==='RAM-7'){
      ctx.beginPath();ctx.moveTo(-7,-7);ctx.lineTo(6,-8);ctx.lineTo(12,-2);ctx.lineTo(9,8);ctx.lineTo(-2,8);ctx.lineTo(-9,1);ctx.closePath();ctx.fill();
      ctx.strokeStyle=acc;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(1,-1,8,-0.6,0.9);ctx.stroke();
      ctx.fillStyle=COLORS.ink;ctx.fillRect(2,-2,6,3);
    }else if(this.maskId==='FOX-2'){
      ctx.beginPath();ctx.moveTo(-7,-6);ctx.lineTo(8,-7);ctx.lineTo(13,0);ctx.lineTo(4,8);ctx.lineTo(-8,3);ctx.closePath();ctx.fill();
      ctx.fillStyle=acc;ctx.fillRect(6,-5,3,10);ctx.fillStyle=COLORS.ink;ctx.fillRect(0,-1,7,2);
    }else if(this.maskId==='RAVEN-3'){
      ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(9,-3);ctx.lineTo(18,0);ctx.lineTo(9,3);ctx.lineTo(-7,6);ctx.closePath();ctx.fill();
      ctx.fillStyle=acc;ctx.fillRect(6,-2,10,3);ctx.fillStyle=COLORS.ink;ctx.fillRect(0,-2,6,3);
    }else{
      ctx.beginPath();ctx.moveTo(-6,-6);ctx.lineTo(8,-7);ctx.lineTo(12,0);ctx.lineTo(8,7);ctx.lineTo(-6,6);ctx.lineTo(-9,0);ctx.closePath();ctx.fill();
      ctx.fillStyle=acc;ctx.fillRect(2,-4,6,2);ctx.fillRect(2,2,6,2);ctx.fillStyle=COLORS.ink;ctx.fillRect(-1,-2,4,4);
    }
    ctx.restore();
  }
  drawGlow(ctx){
    if(this.dead||this.invuln>.3)return;
    const acc=this.maskAccent();
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.a);
    ctx.fillStyle=acc;ctx.fillRect(6,-5,7,3);ctx.fillRect(6,2,7,3);
    ctx.fillStyle=COLORS.hotPink;ctx.fillRect(-9,-6,3,12);
    ctx.restore();
  }
}
