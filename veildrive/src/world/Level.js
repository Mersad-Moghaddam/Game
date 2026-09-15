import { circleRect, segRect, clamp, dist } from '../core/math.js';
import { makeWeapon } from '../combat/weapons.js';
export class Level{
  constructor(){this.w=1800;this.h=1100;this.walls=[];this.doors=[];this.props=[];this.pickups=[];this.lights=[];this.zones=[];this.objective=null;this.build();}
  wall(x,y,w,h){this.walls.push({x,y,w,h});}
  door(x,y,w,h,axis='v'){this.doors.push({x,y,w,h,axis,open:false,broken:false});}
  prop(x,y,w,h,type='furniture',solid=true,hp=2){this.props.push({x,y,w,h,type,solid,hp,broken:false});}
  build(){
    this.zones=[
      {x:0,y:0,w:1800,h:1100,type:'asphalt'}, {x:330,y:100,w:1240,h:820,type:'interior'}, {x:1220,y:690,w:320,h:200,type:'office'}
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
    this.lights=[{x:500,y:260,r:190},{x:760,y:290,r:150},{x:1030,y:280,r:150},{x:1320,y:270,r:170},{x:760,y:680,r:170},{x:1080,y:690,r:160},{x:1380,y:790,r:180}];
    this.pickups=[{x:250,y:540,weapon:makeWeapon('baton')},{x:750,y:245,weapon:makeWeapon('pistol')},{x:1010,y:760,weapon:makeWeapon('shotgun')},{x:1375,y:230,weapon:makeWeapon('suppressed')}];
  }
  blockers(){return [...this.walls,...this.props.filter(p=>p.solid&&!p.broken),...this.doors.filter(d=>!d.open&&!d.broken)];}
  blocked(x,y,r=12){if(x-r<0||y-r<0||x+r>this.w||y+r>this.h)return true;return this.blockers().some(o=>circleRect(x,y,r,o));}
  moveCircle(e,dx,dy,r=e.r||12){let nx=e.x+dx;if(!this.blocked(nx,e.y,r))e.x=nx;let ny=e.y+dy;if(!this.blocked(e.x,ny,r))e.y=ny;}
  lineBlocked(a,b){return this.blockers().some(o=>segRect(a.x,a.y,b.x,b.y,o));}
  bulletHit(x1,y1,x2,y2){const blockers=[...this.blockers(),...this.props.filter(p=>p.type==='glass'&&!p.broken)];for(const o of blockers){if(segRect(x1,y1,x2,y2,o))return o}return null;}
  nearestDoor(p,max=64){let best=null,bd=max;for(const d of this.doors){if(d.broken||d.open)continue;const c={x:d.x+d.w/2,y:d.y+d.h/2},dd=dist(p,c);if(dd<bd){best=d;bd=dd}}return best;}
  openDoor(d,kick=false){if(!d)return;d.open=true;if(kick)d.broken=true;}
  damageProp(o,dmg=1){if(!o||!('hp'in o)||o.broken)return false;o.hp-=dmg;if(o.hp<=0){o.broken=true;o.solid=false;return true}return false;}
  draw(ctx){
    ctx.fillStyle='#101116';ctx.fillRect(0,0,this.w,this.h);
    ctx.fillStyle='#17181d';ctx.fillRect(0,0,this.w,this.h);ctx.fillStyle='#25222b';ctx.fillRect(330,100,1240,820);
    // asphalt striping and grime
    ctx.strokeStyle='rgba(235,190,95,.17)';ctx.lineWidth=4;for(let y=140;y<1000;y+=125){ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(290,y);ctx.stroke()}
    ctx.fillStyle='#2d2833';ctx.fillRect(358,428,1184,92);ctx.fillStyle='#34303a';ctx.fillRect(1220,718,322,174);
    // floor tile seams
    ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;for(let x=370;x<1540;x+=48){ctx.beginPath();ctx.moveTo(x,130);ctx.lineTo(x,890);ctx.stroke()}for(let y=140;y<890;y+=48){ctx.beginPath();ctx.moveTo(358,y);ctx.lineTo(1540,y);ctx.stroke()}
    for(const w of this.walls){ctx.fillStyle='#443b48';ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle='#705e70';ctx.fillRect(w.x,w.y,Math.min(4,w.w),w.h);ctx.fillRect(w.x,w.y,w.w,Math.min(4,w.h));}
    for(const d of this.doors){if(d.open||d.broken){ctx.strokeStyle='rgba(239,173,77,.28)';ctx.strokeRect(d.x,d.y,d.w,d.h);continue}ctx.fillStyle='#775139';ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle='#bd8052';ctx.strokeRect(d.x+2,d.y+2,d.w-4,d.h-4)}
    for(const p of this.props){if(p.broken){if(p.type==='glass'){ctx.fillStyle='rgba(120,220,220,.28)';for(let i=0;i<5;i++)ctx.fillRect(p.x-8+i*5,p.y+3+(i%2)*4,5,2)}continue}let c='#4d454d';if(p.type==='bed')c='#654b61';if(p.type==='car')c='#39454f';if(p.type==='vending')c='#7d294e';if(p.type==='barrel')c='#8f553e';if(p.type==='glass')c='rgba(93,220,215,.45)';ctx.fillStyle=c;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle='rgba(255,255,255,.12)';ctx.strokeRect(p.x,p.y,p.w,p.h)}
    for(const p of this.pickups){if(p.taken)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.35);ctx.fillStyle=p.weapon.color;ctx.fillRect(-14,-3,28,6);ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(-10,-5,6,2);ctx.restore();}
    if(this.objective&&!this.objective.taken){ctx.save();ctx.translate(this.objective.x,this.objective.y);ctx.fillStyle='#e9b65d';ctx.fillRect(-11,-7,22,14);ctx.fillStyle='#151419';ctx.fillRect(-7,-4,5,8);ctx.fillRect(2,-4,5,8);ctx.restore();}
  }
}
