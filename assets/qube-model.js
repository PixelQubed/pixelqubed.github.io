(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PixelQube=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const FACE={R:[0,1,-1],L:[0,-1,1],U:[1,-1,1],D:[1,1,-1],F:[2,1,1],B:[2,-1,-1]};
 const NORMAL={R:[1,0,0],L:[-1,0,0],U:[0,-1,0],D:[0,1,0],F:[0,0,1],B:[0,0,-1]};
 const identity=()=>[1,0,0,0,1,0,0,0,1];
 const multiply=(a,b)=>Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[c+3]+a[r*3+2]*b[c+6];});
 const vector=(m,v)=>[0,1,2].map(r=>m[r*3]*v[0]+m[r*3+1]*v[1]+m[r*3+2]*v[2]);
 function rotation(axis,d){return axis===0?[1,0,0,0,0,-d,0,d,0]:axis===1?[0,0,d,0,1,0,-d,0,0]:[0,-d,0,d,0,0,0,0,1];}
 class QubeModel{
  constructor(){this.reset();}
  reset(){this.cells=[];for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){if(!x&&!y&&!z)continue;const position=[x,y,z];this.cells.push({id:`${x+1}${y+1}${z+1}`,position,orientation:identity(),stickers:Object.keys(NORMAL).filter(face=>NORMAL[face].some((v,i)=>v!==0&&position[i]===v))});}return this;}
  layer(face){if(!FACE[face])throw Error('Unknown face');const [axis,plane]=FACE[face];return this.cells.filter(c=>c.position[axis]===plane);}
  normal(cell,face){return vector(cell.orientation,NORMAL[face]);}
  faceAt(id,localFace){const cell=this.cells.find(c=>c.id===id);if(!cell||!NORMAL[localFace])return null;const n=this.normal(cell,localFace);return Object.keys(NORMAL).find(face=>NORMAL[face].every((v,i)=>v===n[i]));}
  slice(axis,plane){if(![0,1,2].includes(axis)||![-1,0,1].includes(plane))throw Error('Invalid layer');return this.cells.filter(c=>c.position[axis]===plane);}
  turnLayer(axis,plane,direction=1){if(direction!==1&&direction!==-1)throw Error('Quarter turn direction required');const m=rotation(axis,direction);for(const c of this.slice(axis,plane)){c.position=vector(m,c.position);c.orientation=multiply(m,c.orientation);}return this;}
  turn(face,direction=1){const [axis,plane,sense]=FACE[face]||[];if(axis===undefined)throw Error('Unknown face');return this.turnLayer(axis,plane,direction*sense);}
  dragMove(id,localFace,dx,dy,pitch,yaw){
   const cell=this.cells.find(c=>c.id===id);if(!cell||!NORMAL[localFace]||Math.hypot(dx,dy)<1)return null;
   const normal=this.normal(cell,localFace),point=cell.position.map((v,i)=>v+normal[i]*.46),rx=pitch*Math.PI/180,ry=yaw*Math.PI/180;
   const project=v=>{const x=v[0]*Math.cos(ry)+v[2]*Math.sin(ry),z=-v[0]*Math.sin(ry)+v[2]*Math.cos(ry);return [x,v[1]*Math.cos(rx)-z*Math.sin(rx)];};
   let best=null;for(let axis=0;axis<3;axis++){if(normal[axis])continue;const u=[0,0,0];u[axis]=1;const speed=project([u[1]*point[2]-u[2]*point[1],u[2]*point[0]-u[0]*point[2],u[0]*point[1]-u[1]*point[0]]),length=Math.hypot(...speed);if(length<.05)continue;const alignment=(speed[0]*dx+speed[1]*dy)/length;
    if(!best||Math.abs(alignment)>best.score)best={axis,plane:cell.position[axis],direction:alignment>=0?1:-1,score:Math.abs(alignment)};
   }return best;
  }
  isSolved(){const colours={};for(const cell of this.cells)for(const sticker of cell.stickers){const face=this.faceAt(cell.id,sticker);if(colours[face]&&colours[face]!==sticker)return false;colours[face]=sticker;}return Object.keys(colours).length===6;}
  serialise(){return JSON.stringify(this.cells.map(c=>[c.id,c.position,c.orientation]));}
 }
 return {QubeModel,FACE};
});
