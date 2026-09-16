export const VIRTUAL_W = 960;
export const VIRTUAL_H = 540;
// Pixel pipeline: the world renders at VIEW_W x VIEW_H and is upscaled with
// nearest-neighbour. Simulation and UI coordinates stay in 960x540, so all
// gameplay math and HUD layout are unchanged.
export const PIXEL = 2;
export const VIEW_W = VIRTUAL_W / PIXEL;
export const VIEW_H = VIRTUAL_H / PIXEL;
export const SAVE_KEY = 'veildrive-save-v1';
export const COLORS = {
  void:'#0b0416', ground:'#1a0a33', ground2:'#2a1055', wall:'#3d1263', wallHi:'#8a35d6',
  hotPink:'#ff2e88', magenta:'#ff1e9c', cyan:'#12e0ff', blue:'#2e5bff', violet:'#8b2bff',
  orange:'#ff7a1a', lime:'#c6ff2e', bone:'#f6f2e6', ink:'#120620', blood:'#ff0a3c', bloodDark:'#7a0018'
};
export const MASKS = [
  {id:'MOTH-0',name:'MOTH-0',desc:'Longer chain window. The original signal mask.'},
  {id:'RAM-7',name:'RAM-7',desc:'Breaches hit harder and throw enemies farther.'},
  {id:'FOX-2',name:'FOX-2',desc:'Quieter movement and shorter enemy detection range.'},
  {id:'RAVEN-3',name:'RAVEN-3',desc:'Thrown weapons gain lethal impact damage.'}
];
export const DEFAULT_SETTINGS = { master:0.9, music:0.5, sfx:0.85, shake:0.75, blood:true, quality:1, post:true, pixel:false, flashes:true, highContrastCursor:false };
export const UPGRADES = [
  {id:'dash',name:'SECOND WIND',desc:'Dash recharge 28% faster.',apply:p=>p.dashCooldown*=0.72},
  {id:'speed',name:'HOT STEP',desc:'Move speed +12%.',apply:p=>p.moveSpeed*=1.12},
  {id:'hp',name:'STITCH KIT',desc:'+1 max health and heal 1.',apply:p=>{p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1)}},
  {id:'reload',name:'QUICK HANDS',desc:'Reload 22% faster.',apply:p=>p.reloadMul*=0.78},
  {id:'spread',name:'COLD BARREL',desc:'Firearm spread reduced 25%.',apply:p=>p.spreadMul*=0.75},
  {id:'melee',name:'HEAVY WRIST',desc:'Melee impact +35%.',apply:p=>p.meleeMul*=1.35},
  {id:'combo',name:'AFTERTASTE',desc:'Combo window +1.2 sec.',apply:p=>p.comboBonus+=1.2},
  {id:'noise',name:'SOFT SOLES',desc:'Footstep noise reduced 45%.',apply:p=>p.noiseMul*=0.55},
  {id:'execution',name:'CLOSE THE FILE',desc:'Executions restore dash.',apply:p=>p.execRestoresDash=true},
  {id:'ricochet',name:'GLASS TEETH',desc:'Bullets ricochet once from walls.',apply:p=>p.ricochet=true},
  {id:'power',name:'HOT LOAD',desc:'Gun damage +15%.',apply:p=>p.damageMul*=1.15},
  {id:'trigger',name:'HAIR TRIGGER',desc:'Gun fire rate +12%.',apply:p=>p.rateMul*=0.88},
  {id:'extmag',name:'EXTENDED MAG',desc:'+3 rounds per magazine.',apply:p=>p.magBonus+=3},
  {id:'pierce',name:'ARMOR PIERCING',desc:'Bullets pierce one more enemy.',apply:p=>p.pierce+=1},
];
