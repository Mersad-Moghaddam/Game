// Weapon data. Firearms carry grounded-but-arcade handling: per-shot recoil
// (aim climb), spread bloom that builds while firing and recovers, a physical
// kick, shell casings, muzzle flash scale, penetration and post-shot cycle
// time (pump/slide). Damage stays arcade so grunts still drop in one hit.
export const WEAPONS = {
  fists:{id:'fists',name:'Bare Hands',kind:'melee',damage:1,rate:0.42,range:32,arc:0.9,noise:55,knock:90,color:'#b6a48d',unthrowable:true},
  baton:{id:'baton',name:'Baton',kind:'melee',damage:2,rate:0.36,range:44,arc:1.0,noise:90,knock:220,color:'#9aa2a9'},
  cleaver:{id:'cleaver',name:'Shop Cleaver',kind:'melee',damage:3,rate:0.46,range:42,arc:0.82,noise:75,knock:140,color:'#d4d0c4'},
  bottle:{id:'bottle',name:'Bottle',kind:'melee',damage:1,rate:0.30,range:34,arc:0.9,noise:70,knock:120,color:'#4da68e'},
  pistol:{id:'pistol',name:'9mm Pistol',kind:'gun',damage:1,rate:0.18,range:900,spread:0.025,mag:9,reload:1.10,noise:430,knock:95,color:'#b9b7ae',recoil:0.018,kick:1.4,bloom:0.012,bloomMax:0.07,flash:1,pen:0,casing:true,cycle:0.015},
  suppressed:{id:'suppressed',name:'Suppressed Pistol',kind:'gun',damage:1,rate:0.20,range:820,spread:0.02,mag:8,reload:1.18,noise:170,knock:75,color:'#9ba49a',recoil:0.012,kick:0.9,bloom:0.01,bloomMax:0.05,flash:0.5,pen:0,casing:true,cycle:0.015},
  shotgun:{id:'shotgun',name:'Pump Shotgun',kind:'gun',damage:1,rate:0.62,range:520,spread:0.14,pellets:7,mag:5,reload:1.45,noise:720,knock:260,color:'#c27e46',recoil:0.05,kick:5.5,bloom:0.05,bloomMax:0.18,flash:1.7,pen:0,casing:true,cycle:0.11},
  smg:{id:'smg',name:'Compact SMG',kind:'gun',damage:1,rate:0.075,range:700,spread:0.08,mag:22,reload:1.40,noise:470,knock:55,color:'#8a9299',recoil:0.022,kick:0.9,bloom:0.018,bloomMax:0.11,flash:1.1,pen:0,casing:true,cycle:0.01},
  revolver:{id:'revolver',name:'Heavy Revolver',kind:'gun',damage:2,rate:0.38,range:950,spread:0.02,mag:6,reload:1.55,noise:560,knock:180,color:'#c8baa0',recoil:0.055,kick:4.2,bloom:0.035,bloomMax:0.12,flash:1.5,pen:1,casing:false,cycle:0.05},
  katana:{id:'katana',name:'Mono-Katana',kind:'melee',damage:3,rate:0.25,range:50,arc:1.35,noise:65,knock:160,color:'#e4e8ec',parry:true},
  rifle:{id:'rifle',name:'Tactical Burst Rifle',kind:'gun',damage:1,rate:0.32,range:960,spread:0.02,burstCount:3,burstRate:0.055,mag:24,reload:1.50,noise:520,knock:110,color:'#4a5568',recoil:0.025,kick:2.0,bloom:0.018,bloomMax:0.08,flash:1.2,pen:1,casing:true,cycle:0.015}
};
export function makeWeapon(id){ const d=WEAPONS[id]; return {...d, ammo:d.mag ?? null, reserve:d.mag ? d.mag*2 : null}; }
