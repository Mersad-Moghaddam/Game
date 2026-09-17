import { norm, clamp } from '../core/math.js';
import { rng } from '../core/rng.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
import { drawCharacter } from '../render/character.js';
const MASK_ACCENT = { 'MOTH-0': COLORS.cyan, 'RAM-7': COLORS.orange, 'FOX-2': COLORS.cyan, 'RAVEN-3': COLORS.violet };
export class Player{
  constructor(x,y){this.x=x;this.y=y;this.r=13;this.a=0;this.hp=5;this.maxHp=5;this.moveSpeed=270;this.dashCooldown=.6;this.dashTimer=0;this.dashCd=0;this.dashV={x:0,y:0};this.invuln=0;this.attackCd=0;this.reloadT=0;this.reloadWeapon=null;this.reloadMul=1;this.spreadMul=1;this.meleeMul=1;this.noiseMul=1;this.damageMul=1;this.rateMul=1;this.magBonus=0;this.pierce=0;this.comboBonus=0;this.execRestoresDash=false;this.ricochet=false;this.maskId='MOTH-0';this.breachBonus=0;this.detectionMul=1;this.thrownBonus=0;this.current=makeWeapon('pistol');this.previous=null;this.dead=false;this.hitFlash=0;this.stepT=0;this.animT=0;this.vx=0;this.vy=0;this.recoil=0;this.bloom=0;this.meleeSwings=0;}
  magOf(w){return Math.max(1,(w.mag||0)+this.magBonus)}
  update(dt,g){
    const i=g.input;const ox=this.x,oy=this.y;
    // Defensive: a non-finite cooldown or reload timer would permanently block
    // firing (the <=0 checks never pass), presenting as "the gun won't shoot".
    if(!Number.isFinite(this.attackCd)||this.attackCd<0)this.attackCd=0;
    if(!Number.isFinite(this.reloadT)||this.reloadT<0){this.reloadT=0;this.reloadWeapon=null}
    if(!Number.isFinite(this.dashCd)||this.dashCd<0)this.dashCd=0;
    this.attackCd=Math.max(0,this.attackCd-dt);this.dashCd=Math.max(0,this.dashCd-dt);this.invuln=Math.max(0,this.invuln-dt);this.hitFlash=Math.max(0,this.hitFlash-dt);
    this.recoil*=Math.pow(.004,dt);this.bloom*=Math.pow(.12,dt);if(Math.abs(this.recoil)<1e-4)this.recoil=0;if(this.bloom<1e-4)this.bloom=0;
    const mw=g.screenToWorld(i.mouse.x,i.mouse.y);if(i.mouse.moved)this.a=Math.atan2(mw.y-this.y,mw.x-this.x);
    if(this.reloadT>0){this.reloadT-=dt;if(this.reloadT<=0){const rw=this.reloadWeapon;const mag=rw?this.magOf(rw):0;if(rw&&rw.kind==='gun'&&rw.ammo<mag&&rw.reserve>0){const need=mag-rw.ammo,take=Math.min(need,rw.reserve);rw.ammo+=take;rw.reserve-=take;g.audio.play('reload')}this.reloadWeapon=null}}
    let x=(i.down('KeyD')?1:0)-(i.down('KeyA')?1:0),y=(i.down('KeyS')?1:0)-(i.down('KeyW')?1:0);const n=norm(x,y);const moving=!!(x||y);if(!moving){n.x=0;n.y=0}
    this.animT+=(moving?9:2)*dt;
    if(i.tap('ShiftLeft')||i.tap('ShiftRight'))this.startDash(n,g);
    if(this.dashTimer>0){this.dashTimer-=dt;g.level.moveCircle(this,this.dashV.x*dt,this.dashV.y*dt);g.fx.ghost(this.x,this.y,this.a);}
    else{g.level.moveCircle(this,n.x*this.moveSpeed*dt,n.y*this.moveSpeed*dt);if(moving){this.stepT-=dt;if(this.stepT<=0){this.stepT=.32;g.emitNoise(this.x,this.y,55*this.noiseMul,'step');g.audio.play('step')}}}
    // Holding attack is one continuous intent: firearms auto-fire (and
    // auto-reload an empty magazine if reserve remains) and melee weapons
    // swing repeatedly. Previously melee only fired on the initial press and
    // an empty gun did nothing on hold, which read as "it doesn't shoot".
    if(i.mouse.left&&this.attackCd<=0&&this.reloadT<=0){
      if(this.current.kind==='gun'){if(this.current.ammo<=0)this.reload(g);else this.shoot(g);}
      else this.melee(g);
    }
    if(i.mouse.rightPressed&&this.attackCd<=0)this.throwCurrent(g);
    if(i.tap('KeyR'))this.reload(g);
    if(i.tap('KeyQ'))this.swap(g);
    if(i.tap('KeyE'))g.interact(false);
    if(i.tap('Space'))g.interact(true);
    this.vx=(this.x-ox)/Math.max(dt,1e-4);this.vy=(this.y-oy)/Math.max(dt,1e-4);
  }
  startDash(n,g){if(this.dashCd>0||this.reloadT>0)return;let d=n;if(!d.x&&!d.y)d={x:Math.cos(this.a),y:Math.sin(this.a)};this.dashTimer=.13;this.dashCd=this.dashCooldown;this.invuln=.12;this.dashV={x:d.x*640,y:d.y*640};g.audio.play('dash');g.shake(5);}
  shoot(g){const w=this.current;if(!(w.ammo>0)){this.attackCd=.18;g.audio.play('empty');if(w.reserve>0)this.reload(g);return}w.ammo--;const rate=Number.isFinite(w.rate)&&w.rate>0?w.rate:0.25;this.attackCd=rate*this.rateMul+(w.cycle||0);g.fireWeapon(this,w,this.a+this.recoil);
    this.recoil+=(w.recoil||.015)*(rng.random()*2-1);this.bloom=Math.min(w.bloomMax||.1,this.bloom+(w.bloom||.015));
    if(w.kick)g.level.moveCircle(this,-Math.cos(this.a)*w.kick,-Math.sin(this.a)*w.kick);
    if(w.ammo===0)this.attackCd+=.04;}
  melee(g){this.attackCd=this.current.rate;this.meleeSwings=(this.meleeSwings||0)+1;g.meleeAttack(this,this.current,this.a);}
  reload(g){const w=this.current;if(w.kind!=='gun'||w.ammo>=this.magOf(w)||w.reserve<=0||this.reloadT>0)return;this.reloadT=w.reload*this.reloadMul;this.reloadWeapon=w;g.audio.play('reload');}
  throwCurrent(g){if(!this.current||this.current.unthrowable)return;const thrown=this.current;g.throwWeapon(this,thrown,this.a);this.current=this.previous||makeWeapon('fists');this.previous=null;this.attackCd=.38;this.reloadT=0;this.reloadWeapon=null;}
  equip(w,g){if(this.current){this.previous=this.current}this.current=w;this.reloadT=0;this.reloadWeapon=null;g.audio.play('pickup');}
  swap(g){if(!this.previous)return;[this.current,this.previous]=[this.previous,this.current];this.reloadT=0;this.reloadWeapon=null;g.audio.play('ui');}
  damage(n,g,sourceA=0){if(this.invuln>0||this.dead)return;this.hp-=n;this.invuln=.22;this.hitFlash=.15;g.fx.blood(this.x,this.y,10,sourceA+Math.PI);g.shake(9);g.hurtFlash=1;g.audio.play('hurt');g.renderer?.glitch?.(.6);if(this.hp<=0){this.dead=true;g.onPlayerDeath();}}
  maskAccent(){return MASK_ACCENT[this.maskId]||COLORS.cyan}
  maskStyle(){return this.maskId==='RAM-7'?'ram':this.maskId==='FOX-2'?'fox':this.maskId==='RAVEN-3'?'raven':'moth'}
  draw(ctx){
    const flash=this.hitFlash>0;
    const gun=this.current.kind==='gun';
    const speed=Math.hypot(this.vx||0,this.vy||0);
    const pose=this.dead?'dead':(this.reloadT>0?'reload':(this.attackCd>0&&!gun?'melee':(speed>24?'walk':(gun?'aim':'idle'))));
    const hpFrac=this.maxHp?clamp(this.hp/this.maxHp,0,1):1;
    drawCharacter(ctx,{x:this.x,y:this.y,facing:this.a,archetype:'moth0',gear:{mask:this.maskStyle()},pose,phase:this.animT||0,weapon:this.current,hitFlash:flash,recoil:Math.max(0,this.attackCd),hpFrac,limp:hpFrac<=.4,deathT:1,seed:0x1101});
  }
  drawGlow(ctx){
    if(this.dead||this.invuln>.3)return;
    const acc=this.maskAccent(),c=Math.cos(this.a),s=Math.sin(this.a);
    ctx.save();
    ctx.fillStyle=acc;ctx.fillRect(this.x+c*9-3,this.y+s*9-3,6,6);
    ctx.fillStyle=COLORS.hotPink;ctx.fillRect(this.x-c*5-2,this.y-s*5-2,4,4);
    ctx.restore();
  }
}
