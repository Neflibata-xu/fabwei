import { useState, useEffect, useRef } from "react";

// ── 存储：localStorage，刷新不丢数据 ──
const LS = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const THEMES = {
  '暖米': { bg:'#f4f0e8', paper:'#faf8f4', card:'#fefcf8', border:'#ccc4b5', borderL:'#e5ddd0', acc:'#8b6f4e', accBg:'rgba(139,111,78,0.1)', text:'#2c2825', textM:'#5c5450', textL:'#9a9490', ok:'#4a6b5a', okBg:'rgba(74,107,90,0.1)', okBd:'rgba(74,107,90,0.25)', ng:'#7a6e5f', ngBg:'rgba(122,110,95,0.1)', ngBd:'rgba(122,110,95,0.25)', heart:'#b85050' },
  '青瓷': { bg:'#edf2ed', paper:'#f5f8f5', card:'#f9fbf9', border:'#b5c8b8', borderL:'#d2e0d5', acc:'#4a6b58', accBg:'rgba(74,107,88,0.1)', text:'#252c25', textM:'#4e5e50', textL:'#8a9888', ok:'#3d5a75', okBg:'rgba(61,90,117,0.1)', okBd:'rgba(61,90,117,0.25)', ng:'#6a7a68', ngBg:'rgba(106,122,104,0.1)', ngBd:'rgba(106,122,104,0.25)', heart:'#b85050' },
  '月白': { bg:'#edf0f5', paper:'#f5f7fb', card:'#f9fbfd', border:'#b5c0d0', borderL:'#d2d8e8', acc:'#3d5878', accBg:'rgba(61,88,120,0.1)', text:'#242830', textM:'#4e5260', textL:'#888ea0', ok:'#4a6b58', okBg:'rgba(74,107,88,0.1)', okBd:'rgba(74,107,88,0.25)', ng:'#686e80', ngBg:'rgba(104,110,128,0.1)', ngBd:'rgba(104,110,128,0.25)', heart:'#b85050' },
  '杏仁': { bg:'#f6f2ec', paper:'#faf8f4', card:'#fdfaf7', border:'#c5bdb0', borderL:'#e2d8cc', acc:'#7a5e48', accBg:'rgba(122,94,72,0.1)', text:'#2c2820', textM:'#5c5248', textL:'#988e84', ok:'#4a6b58', okBg:'rgba(74,107,88,0.1)', okBd:'rgba(74,107,88,0.25)', ng:'#7a7268', ngBg:'rgba(122,114,104,0.1)', ngBd:'rgba(122,114,104,0.25)', heart:'#b85050' },
  '烟紫': { bg:'#f1edf5', paper:'#f8f5fb', card:'#fbf9fd', border:'#bdb0cc', borderL:'#d8d0e8', acc:'#685078', accBg:'rgba(104,80,120,0.1)', text:'#282430', textM:'#584858', textL:'#8e8498', ok:'#4a6b58', okBg:'rgba(74,107,88,0.1)', okBd:'rgba(74,107,88,0.25)', ng:'#706878', ngBg:'rgba(112,104,120,0.1)', ngBd:'rgba(112,104,120,0.25)', heart:'#b85050' },
};

const TEXTURES = {
  '纯净': { img:'', sz:'' },
  '点阵': { img:'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)', sz:'10px 10px' },
  '斜纹': { img:'repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(0,0,0,0.035) 6px,rgba(0,0,0,0.035) 7px),repeating-linear-gradient(-45deg,transparent,transparent 6px,rgba(0,0,0,0.035) 6px,rgba(0,0,0,0.035) 7px)', sz:'' },
  '云纹': { img:'radial-gradient(ellipse at 20% 30%,rgba(0,0,0,0.05) 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,rgba(0,0,0,0.04) 0%,transparent 50%)', sz:'' },
  '格纹': { img:'repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(0,0,0,0.065) 19px,rgba(0,0,0,0.065) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(0,0,0,0.05) 19px,rgba(0,0,0,0.05) 20px)', sz:'' },
  '竖线': { img:'repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(0,0,0,0.065) 23px,rgba(0,0,0,0.065) 24px)', sz:'' },
};

