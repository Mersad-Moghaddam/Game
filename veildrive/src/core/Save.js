import { SAVE_KEY, DEFAULT_SETTINGS } from '../data/config.js';
export function loadSave(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw) throw 0; const v=JSON.parse(raw); if(v.version!==1) throw 0; return {...v,selectedMask:v.selectedMask||'MOTH-0',unlockedMasks:v.unlockedMasks||['MOTH-0'],settings:{...DEFAULT_SETTINGS,...v.settings}}; }
  catch{ return {version:1,highScore:0,bestRank:'—',runs:0,unlockedMasks:['MOTH-0'],selectedMask:'MOTH-0',settings:{...DEFAULT_SETTINGS}}; }
}
export function storeSave(s){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(s)); }catch{} }
