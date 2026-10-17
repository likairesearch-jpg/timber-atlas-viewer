import {createMeasurement} from './measurement.js?v=0.0.10';
import {openAssemblySteps,refreshAssemblySteps} from './assembly-view.js?v=0.0.9';
import {t,language,setLanguage,initStatic} from './i18n.js?v=0.0.8';
import {openDrawings,refreshDrawings,drawingsMemberId} from './drawings.js?v=0.0.9';
const directionLabel=mode=>t(mode);
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { validateAssembly } from './schema.js?v=0.0.10';

const $ = id => document.getElementById(id);
const fmt = (n,d=1) => Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors = [0x47868b,0xb68a53,0x839b68,0x9683a8,0x9e7773];
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40,1,.1,1000000);camera.up.set(0,0,1);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0xffffff,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;$('viewport').prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;
// Read-only diagnostic snapshot for repeatable camera regression checks.
controls.addEventListener('change',()=>{renderer.domElement.dataset.camera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),quaternion:camera.quaternion.toArray(),zoom:camera.zoom});});
scene.add(new THREE.HemisphereLight(0xffffff,0x68765c,2.3));
const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(1,-2,3);scene.add(sun);
const root=new THREE.Group();scene.add(root);
const measurement=createMeasurement({THREE,scene,camera,canvas:renderer.domElement,viewport:$('viewport'),language:()=>language});
const grid=new THREE.GridHelper(4000,20,0xc6d0c0,0xdce3d5);grid.rotation.x=Math.PI/2;grid.position.z=-100;scene.add(grid);
let data=null,selectedMember=null,selectedJoint=null,view='finished',pickables=[],labelPoints=[];
let renderedFrames=0,lastSource="",selectedAttempt=0;
const vec=a=>new THREE.Vector3(...a);
const member=id=>data.members.find(m=>m.id===id);
const joint=id=>data.joints.find(j=>j.id===id);
function geometry(mesh) {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices.flat(),3));g.setIndex(mesh.triangles.flat());g.computeVertexNormals();return g;}
function meshObject(mesh,color,opacity=1) {const obj=new THREE.Mesh(geometry(mesh),new THREE.MeshStandardMaterial({color,roughness:.8,metalness:0,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity>=1}));return obj;}
function clearScene() {root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.clear();pickables=[];labelPoints=[];$('label-layer').replaceChildren();}
function frameBox(box,factor=1.35) {renderer.domElement.dataset.lastFrame=new Error().stack;if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3());const size=box.getSize(new THREE.Vector3());const radius=Math.max(size.length()/2,30);const dist=radius/Math.sin(camera.fov*Math.PI/360)*factor/Math.min(camera.aspect,1);camera.position.copy(center).add(new THREE.Vector3(1,-1.4,1.15).normalize().multiplyScalar(dist));camera.near=Math.max(.1,dist/10000);camera.far=Math.max(100000,dist*100);camera.updateProjectionMatrix();controls.target.copy(center);controls.update();}
function modelBounds(){const b=new THREE.Box3();for(const o of pickables)b.expandByObject(o);return b;}
function nodeBounds(j) {const g=geometry(j.intersectionMesh);g.computeBoundingBox();const b=g.boundingBox.clone();g.dispose();b.expandByScalar(65+Number($('gap').value)/2);return b;}
function rebuild(fit=false) {
  if(!data)return;clearScene();
  const j=selectedJoint?joint(selectedJoint):null;
  const attempt=j?.status==='failed'?j.attempts?.[selectedAttempt]:null;
  const isolate=$('isolate').checked, gap=j&&j.status==='ok'&&view!=='layout'?Number($('gap').value):0;
  const groups=[...new Set(data.members.map(m=>m.group))];let row=0;
  for(const m of data.members){
    if(view!=='stock'&&m.processingStatus==='removed')continue;
    if(isolate && (j?!j.members.includes(m.id):selectedMember&&m.id!==selectedMember))continue;
    let color=colors[groups.indexOf(m.group)%colors.length];
    if(selectedMember===m.id)color=new THREE.Color(color).lerp(new THREE.Color(0xffffff),.38);
    if(j)color=j.members.indexOf(m.id)===0?0x337787:j.members.indexOf(m.id)===1?0xbd884d:0xb9c4b7;
    const diagnostic=j?.status==='failed'&&view==='finished'?j.previewTimbers?.find(p=>p.memberId===m.id):null;
    const o=meshObject(view==='stock'?m.stockMesh:diagnostic?.mesh??m.finishedMesh,color);
    o.userData.memberId=m.id;
    if(view==='layout'){
      const f=m.frame;const basis=new THREE.Matrix4().makeBasis(vec(f.x),vec(f.y),vec(f.normal));basis.setPosition(vec(f.origin));
      o.applyMatrix4(basis.invert());o.position.y+=row;row+=m.section.width+130;
    }else if(j&&gap&&j.members.includes(m.id))o.position.copy(vec(j.insertionDirection).multiplyScalar(m.id===j.movingMember?-gap/2:gap/2));
    if(attempt&&!attempt.clear&&view==='finished'&&m.id===attempt.movingMember)o.position.addScaledVector(vec(attempt.withdrawal),attempt.collisionDistance);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,25),new THREE.LineBasicMaterial({color:0x34524a,transparent:true,opacity:.5}));o.add(edges);if(selectedMember===m.id){
      const shell=new THREE.Mesh(o.geometry,new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{pixelWidth:{value:3},resolution:{value:new THREE.Vector2(renderer.domElement.clientWidth,renderer.domElement.clientHeight)}},vertexShader:`uniform float pixelWidth;uniform vec2 resolution;void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);vec2 projected=(projectionMatrix*vec4(n,0.)).xy;float l=length(projected);if(l>0.0001)p.xy+=projected/l*pixelWidth*2./resolution*p.w;gl_Position=p;}`,fragmentShader:`void main(){gl_FragColor=vec4(.12,.24,.28,1.);}`}));o.add(shell);
    }root.add(o);pickables.push(o);
    o.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(o);const label=document.createElement('div');label.className='model-label';label.textContent=m.name;$('label-layer').append(label);labelPoints.push({point:box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0,0,m.section.height/2+20)),element:label});
  }
  if(selectedMember&&view==='finished'&&$('show-contacts').checked)for(const c of data.contacts??[])if(c.members.includes(selectedMember)){const patch=meshObject(c.mesh,0xa54aab,.6);patch.material.depthTest=false;patch.renderOrder=5;root.add(patch);}
  if(selectedMember&&view!=='layout'&&$('show-cuts').checked)for(const p of data.planeTrims??[])if(p.memberId===selectedMember)root.add(meshObject(p.removedMesh,0xdb6659,.45));
  if(j&&view!=='layout'){
    if($('show-cuts').checked)for(const c of j.cuts??[])root.add(meshObject(c.mesh,0xdb6659,.45));
    if($('show-extra').checked)for(const c of j.cuts??[])if(c.extraMesh.triangles.length)root.add(meshObject(c.extraMesh,0xedb535,.8));
    if(attempt&&!attempt.clear){const point=vec(attempt.collisionPoint);const arrow=new THREE.ArrowHelper(vec(attempt.withdrawal),point.clone().addScaledVector(vec(attempt.withdrawal),-100),100,0xd33535,15,8);arrow.traverse(o=>{if(o.material)o.material.depthTest=false;o.renderOrder=11;});root.add(arrow);const marker=new THREE.Mesh(new THREE.SphereGeometry(5,16,12),new THREE.MeshBasicMaterial({color:0xff3333,depthTest:false}));marker.position.copy(point);marker.renderOrder=10;root.add(marker);}
    if(j.status==='ok'){
      const p=j.splitPlane;const center=vec(p.origin);const dir=vec(j.insertionDirection);
      root.add(new THREE.ArrowHelper(dir,center.clone().addScaledVector(dir,-170),170,0xba4d3f,23,12));
      if($('show-plane').checked){const plane=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.MeshBasicMaterial({color:0x7f9db9,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));plane.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),vec(p.normal));plane.position.copy(center);root.add(plane);}
    }
  }
  grid.visible=!selectedJoint;const bounds=modelBounds();if(!bounds.isEmpty()){grid.position.z=bounds.min.z-10;grid.position.x=(bounds.min.x+bounds.max.x)/2;grid.position.y=(bounds.min.y+bounds.max.y)/2;}
  $('gap').disabled=!j||j.status!=='ok'||view==='layout';$('gap-value').textContent=fmt(gap,0)+' mm';
  $('selection-badge').textContent=j?t('joints')+' '+(data.joints.indexOf(j)+1)+' · '+j.members.map(id=>member(id).name).join(' ↔ '):selectedMember?member(selectedMember).name:t('overview');
  $('view-caption').textContent=t(view==='layout'?'layoutView':selectedJoint?'jointView':view==='stock'?'stockView':'assemblyView');
  if(fit)frameBox(j&&view!=='layout'?nodeBounds(j):bounds);
  measurement.context(data,view,pickables,!!selectedJoint);
  updateDebug();
}
function updateDebug(){window.timberViewerState={project:data?.project,members:data?.members.length,joints:data?.joints.length,selectedMember,selectedJoint,view,visibleMembers:pickables.map(o=>o.userData.memberId),gap:Number($('gap').value),renderedFrames};}
function memberList(){if(!data)return;const q=$('search').value.toLowerCase();const list=$('member-list');list.replaceChildren();let last=null,count=0;for(const m of [...data.members].sort((a,b)=>a.group.localeCompare(b.group)||a.index-b.index)){
 if(!(m.name+' '+m.group).toLowerCase().includes(q))continue;count++;if(last!==m.group){const h=document.createElement('div');h.className='group-name';h.textContent=m.group;list.append(h);last=m.group;}
 const b=document.createElement('button');b.className='member-row'+(selectedMember===m.id?' active':'');b.innerHTML=`<span><strong>${esc(m.name)}</strong><small>${fmt(m.section.width)} × ${fmt(m.section.height)} · L ${fmt(m.length)}</small></span><span class="count">${m.jointIds.length} ${t('joints')}</span>`;b.onclick=()=>selectMember(m.id);list.append(b);
 }$('member-count').textContent=count;}