const TAG_COLORS = ['#8b6f4e','#4a6b5a','#3d5a75','#685078','#8b5050','#506b4a','#4a5a7a','#7a6040','#5a6878','#7a4858'];
const DEFAULT_TAGS = [
  {name:'日常',color:'#8b6f4e'},{name:'亲密',color:'#8b5050'},{name:'搞笑',color:'#4a6b5a'},
  {name:'角色扮演',color:'#3d5a75'},{name:'平行宇宙',color:'#685078'},{name:'温情',color:'#7a6040'},
  {name:'悬念张力',color:'#4a5a7a'},{name:'校园',color:'#506b4a'},
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

// ── 解析 txt：识别标题 / 提示词 / 正文 ──
const parseTxt = (raw) => {
  const txt = raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const lines = txt.split('\n');
  const isPS  = l => /^\s*[（(]?\$/.test(l);
  const isSep = l => /^-{3,}\s*$/.test(l.trim());

  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isPS(lines[i])) continue;
    let titleIdx = -1;
    for (let j = i-1; j >= Math.max(0,i-5); j--) {
      const t = lines[j].trim();
      if (!t) continue;
      if (!isPS(t) && !isSep(t) && t.length <= 40) titleIdx = j;
      break;
    }
    starts.push({ promptIdx:i, titleIdx });
  }
  if (!starts.length) return [];

  return starts.map(({ promptIdx, titleIdx }, si) => {
    const nextBound = si < starts.length-1
      ? (starts[si+1].titleIdx >= 0 ? starts[si+1].titleIdx : starts[si+1].promptIdx)
      : lines.length;

    let title = titleIdx >= 0 ? lines[titleIdx].trim() : '';
    const promptLines = [], contentLines = [];
    let inContent = false;

    for (let i = promptIdx; i < nextBound; i++) {
      if (!inContent && isSep(lines[i])) { inContent = true; continue; }
      if (inContent) contentLines.push(lines[i]);
      else promptLines.push(lines[i]);
    }

    const prompt  = promptLines.join('\n').trim();
    const content = contentLines.join('\n').trim();
    const status  = content ? 'written' : 'unwritten';

    if (!title) {
      const m = prompt.slice(0,300).match(/[""「『""]([^""」』""]{2,30})[""」』""]/);
      if (m) title = m[1];
    }
    if (!title) title = '未命名番外';

    return { id:uid(), title, status, tags:[], prompt, content, note:'', favorite:false, createdAt:Date.now() };
  });
};

// ── 读文件，自动检测 UTF-8 / GBK ──
const readFile = (file) => new Promise((resolve) => {
  const tryEnc = (enc) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsText(file, enc);
  });
  tryEnc('utf-8').then(txt => {
    // 如果含乱码特征就改用 GBK
    if (txt.includes('\uFFFD') || /锟/.test(txt)) return tryEnc('gbk');
    return txt;
  }).then(resolve).catch(() => tryEnc('gbk').then(resolve));
});

const Ico = ({ path, size=20, fill=false, style={} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill?"currentColor":"none"}
    stroke={fill?"none":"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={path}/>
  </svg>
);

const IC = {
  back:    "M19 12H5M12 19l-7-7 7-7",
  search:  "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  plus:    "M12 5v14M5 12h14",
  edit:    "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  dl:      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  ul:      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  shuffle: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  check:   "M20 6L9 17l-5-5",
  x:       "M18 6L6 18M6 6l12 12",
  sort:    "M3 6h18M7 12h10M11 18h2",
  list:    "M4 6h16M4 12h16M4 18h10",
  fav:     "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  cog:     "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  note:    "M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  file:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
};

function Toast({ msg, acc, paper }) {
  return <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:acc, color:paper, padding:'8px 20px', borderRadius:20, fontSize:12, letterSpacing:1, zIndex:1000, whiteSpace:'nowrap', fontFamily:"sans-serif", boxShadow:'0 2px 12px rgba(0,0,0,0.18)' }}>{msg}</div>;
}

