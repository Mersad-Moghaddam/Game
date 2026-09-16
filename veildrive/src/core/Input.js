import { VIRTUAL_W, VIRTUAL_H } from '../data/config.js';
export class Input {
  constructor(canvas){
    this.canvas=canvas; this.keys=new Set(); this.pressed=new Set(); this.released=new Set();
    this.mouse={x:480,y:270,left:false,right:false,leftPressed:false,rightPressed:false,wheel:0,moved:false};
    addEventListener('keydown',e=>{ if(!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault(); });
    addEventListener('keyup',e=>{this.keys.delete(e.code);this.released.add(e.code)});
    // Pointer coordinates are always mapped to the 960x540 virtual space, even
    // though the WebGL canvas backing store is the lower pixel resolution.
    const pos=e=>{const r=canvas.getBoundingClientRect()||{left:0,top:0,width:VIRTUAL_W,height:VIRTUAL_H};const rw=r.width||VIRTUAL_W,rh=r.height||VIRTUAL_H;this.mouse.x=(e.clientX-r.left)/rw*VIRTUAL_W;this.mouse.y=(e.clientY-r.top)/rh*VIRTUAL_H;this.mouse.moved=true;};
    canvas.addEventListener('mousemove',pos);
    canvas.addEventListener('mousedown',e=>{pos(e); if(e.button===0){this.mouse.left=true;this.mouse.leftPressed=true} if(e.button===2){this.mouse.right=true;this.mouse.rightPressed=true}});
    addEventListener('mouseup',e=>{if(e.button===0)this.mouse.left=false;if(e.button===2)this.mouse.right=false});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('wheel',e=>{this.mouse.wheel=Math.sign(e.deltaY);e.preventDefault()},{passive:false});
    addEventListener('blur',()=>{this.keys.clear();this.mouse.left=this.mouse.right=false});
  }
  down(c){return this.keys.has(c)} tap(c){return this.pressed.has(c)}
  endFrame(){this.pressed.clear();this.released.clear();this.mouse.leftPressed=this.mouse.rightPressed=false;this.mouse.wheel=0}
}
