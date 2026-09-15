export class Input {
  constructor(canvas){
    this.canvas=canvas; this.keys=new Set(); this.pressed=new Set(); this.released=new Set();
    this.mouse={x:480,y:270,left:false,right:false,leftPressed:false,rightPressed:false,wheel:0};
    addEventListener('keydown',e=>{ if(!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault(); });
    addEventListener('keyup',e=>{this.keys.delete(e.code);this.released.add(e.code)});
    const pos=e=>{const r=canvas.getBoundingClientRect();this.mouse.x=(e.clientX-r.left)/r.width*canvas.width;this.mouse.y=(e.clientY-r.top)/r.height*canvas.height;};
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
