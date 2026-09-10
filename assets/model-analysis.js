export function analyseUV(geometry, materialIndex = null, resolution = 192) {
 const uv=geometry.attributes.uv, index=geometry.index, count=index?index.count:geometry.attributes.position.count;
 if(!uv) return {available:false, coverage:0, overlap:0, outside:0, triangles:0, resolution, segments:[]};
 const mask=new Uint16Array(resolution*resolution), segments=[];let outside=0, triangles=0,degenerate=0;
 const ranges=materialIndex===null||!geometry.groups.length?[{start:0,count}]:geometry.groups.filter(g=>g.materialIndex===materialIndex);
 const cross=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
 for(const range of ranges)for(let i=range.start;i<Math.min(count,range.start+range.count);i+=3){
  const p=[0,1,2].map(k=>{const n=index?index.getX(i+k):i+k;return [uv.getX(n),uv.getY(n)];});
  if(!p.flat().every(Number.isFinite))continue;
  triangles++;if(p.some(v=>v.some(c=>c<0||c>1)))outside++;
  segments.push(p);const area=cross(p[0],p[1],...p[2]);if(Math.abs(area)<1e-12){degenerate++;continue;}
  const x0=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0]))*resolution)),x1=Math.min(resolution-1,Math.ceil(Math.max(...p.map(v=>v[0]))*resolution));
  const y0=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1]))*resolution)),y1=Math.min(resolution-1,Math.ceil(Math.max(...p.map(v=>v[1]))*resolution));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const a=(x+.371)/resolution,b=(y+.529)/resolution;
   if([cross(p[0],p[1],a,b),cross(p[1],p[2],a,b),cross(p[2],p[0],a,b)].every(v=>v*area>=0))mask[y*resolution+x]++;
  }
 }
 return {available:true,mask,resolution,triangles,outside,degenerate,segments,coverage:100*mask.filter(v=>v>0).length/mask.length,overlap:100*mask.filter(v=>v>1).length/mask.length};
}
export function mergeUV(parts){
 const valid=parts.filter(p=>p.available);if(!valid.length)return {available:false};
 const result={...valid[0],mask:new Uint32Array(valid[0].mask.length),triangles:0,outside:0,degenerate:0,segments:[]};
 for(const p of valid){p.mask.forEach((n,i)=>result.mask[i]+=n);for(const k of ['triangles','outside','degenerate'])result[k]+=p[k];result.segments.push(...p.segments);}
 result.coverage=100*result.mask.filter(v=>v>0).length/result.mask.length;result.overlap=100*result.mask.filter(v=>v>1).length/result.mask.length;return result;
}
