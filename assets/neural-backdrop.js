(() => {
 const canvas=document.querySelector('.neural-backdrop');if(!canvas)return;
 const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)'),portfolio=document.querySelector('#portfolio');
 let w=0,h=0,raf=0,last=0,elapsed=0,seed=73,progress=0,target=0,pointer={x:-9999,y:-9999,energy:0},frames=0;
 const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;},clamp=x=>Math.max(0,Math.min(1,x));
 // Independent low-poly meshes: left cortex, right cortex and brain stem.
 // An icosphere avoids regular latitude rings; displaced vertices and sparse extra links break the grid.
 const nodes=[],edges=[],meshes=[];
 function cortex(side){
  const t=(1+Math.sqrt(5))/2;let vertices=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>{const n=Math.hypot(...v);return v.map(x=>x/n);});
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let pass=0;pass<2;pass++){const cache=new Map(),mid=(a,b)=>{const key=[a,b].sort((x,y)=>x-y).join(':');if(cache.has(key))return cache.get(key);const v=vertices[a].map((x,k)=>(x+vertices[b][k])/2),length=Math.hypot(...v),id=vertices.length;vertices.push(v.map(x=>x/length));cache.set(key,id);return id;};faces=faces.flatMap(([a,b,c])=>{const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);return [[a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]];});}
  const start=nodes.length,mesh=side<0?'left-hemisphere':'right-hemisphere';
  for(const v of vertices){const jitter=()=> (random()-.5)*.065,fold=1+.07*Math.sin(v[2]*17+v[1]*9)+.035*Math.cos(v[0]*13-v[2]*11),lower=Math.max(0,v[1]),temporal=Math.exp(-((v[1]-.55)**2+(v[2]-.20)**2)*9),x=side*(.018+(v[0]<0?.035*(1+v[0]):v[0]*.70*fold)*(1-.10*lower)+temporal*.025),y=-.24+v[1]*.61*fold+temporal*.055,z=v[2]*.96*fold+.075*(1-v[1]*v[1]);
   nodes.push({mesh,brain:[x+jitter()*.4,y+jitter(),z+jitter()],star:[(random()-.5)*3.8,(random()-.5)*2.7,(random()-.5)*1.8],phase:random(),energy:0});
  }
  const unique=new Set();for(const face of faces)for(let k=0;k<3;k++){const pair=[face[k]+start,face[(k+1)%3]+start].sort((a,b)=>a-b),key=pair.join(':');if(!unique.has(key)){unique.add(key);if(random()>.14)edges.push(pair);}}
  meshes.push({name:mesh,vertices:vertices.length,triangles:faces.length});
 }
 cortex(-1);cortex(1);
 const stemStart=nodes.length,stemRings=[[.24,-.27,.15],[.38,-.32,.13],[.53,-.25,.10],[.66,-.17,.07],[.78,-.11,.05]];
 for(let r=0;r<stemRings.length;r++)for(let n=0;n<7;n++){const [y,z,radius]=stemRings[r],a=n/7*Math.PI*2+(r%2)*.17;nodes.push({mesh:'brain-stem',brain:[Math.cos(a)*radius,y+(random()-.5)*.035,z+Math.sin(a)*radius],star:[(random()-.5)*3.8,(random()-.5)*2.7,(random()-.5)*1.8],phase:random(),energy:0});const index=stemStart+r*7+n;edges.push([index,stemStart+r*7+(n+1)%7]);if(r){edges.push([index,index-7],[index,stemStart+(r-1)*7+(n+1)%7]);}}
 meshes.push({name:'brain-stem',vertices:35,triangles:56});
 // Sparse longer neural links supplement each cortex without making a uniformly connected cloud.
 for(let i=0;i<stemStart;i+=7){const n=nodes[i],near=nodes.slice(0,stemStart).map((v,j)=>({j,d:v.brain.reduce((sum,x,k)=>sum+(x-n.brain[k])**2,0)})).filter(v=>v.j!==i&&v.d>.045&&v.d<.22).sort((a,b)=>a.d-b.d);if(near[3])edges.push([i,near[3].j]);}
 for(const side of ['left-hemisphere','right-hemisphere']){const near=nodes.map((n,i)=>({i,n,d:n.brain.reduce((sum,v,k)=>sum+(v-nodes[stemStart].brain[k])**2,0)})).filter(x=>x.n.mesh===side).sort((a,b)=>a.d-b.d).slice(0,3);for(const n of near)edges.push([stemStart,n.i]);}
 // The cerebellum sits below the rear cerebrum, separate from the stem and cortical hemispheres.
 const cerebellumStart=nodes.length;for(let i=0;i<72;i++){const y=1-2*(i+.5)/72,r=Math.sqrt(1-y*y),angle=i*2.399963,fold=1+.045*Math.sin(y*30);nodes.push({mesh:'cerebellum',brain:[Math.cos(angle)*r*.40*fold,.32+y*.25,Math.sin(angle)*r*.36-.50],star:[(random()-.5)*3.8,(random()-.5)*2.7,(random()-.5)*1.8],phase:random(),energy:0});}
 for(let i=cerebellumStart;i<nodes.length;i++){const near=nodes.map((n,j)=>({j,d:n.brain.reduce((sum,v,k)=>sum+(v-nodes[i].brain[k])**2,0)})).filter(n=>n.j>=cerebellumStart&&n.j!==i).sort((a,b)=>a.d-b.d).slice(0,4);for(const n of near)if(n.j>i)edges.push([i,n.j]);}
 meshes.push({name:'cerebellum',vertices:72,connections:'local irregular neighbourhood'});
 // Interior vertex buffers are independent of the cortex triangles. Rewire their indices locally
 // to create branching paths through the volume without tearing the outer anatomical meshes.
 const interiorStart=nodes.length;
 for(const side of [-1,1])for(let i=0;i<145;i++){let v;do{v=[random()*2-1,random()*2-1,random()*2-1];}while(v.reduce((n,x)=>n+x*x,0)>.80);nodes.push({mesh:side<0?'left-interior':'right-interior',interior:true,brain:[side*(.024+Math.abs(v[0])*.61),-.24+v[1]*.49,v[2]*.81+.04],star:[(random()-.5)*3.8,(random()-.5)*2.7,(random()-.5)*1.8],phase:random(),energy:0});}
 const interiorIndices=Array.from({length:nodes.length-interiorStart},(_,i)=>interiorStart+i);
 for(let i=interiorIndices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[interiorIndices[i],interiorIndices[j]]=[interiorIndices[j],interiorIndices[i]];}
 for(const i of interiorIndices){const near=interiorIndices.filter(j=>j!==i).map(j=>({j,d:nodes[j].brain.reduce((sum,v,k)=>sum+(v-nodes[i].brain[k])**2,0)})).sort((a,b)=>a.d-b.d).slice(0,10);for(let n=0;n<2;n++){const choice=near[Math.floor(random()*near.length)];if(choice)edges.push([i,choice.j]);}if(i%17===0){const other=interiorIndices[Math.floor(random()*interiorIndices.length)];if(other!==i)edges.push([i,other]);}}
 meshes.push({name:'interior-neurons',vertices:290,connections:'selectively shuffled local vertex indices with sparse long paths'});
 // Deterministic local disorder: vary drawing/activation order without scattering the anatomy.
 for(let i=edges.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[edges[i],edges[j]]=[edges[j],edges[i]];}
 canvas.dataset.meshes=JSON.stringify(meshes);canvas.dataset.interiorVertices=String(nodes.length-interiorStart);
 function scrollProgress(){const top=portfolio?portfolio.getBoundingClientRect().top+scrollY:innerHeight;const start=Math.max(160,top-innerHeight*.70),end=Math.max(start+300,top+innerHeight*.36);target=clamp((scrollY-start)/(end-start));request();}
 function size(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);scrollProgress();}
 function draw(time){raf=0;if(document.hidden){last=0;return;}const dt=last?Math.min(50,time-last):16.67;last=time;elapsed+=motion.matches?0:dt;const started=performance.now();
  progress=motion.matches?target:progress+(target-progress)*(1-Math.exp(-dt/85));if(Math.abs(target-progress)<.0005)progress=target;
  pointer.energy*=Math.exp(-dt/1050);ctx.clearRect(0,0,w,h);
  const formed=progress*progress*(3-2*progress),scale=w<700?Math.min(w*.49,h*.40):Math.min(w*.32,h*.46),angle=-.65+(motion.matches?0:elapsed*.000025*formed),tilt=-.13,c=Math.cos(angle),s=Math.sin(angle),cx=w<700?w*.56:w*.68,cy=h*.55;
  const activity=[Math.cos(elapsed*.00016)*.66,Math.sin(elapsed*.00022)*.45,Math.sin(elapsed*.00016)*.55];
  let activeCount=0;const points=nodes.map(n=>{
   const a=n.star.map((v,k)=>v*(1-formed)+n.brain[k]*formed),x=a[0]*c+a[2]*s,z=-a[0]*s+a[2]*c,y=a[1]*Math.cos(tilt)-z*Math.sin(tilt),depth=3.5/(3.5-z*.30);
   const px=cx+x*scale*depth,py=cy+y*scale*depth,dist=Math.hypot(px-pointer.x,py-pointer.y),near=Math.exp(-dist*dist/15000)*pointer.energy;
   const local=Math.exp(-n.brain.reduce((sum,v,k)=>sum+(v-activity[k])**2,0)*16),synapse=motion.matches?0:local*(.55+.45*Math.sin(elapsed*.002+n.phase*5));
   n.energy=Math.max(near,synapse,n.energy*Math.exp(-dt/240));if(n.energy>.35)activeCount++;
   const reading=w<700?.72:clamp((px-w*.32)/(w*.25))*.75+.25;
   return {x:px,y:py,z,energy:n.energy,reading,interior:n.interior};
  });
  // Connections only appear with the forming cortex, never in the opening starfield.
  if(formed>.002){for(const [i,j]of edges){const a=points[i],b=points[j],light=Math.max(a.energy,b.energy),front=clamp((a.z+b.z+1.5)/3),alpha=formed*(((a.interior||b.interior)? .045:.08)+front*((a.interior||b.interior)? .07:.20)+light*.45)*Math.min(a.reading,b.reading);ctx.strokeStyle=`rgba(${light>.35?'230,189,248':'149,112,201'},${alpha})`;ctx.lineWidth=light>.35?.9:.55;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
  for(const p of points){const front=clamp((p.z+.8)/1.7),alpha=((1-formed)*.22+formed*(.12+front*.35+p.energy*.50))*p.reading;ctx.fillStyle=`rgba(218,187,246,${alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,.6+front*.55+p.energy*1.15,0,Math.PI*2);ctx.fill();if(formed>.3&&p.energy>.6){ctx.fillStyle=`rgba(209,149,248,${p.energy*.06})`;ctx.beginPath();ctx.arc(p.x,p.y,5.5,0,Math.PI*2);ctx.fill();}}
  canvas.dataset.renderMs=(performance.now()-started).toFixed(2);canvas.dataset.progress=progress.toFixed(3);canvas.dataset.rotation=angle.toFixed(4);canvas.dataset.activeNodes=String(activeCount);canvas.dataset.nodes=String(nodes.length);canvas.dataset.edges=formed>.002?String(edges.length):'0';canvas.dataset.frames=String(++frames);
  if(!motion.matches&&(progress>0||progress!==target||pointer.energy>.01))request();else last=0;
 }
 function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(draw);}
 addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||motion.matches||progress<.05)return;pointer.x=e.clientX;pointer.y=e.clientY;pointer.energy=1;request();},{passive:true});
 document.documentElement.addEventListener('pointerleave',()=>{pointer.energy=0;});
 addEventListener('scroll',scrollProgress,{passive:true});addEventListener('resize',size);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else request();});motion.addEventListener('change',()=>{cancelAnimationFrame(raf);raf=0;last=0;request();});size();
})();
