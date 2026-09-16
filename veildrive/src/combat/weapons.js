// Weapon data. Firearms carry grounded-but-arcade handling: per-shot recoil
// (aim climb), spread bloom that builds while firing and recovers, a physical
// kick, shell casings, muzzle flash scale, penetration and post-shot cycle
// time (pump/slide). Damage stays arcade so grunts still drop in one hit.
export const WEAPONS = {
  fists:{id:'fists',name:'Bare Hands',kind:'melee',damage:1,rate:0.52,range:30,arc:0.9,noise:55,knock:90,color:'#b6a48d',unthrowable:true},
  baton:{id:'baton',name:'Baton',kind:'melee',damage:2,rate:0.44,range:44,arc:1.0,noise:90,knock:220,color:'#9aa2a9'},
  cleaver:{id:'cleaver',name:'Shop Cleaver',kind:'melee',damage:3,rate:0.58,range:42,arc:0.82,noise:75,knock:140,color:'#d4d0c4'},
  bottle:{id:'bottle',name:'Bottle',kind:'melee',damage:1,rate:0.36,range:34,arc:0.9,noise:70,knock:120,color:'#4da68e'},
  pistol:{id:'pistol',name:'9mm Pistol',kind:'gun',damage:1,rate:0.22,range:900,spread:0.03,mag:9,reload:1.25,noise:430,knock:95,color:'#b9b7ae',recoil:0.02,kick:1.4,bloom:0.015,bloomMax:0.075,flash:1,pen:0,casing:true,cycle:0.02},
  suppressed:{id:'suppressed',name:'Suppressed Pistol',kind:'gun',damage:1,rate:0.24,range:820,spread:0.025,mag:8,reload:1.35,noise:170,knock:75,color:'#9ba49a',recoil:0.013,kick:0.9,bloom:0.011,bloomMax:0.055,flash:0.5,pen:0,casing:true,cycle:0.02},
  shotgun:{id:'shotgun',name:'Pump Shotgun',kind:'gun',damage:1,rate:0.72,range:520,spread:0.15,pellets:7,mag:5,reload:1.7,noise:720,knock:260,color:'#c27e46',recoil:0.055,kick:6,bloom:0.055,bloomMax:0.2,flash:1.7,pen:0,casing:true,cycle:0.14},
  smg:{id:'smg',name:'Compact SMG',kind:'gun',damage:1,rate:0.085,range:700,spread:0.09,mag:22,reload:1.65,noise:470,knock:55,color:'#8a9299',recoil:0.026,kick:1,bloom:0.022,bloomMax:0.13,flash:1.1,pen:0,casing:true,cycle:0.01},
  revolver:{id:'revolver',name:'Heavy Revolver',kind:'gun',damage:2,rate:0.46,range:950,spread:0.02,mag:6,reload:1.9,noise:560,knock:180,color:'#c8baa0',recoil:0.06,kick:4.5,bloom:0.04,bloomMax:0.14,flash:1.5,pen:1,casing:false,cycle:0.06}
};
export function makeWeapon(id){ const d=WEAPONS[id]; return {...d, ammo:d.mag ?? null, reserve:d.mag ? d.mag*2 : null}; }
