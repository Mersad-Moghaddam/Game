import { VIRTUAL_W, VIRTUAL_H } from '../data/config.js';
export class Input {
  constructor(canvas){
    this.canvas=canvas; this.keys=new Set(); this.pressed=new Set(); this.released=new Set();
    this.mouse={x:480,y:270,left:false,right:false,leftPressed:false,rightPressed:false,moved:false};
    this._onKeyDown = e => { if(!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault(); };
    this._onKeyUp = e => { this.keys.delete(e.code); this.released.add(e.code); };
    const pos=e=>{const r=canvas.getBoundingClientRect()||{left:0,top:0,width:VIRTUAL_W,height:VIRTUAL_H};const rw=r.width||VIRTUAL_W,rh=r.height||VIRTUAL_H;this.mouse.x=(e.clientX-r.left)/rw*VIRTUAL_W;this.mouse.y=(e.clientY-r.top)/rh*VIRTUAL_H;this.mouse.moved=true;};
    this._onMouseMove = pos;
    this._onMouseDown = e => { pos(e); if(e.button===0){this.mouse.left=true;this.mouse.leftPressed=true} if(e.button===2){this.mouse.right=true;this.mouse.rightPressed=true} };
    this._onMouseUp = e => { if(e.button===0)this.mouse.left=false; if(e.button===2)this.mouse.right=false; };
    this._onContextMenu = e => e.preventDefault();
    this._onBlur = () => { this.keys.clear(); this.mouse.left=this.mouse.right=false; };

    addEventListener('keydown', this._onKeyDown);
    addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('contextmenu', this._onContextMenu);
    addEventListener('blur', this._onBlur);
  }
  down(c){return this.keys.has(c)} tap(c){return this.pressed.has(c)}
  endFrame(){this.pressed.clear();this.released.clear();this.mouse.leftPressed=this.mouse.rightPressed=false}
  destroy(){
    removeEventListener('keydown', this._onKeyDown);
    removeEventListener('keyup', this._onKeyUp);
    if(this.canvas){
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
      this.canvas.removeEventListener('mousedown', this._onMouseDown);
      this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
    removeEventListener('mouseup', this._onMouseUp);
    removeEventListener('blur', this._onBlur);
  }
}