function Hdr({ th, serif, title, onBack, extra }) {
  return (
    <div style={{ background:th.paper, borderBottom:`0.5px solid ${th.border}`, padding:'13px 16px 10px', position:'sticky', top:0, zIndex:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {onBack && <button onClick={onBack} style={{ background:'transparent', border:'none', padding:4, cursor:'pointer', color:th.textM, display:'flex' }}><Ico path={IC.back} size={22}/></button>}
        <div style={{ flex:1, fontFamily:serif, fontSize:15, fontWeight:500, color:th.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
        {extra}
      </div>
    </div>
  );
}

function Field({ label, children, th, sans }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:7, fontFamily:sans }}>{label}</div>
      {children}
    </div>
  );
}

// ── 详情页 ──
function DetailView({ entry:e, th, tx, serif, sans, onBack, onEdit, onFav, onDelete, StatusBadge, TagChip, toast }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const bg = { minHeight:'100vh', background:th.bg, backgroundImage:tx.img, backgroundSize:tx.sz, paddingBottom:32 };
  return (
    <div style={bg}>
      <Hdr th={th} serif={serif} title={e.title||'无标题'} onBack={onBack} extra={
        <>
          <button onClick={onFav} style={{ background:'transparent', border:'none', padding:4, cursor:'pointer', color:e.favorite?th.heart:th.borderL, display:'flex' }}><Ico path={IC.fav} size={20} fill={e.favorite}/></button>
          <button onClick={onEdit} style={{ background:'transparent', border:'none', padding:4, cursor:'pointer', color:th.textM, display:'flex' }}><Ico path={IC.edit} size={20}/></button>
        </>
      }/>
      <div style={{ padding:'20px 16px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:18 }}>
          <StatusBadge status={e.status}/>
          {e.tags?.map(t=><TagChip key={t} name={t}/>)}
        </div>
        {e.note && <div style={{ background:`${th.acc}0d`, border:`0.5px solid ${th.acc}30`, borderRadius:10, padding:'10px 14px', fontSize:12, color:th.textM, lineHeight:1.7, marginBottom:18, fontFamily:sans }}>{e.note}</div>}
        {e.prompt && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:8, fontFamily:sans }}>提 示 词</div>
            <div style={{ background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:10, padding:'14px', fontSize:13, color:th.textM, lineHeight:1.85, whiteSpace:'pre-wrap', wordBreak:'break-all', fontFamily:sans }}>{e.prompt}</div>
          </div>
        )}
        {e.content && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:8, fontFamily:sans }}>正 文</div>
            <div style={{ background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:10, padding:'14px', fontSize:13, color:th.text, lineHeight:1.95, whiteSpace:'pre-wrap', wordBreak:'break-all', fontFamily:serif }}>{e.content}</div>
          </div>
        )}
        {!confirmDel
          ? <button onClick={()=>setConfirmDel(true)} style={{ width:'100%', padding:'11px', borderRadius:10, background:'transparent', border:`0.5px solid #b8505050`, color:'#b85050', fontSize:12, letterSpacing:1, fontFamily:serif, cursor:'pointer', marginTop:8 }}>删除这篇番外</button>
          : <div style={{ marginTop:8, background:'#b8505010', border:`0.5px solid #b8505040`, borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:12, color:'#b85050', marginBottom:12, fontFamily:sans, textAlign:'center' }}>确定删除《{e.title||'无标题'}》？</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setConfirmDel(false)} style={{ flex:1, padding:'9px', borderRadius:8, background:'transparent', border:`0.5px solid ${th.border}`, color:th.textM, fontSize:12, fontFamily:sans, cursor:'pointer' }}>取消</button>
                <button onClick={onDelete} style={{ flex:1, padding:'9px', borderRadius:8, background:'#b85050', border:'none', color:'#fff', fontSize:12, fontFamily:sans, cursor:'pointer' }}>确认删除</button>
              </div>
            </div>
        }
      </div>
      {toast && <Toast msg={toast} acc={th.acc} paper={th.paper}/>}
    </div>
  );
}

// ── 编辑 / 新建页 ──
function EditView({ init, tags, th, tx, isNew, serif, sans, onSave, onBack }) {
  const [form, setForm] = useState({ title:'', status:'unwritten', tags:[], prompt:'', content:'', note:'', ...init });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const inSt = { background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:8, padding:'10px 14px', fontSize:13, fontFamily:serif, color:th.text, width:'100%', outline:'none', boxSizing:'border-box' };
  const bg = { minHeight:'100vh', background:th.bg, backgroundImage:tx.img, backgroundSize:tx.sz, paddingBottom:32 };
  return (
    <div style={bg}>
      <Hdr th={th} serif={serif} title={isNew?'新建番外':'编辑番外'} onBack={onBack} extra={
        <button onClick={()=>onSave(form)} style={{ background:th.acc, color:th.paper, border:'none', borderRadius:8, padding:'7px 18px', fontSize:12, letterSpacing:1, fontFamily:serif, cursor:'pointer' }}>保存</button>
      }/>
      <div style={{ padding:'20px 16px' }}>
        <Field label="标 题" th={th} sans={sans}><input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="番外标题" style={inSt}/></Field>
        <Field label="状 态" th={th} sans={sans}>
          <div style={{ display:'flex', gap:8 }}>
            {[['unwritten','未写'],['written','已写']].map(([v,l])=>(
              <button key={v} onClick={()=>set('status',v)} style={{ flex:1, padding:'9px', borderRadius:8, fontSize:12, letterSpacing:1, cursor:'pointer', fontFamily:serif, background:form.status===v?th.acc:'transparent', color:form.status===v?th.paper:th.textM, border:`0.5px solid ${form.status===v?th.acc:th.border}` }}>{l}</button>
            ))}
          </div>
        </Field>
        <Field label="标 签" th={th} sans={sans}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {tags.map(tag=>{ const on=form.tags.includes(tag.name); return <button key={tag.name} onClick={()=>set('tags',on?form.tags.filter(t=>t!==tag.name):[...form.tags,tag.name])} style={{ background:on?tag.color:'transparent', color:on?th.paper:tag.color, border:`0.5px solid ${tag.color}55`, borderRadius:16, padding:'4px 12px', fontSize:11, cursor:'pointer', fontFamily:sans }}>{tag.name}</button>; })}
          </div>
        </Field>
        <Field label="提 示 词" th={th} sans={sans}><textarea value={form.prompt} onChange={e=>set('prompt',e.target.value)} placeholder="粘贴或输入提示词" rows={6} style={{ ...inSt, resize:'vertical', lineHeight:1.75, fontFamily:sans }}/></Field>
        <Field label="正 文" th={th} sans={sans}><textarea value={form.content} onChange={e=>set('content',e.target.value)} placeholder="粘贴正文（可选）" rows={6} style={{ ...inSt, resize:'vertical', lineHeight:1.85 }}/></Field>
        <Field label="备 注" th={th} sans={sans}><textarea value={form.note} onChange={e=>set('note',e.target.value)} placeholder="随便写点什么…（可选）" rows={3} style={{ ...inSt, resize:'vertical', lineHeight:1.7, fontFamily:sans }}/></Field>
      </div>
    </div>
  );
}

