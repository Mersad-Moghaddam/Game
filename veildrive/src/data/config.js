export const VIRTUAL_W = 960;
export const VIRTUAL_H = 540;
export const SAVE_KEY = 'veildrive-save-v1';
export const COLORS = {
  void:'#05070b', asphalt:'#14151a', floor:'#222129', floor2:'#292630', wall:'#3a3441', wallEdge:'#6c5a72',
  bone:'#d6d0b7', ink:'#101018', teal:'#1da9a5', magenta:'#d4417e', amber:'#efad4d', red:'#a61f35', cyan:'#62d8d4', white:'#f4f1df'
};
export const MASKS = [
  {id:'MOTH-0',name:'MOTH-0',desc:'Longer chain window. The original signal mask.'},
  {id:'RAM-7',name:'RAM-7',desc:'Breaches hit harder and throw enemies farther.'},
  {id:'FOX-2',name:'FOX-2',desc:'Quieter movement and shorter enemy detection range.'},
  {id:'RAVEN-3',name:'RAVEN-3',desc:'Thrown weapons gain lethal impact damage.'}
];
export const DEFAULT_SETTINGS = { master:0.9, music:0.5, sfx:0.85, shake:0.75, blood:true, quality:1, post:true, flashes:true, highContrastCursor:false };
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
];
