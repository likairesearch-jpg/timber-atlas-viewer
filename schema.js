export function validateAssembly(data) {
  const fail = message => { throw new Error(message); };
  if (data?.schema !== 'timber-assembly' || data.schemaVersion !== '1.0') fail('不支持的数据格式。请使用 09 Export Assembly 导出的 v1.0 JSON。');
  if (!['exact-intersection','exact-intersection-with-optional-plane-trim'].includes(data.contactPolicy)) fail('这是未包含严格贴合检查的旧数据，请使用新版 GH 插件重新导出。');
  if (data.units !== 'mm') fail('当前分析器只接受明确标记为 mm 的数据。');
  if (!Array.isArray(data.members) || !Array.isArray(data.joints)) fail('缺少构件或节点列表。');
  if (data.members.length > 10000 || data.joints.length > 50000) fail('文件超过 prototype 的模型规模限制。');
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const vector = v => Array.isArray(v) && v.length === 3 && v.every(finite);
  function mesh(m) {
    if (!m || !Array.isArray(m.vertices) || !Array.isArray(m.triangles)) fail('缺少显示网格。');
    if (!m.vertices.every(vector)) fail('网格包含无效坐标。');
    if (!m.triangles.every(t => Array.isArray(t) && t.length === 3 && t.every(i => Number.isInteger(i) && i >= 0 && i < m.vertices.length))) fail('网格面索引无效。');
  }
  const ids = new Set(), names = new Set(), joints = new Set();
  for (const m of data.members) {
    if (typeof m.id !== 'string' || ids.has(m.id)) fail('构件 ID 缺失或重复。');
    if (typeof m.name !== 'string' || names.has(m.name)) fail('构件编号缺失或重复。');
    if (typeof m.group !== 'string' || !Array.isArray(m.jointIds)) fail('构件分组或节点引用无效。');
    ids.add(m.id); names.add(m.name);
    if (![m.length, m.section?.width, m.section?.height].every(n => finite(n) && n > 0)) fail('构件尺寸无效。');
    if (!Array.isArray(m.axis) || m.axis.length !== 2 || !m.axis.every(vector)) fail('构件轴线无效。');
    if (!m.frame || ![m.frame.origin,m.frame.x,m.frame.y,m.frame.normal].every(vector)) fail('构件局部坐标无效。');
    mesh(m.stockMesh); mesh(m.finishedMesh);
    if(m.measurement)for(const mode of ['stock','finished']){
      const g=m.measurement[mode];
      if(g?.source!=='brep-linear-edges'||!Array.isArray(g.edges)||g.edges.length>100000||!g.edges.every(e=>[e.a,e.b,e.midpoint].every(vector)))fail('Invalid exact measurement edges.');
    }
    if(m.drawings){
      const d=m.drawings,box=b=>Array.isArray(b)&&b.length===4&&b.every(finite)&&b[2]>b[0]&&b[3]>b[1];
      if(d.coordinateConvention!=='Z-longitudinal'||![d.origin,d.x,d.y,d.z].every(vector)||!Array.isArray(d.views)||d.views.length!==6)fail('Invalid drawing coordinate frame.');
      if(new Set(d.views.map(v=>v.id)).size!==6||!d.views.every(v=>['+X','-X','+Y','-Y','+Z','-Z'].includes(v.id)))fail('Invalid six-face identifiers.');
      for(const v of d.views){
        if(!box(v.bounds)||![v.viewFrom,v.horizontal,v.vertical].every(vector)||!Array.isArray(v.lines)||v.lines.length>100000||!Array.isArray(v.features))fail('Invalid drawing view.');
        for(const e of v.lines)if(![e.a,e.b].every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))||typeof e.hidden!=='boolean')fail('Invalid drawing line.');
        for(const f of v.features)if(!m.jointIds.includes(f.id)||typeof f.label!=='string'||!box(f.bounds)||!Array.isArray(f.zRange)||f.zRange.length!==2||!f.zRange.every(finite)||!finite(f.depth)||f.depth<0||!Array.isArray(f.localCorners)||!f.localCorners.every(vector))fail('Invalid drawing feature.');
      }
    }
  }
  const contacts=new Set();
  for(const c of data.contacts??[]){if(typeof c.id!=='string'||contacts.has(c.id)||!Array.isArray(c.members)||c.members.length!==2||c.members[0]===c.members[1]||!c.members.every(id=>ids.has(id))||!finite(c.area)||c.area<=0||!['direct','machined'].includes(c.source)||!Array.isArray(c.loops)||!c.loops.every(loop=>Array.isArray(loop)&&loop.length>=4&&loop.every(vector)))fail('Invalid contact region.');contacts.add(c.id);mesh(c.mesh);}
  for(const m of data.members)for(const v of m.drawings?.views??[])for(const c of v.contacts??[]){if(!contacts.has(c.id)||!ids.has(c.partnerId)||!Array.isArray(c.loops)||!c.loops.every(loop=>Array.isArray(loop)&&loop.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))))fail('Invalid drawing contact.');}
  const trims=new Set();
  for(const p of data.planeTrims??[]){
    if(typeof p.id!=='string'||trims.has(p.id)||!ids.has(p.memberId)||!['trimmed','removed'].includes(p.status)||!finite(p.removedVolume)||p.removedVolume<=0||!p.plane||![p.plane.origin,p.plane.x,p.plane.y,p.plane.normal].every(vector))fail('Invalid plane trim record.');
    trims.add(p.id);mesh(p.removedMesh);
  }
  for(const m of data.members)for(const id of m.trimIds??[])if(!trims.has(id)||!data.planeTrims.some(p=>p.id===id&&p.memberId===m.id))fail('Invalid member trim reference.');
  for (const j of data.joints) {
    if (typeof j.id !== 'string' || joints.has(j.id)) fail('节点 ID 缺失或重复。');
    joints.add(j.id);
    if (!Array.isArray(j.members) || j.members.length !== 2 || j.members[0] === j.members[1] || !j.members.every(id => ids.has(id))) fail('节点引用了不存在或重复的构件。');
    mesh(j.intersectionMesh);
    if (!['ok','failed'].includes(j.status)) fail('节点状态无效。');
    if(j.previewTimbers!=null){if(!Array.isArray(j.previewTimbers)||j.previewTimbers.length!==2||new Set(j.previewTimbers.map(p=>p.memberId)).size!==2)fail('Invalid diagnostic preview.');for(const p of j.previewTimbers){if(!j.members.includes(p.memberId))fail('Invalid preview member.');mesh(p.mesh);}}
    if(j.attempts!=null){if(!Array.isArray(j.attempts)||j.attempts.length>1000)fail('Invalid motion attempts.');for(const a of j.attempts){if(!j.members.includes(a.movingMember)||!j.members.includes(a.fixedMember)||a.movingMember===a.fixedMember||!vector(a.withdrawal)||typeof a.clear!=='boolean'||typeof a.source!=='string')fail('Invalid motion attempt.');if(!a.clear&&(!vector(a.collisionPoint)||![a.collisionStart,a.collisionEnd,a.collisionDistance].every(n=>finite(n)&&n>=0)||a.collisionEnd<=a.collisionStart||a.collisionDistance<a.collisionStart||a.collisionDistance>a.collisionEnd))fail('Invalid collision interval.');}}
    if(j.cuts!=null){if(!Array.isArray(j.cuts)||j.cuts.length!==2)fail('Invalid cuts.');for(const c of j.cuts){if(!j.members.includes(c.memberId)||!finite(c.removedVolume)||!finite(c.extraVolume))fail('Invalid cut record.');mesh(c.mesh);mesh(c.extraMesh);}}
    if (j.status === 'ok') {
      if (!finite(j.checks?.contactArea) || j.checks.contactArea <= 0 || !finite(j.checks?.partitionErrorVolume)) fail('缺少有效的贴合检查。');
      if (!j.splitPlane || ![j.splitPlane.origin,j.splitPlane.x,j.splitPlane.y,j.splitPlane.normal,j.insertionDirection].every(vector)) fail('节点方向或分割平面无效。');
      if (!j.members.includes(j.movingMember) || !Array.isArray(j.cuts) || j.cuts.length !== 2) fail('节点加工记录不完整。');
      for (const c of j.cuts) { if (!j.members.includes(c.memberId)) fail('切口构件引用无效。'); mesh(c.mesh);mesh(c.extraMesh); }
    }
    for (const id of j.members) if (!data.members.find(m => m.id === id).jointIds.includes(j.id)) fail('节点与构件之间的引用不一致。');
  }
  for (const m of data.members) for (const id of m.jointIds) if (!joints.has(id) || !data.joints.find(j => j.id === id).members.includes(m.id)) fail('构件包含无效的节点引用。');
  for(const m of data.members) {
    const d=m.drawings;if(!d||d.version!=='1.0')continue;
    for(const v of d.views.filter(v=>v.id==='+X'||v.id==='-Y')){
      const mirror=b=>[-b[2],b[1],-b[0],b[3]];
      v.horizontal=v.horizontal.map(n=>-n);v.bounds=mirror(v.bounds);
      for(const e of v.lines){e.a=[-e.a[0],e.a[1]];e.b=[-e.b[0],e.b[1]];}
      for(const f of v.features)f.bounds=mirror(f.bounds);
    }
    d.version='1.1';
  }
  if(data.assemblyAnalysis!=null){
    const a=data.assemblyAnalysis;
    if(a.version!=='1.0'||!finite(a.travel)||a.travel<=0||!Array.isArray(a.pairDirections))fail('Invalid assembly analysis.');
    for(const mode of ['ground','freeSpace']){
      const plan=a[mode];
      if(!plan||typeof plan.complete!=='boolean'||!Array.isArray(plan.disassembly)||!Array.isArray(plan.locked))fail('Invalid assembly sequence.');
      const listed=new Set();
      for(const step of plan.disassembly){
        if(!names.has(step.name)||listed.has(step.name)||!vector(step.withdrawal)||Math.abs(Math.hypot(...step.withdrawal)-1)>1e-6)fail('Invalid assembly step.');
        listed.add(step.name);
      }
      for(const name of plan.locked){if(!names.has(name)||listed.has(name))fail('Invalid locked member.');listed.add(name);}
      const retained=data.members.filter(m=>m.processingStatus!=='removed').length;
      if(listed.size!==retained||(plan.complete&&plan.locked.length))fail('Incomplete assembly coverage.');
    }
    for(const c of a.pairDirections)if(!names.has(c.moving)||!vector(c.withdrawal)||!Array.isArray(c.blockers)||!c.blockers.every(n=>names.has(n))||!Array.isArray(c.hits)||!c.hits.every(h=>finite(h.distance)&&h.distance>=0&&vector(h.point)))fail('Invalid assembly collision diagnostic.');
  }
  return data;
}