// ── 导入页（多文件 + 编码检测）──
function ImportView({ th, tx, serif, sans, onImport, onBack }) {
  const [txt, setTxt]           = useState('');
  const [fileNames, setFileNames] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState(0);
  const fileRef = useRef();
  const inSt = { background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:8, padding:'10px 14px', fontSize:12, fontFamily:sans, color:th.text, width:'100%', outline:'none', boxSizing:'border-box' };
  const bg = { minHeight:'100vh', background:th.bg, backgroundImage:tx.img, backgroundSize:tx.sz, paddingBottom:32 };

  useEffect(() => { setPreview(txt.trim() ? parseTxt(txt).length : 0); }, [txt]);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setLoading(true);
    const names = [], txts = [];
    for (const f of Array.from(files)) {
      try { txts.push(await readFile(f)); names.push(f.name); }
      catch { names.push(f.name + ' (读取失败)'); }
    }
    setTxt(prev => (prev ? prev + '\n\n' : '') + txts.join('\n\n'));
    setFileNames(prev => [...prev, ...names]);
    setLoading(false);
  };

  const doImport = () => {
    const news = parseTxt(txt);
    if (!news.length) { alert('未识别到番外。\n\n请确认文件中包含以 $ 开头的提示词行。'); return; }
    onImport(news);
  };

  return (
    <div style={bg}>
      <Hdr th={th} serif={serif} title="导入番外" onBack={onBack}/>
      <div style={{ padding:'20px 16px' }}>
        {/* 上传区 */}
        <div onClick={()=>!loading&&fileRef.current?.click()}
          onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
          onDragOver={e=>e.preventDefault()}
          style={{ border:`1.5px dashed ${th.border}`, borderRadius:12, padding:'28px 16px', textAlign:'center', cursor:'pointer', marginBottom:14, background:th.paper }}>
          <input ref={fileRef} type="file" accept=".txt" multiple style={{ display:'none' }} onChange={e=>handleFiles(e.target.files)}/>
          <Ico path={IC.ul} size={28} style={{ color:th.textL, display:'block', margin:'0 auto 10px' }}/>
          <div style={{ fontSize:13, color:th.textM, fontFamily:sans, marginBottom:4 }}>{loading ? '读取中…' : '点击或拖拽上传 TXT 文件'}</div>
          <div style={{ fontSize:11, color:th.textL, fontFamily:sans }}>支持多选 · 自动识别 UTF-8 / GBK 编码</div>
        </div>

        {/* 已选文件 */}
        {fileNames.length > 0 && (
          <div style={{ marginBottom:12 }}>
            {fileNames.map((n,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:th.ok, fontFamily:sans, marginBottom:3 }}>
                <Ico path={IC.file} size={12}/>{n}
              </div>
            ))}
          </div>
        )}

        {/* 手动粘贴 */}
        <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:8, fontFamily:sans }}>或 直 接 粘 贴</div>
        <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={8}
          placeholder={"粘贴提示词内容\n每个以 $ 开头的段落 = 一篇番外"}
          style={{ ...inSt, resize:'vertical', lineHeight:1.75, marginBottom:12 }}/>

        {/* 格式说明 */}
        <div style={{ fontSize:11, color:th.textL, lineHeight:1.85, fontFamily:sans, background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
          <span style={{ color:th.textM, fontWeight:'500' }}>格式说明</span><br/>
          未写番外：标题行（可选）＋ $ 提示词<br/>
          已写番外：标题行（可选）＋ $ 提示词 ＋ ---（分隔线）＋ 正文<br/>
          同一文件可混合多篇
        </div>

        {/* 预览 */}
        {txt.trim() && (
          <div style={{ fontSize:12, textAlign:'center', marginBottom:12, fontFamily:sans, color:preview>0?th.ok:'#b85050' }}>
            {preview > 0 ? `识别到 ${preview} 篇番外` : '未识别到番外，请检查格式'}
          </div>
        )}

        <button onClick={doImport} disabled={!txt.trim()||loading}
          style={{ width:'100%', padding:'13px', borderRadius:10, background:txt.trim()&&preview>0?th.acc:'transparent', border:`0.5px solid ${th.border}`, color:txt.trim()&&preview>0?th.paper:th.textL, fontSize:13, letterSpacing:1, fontFamily:serif, cursor:txt.trim()&&preview>0?'pointer':'default', transition:'all 0.15s' }}>
          {loading ? '读取中…' : `开始导入${preview>0?' ('+preview+'篇)':''}`}
        </button>
      </div>
    </div>
  );
}

