import {mountPreview,selectPreviewFace} from './member-preview.js?v=0.0.8';
import {t} from './i18n.js?v=0.0.8';
import {faceSvg,allSvg,detailSvg,printHtml,featureMeasurements,esc,num,setContactsVisible} from './drawing-svg.js?v=0.0.8';
let current=null,face=0,feature=null,viewBox=null,onJoint=null,sheet=false,contactsVisible=true;
const overlay=document.createElement('section');overlay.id='drawings';overlay.hidden=true;document.body.append(overlay);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){overlay.hidden=true;e.preventDefault();e.stopPropagation();}},true);
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'image/svg+xml;charset=utf-8'}));a.download=name.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function render(keep=false){
 if(!current)return;const m=current,v=m.drawings.views[face],drawing=sheet?{svg:allSvg(m,true),box:[0,0,1600,1080]}:faceSvg(m,v);if(!keep||!viewBox)viewBox=drawing.box.slice();
 overlay.innerHTML=`<header><strong>${esc(m.name)} · ${t('drawing')}</strong><button id="draw-close" title="Esc" aria-keyshortcuts="Escape">${t('back')}</button></header><nav>${m.drawings.views.map((v,i)=>`<button data-face="${i}" class="${!sheet&&i===face?'active':''}">${v.id}</button>`).join('')}<button id="draw-sheet" class="${sheet?'active':''}">${t('sheet')}</button><label><input id="draw-contacts" type="checkbox" ${contactsVisible?'checked':''}> ${t('contacts')}</label><button id="draw-fit">${t('fit')}</button><button id="draw-svg" ${sheet?'hidden':''}>${t(sheet?'allSvg':'svg')}</button><button id="draw-all">${t('allSvg')}</button><button id="draw-pdf">${t('pdf')}</button></nav><p>${t(sheet?'sheetHelp':'drawingHelp')} ${t('projectedMeasurements')}</p><div class="drawing-workspace"><div class="drawing-preview"><span class="preview-caption"></span></div><div class="drawing-stage">${drawing.svg}</div></div><div class="drawing-info"><span>${sheet?t('sheetHelp'):v.endView?t('endFilter'):t('sideFilter')}</span><div>${sheet?'':v.features.map((f,i)=>`<button data-detail="${i}">${esc(f.label)}</button>`).join('')}</div><div id="draw-detail"></div></div>`;
 overlay.querySelector('#draw-contacts').onchange=e=>{contactsVisible=e.target.checked;setContactsVisible(contactsVisible);render(true);};
 const svg=overlay.querySelector('.drawing-stage>svg');const update=()=>svg.setAttribute('viewBox',viewBox.join(' '));update();
 overlay.querySelector('#draw-close').onclick=()=>{overlay.hidden=true;};
 for(const b of overlay.querySelectorAll('[data-face]'))b.onclick=()=>{face=Number(b.dataset.face);sheet=false;feature=null;render();};
 overlay.querySelector('#draw-sheet').onclick=()=>{sheet=true;feature=null;render();};
 let moved=false;const highlightFace=()=>{for(const r of svg.querySelectorAll('[data-sheet-face]'))r.classList.toggle('selected',Number(r.dataset.sheetFace)===face);selectPreviewFace(m.drawings.views[face].id);overlay.dataset.selectedFace=m.drawings.views[face].id;};
 for(const r of svg.querySelectorAll('[data-sheet-face]')){r.onclick=()=>{if(moved)return;face=Number(r.dataset.sheetFace);feature=null;highlightFace();};r.ondblclick=()=>{face=Number(r.dataset.sheetFace);sheet=false;feature=null;render();};}
 mountPreview(overlay.querySelector('.drawing-preview'),m,id=>{face=m.drawings.views.findIndex(v=>v.id===id);feature=null;if(sheet)highlightFace();else render();},v.id);highlightFace();
 overlay.querySelector('#draw-fit').onclick=()=>{feature=null;render();};
 overlay.querySelector('#draw-svg').onclick=()=>download(m.name+(sheet?'_six_faces':'_'+v.id+(feature!=null?'_'+v.features[feature].label:''))+'.svg',sheet?allSvg(m):feature!=null?detailSvg(m,v,feature):faceSvg(m,v,true).svg);
 overlay.querySelector('#draw-all').onclick=()=>download(m.name+'_six_faces.svg',allSvg(m));
 overlay.querySelector('#draw-pdf').onclick=()=>{const win=window.open('','_blank');if(!win)return;win.document.open();win.addEventListener('load',async()=>{await win.document.fonts.ready;win.focus();win.print();},{once:true});win.document.write(printHtml(m,feature!=null?{face,feature}:null,sheet));win.document.close();};
 let drag=null;svg.onpointerdown=e=>{if(e.button!==0||e.target.closest('[data-feature]'))return;moved=false;drag={x:e.clientX,y:e.clientY,box:viewBox.slice()};if(!e.target.closest('[data-sheet-face]'))svg.setPointerCapture(e.pointerId);};
 svg.onpointermove=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)moved=true;const rect=svg.getBoundingClientRect();const scale=Math.max(viewBox[2]/rect.width,viewBox[3]/rect.height);viewBox[0]=drag.box[0]-(e.clientX-drag.x)*scale;viewBox[1]=drag.box[1]-(e.clientY-drag.y)*scale;update();};svg.onpointerup=()=>{drag=null;};
 svg.onwheel=e=>{e.preventDefault();const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());const factor=Math.exp(Math.max(-.4,Math.min(.4,e.deltaY*.001)));if(viewBox[2]*factor<1||viewBox[2]*factor>drawing.box[2]*30)return;viewBox=[point.x+(viewBox[0]-point.x)*factor,point.y+(viewBox[1]-point.y)*factor,viewBox[2]*factor,viewBox[3]*factor];update();};
 const detail=i=>{feature=i;const f=v.features[i],b=f.bounds,pad=Math.max((b[2]-b[0])*.4,(b[3]-b[1])*.6,10);viewBox=[b[0]-pad,-b[3]-pad,b[2]-b[0]+2*pad,b[3]-b[1]+2*pad];update();
   const measures=featureMeasurements(v,f);
   overlay.querySelector('#draw-detail').innerHTML=`<h3>${esc(f.label)} · ${t('location')}: ${num(f.zRange[0])} mm · ${t('span')}: ${num(f.zRange[1]-f.zRange[0])} mm ${f.opensOnFace?'· '+t('depth')+': '+num(f.depth)+' mm':''}</h3><p>${t('projectedMeasurements')}</p><table><tr><th>${t('edge')}</th><th>mm</th><th>${t('corner')}</th><th>°</th></tr>${measures.edges.map((e,i)=>`<tr><td>${e.id}</td><td>${num(e.length)}</td><td>${measures.angles[i].id}</td><td>${num(measures.angles[i].degrees)}</td></tr>`).join('')}</table><button id="draw-joint">${t('focus')}</button><details><summary>${t('coordinates')}</summary><table><tr><th>ID</th><th>X</th><th>Y</th><th>Z</th></tr>${f.localCorners.map((p,i)=>`<tr><td>P${i+1}</td>${p.map(n=>`<td>${num(n)}</td>`).join('')}</tr>`).join('')}</table></details>`;
   overlay.querySelector('#draw-joint').onclick=()=>{overlay.hidden=true;onJoint?.(f.id);};};
 for(const r of svg.querySelectorAll('[data-feature]'))r.onclick=()=>detail(Number(r.dataset.feature));
 for(const b of overlay.querySelectorAll('[data-detail]'))b.onclick=()=>detail(Number(b.dataset.detail));
 if(!sheet&&feature!=null&&v.features[feature]){const box=viewBox.slice();detail(feature);if(keep){viewBox=box;update();}}
}
export function openDrawings(m,selectJoint){if(!m.drawings){alert(t('missingDrawing'));return;}current=m;face=0;sheet=false;feature=null;onJoint=selectJoint;overlay.hidden=false;render();}
export function refreshDrawings(m){if(!overlay.hidden){if(!m?.drawings){overlay.hidden=true;return;}const before=viewBox?.slice();current={...m,displayColor:current?.displayColor};render(true);overlay.dataset.refresh=JSON.stringify({before,after:viewBox});}}
export function drawingsMemberId(){return !overlay.hidden?current?.id:null;}
export {faceSvg,allSvg};