const detailLine=(a,b)=>`<div class="detail-line"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
function inspect(){const el=$('details');if(!data)return;
 if(selectedJoint){const j=joint(selectedJoint),index=data.joints.indexOf(j)+1,angles=j.checks?.sidewallAnglesDegrees??[];
  el.innerHTML=`<div class="eyebrow">${t('joints')} / ${index}</div><h3>${t('joints')} ${index}</h3>${(data.planeTrims??[]).some(p=>j.members.includes(p.memberId))?`<div class="callout">${t('trimReview')}</div>`:''}<p class="${j.status==='ok'?'status-ok':'status-failed'}">${t(j.status==='ok'?'ok':'failed')}</p>${detailLine(t('mode'),t(j.rule.mode))}${detailLine(t('family'),t(j.family??'Lap'))}${j.family==='ThroughHole'?'':detailLine(t('split'),fmt(j.rule.x,3))}${detailLine(t('angles'),angles.length?fmt(Math.min(...angles),2)+'° — '+fmt(Math.max(...angles),2)+'°':t('notMeasured'))}${detailLine(t('area'),fmt((j.checks?.contactArea??0)/100,2)+' cm²')}${detailLine(t('extra'),fmt((j.cuts??[]).reduce((n,c)=>n+c.extraVolume,0)/1000,2)+' cm³')}<h4>${t('connected')}</h4>${j.members.map(id=>`<button class="partner" data-partner="${esc(id)}">${esc(member(id).name)} →</button>`).join('')}<h4>${t('cuts')}</h4>${(j.cuts??[]).map(c=>detailLine(member(c.memberId).name,fmt(c.removedVolume/1000,2)+' cm³')).join('')}${j.status==='ok'?`<div class="callout">${t('moving')}: ${esc(member(j.movingMember).name)}<br>[${j.insertionDirection.map(n=>fmt(n,3)).join(', ')}]<br>${j.checks.assembly==='pairwise_continuous_clear'?t('continuousClear'):j.checks.samples+' '+t('sampled')}</div>`:`<div class="callout">${esc(j.message)}</div>`}${j.status==='failed'&&j.attempts?.length?`<div class="callout">${t('diagnosticPreview')}<label for="attempt">${t('attempt')}</label><select id="attempt">${j.attempts.map((a,i)=>`<option value="${i}" ${i===selectedAttempt?'selected':''}>${i+1}. ${esc(a.source)}</option>`).join('')}</select><p>${t('probeMember')}: ${esc(member(j.attempts[selectedAttempt].movingMember).name)}<br>${t('collisionTravel')}: ${fmt(j.attempts[selectedAttempt].collisionDistance,3)} mm<br>${t('blocking')}: ${esc(member(j.attempts[selectedAttempt].fixedMember).name)}</p></div>`:''}<button id="node-focus">${t('focus')}</button>`;
  if($('attempt'))$('attempt').onchange=()=>{selectedAttempt=Number($('attempt').value);inspect();rebuild();};
  for(const b of el.querySelectorAll('[data-partner]'))b.onclick=()=>selectMember(b.dataset.partner);$('node-focus').onclick=()=>frameBox(nodeBounds(j));
 }else if(selectedMember){const m=member(selectedMember);
  el.innerHTML=`<div class="eyebrow">${esc(m.group)}</div><h3>${esc(m.name)}</h3>${detailLine(t('width'),fmt(m.section.width)+' mm')}${detailLine(t('height'),fmt(m.section.height)+' mm')}${detailLine(t('length'),fmt(m.length)+' mm')}${detailLine(t('roll'),fmt(m.rollDegrees)+'°')}${detailLine(t('stockVolume'),fmt(m.stockVolume/1e6,3)+' L')}${detailLine(t('finishedVolume'),fmt(m.finishedVolume/1e6,3)+' L')}<button id="draw-open" class="primary" ${!m.drawings?'disabled':''}>${t('drawing')}</button>${m.processingStatus==='removed'?`<p>${t('fullyRemoved')}</p>`:''}${(data.planeTrims??[]).filter(p=>p.memberId===m.id).map(p=>detailLine(t('planeTrim'),fmt(p.removedVolume/1000,2)+' cm³')).join('')}<h4>${t('joints')} · ${m.jointIds.length}</h4>${m.jointIds.map(id=>{const j=joint(id),partner=member(j.members.find(p=>p!==m.id));return `<button class="joint-link" data-joint="${esc(id)}"><strong>${t('joints')} ${data.joints.indexOf(j)+1} → ${esc(partner.name)}</strong><small>${t(j.rule.mode)}${j.family==='ThroughHole'?'':' · x '+fmt(j.rule.x,3)} · ${t(j.status==='ok'?'ok':'failed')}</small></button>`;}).join('')||'<p>'+t('noJoints')+'</p>'}`;
  el.insertAdjacentHTML('beforeend',`<h4>${t('contacts')}</h4>${(data.contacts??[]).filter(c=>c.members.includes(m.id)).map(c=>{const partner=member(c.members.find(id=>id!==m.id));return `<button class="partner" data-contact-partner="${esc(partner.id)}">${esc(c.id)} → ${esc(partner.name)} · ${fmt(c.area,2)} mm² · ${t(c.source)}</button>`;}).join('')||'<p>'+t(data.contactStatus==='failed'?'contactFailed':data.contactStatus==='ok'?'noContacts':'contactUnavailable')+'</p>'}`);
  for(const b of el.querySelectorAll('[data-contact-partner]'))b.onclick=()=>selectMember(b.dataset.contactPartner);
  $('draw-open').onclick=()=>openDrawings({...m,displayColor:colors[[...new Set(data.members.map(x=>x.group))].indexOf(m.group)%colors.length]},selectJoint);for(const b of el.querySelectorAll('[data-joint]'))b.onclick=()=>selectJoint(b.dataset.joint);
 }else{el.innerHTML=`<h3>${t('overview')}</h3><p class="muted">${t('overviewHelp')}</p>${data.joints.map((j,i)=>`<button class="joint-link" data-joint="${esc(j.id)}"><strong>${t('joints')} ${i+1} · ${t(j.status==='ok'?'ok':'failed')}</strong><small>${j.members.map(id=>esc(member(id).name)).join(' ↔ ')}</small></button>`).join('')}`;for(const b of el.querySelectorAll('[data-joint]'))b.onclick=()=>selectJoint(b.dataset.joint);}
}
function selectMember(id){selectedMember=id;selectedJoint=null;$('gap').value=0;memberList();inspect();rebuild();}
function selectJoint(id){selectedAttempt=0;selectedJoint=id;selectedMember=null;$('gap').value=0;view='finished';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));memberList();inspect();rebuild();}
function showError(e){$('error').hidden=false;$('error').textContent=e.message??String(e);$('status').textContent=t('importFailed');}
function loadData(raw,source,preserve=false){const next=validateAssembly(raw),drawingId=drawingsMemberId(),same=preserve&&data?.members.some(m=>next.members.some(n=>n.id===m.id));data=next;lastSource=source;refreshAssemblySteps(data);
 if(!same){selectedMember=selectedJoint=null;$('gap').value=0;$('search').value='';}else{if(!data.members.some(m=>m.id===selectedMember))selectedMember=null;if(!data.joints.some(j=>j.id===selectedJoint))selectedJoint=null;}
 if(selectedJoint&&selectedAttempt>=(joint(selectedJoint)?.attempts?.length??0))selectedAttempt=0;
 $('error').hidden=true;$('processing-warning').hidden=data.status==='processed';$('project-title').textContent=data.project;$('project-status').textContent=t(data.status==='processed'?'ok':'failed')+' / mm';$('stat-members').textContent=data.members.length;$('stat-groups').textContent=new Set(data.members.map(m=>m.group)).size;$('stat-joints').textContent=data.joints.length;$('stat-issues').textContent=data.joints.filter(j=>j.status!=='ok').length;
 $('notes').textContent=[t('scope'),...(data.notes??[])].join('\n');$('status').textContent=`${t('loaded')} ${source} · ${data.members.length} ${t('members')} / ${data.joints.length} ${t('joints')}`;memberList();inspect();rebuild(!same);refreshDrawings(data.members.find(m=>m.id===drawingId));}
async function sample(){try{const response=await fetch('./model.json');if(!response.ok)throw new Error(t('sampleError'));loadData(await response.json(),$('sample').selectedOptions[0].textContent);}catch(e){showError(e);}}
$('sample-load').onclick=sample;
$('assembly-open').onclick=()=>{if(data)openAssemblySteps(data);};
$('search').oninput=memberList;
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));rebuild(true);};
$('fit').onclick=()=>{selectedJoint=selectedMember=null;$('gap').value=0;memberList();inspect();rebuild(true);};
for(const id of ['isolate','show-cuts','show-extra','show-plane','show-contacts'])$(id).onchange=()=>rebuild();
$('gap').oninput=()=>rebuild();
const raycaster=new THREE.Raycaster();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(measurement.enabled)return;if(e.button!==0||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=raycaster.intersectObjects(pickables,false);if(hits.length)selectMember(hits[0].object.userData.memberId);});
function resize(){const r=$('viewport').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('viewport'));
function animate(){requestAnimationFrame(animate);controls.update();measurement.render();renderer.render(scene,camera);renderedFrames++;const r=$('viewport').getBoundingClientRect();for(const l of labelPoints){const p=l.point.clone().project(camera);l.element.hidden=!$('labels').checked||p.z< -1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;l.element.style.left=(p.x*.5+.5)*r.width+'px';l.element.style.top=(-p.y*.5+.5)*r.height+'px';}if(window.timberViewerState)window.timberViewerState.renderedFrames=renderedFrames;}
initStatic();$('language').value=language;$('language').onchange=()=>{setLanguage($('language').value);memberList();inspect();rebuild();refreshDrawings(member(drawingsMemberId()));if(data){$('status').textContent=`${t('loaded')} ${lastSource} · ${data.members.length} ${t('members')} / ${data.joints.length} ${t('joints')}`;$('project-status').textContent=t(data.status==='processed'?'ok':'failed')+' / mm';$('notes').textContent=[t('scope'),...(data.notes??[])].join('\n');}};
resize();animate();sample();