// ── 设置页 ──
function SettingsView({ cfg, th, tx, tags, serif, sans, onUpdateCfg, onUpdateTags, onBack }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const inSt = { background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:8, padding:'8px 12px', fontSize:12, fontFamily:sans, color:th.text, outline:'none', boxSizing:'border-box' };
  const bg = { minHeight:'100vh', background:th.bg, backgroundImage:tx.img, backgroundSize:tx.sz, paddingBottom:32 };
  const addTag = () => { if(!newName.trim()||tags.find(t=>t.name===newName.trim())) return; onUpdateTags([...tags,{name:newName.trim(),color:newColor}]); setNewName(''); };
  return (
    <div style={bg}>
      <Hdr th={th} serif={serif} title="设置" onBack={onBack}/>
      <div style={{ padding:'20px 16px' }}>
        <div style={{ marginBottom:26 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:12, fontFamily:sans }}>配 色 主 题</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {Object.entries(THEMES).map(([name,t])=>(
              <button key={name} onClick={()=>onUpdateCfg({theme:name})} style={{ padding:'12px', borderRadius:12, border:`${cfg.theme===name?'1.5px':'0.5px'} solid ${cfg.theme===name?t.acc:t.border}`, background:t.paper, cursor:'pointer', textAlign:'left', position:'relative' }}>
                <div style={{ display:'flex', gap:5, marginBottom:7 }}>{[t.acc,t.ok,t.heart].map((c,i)=><div key={i} style={{ width:12,height:12,borderRadius:'50%',background:c }}/>)}</div>
                <div style={{ fontSize:11, color:t.text, letterSpacing:1, fontFamily:serif }}>{name}</div>
                {cfg.theme===name && <div style={{ position:'absolute', top:8, right:8, width:15, height:15, borderRadius:'50%', background:t.acc, display:'flex', alignItems:'center', justifyContent:'center' }}><Ico path={IC.check} size={9} style={{ color:t.paper }}/></div>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:26 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:12, fontFamily:sans }}>纸 纹 质 感</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {Object.entries(TEXTURES).map(([name,t])=>(
              <button key={name} onClick={()=>onUpdateCfg({texture:name})} style={{ height:52, borderRadius:10, border:`${cfg.texture===name?'1.5px':'0.5px'} solid ${cfg.texture===name?th.acc:th.border}`, background:th.bg, backgroundImage:t.img, backgroundSize:t.sz, cursor:'pointer', position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:6 }}>
                <span style={{ fontSize:10, color:th.textM, fontFamily:sans, background:`${th.paper}cc`, borderRadius:4, padding:'1px 5px' }}>{name}</span>
                {cfg.texture===name && <div style={{ position:'absolute', top:5, right:5, width:13, height:13, borderRadius:'50%', background:th.acc, display:'flex', alignItems:'center', justifyContent:'center' }}><Ico path={IC.check} size={8} style={{ color:th.paper }}/></div>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, letterSpacing:3, color:th.textL, marginBottom:12, fontFamily:sans }}>标 签 管 理</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
            {tags.map(tag=>(
              <div key={tag.name} style={{ display:'flex', alignItems:'center', gap:5, background:`${tag.color}18`, border:`0.5px solid ${tag.color}50`, borderRadius:16, padding:'4px 6px 4px 12px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:tag.color }}/>
                <span style={{ fontSize:12, color:tag.color, fontFamily:sans }}>{tag.name}</span>
                <button onClick={()=>onUpdateTags(tags.filter(t=>t.name!==tag.name))} style={{ background:'transparent', border:'none', padding:'1px 3px', cursor:'pointer', color:tag.color, display:'flex' }}><Ico path={IC.x} size={12}/></button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="新标签名称" style={{ ...inSt, flex:1, minWidth:100 }} onKeyDown={e=>e.key==='Enter'&&addTag()}/>
            <div style={{ display:'flex', gap:5 }}>{TAG_COLORS.map(c=><div key={c} onClick={()=>setNewColor(c)} style={{ width:17, height:17, borderRadius:'50%', background:c, cursor:'pointer', border:`2px solid ${newColor===c?th.text:'transparent'}` }}/>)}</div>
            <button onClick={addTag} style={{ background:th.acc, color:th.paper, border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, letterSpacing:1, fontFamily:serif, cursor:'pointer', whiteSpace:'nowrap' }}>添加</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 主应用 ──
export default function App() {
  const [entries,  setEntries]  = useState([]);
  const [tags,     setTags]     = useState(DEFAULT_TAGS);
  const [cfg,      setCfg]      = useState({ theme:'暖米', texture:'点阵' });
  const [view,     setView]     = useState('list');
  const [selId,    setSelId]    = useState(null);
  const [q,        setQ]        = useState('');
  const [ftags,    setFtags]    = useState([]);
  const [fstatus,  setFstatus]  = useState('all');
  const [sortBy,   setSortBy]   = useState('newest');
  const [loading,  setLoading]  = useState(true);
  const [ms,       setMs]       = useState(false);
  const [msSel,    setMsSel]    = useState(new Set());
  const [showSort, setShowSort] = useState(false);
  const [toast,    setToast]    = useState('');

  const th = THEMES[cfg.theme];
  const tx = TEXTURES[cfg.texture];
  const serif = "'Noto Serif SC','Source Han Serif SC',Georgia,serif";
  const sans  = "'Noto Sans SC','PingFang SC',sans-serif";

  useEffect(() => {
    const e  = LS.get('fx:entries');
    const ta = LS.get('fx:tags');
    const s  = LS.get('fx:cfg');
    if (e)  setEntries(e);
    if (ta) setTags(ta);
    if (s)  setCfg(s);
    setLoading(false);
  }, []);

  const saveE = (d) => LS.set('fx:entries', d);
  const saveT = (d) => LS.set('fx:tags', d);
  const saveC = (d) => LS.set('fx:cfg', d);
  const notify = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 2500); };

  const addE    = (data) => { const n={id:uid(),createdAt:Date.now(),favorite:false,status:'unwritten',tags:[],note:'',content:'',...data}; const next=[n,...entries]; setEntries(next); saveE(next); notify('已添加'); setView('list'); };
  const updateE = (id, data) => { const next=entries.map(e=>e.id===id?{...e,...data}:e); setEntries(next); saveE(next); };
  const deleteE = (id) => { const next=entries.filter(e=>e.id!==id); setEntries(next); saveE(next); notify('已删除'); setView('list'); };
  const toggleFav = (id) => { const e=entries.find(e=>e.id===id); updateE(id,{favorite:!e?.favorite}); };
  const updateCfg  = (d) => { const n={...cfg,...d}; setCfg(n); saveC(n); };
  const updateTags = (d) => { setTags(d); saveT(d); };

  const selEntry = entries.find(e=>e.id===selId);

  const filtered = entries.filter(e=>{
    if (view==='favorites' && !e.favorite) return false;
    if (fstatus==='written'   && e.status!=='written')   return false;
    if (fstatus==='unwritten' && e.status!=='unwritten') return false;
    if (ftags.length && !ftags.every(t=>e.tags?.includes(t))) return false;
    if (q) { const lq=q.toLowerCase(); if (!e.title?.toLowerCase().includes(lq)&&!e.prompt?.toLowerCase().includes(lq)&&!e.note?.toLowerCase().includes(lq)) return false; }
    return true;
  }).sort((a,b)=>{
    if (sortBy==='oldest')    return a.createdAt-b.createdAt;
    if (sortBy==='title')     return (a.title||'').localeCompare(b.title||'');
    if (sortBy==='written')   return (b.status==='written')-(a.status==='written');
    if (sortBy==='unwritten') return (b.status==='unwritten')-(a.status==='unwritten');
    return b.createdAt-a.createdAt;
  });

  const stats = { total:entries.length, written:entries.filter(e=>e.status==='written').length, unwritten:entries.filter(e=>e.status==='unwritten').length, fav:entries.filter(e=>e.favorite).length };

  const randomPick = () => { const pool=entries.filter(e=>e.status==='unwritten'); if(!pool.length){notify('未写番外已全部写完了！');return;} const pick=pool[Math.floor(Math.random()*pool.length)]; setSelId(pick.id); setView('detail'); };

  const exportSel = () => {
    const items=entries.filter(e=>msSel.has(e.id));
    if (!items.length){notify('请先选择要导出的番外');return;}
    const txt=items.map(e=>[`【${e.title||'无标题'}】`,`状态：${e.status==='written'?'已写':'未写'}`,e.tags?.length?`标签：${e.tags.join('、')}`:'','','提示词：',e.prompt||'（无）',e.content?`\n正文：\n${e.content}`:'',e.note?`\n备注：${e.note}`:''].filter(Boolean).join('\n')).join('\n\n'+'─'.repeat(28)+'\n\n');
    const blob=new Blob([txt],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='番外导出.txt'; a.click(); URL.revokeObjectURL(url);
    setMs(false); setMsSel(new Set()); notify(`已导出 ${items.length} 篇`);
  };

  const deleteSel = () => { const count=msSel.size; const next=entries.filter(e=>!msSel.has(e.id)); setEntries(next); saveE(next); setMs(false); setMsSel(new Set()); notify(`已删除 ${count} 篇`); };

  const importEntries = (news) => { const next=[...news,...entries]; setEntries(next); saveE(next); notify(`已导入 ${news.length} 篇`); setView('list'); };

  const StatusBadge = ({ status }) => (
    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:3, letterSpacing:1, fontFamily:sans, background:status==='written'?th.okBg:th.ngBg, color:status==='written'?th.ok:th.ng, border:`0.5px solid ${status==='written'?th.okBd:th.ngBd}` }}>{status==='written'?'已写':'未写'}</span>
  );
  const TagChip = ({ name, small }) => {
    const tc=tags.find(t=>t.name===name); const c=tc?.color||th.acc;
    return <span style={{ fontSize:small?10:11, padding:small?'2px 7px':'3px 10px', borderRadius:3, letterSpacing:0.5, fontFamily:sans, background:`${c}18`, color:c, border:`0.5px solid ${c}40` }}>{name}</span>;
  };

  const appBg = { minHeight:'100vh', background:th.bg, backgroundImage:tx.img, backgroundSize:tx.sz };

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f0e8', fontFamily:serif, color:'#9a9490', fontSize:13, letterSpacing:3 }}>加 载 中 …</div>;

  if (view==='detail'&&selEntry) return <DetailView key={selEntry.id} entry={selEntry} th={th} tx={tx} serif={serif} sans={sans} onBack={()=>setView('list')} onEdit={()=>setView('edit')} onFav={()=>toggleFav(selEntry.id)} onDelete={()=>deleteE(selEntry.id)} StatusBadge={StatusBadge} TagChip={TagChip} toast={toast}/>;
  if (view==='edit'||view==='new') { const isNew=view==='new'; return <EditView key={isNew?'new':selEntry?.id} init={isNew?{}:selEntry} tags={tags} th={th} tx={tx} isNew={isNew} serif={serif} sans={sans} onSave={(d)=>{isNew?addE(d):(updateE(selEntry.id,d),notify('已保存'),setView('detail'));}} onBack={()=>setView(isNew?'list':'detail')}/>; }
  if (view==='settings') return <SettingsView cfg={cfg} th={th} tx={tx} tags={tags} serif={serif} sans={sans} onUpdateCfg={updateCfg} onUpdateTags={updateTags} onBack={()=>setView('list')}/>;
  if (view==='import') return <ImportView th={th} tx={tx} serif={serif} sans={sans} onImport={importEntries} onBack={()=>setView('list')}/>;

  const cardSt = { background:th.card, border:`0.5px solid ${th.border}`, borderRadius:14, padding:'16px 16px 14px', marginBottom:12, cursor:'pointer', position:'relative' };

  return (
    <div style={{ ...appBg, paddingBottom:80 }}>
      <div style={{ background:th.paper, borderBottom:`0.5px solid ${th.border}`, padding:'13px 16px 10px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:th.textL, letterSpacing:0.5, marginBottom:10, display:'flex', gap:14, fontFamily:sans }}>
          <span>全部 <b style={{ color:th.textM }}>{stats.total}</b></span>
          <span>已写 <b style={{ color:th.ok }}>{stats.written}</b></span>
          <span>未写 <b style={{ color:th.ng }}>{stats.unwritten}</b></span>
          <span>收藏 <b style={{ color:th.heart }}>{stats.fav}</b></span>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
          <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center' }}>
            <span style={{ position:'absolute', left:10, color:th.textL, display:'flex', pointerEvents:'none' }}><Ico path={IC.search} size={15}/></span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索标题或提示词" style={{ background:th.paper, border:`0.5px solid ${th.border}`, borderRadius:8, paddingLeft:32, paddingRight:12, paddingTop:8, paddingBottom:8, fontSize:12, fontFamily:serif, color:th.text, width:'100%', outline:'none', boxSizing:'border-box' }}/>
          </div>
          <button onClick={()=>setShowSort(!showSort)} style={{ background:showSort?th.accBg:'transparent', border:`0.5px solid ${th.border}`, borderRadius:8, padding:'8px 10px', color:showSort?th.acc:th.textM, display:'flex', alignItems:'center', cursor:'pointer' }}><Ico path={IC.sort} size={16}/></button>
        </div>
        {showSort && (
          <div style={{ background:th.card, border:`0.5px solid ${th.border}`, borderRadius:8, marginBottom:8, overflow:'hidden' }}>
            {[['newest','最新添加'],['oldest','最早添加'],['title','标题排序'],['written','已写优先'],['unwritten','未写优先']].map(([v,l])=>(
              <div key={v} onClick={()=>{setSortBy(v);setShowSort(false);}} style={{ padding:'9px 14px', fontSize:12, fontFamily:sans, color:sortBy===v?th.acc:th.textM, background:sortBy===v?th.accBg:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                {l}{sortBy===v&&<Ico path={IC.check} size={13}/>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
          {[['all','全部'],['unwritten','未写'],['written','已写']].map(([v,l])=>(
            <button key={v} onClick={()=>setFstatus(v)} style={{ background:fstatus===v?th.acc:'transparent', color:fstatus===v?th.paper:th.textM, border:`0.5px solid ${fstatus===v?th.acc:th.border}`, borderRadius:16, padding:'4px 13px', fontSize:11, letterSpacing:1, cursor:'pointer', fontFamily:sans }}>{l}</button>
          ))}
          {ms && <button onClick={()=>{setMs(false);setMsSel(new Set());}} style={{ marginLeft:'auto', background:'transparent', color:'#b85050', border:`0.5px solid #b8505040`, borderRadius:16, padding:'4px 13px', fontSize:11, cursor:'pointer', fontFamily:sans }}>取消多选</button>}
        </div>
        {tags.length>0 && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
            {tags.map(tag=>{ const on=ftags.includes(tag.name); return <button key={tag.name} onClick={()=>setFtags(on?ftags.filter(t=>t!==tag.name):[...ftags,tag.name])} style={{ flexShrink:0, background:on?tag.color:'transparent', color:on?th.paper:tag.color, border:`0.5px solid ${tag.color}55`, borderRadius:16, padding:'3px 11px', fontSize:11, cursor:'pointer', fontFamily:sans }}>{tag.name}</button>; })}
          </div>
        )}
        {ms && msSel.size>0 && (
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:th.textM, fontFamily:sans }}>已选 {msSel.size} 篇</span>
            <button onClick={exportSel} style={{ background:th.acc, color:th.paper, border:'none', borderRadius:8, padding:'6px 14px', fontSize:11, fontFamily:sans, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}><Ico path={IC.dl} size={13}/>导出 txt</button>
            <button onClick={deleteSel} style={{ background:'transparent', border:`0.5px solid #b8505060`, color:'#b85050', borderRadius:8, padding:'6px 14px', fontSize:11, fontFamily:sans, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}><Ico path={IC.trash} size={13}/>删除</button>
          </div>
        )}
      </div>

      <div style={{ padding:'14px 14px 0' }}>
        {filtered.length===0 && <div style={{ textAlign:'center', color:th.textL, fontSize:13, padding:'50px 0', letterSpacing:2, fontFamily:serif }}>暂无番外</div>}
        {filtered.map(e=>{
          const isSel=ms&&msSel.has(e.id);
          return (
            <div key={e.id} onClick={()=>{ if(ms){const n=new Set(msSel);n.has(e.id)?n.delete(e.id):n.add(e.id);setMsSel(n);}else{setSelId(e.id);setView('detail');} }} style={{ ...cardSt, border:`0.5px solid ${isSel?th.acc:th.border}` }}>
              {ms && <div style={{ position:'absolute', top:14, right:14, width:19, height:19, borderRadius:'50%', background:isSel?th.acc:th.paper, border:`1.5px solid ${isSel?th.acc:th.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>{isSel&&<Ico path={IC.check} size={11} style={{ color:th.paper }}/>}</div>}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8, gap:10 }}>
                <div style={{ fontFamily:serif, fontSize:14, fontWeight:500, color:th.text, lineHeight:1.45, flex:1 }}>{e.title||'无标题'}</div>
                {!ms && <button onClick={ev=>{ev.stopPropagation();toggleFav(e.id);}} style={{ background:'transparent', border:'none', padding:2, cursor:'pointer', color:e.favorite?th.heart:th.borderL, display:'flex', flexShrink:0 }}><Ico path={IC.fav} size={16} fill={e.favorite}/></button>}
              </div>
              <div style={{ fontSize:11, color:th.textL, lineHeight:1.65, marginBottom:10, fontFamily:sans, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                {e.prompt?.replace(/^\s*[（(]?\$\s*/,'').trim().slice(0,90)||'（暂无提示词）'}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                <StatusBadge status={e.status}/>
                {e.tags?.slice(0,3).map(t=><TagChip key={t} name={t} small/>)}
                {(e.tags?.length||0)>3&&<span style={{ fontSize:10, color:th.textL, fontFamily:sans }}>+{e.tags.length-3}</span>}
                {e.note&&<Ico path={IC.note} size={13} style={{ color:th.textL, marginLeft:2 }}/>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position:'fixed', bottom:82, right:16, display:'flex', flexDirection:'column', gap:10, zIndex:20 }}>
        {[[randomPick,IC.shuffle,'今天写哪个'],[()=>{if(ms)exportSel();else{setMs(true);setMsSel(new Set());}},IC.dl,ms?'导出选中':'多选导出'],[()=>setView('import'),IC.ul,'导入']].map(([fn,ic,tt],i)=>(
          <button key={i} title={tt} onClick={fn} style={{ width:44, height:44, borderRadius:'50%', background:th.paper, border:`0.5px solid ${th.border}`, color:th.textM, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 2px 10px ${th.border}80` }}><Ico path={ic} size={18}/></button>
        ))}
        <button onClick={()=>setView('new')} style={{ width:50, height:50, borderRadius:'50%', background:th.acc, color:th.paper, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 3px 12px ${th.acc}60` }}><Ico path={IC.plus} size={22}/></button>
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:th.paper, borderTop:`0.5px solid ${th.border}`, display:'flex', zIndex:20 }}>
        {[['list','番外',IC.list],['favorites','收藏',IC.fav],['settings','设置',IC.cog]].map(([v,l,ic])=>{
          const active=view===v;
          return <button key={v} onClick={()=>setView(v)} style={{ flex:1, background:'transparent', border:'none', padding:'10px 0 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', color:active?th.acc:th.textL }}><Ico path={ic} size={20} fill={v==='favorites'&&active}/><span style={{ fontSize:10, letterSpacing:1, fontFamily:sans }}>{l}</span></button>;
        })}
      </div>

      {toast&&<Toast msg={toast} acc={th.acc} paper={th.paper}/>}
    </div>
  );
}
