// Measurements of the projected cut envelope, in drawing coordinates (mm).
// These are projected edge lengths / included angles, not 3D dihedral angles.
export function featureMeasurements(v,f){
 const dot=(p,a)=>p.reduce((s,n,i)=>s+n*a[i],0),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const points=f.localCorners.map(p=>[dot(p,v.horizontal),dot(p,v.vertical)]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const unique=[];for(const p of points)if(!unique.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-6))unique.push(p);
 if(unique.length<3)return {vertices:[],edges:[],angles:[]};
 const half=ps=>{const h=[];for(const p of ps){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=1e-7)h.pop();h.push(p);}return h;};
 const hull=half(unique).slice(0,-1).concat(half([...unique].reverse()).slice(0,-1));
 if(hull.length<3)return {vertices:[],edges:[],angles:[]};
 const vertices=hull.map((point,i)=>({id:String.fromCharCode(65+i),point}));
 const edges=vertices.map((a,i)=>{const b=vertices[(i+1)%vertices.length];return {id:a.id+b.id,a:a.point,b:b.point,length:Math.hypot(b.point[0]-a.point[0],b.point[1]-a.point[1])};});
 const angles=vertices.map((p,i)=>{
  const prev=hull[(i+hull.length-1)%hull.length],next=hull[(i+1)%hull.length];
  let a=[prev[0]-p.point[0],prev[1]-p.point[1]],b=[next[0]-p.point[0],next[1]-p.point[1]],materialSide=false;
  // At an opening on the stock top/bottom boundary, measure against the
  // continuation of the external stock face, rather than the void's chord.
  if(f.opensOnFace&&v.bounds&&(Math.abs(p.point[1]-v.bounds[1])<1e-5||Math.abs(p.point[1]-v.bounds[3])<1e-5)){
   if(Math.abs(a[1])<1e-5){a=a.map(n=>-n);materialSide=true;}
   else if(Math.abs(b[1])<1e-5){b=b.map(n=>-n);materialSide=true;}
  }
  return {id:p.id,point:p.point,rays:[a,b],materialSide,degrees:Math.acos(Math.max(-1,Math.min(1,(a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))))*180/Math.PI};
 });
 return {vertices,edges,angles};
}
