import { circleRect, segRect, clamp, dist } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
import { moodColor } from '../render/mood.js';

const hash2 = (x, y) => {
  let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

export class Level{
  constructor(){this.w=1800;this.h=1100;this.walls=[];this.doors=[];this.props=[];this.pickups=[];this.lights=[];this.zones=[];this.objective=null;this.dirty=false;this.build();}
  wall(x,y,w,h){this.walls.push({x,y,w,h});}
  door(x,y,w,h,axis='v'){this.doors.push({x,y,w,h,axis,open:false,broken:false});}
  prop(x,y,w,h,type='furniture',solid=true,hp=2){this.props.push({x,y,w,h,type,solid,hp,broken:false});}
  build(){
    this.zones=[
      {x:0,y:0,w:1800,h:1100,type:'asphalt',mood:'sunset'},
      {x:330,y:100,w:1240,h:820,type:'interior',mood:'violet'},
      {x:1220,y:690,w:320,h:200,type:'office',mood:'blood'}
    ];
    const t=28; this.wall(330,100,1240,t);this.wall(330,892,1240,t);this.wall(330,100,t,330);this.wall(330,500,t,420);this.wall(1542,100,t,820);
    // lobby / front office
    this.wall(650,128,t,172);this.wall(650,372,t,28);this.door(650,300,t,72,'v');
    // main hall borders, gaps become doors
    this.wall(358,520,220,t);this.wall(658,520,210,t);this.wall(948,520,210,t);this.wall(1238,520,304,t);
    this.door(578,520,80,t,'h');this.door(868,520,80,t,'h');this.door(1158,520,80,t,'h');
    // upper rooms dividers
    this.wall(870,128,t,152);this.wall(870,350,t,50);this.wall(1160,128,t,122);this.wall(1160,320,t,80);this.wall(358,400,112,t);this.wall(548,400,322,t);this.wall(898,400,262,t);this.wall(1160,400,382,t);
    this.door(470,400,78,t,'h');this.door(870,280,t,70,'v');this.door(1160,250,t,70,'v');
    // lower rooms/courtyard dividers
    this.wall(650,548,t,132);this.wall(650,754,t,138);this.wall(960,548,t,82);this.wall(960,704,t,188);this.wall(1210,548,t,142);this.wall(1210,770,t,122);this.door(650,680,t,74,'v');this.door(960,630,t,74,'v');this.door(1210,696,t,74,'v');
    // back office separator
    this.wall(1210,690,110,t);this.wall(1395,690,147,t);this.door(1320,690,75,t,'h');
    // parking cover and props
    this.prop(95,660,120,48,'car',true,4);this.prop(90,230,118,48,'car',true,4);this.prop(220,820,64,30,'dumpster',true,3);
    this.prop(420,180,92,34,'sofa',true,2);this.prop(535,245,54,54,'desk',true,3);this.prop(715,180,76,36,'bed',true,3);this.prop(985,190,78,36,'bed',true,3);this.prop(1285,185,78,36,'bed',true,3);
    this.prop(728,595,56,30,'table',true,2);this.prop(820,760,70,34,'table',true,2);this.prop(1008,610,44,44,'vending',true,3);this.prop(1055,805,80,28,'bench',true,2);this.prop(905,590,24,24,'barrel',true,1);this.prop(1180,845,24,24,'barrel',true,1);
    this.prop(1270,745,72,34,'desk',true,3);this.prop(1435,795,42,58,'cabinet',true,3);
    this.prop(805,400,12,28,'glass',false,1);this.prop(1110,400,12,28,'glass',false,1);this.prop(650,610,12,50,'glass',false,1);
    this.lights=[
      {x:500,y:260,r:190,mood:'violet'},{x:760,y:290,r:150,mood:'violet'},{x:1030,y:280,r:150,mood:'violet'},{x:1320,y:270,r:170,mood:'violet'},
      {x:760,y:680,r:170,mood:'violet'},{x:1080,y:690,r:160,mood:'violet'},{x:1380,y:790,r:180,mood:'blood'}
    ];
    this.pickups=[{x:250,y:540,weapon:makeWeapon('baton')},{x:750,y:245,weapon:makeWeapon('pistol')},{x:1010,y:760,weapon:makeWeapon('shotgun')},{x:1375,y:230,weapon:makeWeapon('suppressed')}];
  }
  markDirty(){this.dirty=true;}
  zoneAt(x,y){for(const z of this.zones){if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h&&z.type!=='asphalt')return z.mood;}return 'sunset';}
  blockers(){return [...this.walls,...this.props.filter(p=>p.solid&&!p.broken),...this.doors.filter(d=>!d.open&&!d.broken)];}
  blocked(x,y,r=12){if(x-r<0||y-r<0||x+r>this.w||y+r>this.h)return true;return this.blockers().some(o=>circleRect(x,y,r,o));}
  moveCircle(e,dx,dy,r=e.r||12){let nx=e.x+dx;if(!this.blocked(nx,e.y,r))e.x=nx;let ny=e.y+dy;if(!this.blocked(e.x,ny,r))e.y=ny;}
  lineBlocked(a,b){return this.blockers().some(o=>segRect(a.x,a.y,b.x,b.y,o));}
  bulletHit(x1,y1,x2,y2){const blockers=[...this.blockers(),...this.props.filter(p=>p.type==='glass'&&!p.broken)];for(const o of blockers){if(segRect(x1,y1,x2,y2,o))return o}return null;}
  nearestDoor(p,max=64){let best=null,bd=max;for(const d of this.doors){if(d.broken||d.open)continue;const c={x:d.x+d.w/2,y:d.y+d.h/2},dd=dist(p,c);if(dd<bd){best=d;bd=dd}}return best;}
  openDoor(d,kick=false){if(!d)return;d.open=true;if(kick)d.broken=true;this.markDirty();}
  damageProp(o,dmg=1){if(!o||!('hp'in o)||o.broken)return false;o.hp-=dmg;if(o.hp<=0){o.broken=true;o.solid=false;this.markDirty();return true}return false;}
  paintDecal(ctx,d){ctx.globalAlpha=d.a;ctx.fillStyle=COLORS.bloodDark;ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  paintCorpse(ctx,c){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(0,0,15,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a1030';ctx.fillRect(-11,-7,22,14);ctx.fillStyle=COLORS.ink;ctx.fillRect(-9,-6,18,12);ctx.fillStyle=COLORS.blood;ctx.beginPath();ctx.arc(6,0,5,0,Math.PI*2);ctx.fill();ctx.restore();}
  draw(ctx){this.bake(ctx);}
  bake(ctx){
    ctx.save();
    ctx.fillStyle=COLORS.void;ctx.fillRect(0,0,this.w,this.h);
    const asphalt=this.zones.find(z=>z.type==='asphalt');
    ctx.fillStyle=moodColor(asphalt.mood,'ground',0);ctx.fillRect(0,0,this.w,this.h);
    // asphalt stripes
    ctx.save();ctx.strokeStyle=moodColor(asphalt.mood,'glow',0);ctx.globalAlpha=.28;ctx.lineWidth=5;
    for(let x=-600;x<this.w;x+=130){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+520,this.h);ctx.stroke()}
    ctx.restore();
    // asphalt cracks + oil
    ctx.save();ctx.strokeStyle=COLORS.ink;ctx.globalAlpha=.5;ctx.lineWidth=2;
    for(let i=0;i<70;i++){const x=hash2(i,3)*this.w,y=hash2(i,7)*this.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hash2(i,11)*60-30,y+hash2(i,17)*60-30);ctx.stroke()}
    ctx.globalAlpha=.35;ctx.fillStyle='#000';
    for(let i=0;i<26;i++){const x=hash2(i,23)*this.w,y=hash2(i,29)*this.h,r=6+hash2(i,31)*18;ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    // interior floor
    const interior=this.zones.find(z=>z.type==='interior');
    const g0=moodColor(interior.mood,'ground',0), g1=moodColor(interior.mood,'ground2',0);
    ctx.fillStyle=g0;ctx.fillRect(interior.x,interior.y,interior.w,interior.h);
    for(let y=interior.y;y<interior.y+interior.h;y+=48){for(let x=interior.x;x<interior.x+interior.w;x+=48){if(((x/48)+(y/48))%2===0)continue;ctx.fillStyle=g1;ctx.fillRect(x,y,46,46)}}
    ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#000';
    for(let i=0;i<180;i++){const x=interior.x+hash2(i,41)*interior.w,y=interior.y+hash2(i,43)*interior.h,r=2+hash2(i,47)*10;ctx.beginPath();ctx.ellipse(x,y,r,r*.7,0,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    // office grid
    const office=this.zones.find(z=>z.type==='office');
    if(office){ctx.fillStyle=moodColor(office.mood,'ground',0);ctx.fillRect(office.x,office.y,office.w,office.h);
      ctx.save();ctx.strokeStyle=moodColor(office.mood,'wallHi',0);ctx.globalAlpha=.18;ctx.lineWidth=1;
      for(let x=office.x;x<office.x+office.w;x+=32){ctx.beginPath();ctx.moveTo(x,office.y);ctx.lineTo(x,office.y+office.h);ctx.stroke()}
      for(let y=office.y;y<office.y+office.h;y+=32){ctx.beginPath();ctx.moveTo(office.x,y);ctx.lineTo(office.x+office.w,y);ctx.stroke()}
      ctx.restore();
      ctx.fillStyle=moodColor(office.mood,'ground2',0);ctx.fillRect(1220,718,322,174);
    }
    // neon motel sign (exterior)
    ctx.save();ctx.fillStyle=moodColor('sunset','accent',0);ctx.globalAlpha=.25;ctx.fillRect(96,300,70,120);ctx.restore();
    ctx.save();ctx.fillStyle=COLORS.hotPink;ctx.shadowColor=COLORS.hotPink;ctx.shadowBlur=18;ctx.font='bold 26px monospace';ctx.fillText('MOTEL',64,286);ctx.restore();
    ctx.save();ctx.strokeStyle=COLORS.cyan;ctx.globalAlpha=.7;ctx.lineWidth=3;ctx.strokeRect(60,264,176,150);ctx.restore();
    // doors
    for(const d of this.doors){if(d.open||d.broken){ctx.strokeStyle=`${COLORS.orange}`;ctx.globalAlpha=.5;ctx.setLineDash([6,5]);ctx.strokeRect(d.x+.5,d.y+.5,d.w-1,d.h-1);ctx.setLineDash([]);ctx.globalAlpha=1;continue}ctx.fillStyle=COLORS.wall;ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle=moodColor('violet','wallHi',0);ctx.lineWidth=2;ctx.strokeRect(d.x+3,d.y+3,d.w-6,d.h-6)}
    // walls with bevel + damage
    for(const w of this.walls){ctx.fillStyle=COLORS.wall;ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle=COLORS.ink;ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle=COLORS.wall;ctx.fillRect(w.x+2,w.y+2,Math.max(0,w.w-4),Math.max(0,w.h-4));ctx.fillStyle=moodColor('violet','wallHi',0);ctx.fillRect(w.x,w.y,Math.min(6,w.w),w.h);ctx.fillRect(w.x,w.y,w.w,Math.min(6,w.h));
      ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#000';
      for(let i=0;i<3;i++){const px=w.x+hash2(w.x+i,w.y)*w.w,py=w.y+hash2(w.y+i,w.x)*w.h,r=2+hash2(w.x,w.y+i)*4;ctx.fillRect(px,py,r,r)}
      ctx.restore();
    }
    // props
    for(const p of this.props){if(p.broken){if(p.type==='glass'){ctx.fillStyle='rgba(18,224,255,.3)';for(let i=0;i<5;i++)ctx.fillRect(p.x-8+i*5,p.y+3+(i%2)*4,5,2)}continue}
      let c=COLORS.violet;
      if(p.type==='bed')c=COLORS.magenta;else if(p.type==='car')c=COLORS.blue;else if(p.type==='vending')c=COLORS.hotPink;else if(p.type==='barrel')c=COLORS.orange;else if(p.type==='glass')c='rgba(18,224,255,.45)';else if(p.type==='desk'||p.type==='table')c='#4a1a7a';else if(p.type==='dumpster')c='#2e4a1a';else if(p.type==='cabinet')c='#5a1440';
      ctx.fillStyle=c;ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle=COLORS.ink;ctx.fillRect(p.x,p.y,p.w,2);ctx.fillRect(p.x,p.y,2,p.h);
      ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.strokeRect(p.x+.5,p.y+.5,p.w-1,p.h-1);
      if(p.type==='car'){ctx.fillStyle='rgba(18,224,255,.5)';ctx.fillRect(p.x+8,p.y+8,p.w-24,10)}
      if(p.type==='vending'){ctx.fillStyle=moodColor('violet','glow',0);ctx.globalAlpha=.35;ctx.fillRect(p.x+6,p.y+6,p.w-12,p.h-12);ctx.globalAlpha=1}
    }
    // pickups
    for(const p of this.pickups){if(p.taken)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.35);ctx.fillStyle=p.weapon.color;ctx.fillRect(-14,-3,28,6);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(-10,-5,6,2);ctx.restore();}
    // objective
    if(this.objective&&!this.objective.taken){ctx.save();ctx.translate(this.objective.x,this.objective.y);ctx.fillStyle=COLORS.orange;ctx.fillRect(-11,-7,22,14);ctx.fillStyle=COLORS.ink;ctx.fillRect(-7,-4,5,8);ctx.fillRect(2,-4,5,8);ctx.restore();}
    ctx.restore();
  }
}
