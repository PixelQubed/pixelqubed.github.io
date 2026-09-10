(() => {
 'use strict';
 const sculpture=document.querySelector('.qube-art'),stage=document.querySelector('.qube-viewport');
 if(!sculpture||!stage||!window.PixelQube)return;
 const {QubeModel,FACE}=window.PixelQube,model=new QubeModel(),shell=stage.closest('.qube-stage');
 const status=document.querySelector('[data-qube-status]'),controls=document.querySelector('.qube-console'),play=document.querySelector('[data-qube-play]'),soundButton=document.querySelector('[data-qube-sound]'),unfold=document.querySelector('[data-qube-unfold]'),unused=null;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),nodes=new Map([...sculpture.querySelectorAll('.qube-cell')].map(n=>[n.dataset.cell,n]));
 const MIDDLE={M:[0,0,1],E:[1,0,1],S:[2,0,1]};
 let view,engagementTimer;
 function rest(){if(busy||drag){engagementTimer=setTimeout(rest,300);return;}shell.classList.remove("is-engaged");}
 function engage(){shell.classList.add("is-engaged");clearTimeout(engagementTimer);engagementTimer=setTimeout(rest,2200);}
 shell.addEventListener("pointerdown",engage);
 let busy=false,expanded=false,reverse=false,finishActive=null,moves=0,history=[],pitch=-24,yaw=-32,drag=null,active=false,sound=false,audioContext;
 try{sound=localStorage.getItem('pixelqubed.qube.sound')==='on';}catch{}
 document.querySelector('.qube-rest').hidden=false;stage.setAttribute('aria-describedby','qube-instructions');
 function soundLabel(){soundButton.textContent=sound?'Sound on':'Sound off';soundButton.setAttribute('aria-pressed',String(sound));}
 function activate(value=true){engage();active=value;controls.hidden=!value;play.setAttribute('aria-expanded',String(value));play.textContent=value?'Close controls':'Play the Qube';shell.classList.toggle('is-playing',value);if(!value)play.focus({preventScroll:true});}
 play.addEventListener('click',()=>activate(!active));document.querySelector('[data-qube-close]').addEventListener('click',()=>activate(false));
 soundButton.addEventListener('click',()=>{sound=!sound;soundLabel();try{localStorage.setItem('pixelqubed.qube.sound',sound?'on':'off');if(sound){audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();}}catch{}});
 function announce(message){status.textContent=message;sculpture.dataset.state=model.serialise();sculpture.dataset.moves=String(moves);sculpture.dataset.solved=String(model.isSolved());}
 function celebrate(wasSolved){if(wasSolved||!model.isSolved())return false;announce('Qubed.');sculpture.dataset.celebrations=String(Number(sculpture.dataset.celebrations||0)+1);
  if(sound&&!document.hidden){try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const now=audioContext.currentTime;[523.25,659.25,783.99].forEach((frequency,index)=>{const tone=audioContext.createOscillator(),gain=audioContext.createGain();tone.frequency.value=frequency;gain.gain.setValueAtTime(0,now+index*.09);gain.gain.linearRampToValueAtTime(.045,now+index*.09+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+index*.09+.32);tone.connect(gain).connect(audioContext.destination);tone.start(now+index*.09);tone.stop(now+index*.09+.34);});sculpture.dataset.soundEvents=String(Number(sculpture.dataset.soundEvents||0)+1);}catch{}}return true;
 }
 function cellTransform(cell){const spread=expanded?94:67,m=cell.orientation,matrix=[m[0],m[3],m[6],0,m[1],m[4],m[7],0,m[2],m[5],m[8],0,0,0,0,1];return `translate3d(${cell.position[0]*spread}px,${cell.position[1]*spread}px,${cell.position[2]*spread}px) matrix3d(${matrix.join(',')})`;}
 function paint(){view?.paint(expanded);for(const cell of model.cells)nodes.get(cell.id).style.transform=cellTransform(cell);light();}
 function project(v){const rx=pitch*Math.PI/180,ry=yaw*Math.PI/180,x=v[0]*Math.cos(ry)+v[2]*Math.sin(ry),z=-v[0]*Math.sin(ry)+v[2]*Math.cos(ry);return [x,v[1]*Math.cos(rx)-z*Math.sin(rx),v[1]*Math.sin(rx)+z*Math.cos(rx)];}
 function light(){if(view)return;for(const cell of model.cells)for(const face of nodes.get(cell.id).querySelectorAll('[data-face]')){const n=project(model.normal(cell,face.dataset.face));face.style.setProperty('--shade',String(Math.max(0,.29-(n[0]*-.28+n[1]*-.5+n[2]*.42)*.28)));}}
 function orbit(){view?.orbit(pitch,yaw);sculpture.style.transform=`rotateX(${pitch}deg) rotateY(${yaw}deg)`;light();}
 function highlight(move){view?.highlight(move);for(const cell of model.cells)nodes.get(cell.id).classList.toggle('is-preview',Boolean(move&&cell.position[move.axis]===move.plane));sculpture.dataset.preview=move?`${move.axis}:${move.plane}:${move.direction}`:'';}
 function setBusy(value){busy=value;controls.querySelectorAll('button').forEach(b=>b.disabled=value);stage.setAttribute('aria-busy',String(value));sculpture.dataset.busy=String(value);if(!value){document.querySelector('[data-qube-undo]').disabled=!history.length;document.querySelector('[data-qube-solve]').disabled=model.isSolved();}}
 // A bounded screen-space particle sweep; the cube's actual layer axis sets its direction.
 const particles=document.createElement('canvas');particles.className='qube-particles';particles.setAttribute('aria-hidden','true');shell.append(particles);let particleFrame=0;
 function sweep(move,layer){cancelAnimationFrame(particleFrame);const ctx=particles.getContext('2d');ctx.clearRect(0,0,particles.width,particles.height);if(motion.matches||document.hidden)return;
  const r=shell.getBoundingClientRect(),v=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.5),scale=innerWidth<=760?.85:1;particles.width=r.width*d;particles.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);
  const centre=[v.left-r.left+v.width/2,v.top-r.top+v.height/2],spread=expanded?94:67,started=performance.now(),seed=[];
  const screen=point=>{const a=project(point),perspective=1000/(1000-a[2]*scale);return [centre[0]+a[0]*scale*perspective,centre[1]+a[1]*scale*perspective];};
  const tangent=[0,1,2].filter(axis=>axis!==move.axis);
  // Dust follows the selected layer's angular direction; the wake is local and finite.
  for(let i=0;i<64;i++){const phase=i/64*Math.PI*2,radius=spread*(1.4+(i%5)*.10),delay=(i%4)*.035;seed.push({phase,radius,delay,brightness:i%4===0?1:.45});}
  function point(p,a,expansion=1){const position=[0,0,0];position[move.axis]=move.plane*spread;position[tangent[0]]=Math.cos(p.phase+a)*p.radius*expansion;position[tangent[1]]=Math.sin(p.phase+a)*p.radius*expansion;return screen(position);}
  function draw(now){particleFrame=0;ctx.clearRect(0,0,r.width,r.height);if(document.hidden||motion.matches)return;const t=(now-started)/720;if(t>=1)return;const direction=move.direction*(move.axis===1?-1:1);
   for(const p of seed){const a=Math.max(0,Math.min(1,(t-p.delay)*1.2));if(!a)continue;const angle=direction*Math.PI*.62*(1-(1-a)**2),opacity=Math.sin(a*Math.PI)*p.brightness;
    const expansion=1+a*.75,head=point(p,angle,expansion),tail=point(p,angle-direction*(.045+a*.13),expansion-.07);ctx.strokeStyle=`rgba(205,158,249,${opacity*.48})`;ctx.lineWidth=p.brightness===1?1.35:.65;ctx.beginPath();ctx.moveTo(...tail);ctx.lineTo(...head);ctx.stroke();ctx.fillStyle=`rgba(247,209,254,${opacity*.88})`;ctx.beginPath();ctx.arc(...head,p.brightness===1?1.5:.8,0,Math.PI*2);ctx.fill();if(p.brightness===1){ctx.fillStyle=`rgba(172,97,255,${opacity*.09})`;ctx.beginPath();ctx.arc(...head,5,0,Math.PI*2);ctx.fill();}
   }particleFrame=requestAnimationFrame(draw);
  }
  sculpture.dataset.particleMoves=String(Number(sculpture.dataset.particleMoves||0)+1);particleFrame=requestAnimationFrame(draw);
 }
 async function animateMove(move,duration=300){const layer=model.slice(move.axis,move.plane);highlight(move);sweep(move,layer);sculpture.classList.remove('is-unfolding');
  // Keep every cubie in the same preserve-3d context. Reparenting mid-turn can make Chromium cull faces.
  await new Promise(resolve=>{let done=false,timer;const finish=()=>{if(done)return;done=true;clearTimeout(timer);finishActive=null;view?.stop();for(const c of layer){const n=nodes.get(c.id);n.style.transition='none';n.removeEventListener('transitionend',ended);}model.turnLayer(move.axis,move.plane,move.direction);paint();highlight(null);resolve();};const ended=e=>{if(e.target===nodes.get(layer[0].id))finish();};finishActive=finish;
   if(motion.matches||document.hidden){finish();return;}
   if(view){view.animate(move,duration,finish);return;}
   for(const c of layer){const n=nodes.get(c.id);n.style.transition='none';n.style.transform=`rotate${['X','Y','Z'][move.axis]}(0deg) ${cellTransform(c)}`;}
   sculpture.getBoundingClientRect();for(const c of layer){const n=nodes.get(c.id);n.style.transition=`transform ${duration}ms cubic-bezier(.2,.7,.25,1)`;n.style.transform=`rotate${['X','Y','Z'][move.axis]}(${move.direction*90}deg) ${cellTransform(c)}`;}nodes.get(layer[0].id).addEventListener('transitionend',ended);timer=setTimeout(finish,duration+100);
  });
 }
 const faceMove=(face,direction=1)=>{const [axis,plane,sense]=FACE[face]||MIDDLE[face];return {axis,plane,direction:direction*sense,label:face};};
 async function turn(move,record=true){if(busy||!move)return;activate();const wasSolved=model.isSolved();setBusy(true);try{await animateMove(move);if(record)history.push({...move});moves++;if(!celebrate(wasSolved))announce(`${move.plane===0?'Middle layer':move.label||'Row'} turned · ${moves} moves`);}finally{setBusy(false);}}
 controls.querySelectorAll('[data-turn],[data-slice]').forEach(button=>{const get=()=>faceMove(button.dataset.turn||button.dataset.slice,reverse?-1:1);button.addEventListener('click',()=>turn(get()));button.addEventListener('pointerenter',()=>{if(!busy)highlight(get());});button.addEventListener('pointerleave',()=>{if(!busy)highlight(null);});button.addEventListener('focus',()=>{if(!busy)highlight(get());});button.addEventListener('blur',()=>{if(!busy)highlight(null);});});
 unfold.addEventListener('click',()=>{expanded=!expanded;unfold.setAttribute('aria-pressed',String(expanded));unfold.textContent=expanded?'Compose −':'Unfold +';for(const n of nodes.values())n.style.transition='';sculpture.classList.add('is-unfolding');paint();setTimeout(()=>sculpture.classList.remove('is-unfolding'),motion.matches?0:500);announce(expanded?'Unfolded · row turns still work':'Composed · ready to turn');});
 document.querySelector('[data-qube-reset]').addEventListener('click',()=>{if(busy)return;model.reset();history=[];moves=0;expanded=false;unfold.textContent='Unfold +';unfold.setAttribute('aria-pressed','false');pitch=-24;yaw=-32;orbit();paint();highlight(null);announce('Reset · ready to play');setBusy(false);});
 document.querySelector('[data-qube-undo]').addEventListener('click',async()=>{if(busy||!history.length)return;const move=history.pop();await turn({...move,direction:-move.direction},false);});
 document.querySelector('[data-qube-scramble]').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{let previous='';for(let i=0;i<12;i++){const faces=Object.keys(FACE).filter(f=>f!==previous),face=faces[Math.floor(Math.random()*faces.length)],move=faceMove(face,Math.random()<.5?-1:1);await animateMove(move,160);history.push(move);previous=face;moves++;announce(`Scrambling · ${i+1}/12`);}announce(`Scrambled · ${moves} moves`);}finally{setBusy(false);}});
 document.querySelector('[data-qube-solve]').addEventListener('click',async()=>{if(busy||model.isSolved())return;setBusy(true);const wasSolved=model.isSolved();try{while(history.length){const move=history.pop();await animateMove({...move,direction:-move.direction},120);moves++;announce(`Solving · ${history.length} moves remaining`);}celebrate(wasSolved);}finally{setBusy(false);}});
 function hit(target,x,y){if(view)return view.hit(x,y);const face=target.closest?.('.qube-face[data-face]'),cell=face?.closest('[data-cell]');return cell?{id:cell.dataset.cell,face:face.dataset.face}:null;}
 stage.addEventListener('contextmenu',e=>e.preventDefault());
 stage.addEventListener('pointerdown',e=>{if(![0,2].includes(e.button)||busy)return;engage();const selected=e.button===2?null:hit(e.target,e.clientX,e.clientY);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,selected,move:null};stage.setPointerCapture(e.pointerId);if(selected)e.preventDefault();});
 stage.addEventListener('pointermove',e=>{if(busy)return;engage();if(!drag){const selected=hit(e.target,e.clientX,e.clientY);highlight(null);view?.hover(selected);return;}const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(drag.selected){if(Math.hypot(dx,dy)>12){const candidate=model.dragMove(drag.selected.id,drag.selected.face,dx,dy,pitch,yaw);if(!drag.move)drag.move=candidate;else if(candidate?.axis===drag.move.axis)drag.move.direction=candidate.direction;highlight(drag.move);}}
  else{yaw+=(e.clientX-drag.x)*.4;pitch=Math.max(-75,Math.min(75,pitch-(e.clientY-drag.y)*.4));orbit();}
  drag.x=e.clientX;drag.y=e.clientY;
 });
 stage.addEventListener('pointerup',e=>{if(!drag)return;const current=drag;drag=null;if(current.selected&&current.move&&Math.hypot(e.clientX-current.startX,e.clientY-current.startY)>20)turn(current.move);else if(current.selected){activate();announce('Drag across a row to turn it.');}highlight(null);});
 stage.addEventListener('pointerleave',()=>{if(!drag&&!busy)highlight(null);});stage.addEventListener('pointercancel',()=>{drag=null;highlight(null);});stage.addEventListener('lostpointercapture',()=>{drag=null;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&finishActive)finishActive();});motion.addEventListener('change',()=>{if(motion.matches&&finishActive)finishActive();});
 import('./qube-view.js').then(({mountQube})=>{view=mountQube(stage,model);paint();orbit();}).catch(()=>{stage.dataset.renderer='css-fallback';});
 soundLabel();paint();orbit();announce('');setBusy(false);
})();
document.querySelector('[data-copy-discord]')?.addEventListener('click',async()=>{const status=document.querySelector('.contact-copy-status');try{await navigator.clipboard.writeText('PixelQubed');status.textContent='Copied PixelQubed — add me on Discord.';}catch{status.textContent='Discord username: PixelQubed. Select and copy the handle above.'}});
