import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
let renderer,scene,camera,controls,mesh,highlight,container,currentId,callback,faceIds=[];
const axes=['+X','-X','+Y','-Y','+Z','-Z'];
function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.1,1000000);camera.up.set(0,1,0);
 controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=false;
 scene.add(new THREE.HemisphereLight(0xffffff,0x667766,2.5));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(2,3,4);scene.add(light);
 let down;renderer.domElement.onpointerdown=e=>{down=[e.clientX,e.clientY];};
 renderer.domElement.onpointerup=e=>{if(e.button!==0||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||!mesh)return;
  const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
  const hit=ray.intersectObject(mesh,false)[0],id=hit&&faceIds[hit.faceIndex];if(id)callback?.(id);
 };
 const draw=()=>{requestAnimationFrame(draw);if(!container?.isConnected||!container.clientWidth||!container.clientHeight||!container.getClientRects().length)return;
  const w=container.clientWidth,h=container.clientHeight;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  renderer.domElement.dataset.camera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray()});renderer.render(scene,camera);
 };draw();
}
export function mountPreview(target,m,onFace,selected){
 if(!renderer)init();container=target;callback=onFace;target.append(renderer.domElement);
 if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
 if(highlight){scene.remove(highlight);highlight.geometry.dispose();highlight.material.dispose();highlight=null;}
 const d=m.drawings,origin=new THREE.Vector3(...d.origin),basis=[d.x,d.y,d.z].map(a=>new THREE.Vector3(...a));
 const points=m.finishedMesh.vertices.map(p=>{const delta=new THREE.Vector3(...p).sub(origin);return basis.map(a=>delta.dot(a));});
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex(m.finishedMesh.triangles.flat());g.computeVertexNormals();
 mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:m.displayColor??0x47868b,roughness:.8,side:THREE.DoubleSide}));scene.add(mesh);
 const bounds=[d.width/2,-d.width/2,d.height/2,-d.height/2,d.length,0],tol=.02;
 faceIds=m.finishedMesh.triangles.map(tri=>axes.find((id,i)=>tri.every(v=>Math.abs(points[v][Math.floor(i/2)]-bounds[i])<tol))??null);
 if(currentId!==m.id){const center=new THREE.Vector3(0,0,d.length/2),radius=Math.hypot(d.length,d.width,d.height)/2;camera.aspect=target.clientWidth/Math.max(1,target.clientHeight);camera.position.copy(center).add(new THREE.Vector3(1.3,.8,1).normalize().multiplyScalar(radius/Math.sin(Math.PI/9)*1.3/Math.min(camera.aspect,1)));controls.target.copy(center);controls.update();currentId=m.id;}
 selectPreviewFace(selected);target.dataset.member=m.id;
}
export function selectPreviewFace(id){
 if(!mesh)return;if(highlight){scene.remove(highlight);highlight.geometry.dispose();highlight.material.dispose();}
 const indices=[];faceIds.forEach((f,i)=>{if(f===id)indices.push(...[0,1,2].map(k=>mesh.geometry.index.array[i*3+k]));});
 const g=new THREE.BufferGeometry();g.setAttribute('position',mesh.geometry.attributes.position.clone());g.setIndex(indices);
 highlight=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xf2c45a,side:THREE.DoubleSide,transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));scene.add(highlight);
 if(container){container.dataset.face=id??'';const label=container.querySelector('.preview-caption');if(label)label.textContent=id??'';}
}
