export let language=localStorage.getItem('timber-language')||'zh';
if(!['zh','ja','en'].includes(language))language='zh';
const words={
 contactUnavailable:['尚无有效接触分析数据','有効な接触解析データなし','Contact analysis unavailable'],
 contactLegend:['紫色点划线：接触区域（非加工线）','紫色一点鎖線：接触領域（加工線ではない）','Purple dash-dot: contact regions (not cutting lines)'],
 contacts:['接触区域','接触領域','Contact regions'],direct:['直接贴合','直接接触','Direct contact'],machined:['加工后贴合','加工後接触','Machined contact'],noContacts:['无面接触区域','面接触なし','No face contact'],contactFailed:['接触分析失败，查看诊断','接触解析失敗','Contact analysis failed; check diagnostics'],
 family:['连接规则','接合ルール','Connection rule'],Lap:['搭接','相欠き','Lap'],ThroughHole:['贯穿孔','貫通穴','Through hole'],ThroughAxis:['沿穿入构件轴线','挿入部材の軸方向','Along passing member axis'],
 continuousClear:['此节点的固定姿态连续平移检查通过；整体顺序请查看装配步骤。','この接合部の固定姿勢・連続移動を検証。全体の順序は組立手順を参照。','Pairwise fixed-orientation translation checked; see Assembly steps for the whole-model plan.'],
 diagnosticPreview:['诊断预览：显示试切构件在碰撞位置的状态，不是可加工结果。','診断表示：仮加工部材の衝突位置。加工確定結果ではありません。','Diagnostic preview: trial-cut members at the collision position, not a fabrication result.'],
 probeMember:['测试移动构件（分离方向）','試行移動部材（引抜き方向）','Test moving member (withdrawal)'],
 attempt:['尝试方向','試行方向','Attempted direction'],collisionTravel:['碰撞检查位置','衝突確認位置','Collision probe travel'],blocking:['阻挡构件','干渉する部材','Blocking member'],
 sheet:['六面同页','六面を一枚に','Six faces on one sheet'],sheetHelp:['六面同页：滚轮缩放、拖动平移、双击某面放大；此模式打印为一页。','六面を一枚に表示。ホイールでズーム、ドラッグで移動、面をダブルクリックで詳細。一ページで印刷。','Six faces on one sheet: wheel to zoom, drag to pan, double-click a face for detail. Prints as one page.'],projectedMeasurements:['橙色标注：切口投影边长与夹角；槽口角度标在木材一侧（非三维二面角）。','橙色寸法：切欠きの投影辺長と角度（開口部は木材側）（3D 二面角ではありません）。','Orange annotations: projected cut-edge lengths and angles; opening angles are on the material side (not 3D dihedral angles).'],edge:['边','辺','Edge'],corner:['角点','頂点','Corner'],
 appTitle:['Timber Atlas · 木构件分析器','Timber Atlas · 木部材ビューア','Timber Atlas · Timber analyzer'],sampleLabel:['示例模型','サンプルモデル','Sample model'],searchLabel:['搜索构件','部材を検索','Search timbers'],statsLabel:['项目统计','プロジェクト統計','Project statistics'],modeLabel:['显示模式','表示モード','Display mode'],
 fitPrint:['适合页面 / mm；非固定打印比例','ページに合わせる / mm（縮尺固定ではありません）','Fit to page / mm; not a fixed print scale'],
 assemblyView:['装配视图','組立ビュー','ASSEMBLY VIEW'],layoutView:['平铺视图','展開ビュー','LAYOUT VIEW'],stockView:['原材视图','素材ビュー','STOCK VIEW'],jointView:['节点查看','接合部ビュー','JOINT INSPECTION'],
 sampleError:['示例不可用，请导入 GH 导出的 JSON。','サンプルを開けません。GH の JSON を読み込んでください。','Sample unavailable. Import a JSON exported from GH.'],fileSize:['文件超过 100 MB。','ファイルが 100 MB を超えています。','File exceeds 100 MB.'],
 members:['构件','部材','Members'],groups:['分组','グループ','Groups'],joints:['节点','接合部','Joints'],issues:['失败节点','未処理の接合部','Failed joints'],
 overview:['装配概览','組立概要','Assembly overview'],overviewHelp:['选择木料查看尺寸与连接，选择节点查看切口。','部材を選んで寸法と接合部を確認できます。','Select a timber for dimensions and connections, or a joint to inspect cuts.'],
 mode:['方向模式','挿入方向モード','Direction mode'],split:['分割位置 x','分割位置 x','Split position x'],angles:['槽壁与槽底夹角','側壁と底面の角度','Wall / floor angle'],area:['共同接触面积','共通接触面積','Shared contact area'],source:['方向来源','方向の基準','Direction source'],extra:['额外去料','追加除去','Extra removal'],
 connected:['连接的木料','接続部材','Connected timbers'],cuts:['切口记录','加工記録','Cut records'],view:['查看','表示','View'],focus:['放大切口','接合部を拡大','Focus joint'],ok:['几何检查通过','形状検証済み','Geometry checks passed'],failed:['未完成切割','加工未完了','Processing incomplete'],
 trimReview:['连接构件经过平面切除；以下装配检查基于切除前的连接，需重新核对。','接合部材に平面切断あり。組立検証は切断前の接合形状に基づきます。','Connected members have plane trims. Motion checks below describe the pre-trim joint; review the trimmed connection.'],
 planeTrim:['平面切除','平面切断','Plane trim'],fullyRemoved:['已被平面规则完全切除；原材记录保留。','平面ルールにより全体を除去。素材情報は保持。','Fully removed by plane trim; stock record retained.'],
 width:['截面宽度','断面幅','Section width'],height:['截面高度','断面高さ','Section height'],length:['轴线长度','軸線長さ','Axis length'],roll:['截面旋转','断面回転','Section roll'],stockVolume:['原材体积','素材体積','Stock volume'],finishedVolume:['加工后体积','加工後体積','Finished volume'],removed:['去料体积','除去体積','Removed volume'],
 noJoints:['没有连接节点','接合部なし','No joints'],notMeasured:['未测量','未計測','Not measured'],moving:['插入的构件','挿入する部材','Moving member'],sampled:['个位置通过插入采样；未验证连续运动或整体施工顺序。','位置で干渉なし。連続動作・全体の施工順序は未検証。','sample positions clear; continuous motion and global sequence are not certified.'],
 WorldZ:['世界 Z','ワールド Z','World Z'],ClosestPoints:['最近点方向','最近点方向','Closest points'],Auto:['自动选择','自動選択','Automatic'],Custom:['自定义向量','指定ベクトル','Custom vector'],
 drawing:['六面图纸','六面図','Six-face drawings'],back:['返回三维','3D に戻る','Back to 3D'],fit:['适合窗口','全体表示','Fit view'],svg:['导出当前面 SVG','この面を SVG 出力','Export face SVG'],allSvg:['导出六面 SVG','六面を SVG 出力','Export six-face SVG'],pdf:['打印 / 保存 PDF','印刷 / PDF 保存','Print / Save PDF'],
 drawingHelp:['滚轮缩放 · 拖动平移 · 点击虚框放大切口；尺寸单位 mm，角度为本视图投影角。','ホイールでズーム・ドラッグで移動・枠を選んで詳細表示。mm、角度は投影角。','Wheel to zoom · drag to pan · click a feature frame for detail. Dimensions in mm; angles are projected view angles.'],
 missingDrawing:['旧数据不含六面图，请从新版 GH 重新导出。','六面図データがありません。新版 GH から再出力してください。','This export has no drawings. Re-export using the new GH plugin.'],
 endFilter:['端面只显示与当前端相连的加工','端部に接続する加工のみ表示','End view: only machining connected to this end'],sideFilter:['长侧面：显示相关可见边和隐藏边','側面：可視線と隠線を表示','Long side: visible and hidden edges'],datum:['局部 Z 为长度，起点 Z=0','ローカル Z が長手方向、始点 Z=0','Local Z is length; start datum Z=0'],depth:['深度','深さ','Depth'],location:['起点距离','始点から','From start'],span:['投影范围','投影範囲','Projected span'],coordinates:['局部角点坐标 / mm','局所頂点座標 / mm','Local corner coordinates / mm'],
 waiting:['等待 GH 数据','GH データ待ち','Waiting for GH'],live:['同步中','同期中','Live'],paused:['已暂停同步','同期停止','Sync paused'],error:['同步失败，显示数据可能已过期','同期エラー・表示は古い可能性あり','Sync failed; displayed data may be stale'],updating:['更新中','更新中','Updating'],disconnected:['连接中断，显示数据可能已过期','接続切断・表示は古い可能性あり','Disconnected; displayed data may be stale'],
 loaded:['已读取','読み込み済み','Loaded'],importFailed:['载入失败；保留此前模型。','読み込み失敗。直前のモデルを保持。','Load failed; previous model retained.'],stock:['原材','素材','Stock'],finished:['加工后','加工後','Finished'],layout:['平铺','展開','Layout'],
 incomplete:['整体切割未完成，显示原材；选中失败节点可查看试切与碰撞诊断。','全体の加工は未完了。素材を表示。失敗した接合部を選択して衝突診断を確認。','Processing incomplete: stocks are shown; select a failed joint for trial cuts and collision diagnostics.'],scope:['几何分析原型；装配步骤仅验证有限方向的固定姿态直线移动，不验证结构承载或施工稳定性。','形状確認用。組立手順は有限方向・固定姿勢の直線移動のみ検証し、耐力・施工安定性は未検証。','Geometry prototype; assembly plans cover finite fixed-orientation translation directions, not structural capacity or construction stability.']
};
export function t(key){return words[key]?.[['zh','ja','en'].indexOf(language)]??key;}
const staticWords={
 '平行与端部连接 · 接触区域':['平行・端部接合と接触領域','Parallel / end joints and contacts'],
 '接触区域':['接触領域','Contact regions'],
 '旋转 13° · Auto 修复':['13° 回転 · Auto 修正','Roll 13° · Auto fixed'],
 '旋转 13° · 碰撞诊断':['13° 回転 · 衝突診断','Roll 13° · Collision diagnosis'],
 '贯穿孔 · 粗木与细木':['貫通穴 · 太材と細材','Through hole · Host and passing member'],
 '混合连接 · 槽口与贯穿孔':['混合接合 · 切欠きと貫通穴','Mixed joints · Lap and through hole'],
 '平面切除 · 地面与倾斜木料':['平面切断 · 地面と傾斜部材','Plane trim · Ground and inclined timber'],
 'GH 导出 · 多节点 / 自动方向':['GH · 複数接合 / 自動','GH · Multiple joints / Auto'],
 'GH 导出 · 当前 Rhino 交叉 / 自动方向':['GH · Rhino の交差 / 自動','GH · Rhino pair / Auto'],
 'GH 导出 · 倾斜 / 自动方向':['GH · 傾斜 / 自動','GH · Inclined / Auto'],
 'GH 导出 · 截面相容 / 最近点方向':['GH · 断面整合 / 最近点','GH · Aligned sections / Closest points'],
 'GH 导出 · 轴线相交':['GH · 軸線が交差','GH · Intersecting axes'],
 '倾斜 · 世界 Z':['傾斜 · ワールド Z','Inclined · World Z'],
 '双倾斜 · 自动方向':['両部材が傾斜 · 自動','Both inclined · Auto'],
 '诊断 · 含不支持节点':['診断 · 未対応接合あり','Diagnostic · Unsupported joints'],
 '木构件 · 连接 · 装配':['木部材・接合・組立','Timbers · joints · assembly'], '打开示例':['サンプルを開く','Open sample'],'导入 JSON':['JSON 読込','Import JSON'],
 '构件 / MEMBERS':['部材 / MEMBERS','MEMBERS'],'分组 / GROUPS':['グループ / GROUPS','GROUPS'],'连接 / JOINTS':['接合 / JOINTS','JOINTS'],'失败节点 / ISSUES':['未処理 / ISSUES','ISSUES'],'坐标与单位':['座標と単位','Coordinates & units'],'原始装配坐标':['元の組立座標','Assembly coordinates'],
 '构件目录':['部材一覧','Timber library'],'固定模型快照 · 公开链接':['固定モデル・公開リンク','Fixed snapshot · public link'], '加工后':['加工後','Finished'],'原材':['素材','Stock'],'平铺':['展開','Layout'],'全景':['全体表示','Overview'],'编号':['部材名','Labels'],
 '仅显示所选构件 / 节点':['選択部材・接合部のみ','Isolate selection'],'去料':['除去部分','Cuts'],'额外去料':['追加除去','Extra removal'],'分割平面':['分割平面','Split plane'],'拆开':['分離','Explode'],
 '所选构件':['選択部材','Selected timber'],'连接构件':['接続部材','Partner'],'去料体':['除去体','Removed material'],'拆开显示只作用于所选节点，不改变模型坐标。':['分離表示はモデル座標を変更しません。','Exploded display does not modify model coordinates.'],
 '信息面板':['情報','Inspector'],'范围与检查说明':['範囲と検証','Scope & checks'],'拖动旋转 · 滚轮缩放 · 右键平移 · 点击选取':['ドラッグで回転・ホイールでズーム・右ドラッグで移動','Drag to orbit · wheel to zoom · right drag to pan · click to select']
};
const originals=new Map();
export function initStatic(){const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(staticWords[n.textContent.trim()])originals.set(n,n.textContent.trim());}applyStatic();}
export function applyStatic(){for(const [node,key] of originals)node.textContent=language==='zh'?key:staticWords[key][language==='ja'?0:1];document.documentElement.lang=language;document.title=t('appTitle');
 document.getElementById('sample').setAttribute('aria-label',t('sampleLabel'));document.getElementById('search').setAttribute('aria-label',t('searchLabel'));document.querySelector('.stats').setAttribute('aria-label',t('statsLabel'));document.querySelector('.segmented').setAttribute('aria-label',t('modeLabel'));
 document.getElementById('search').placeholder=language==='zh'?'搜索编号或分组…':language==='ja'?'部材名・グループ検索…':'Search name or group…';
 document.getElementById('processing-warning').textContent=t('incomplete');}
export function setLanguage(value){language=value;localStorage.setItem('timber-language',value);applyStatic();}
