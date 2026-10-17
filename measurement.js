// Measurement consumes exact exported topology; display triangles are never snap targets.
export function measurementPoints(members,mode,visibleIds){
  const points=[];
  for(const m of members){
    if(!visibleIds.has(m.id))continue;
    const geometry=m.measurement?.[mode];
    if(!geometry||geometry.source!=='brep-linear-edges')return null;
    const seen=new Set();
    for(const edge of geometry.edges)for(const [kind,p] of [['endpoint',edge.a],['endpoint',edge.b],['midpoint',edge.midpoint]]){
      const key=kind+':'+p.join(',');if(seen.has(key))continue;seen.add(key);
      points.push({memberId:m.id,name:m.name,kind,p:[...p]});
    }
  }
  return points;
}
export const pointDistance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const words={en:{measure:'Measure',clear:'Clear',pick:'Pick two endpoints or edge midpoints',endpoint:'Endpoint',midpoint:'Midpoint',missing:'Exact edges unavailable. Re-export this model with the updated GH plugin.',restricted:'Measurement is available in the main assembled or stock view. Return from joint/layout views.',next:'Pick the second point',again:'Click another point to start a new measurement'},zh:{measure:'测量',clear:'清除',pick:'选取两个端点或真实边线中点',endpoint:'端点',midpoint:'中点',missing:'缺少真实边线数据，请用新版 GH 插件重新导出。',restricted:'测量仅支持原位加工后或原材视图，请退出节点或平铺视图。',next:'请选择第二个点',again:'再次选点开始新的测量'},ja:{measure:'計測',clear:'クリア',pick:'端点または実際の辺の中点を2点選択',endpoint:'端点',midpoint:'中点',missing:'正確な辺データがありません。更新した GH プラグインで再出力してください。',restricted:'計測は組立位置の加工後・素材ビューで使用できます。接合部・展開ビューから戻ってください。',next:'2点目を選択',again:'次の点を選択して新しい計測を開始'}};
export function createMeasurement({THREE,scene,camera,canvas,viewport,language}){
  const toggle=document.getElementById('measure-toggle'),clear=document.getElementById('measure-clear');
  const panel=document.createElement('div');panel.className='measurement-panel';panel.hidden=true;viewport.append(panel);
  const dots=Array.from({length:3},()=>{const d=document.createElement('div');d.className='measurement-dot';d.hidden=true;viewport.append(d);return d;});
  const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xe05b18,depthTest:false}));line.renderOrder=100;line.visible=false;scene.add(line);
  const ray=new THREE.Raycaster();let active=false,candidates=[],objects=[],chosen=[],hover=null,mouse=null,down=null,reason='',lastLanguage='',hoverKey='';
  const w=()=>words[language()]??words.en;
  function reset(){hoverKey='';chosen=[];hover=null;mouse=null;line.visible=false;for(const d of dots)d.hidden=true;show();}
  function show(){toggle.textContent=w().measure;clear.textContent=w().clear;toggle.setAttribute('aria-pressed',String(active));toggle.classList.toggle('active',active);clear.hidden=!active;panel.hidden=!active;
    const message=reason?w()[reason]:chosen.length===2?`${pointDistance(chosen[0].p,chosen[1].p).toLocaleString('en-US',{maximumFractionDigits:3})} mm · ${w().again}`:hover?`${hover.name} · ${w()[hover.kind]} · ${chosen.length?w().next:w().pick}`:chosen.length?w().next:w().pick;
    if(panel.textContent!==message)panel.textContent=message;
    panel.dataset.points=JSON.stringify(chosen);panel.dataset.pointCount=String(chosen.length);panel.dataset.distance=chosen.length===2?String(pointDistance(chosen[0].p,chosen[1].p)):'';
  }
  toggle.onclick=()=>{active=!active;reset();};clear.onclick=reset;
  function project(p,r=canvas.getBoundingClientRect()){const v=new THREE.Vector3(...p).project(camera);return {x:(v.x*.5+.5)*r.width,y:(-.5*v.y+.5)*r.height,z:v.z};}
  function snap(x,y){
    const r=canvas.getBoundingClientRect(),near=[];
    for(const c of candidates){const s=project(c.p,r);if(s.z< -1||s.z>1)continue;const distance=Math.hypot(s.x-x,s.y-y);if(distance<=12)near.push({c,s,distance});}
    near.sort((a,b)=>a.distance-b.distance||a.s.z-b.s.z);
    for(const {c,s} of near){
      ray.setFromCamera(new THREE.Vector2(s.x/r.width*2-1,1-s.y/r.height*2),camera);
      const hit=ray.intersectObjects(objects,false)[0],p=new THREE.Vector3(...c.p);
      if(hit&&hit.distance+Math.max(.03,hit.distance*1e-7)<ray.ray.origin.distanceTo(p))continue;
      return c;
    }return null;
  }
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse={x:e.clientX-r.left,y:e.clientY-r.top};});
  canvas.addEventListener('pointerleave',()=>{mouse=null;hover=null;});
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{
    if(!active||reason||e.button!==0||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
    const r=canvas.getBoundingClientRect(),hit=snap(e.clientX-r.left,e.clientY-r.top);if(!hit)return;
    if(chosen.length===2)chosen=[];chosen.push(hit);
    line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(chosen.map(c=>new THREE.Vector3(...c.p)));line.visible=chosen.length===2;show();
  });
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){reset();}});
  return {get enabled(){return active;},context(data,mode,pickables,jointView){
    objects=pickables;reason=mode==='layout'||jointView?'restricted':'';
    candidates=reason?[]:measurementPoints(data.members,mode,new Set(objects.map(o=>o.userData.memberId)));
    if(candidates===null){reason='missing';candidates=[];}reset();
  },render(){
    if(lastLanguage!==language()){lastLanguage=language();show();}
    if(!active)return;
    const key=mouse&&!reason?[mouse.x,mouse.y,...camera.matrixWorld.elements,...camera.projectionMatrix.elements].join(','):'';
    if(key!==hoverKey){hoverKey=key;hover=key?snap(mouse.x,mouse.y):null;}
    [...chosen,hover].forEach((p,i)=>{const d=dots[i];if(!d)return;d.hidden=!p;if(p){const s=project(p.p);d.hidden=s.z< -1||s.z>1;d.style.left=s.x+'px';d.style.top=s.y+'px';d.textContent=i<chosen.length?String(i+1):p.kind==='midpoint'?'◇':'○';}});
    for(let i=chosen.length+1;i<dots.length;i++)dots[i].hidden=true;
    show();
  }};
}
