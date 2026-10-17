let showContacts=true;
export function setContactsVisible(value){showContacts=value;}
import {t} from './i18n.js?v=0.0.8';
import {featureMeasurements} from './drawing-measurements.js?v=0.0.8';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n.toFixed(2)).toString();
function featureAnnotations(v,f){
 const result=featureMeasurements(v,f),p=result.vertices.map(x=>x.point);if(!p.length)return '';
 const size=Math.max(.1,Math.min(f.bounds[2]-f.bounds[0],f.bounds[3]-f.bounds[1]));
 const font=size*.115,offset=size*.33,radius=size*.24;
 const line=(a,b)=>`<line x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" stroke="#a85636" stroke-width=".7" vector-effect="non-scaling-stroke"/>`;
 let svg=`<metadata class="feature-measurements">${esc(JSON.stringify({jointId:f.id,face:v.id,units:'mm',kind:'projected-cut-envelope',...result}))}</metadata><g class="feature-annotations" fill="#9b482f" font-family="Arial,sans-serif" pointer-events="none">`;
 for(const e of result.edges){const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],normal=[dy/e.length,-dx/e.length],a=e.a.map((n,i)=>n+normal[i]*offset),b=e.b.map((n,i)=>n+normal[i]*offset);let angle=-Math.atan2(dy,dx)*180/Math.PI;if(angle>90)angle-=180;if(angle< -90)angle+=180;const tx=(a[0]+b[0])/2+normal[0]*font*.6,ty=-((a[1]+b[1])/2+normal[1]*font*.6);
  const tick=q=>line([q[0]-font*.18,q[1]-font*.18],[q[0]+font*.18,q[1]+font*.18]);
  svg+=line(a,b)+line(e.a,a)+line(e.b,b)+tick(a)+tick(b)+`<text x="${tx}" y="${ty}" font-size="${font}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${angle} ${tx} ${ty})">${num(e.length)}</text>`;
 }
 for(let i=0;i<p.length;i++){const o=p[i],prev=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length],a=result.angles[i].rays[0],b=result.angles[i].rays[1],la=Math.hypot(...a),lb=Math.hypot(...b),r=Math.min(radius,la*.25,lb*.25),u=a.map(n=>n/la),w=b.map(n=>n/lb),bis=[u[0]+w[0],u[1]+w[1]],bl=Math.hypot(...bis),start=[o[0]+u[0]*r,-o[1]-u[1]*r],end=[o[0]+w[0]*r,-o[1]-w[1]*r],tx=o[0]+bis[0]/bl*r*1.65,ty=-o[1]-bis[1]/bl*r*1.65;
  svg+=`<path d="M ${start.join(' ')} A ${r} ${r} 0 0 ${u[0]*w[1]-u[1]*w[0]<0?1:0} ${end.join(' ')}" fill="none" stroke="#a85636" stroke-width=".7" vector-effect="non-scaling-stroke"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-size="${font*.8}">${result.angles[i].id} ${num(result.angles[i].degrees)}°</text>`;
 }
 return svg+'</g>';
}
function faceSvg(m,v,standalone=false){
 const b=v.bounds,w=b[2]-b[0],h=b[3]-b[1],unit=Math.max(w/65,h/10,1),pad=unit*5;
 const box=[b[0]-pad,-b[3]-pad*1.7,w+2*pad,h+pad*(3+Math.min(v.features.length,8)*.65)];
 const line=(a,b,cls='')=>`<line x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" class="${cls}"/>`;
 const label=(x,y,value,color='#40525a')=>`<text x="${x}" y="${-y}" fill="${color}" font-size="${unit}" text-anchor="middle">${esc(value)}</text>`;
 const dim=(x1,x2,y,labelText)=>line([x1,y],[x2,y],'dim')+line([x1,y-unit*.3],[x1,y+unit*.3],'dim')+line([x2,y-unit*.3],[x2,y+unit*.3],'dim')+label((x1+x2)/2,y+unit*.5,labelText);
 let content=label((b[0]+b[2])/2,b[3]+pad*1.25,`${m.name} / ${v.id} / mm`)+v.lines.map(e=>line(e.a,e.b,e.hidden?'hidden':'visible')).join('');
 if(showContacts)for(const c of v.contacts??[])for(const loop of c.loops){content+=`<polyline points="${loop.map(p=>p[0]+','+(-p[1])).join(' ')}" fill="none" stroke="#963b9d" stroke-width="1.5" stroke-dasharray="8 3 2 3" vector-effect="non-scaling-stroke"><title>${esc(c.id+' / '+c.partnerId+' / '+num(c.area)+' mm²')}</title></polyline>`;}
 content+=dim(b[0],b[2],b[3]+unit*2,num(w));
 content+=line([b[0]-unit*2,b[1]],[b[0]-unit*2,b[3]],'dim')+label(b[0]-unit*3,(b[1]+b[3])/2,num(h));
 for(let i=0;i<v.features.length;i++){
   const f=v.features[i],fb=f.bounds,y=b[1]-unit*(2+i*3);
   content+=dim(fb[0],fb[2],y,`${f.label}: ${num(fb[2]-fb[0])}`);
   content+=label((fb[0]+fb[2])/2,y-unit*1.3,`${t('location')} Z=${num(f.zRange[0])}${f.opensOnFace?' / '+t('depth')+' '+num(f.depth):''}`);
   content+=featureAnnotations(v,f);
   if(!standalone)content+=`<rect data-feature="${i}" x="${fb[0]-unit/3}" y="${-fb[3]-unit/3}" width="${Math.max(fb[2]-fb[0],unit)+unit*2/3}" height="${Math.max(fb[3]-fb[1],unit)+unit*2/3}" fill="transparent" stroke="#ad8745" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" style="cursor:zoom-in"/>`;
 }
 content+=label((b[0]+b[2])/2,b[1]-unit*(4+v.features.length*3),t('datum'));
 if(showContacts&&(v.contacts??[]).length)content+=label((b[0]+b[2])/2,b[1]-unit*(5.5+v.features.length*3),t('contactLegend'),'#963b9d');
 box[3]=Math.max(box[3],h+pad*2.7+unit*(6+v.features.length*3));
 return {box,body:content,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" width="1200" height="${Math.max(260,1200*box[3]/box[2])}" role="img" aria-label="${esc(m.name+' '+v.id)}"><style>line{stroke:#263c44;stroke-width:1;vector-effect:non-scaling-stroke}line.hidden{stroke:#84939a;stroke-dasharray:5 4;stroke-width:.7}line.dim{stroke:#7b8588;stroke-width:.65}.feature-annotations line{stroke:#a85636;stroke-width:.7}text{font-family:Arial,sans-serif}</style>${content}</svg>`};
}
function allSvg(m,interactive=false){const rows=m.drawings.views.map((v,i)=>{const p=faceSvg(m,v,true),x=(i%2)*800,y=Math.floor(i/2)*360;return `<svg x="${x+12}" y="${y+12}" width="776" height="336" viewBox="${p.box.join(' ')}">${p.svg.slice(p.svg.indexOf('<style>'),p.svg.lastIndexOf('</svg>'))}</svg>${interactive?`<rect data-sheet-face="${i}" x="${x+12}" y="${y+12}" width="776" height="336" fill="transparent" stroke="#d7dfd9" style="cursor:zoom-in"/>`:''}`;});return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1080" viewBox="0 0 1600 1080"><rect width="100%" height="100%" fill="white"/>${rows.join('')}</svg>`;}

function detailSvg(m,v,index){
 const f=v.features[index],b=f.bounds,pad=Math.max((b[2]-b[0])*.4,(b[3]-b[1])*.6,10);
 const box=[b[0]-pad,-b[3]-pad,b[2]-b[0]+2*pad,b[3]-b[1]+2*pad];
 const drawing=faceSvg(m,v,true);const style=drawing.svg.slice(drawing.svg.indexOf('<style>'),drawing.svg.indexOf('</style>')+8);
 const coords=f.localCorners.map((p,i)=>`<text x="840" y="${145+i*22}" font-size="14">P${i+1}   ${p.map(num).join(' / ')}</text>`).join('');
 const height=Math.max(650,175+f.localCorners.length*22);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">${style}<rect width="100%" height="100%" fill="white"/><text x="30" y="35" font-size="22">${esc(m.name)} / ${v.id} / ${esc(f.label)}</text><text x="30" y="65" font-size="16">${esc(t('location'))}: ${num(f.zRange[0])} mm · ${esc(t('span'))}: ${num(f.zRange[1]-f.zRange[0])} mm${f.opensOnFace?' · '+esc(t('depth'))+': '+num(f.depth)+' mm':''}</text><svg x="25" y="95" width="790" height="510" viewBox="${box.join(' ')}">${drawing.body}</svg><text x="840" y="110" font-size="14">X / Y / Z (mm)</text>${coords}</svg>`;
}
function printHtml(m,detail=null,sheet=false){
 const pages=sheet?[{svg:allSvg(m),note:t('sheetHelp')}]:m.drawings.views.map(v=>({svg:faceSvg(m,v,true).svg,note:t(v.endView?'endFilter':'sideFilter')}));
 if(detail)pages.push({svg:detailSvg(m,m.drawings.views[detail.face],detail.feature),note:t('coordinates')});
 return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(m.name)}</title><style>@page{size:A3 landscape;margin:12mm}body{margin:0;font-family:Arial,sans-serif}section{break-after:page}section:last-child{break-after:auto}section>svg{display:block;width:100%;height:235mm}p{font-size:12px}</style></head><body>${pages.map(p=>`<section>${p.svg}<p>${esc(t('datum'))} · ${esc(p.note)} · ${esc(t('fitPrint'))}</p></section>`).join('')}</body></html>`;
}
export {faceSvg,allSvg,detailSvg,printHtml,featureMeasurements,featureAnnotations,esc,num};
