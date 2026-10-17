import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {language} from './i18n.js?v=0.0.8';
const words={
 title:['装配步骤','組立手順','Assembly steps'],back:['返回三维','3D に戻る','Back to 3D'],
 prev:['上一步','前へ','Previous'],next:['下一步','次へ','Next'],play:['播放','再生','Play'],pause:['暂停','一時停止','Pause'],
 ground:['地面 XY','地面 XY','Ground XY'],free:['自由空间','自由空間','Free space'],
 complete:['找到完整顺序','完全な手順あり','Complete sequence found'],
 partial:['未找到完整顺序：红色构件仍被阻挡。以下仅为可拆部分的逆序。','完全な手順なし：赤い部材は拘束されています。','No complete sequence: red members remain locked. Steps reverse only the removable portion.'],
 none:['尚未运行 Assembly Analysis，请在 GH 中运行并导出。','GH で Assembly Analysis を実行してください。','Run Assembly Analysis in GH and export the result first.'],
 scope:['固定朝向直线插入；未检查结构稳定性、吊装和施工空间。','固定姿勢の直線挿入。安定性・揚重は未検証。','Fixed-orientation straight insertion; stability, lifting and site access are not checked.'],
 position:['插入进度','挿入進捗','Insertion progress'],direction:['插入方向（世界坐标）','挿入方向（世界座標）','Insertion direction (world)'],
 clear:['对已安装构件：连续路径检查通过','設置済み部材に対し経路確認済み','Continuous path clear against installed members'],
 blocked:['阻挡诊断','干渉診断','Blocker diagnostics'],normal:['返回装配步骤','手順に戻る','Return to steps'],
 future:['显示未安装构件','未設置部材を表示','Show future members'],fit:['适合窗口','全体表示','Fit'],
 blockers:['阻挡构件','干渉部材','Blocking members'],seed:['首根定位','最初の部材','First member placement']
};
const text=k=>words[k]?.[['zh','ja','en'].indexOf(language)]??k;
const overlay=document.createElement('section');overlay.id='assembly-steps';overlay.hidden=true;document.body.append(overlay);
let model,plan,mode='ground',index=0,progress=0,playing=false,last=0,diagnostic=null,renderer,scene,camera,controls,group,arrow,currentMesh;
let objects=new Map(),steps=[],locked=[],travel=0,currentTravel=0;
const v=a=>new THREE.Vector3(...a),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function close(){overlay.hidden=true;playing=false;}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){close();e.preventDefault();}},true);
function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.1,1000000);camera.up.set(0,0,1);controls=new OrbitControls(camera,renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x667766,2.5));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,-2,3);scene.add(light);group=new THREE.Group();scene.add(group);
 const frame=now=>{requestAnimationFrame(frame);if(overlay.hidden)return;const box=overlay.querySelector('.assembly-canvas');if(!box)return;
  const w=box.clientWidth,h=box.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();
  if(playing){progress=Math.min(1,progress+(now-last)/2500);if(progress===1){if(index<steps.length-1){index++;progress=0;draw();}else playing=false;}move();}
  last=now;controls.update();renderer.render(scene,camera);
 };requestAnimationFrame(frame);
}
function fit(){
 const box=new THREE.Box3();for(const m of model.members)for(const p of m.finishedMesh.vertices)box.expandByPoint(v(p));
 if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length();
 camera.position.copy(center).add(new THREE.Vector3(1,-1,.8).normalize().multiplyScalar(radius*1.05));controls.target.copy(center);controls.update();
}
function build(){
 for(const o of objects.values()){o.geometry.dispose();o.material.dispose();o.children.forEach(e=>{e.geometry?.dispose();e.material?.dispose();});}objects.clear();group.clear();
 const groups=[...new Set(model.members.map(m=>m.group))],colors=[0x47868b,0xb68a53,0x839b68,0x9683a8];
 for(const m of model.members){if(!m.finishedMesh.triangles.length)continue;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(m.finishedMesh.vertices.flat(),3));g.setIndex(m.finishedMesh.triangles.flat());g.computeVertexNormals();
  const color=colors[groups.indexOf(m.group)%colors.length],o=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.8,side:THREE.DoubleSide}));
  o.userData.color=color;const edges=new THREE.LineSegments(new THREE.EdgesGeometry(g,25),new THREE.LineBasicMaterial({color:0x34524a}));o.add(edges);group.add(o);objects.set(m.name,o);
 }
}
function setup(){
 plan=model.assemblyAnalysis?.[mode];steps=plan?[...plan.disassembly].reverse():[];locked=plan?.locked??[];travel=model.assemblyAnalysis?.travel??0;index=Math.min(index,Math.max(0,steps.length-1));
 overlay.innerHTML='<header><strong>'+text('title')+'</strong><button id="assembly-close">'+text('back')+' · Esc</button></header><nav><select id="assembly-mode"><option value="ground">'+text('ground')+'</option><option value="freeSpace">'+text('free')+'</option></select><button id="assembly-prev">'+text('prev')+'</button><button id="assembly-play">'+text('play')+'</button><button id="assembly-next">'+text('next')+'</button><button id="assembly-fit">'+text('fit')+'</button><label><input id="assembly-future" type="checkbox" checked>'+text('future')+'</label></nav><p id="assembly-status"></p><div class="assembly-layout"><div class="assembly-canvas"></div><aside><h3 id="assembly-member"></h3><p id="assembly-direction"></p><p id="assembly-check"></p><label>'+text('position')+'<input id="assembly-progress" type="range" min="0" max="1" step=".001" value="0"></label><ol id="assembly-list"></ol><details><summary>'+text('blocked')+'</summary><div id="assembly-blockers"></div></details><p>'+text('scope')+'</p></aside></div>';
 const q=id=>overlay.querySelector('#'+id);
 q('assembly-close').onclick=close;q('assembly-mode').value=mode;q('assembly-mode').onchange=e=>{mode=e.target.value;index=0;diagnostic=null;playing=false;setup();};
 q('assembly-prev').onclick=()=>{playing=false;diagnostic=null;index=Math.max(0,index-1);progress=0;draw();};
 q('assembly-next').onclick=()=>{playing=false;diagnostic=null;index=Math.min(steps.length-1,index+1);progress=0;draw();};
 q('assembly-play').onclick=()=>{diagnostic=null;playing=!playing;if(progress===1){progress=0;}last=performance.now();draw();};
 q('assembly-fit').onclick=fit;q('assembly-future').onchange=draw;
 q('assembly-progress').oninput=e=>{playing=false;progress=Number(e.target.value);move();};
 q('assembly-status').textContent=!plan?text('none'):plan.complete?text('complete'):text('partial');
 q('assembly-list').innerHTML=steps.map((s,i)=>'<li><button data-step="'+i+'">'+esc(s.name)+'</button></li>').join('');
 for(const b of overlay.querySelectorAll('[data-step]'))b.onclick=()=>{index=Number(b.dataset.step);progress=0;diagnostic=null;playing=false;draw();};
 // Diagnostics retain all other final members; arrows are never advertised as a valid sequence.
 const checks=model.assemblyAnalysis?.pairDirections??[];
 q('assembly-blockers').innerHTML=checks.filter(c=>c.blockers.length).map((c,i)=>'<button data-block="'+checks.indexOf(c)+'">'+esc(c.moving)+' → '+esc(c.blockers.join(', '))+'</button>').join('');
 for(const b of overlay.querySelectorAll('[data-block]'))b.onclick=()=>{playing=false;diagnostic=checks[Number(b.dataset.block)];progress=1;draw();};
 overlay.querySelector('.assembly-canvas').append(renderer.domElement);draw();
}
function draw(){
 const s=diagnostic??steps[index],installed=new Set([...locked,...steps.slice(0,index).map(x=>x.name)]),name=diagnostic?.moving??s?.name;
 for(const [n,o] of objects){o.position.set(0,0,0);const current=n===name,blocked=diagnostic?diagnostic.blockers.includes(n):locked.includes(n);
  o.visible=!!diagnostic||installed.has(n)||current||overlay.querySelector('#assembly-future').checked;
  o.material.color.set(blocked?0xd54f46:o.userData.color);if(current)o.material.color.lerp(new THREE.Color(0xffffff),.4);
  o.material.opacity=diagnostic||installed.has(n)||current?1:.13;o.material.transparent=o.material.opacity<1;o.material.depthWrite=!o.material.transparent;
  o.children.forEach(e=>e.visible=!o.material.transparent);
 }
 currentMesh=objects.get(name);
 currentTravel=0;
 if(s&&!diagnostic&&installed.size){
  const direction=v(s.withdrawal),moving=model.members.find(m=>m.name===name);
  let far=-Infinity,near=Infinity;
  for(const m of model.members)if(installed.has(m.name))for(const p of m.finishedMesh.vertices)far=Math.max(far,v(p).dot(direction));
  for(const p of moving.finishedMesh.vertices)near=Math.min(near,v(p).dot(direction));
  currentTravel=Math.min(travel,Math.max(0,far-near)+Math.max(50,moving.section.width));
 }

 if(arrow){scene.remove(arrow);arrow.dispose();arrow=null;}
 if(s&&currentMesh){const center=new THREE.Box3().setFromObject(currentMesh).getCenter(new THREE.Vector3());arrow=new THREE.ArrowHelper(v(s.withdrawal).negate(),center.clone().addScaledVector(v(s.withdrawal),travel*.08),travel*.08,diagnostic?0xd54f46:0xe07825);arrow.traverse(o=>{if(o.material)o.material.depthTest=false;o.renderOrder=10;});scene.add(arrow);}
 overlay.querySelector('#assembly-member').textContent=name?(diagnostic?text('blocked'):(index+1)+' / '+steps.length)+' · '+name:'—';
 overlay.querySelector('#assembly-direction').textContent=s?text('direction')+': ['+s.withdrawal.map(n=>(-n).toFixed(3)).join(', ')+']':'';
 overlay.querySelector('#assembly-check').textContent=diagnostic?text('blockers')+': '+diagnostic.blockers.join(', '):s?(index===0&&!locked.length?text('seed'):text('clear')):'';
 for(const b of overlay.querySelectorAll('[data-step]'))b.classList.toggle('active',!diagnostic&&Number(b.dataset.step)===index);
 for(const id of ['assembly-prev','assembly-next','assembly-play','assembly-progress'])overlay.querySelector('#'+id).disabled=!s;
 move();
}
function move(){
 const s=diagnostic??steps[index];
 if(currentMesh&&s){const distance=diagnostic?(diagnostic.hits[0]?.distance??0):currentTravel*(1-progress);currentMesh.position.copy(v(s.withdrawal).multiplyScalar(distance));}
 overlay.querySelector('#assembly-progress').value=progress;
 overlay.querySelector('#assembly-play').textContent=text(playing?'pause':'play');
 overlay.dataset.state=JSON.stringify({mode,index,progress,travel:currentTravel,current:diagnostic?.moving??s?.name,complete:plan?.complete,locked,diagnostic:!!diagnostic});
}
export function openAssemblySteps(data){if(!renderer)init();model=data;index=0;progress=0;diagnostic=null;playing=false;overlay.hidden=false;build();setup();fit();}
export function refreshAssemblySteps(data){if(overlay.hidden)return;playing=false;model=data;diagnostic=null;progress=0;build();setup();}
