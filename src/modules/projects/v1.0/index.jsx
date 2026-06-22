import { useState, useMemo, useRef, useEffect } from "react";
import { ContractModule } from "../../contract-analyser/v1.0/index.jsx";
import { matchProject } from "../../email-agent/v1.0/index.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { S, fmt$, doOpenPath, parseNotes, Av, Sb, Pb, ST, SLABadge, getSLAStatus, calculateZone, slaAnchorDate, STATUS_COLOR, PRIORITY_COLOR, DC_INIT, WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE, PHASES_WILLIS_WORKFLOW, makeDefaultPhases, addDays, EXTERNAL_IDS, WEEK_BUCKETS, getProjectMilestones, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_BADGE, CITY_STATUS_DOT, CITY_DEFAULTS, CITY_EMPTY, getCityData, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_BADGE, HOA_STATUS_DOT, HOA_REQUIRED_IDS, HOA_EMPTY, getHOAData, CONTRACT_TEMPLATE, NELSON_CONTRACT, fixDateYear, API_BASE, ANTHROPIC_API_KEY, dbt, sbClient, PHASES } from "../../../shared/core.jsx";

const PROJECT_TYPES=["Room Addition","ADU - New","ADU - Garage Conv.","Garage Conv.","Commercial Int.","High Ceiling Conv.","Single Story Addition","Two Story Addition","Simple Remodel","Open Concept Remodel","Whole House Makeover","Build a Deck","Patio Cover","Build a Garage"];


function PDFPanel({panel, onClose}) {
  if (!panel) return null;
  const {project, filePath} = panel;
  const isFullPath = filePath && (filePath.includes('/') || filePath.includes('\\') || filePath.includes(':'));
  const fileUrl = (filePath && isFullPath) ? (window.electronAPI?.getFilePath ? window.electronAPI.getFilePath(filePath) : ('file:///' + filePath.replace(/\\/g, '/'))) : '';
  return (
    <div style={{position:'fixed',top:0,right:0,width:'50%',height:'100vh',background:'var(--bg-card)',borderLeft:'2px solid var(--border-primary)',zIndex:180,display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border-primary)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
        <div style={{overflow:'hidden'}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text-bright)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{project.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{project.client} · {project.id}</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
          <button onClick={()=>doOpenPath(filePath)} style={{...S.ghost,fontSize:10,padding:'4px 12px'}}>↗ Open in PDF App</button>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
        </div>
      </div>
      <embed src={fileUrl} type="application/pdf" style={{flex:1,width:'100%',border:'none'}}
        onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
      <div style={{display:'none',flex:1,flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:32}}>
        <div style={{fontSize:40}}>📄</div>
        <div style={{fontSize:13,color:'var(--text-muted)',textAlign:'center'}}>PDF could not be displayed inline. Use the button above to open it.</div>
      </div>
    </div>
  );
}

function PaymentPanel({project,milestones,onClose,onUpdate}){
  const CYCLE=['Pending','Invoiced','Collected'];
  const SS={Pending:{bg:'var(--status-ns-bg)',text:'var(--status-ns-text)'},Invoiced:{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)'},Collected:{bg:'var(--status-done-bg)',text:'var(--status-done-text)'}};
  const cycleStatus=code=>{const u=milestones.map(m=>m.code!==code?m:{...m,status:CYCLE[(CYCLE.indexOf(m.status)+1)%CYCLE.length]});onUpdate(project.id,u);};
  const updateAmount=(code,val)=>{const u=milestones.map(m=>m.code!==code?m:{...m,amount:parseFloat(val)||0});onUpdate(project.id,u);};
  const collected=milestones.filter(m=>m.status==='Collected').reduce((a,m)=>a+m.amount,0);
  const invoiced=milestones.filter(m=>m.status==='Invoiced').reduce((a,m)=>a+m.amount,0);
  const total=milestones.reduce((a,m)=>a+m.amount,0);
  const pct=total>0?Math.round(collected/total*100):0;
  return(
    <div style={{position:'fixed',top:0,right:0,width:'55%',height:'100vh',background:'var(--bg-card)',borderLeft:'2px solid var(--border-primary)',zIndex:182,display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-primary)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text-bright)'}}>{project.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{project.client} · Contract: {fmt$(project.contract)}</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
      </div>
      {project.contract===0&&<div style={{padding:'8px 20px',background:'var(--status-hold-bg)',color:'var(--status-hold-text)',fontSize:11,fontFamily:'monospace'}}>⚠ No contract value — enter amounts manually below.</div>}
      <div style={{flex:1,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Code','Milestone','Amount ($)','Status'].map(h=><th key={h} style={{...S.th,padding:'8px 16px'}}>{h}</th>)}</tr></thead>
          <tbody>{milestones.map((m,i)=>(
            <tr key={m.code} style={{background:i%2===0?'transparent':'var(--bg-row-alt)'}}>
              <td style={{...S.td,padding:'10px 16px',fontFamily:'monospace',fontWeight:700,color:'var(--accent)',fontSize:12}}>{m.code}</td>
              <td style={{...S.td,padding:'10px 16px'}}>
                <div style={{fontSize:12,color:'var(--text-bright)',fontWeight:600}}>{m.label}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{m.desc}{project.contract>0&&<span style={{color:'var(--text-ghost)',marginLeft:6}}>({Math.round(m.pct*100)}%)</span>}</div>
              </td>
              <td style={{...S.td,padding:'10px 16px'}}>
                <input type="number" value={m.amount} onChange={e=>updateAmount(m.code,e.target.value)} style={{...S.input,width:100,padding:'4px 8px',fontSize:12,textAlign:'right'}}/>
              </td>
              <td style={{...S.td,padding:'10px 16px'}}>
                <button onClick={()=>cycleStatus(m.code)} style={{background:SS[m.status].bg,color:SS[m.status].text,border:'none',borderRadius:99,padding:'4px 14px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'monospace',whiteSpace:'nowrap'}}>{m.status}</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{padding:'16px 20px',borderTop:'1px solid var(--border-primary)',flexShrink:0}}>
        <Pb pct={pct} color="var(--status-done-text)"/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:11,fontFamily:'monospace',flexWrap:'wrap',gap:8}}>
          <span style={{color:'var(--status-done-text)',fontWeight:700}}>Collected: {fmt$(collected)}</span>
          <span style={{color:'var(--status-hold-text)'}}>Invoiced: {fmt$(invoiced)}</span>
          <span style={{color:'var(--text-muted)'}}>Total: {fmt$(total)}</span>
          <span style={{color:'var(--sla-red-text)',fontWeight:700}}>Outstanding: {fmt$(total-collected)}</span>
        </div>
        <div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',marginTop:6,textAlign:'center'}}>{pct}% collected of total contract</div>
      </div>
    </div>
  );
}


function CityPanel({project,initData,onClose,onUpdate}){
  const [data,setData]=useState(initData);
  const dr=useRef(data);dr.current=data;
  const commit=next=>{setData(next);onUpdate(project.id,next);};
  const upd=(field,value)=>commit({...data,[field]:value});
  const updT=(field,value)=>{const next={...data,[field]:value};setData(next);dbt(`cp-${project.id}`,()=>onUpdate(project.id,dr.current));};
  const updMany=obj=>commit({...data,...obj});
  const addRound=()=>{const rounds=[...(data.rounds||[]),{round:(data.rounds||[]).length+1,commentsDate:'',submittedDate:'',numComments:'',status:'In Progress'}];commit({...data,rounds});};
  const updRound=(i,field,value,txt=false)=>{const rounds=data.rounds.map((r,ri)=>ri===i?{...r,[field]:value}:r);const next={...data,rounds};if(txt){setData(next);dbt(`cp-${project.id}`,()=>onUpdate(project.id,dr.current));}else commit(next);};
  const [confirmRemove,setConfirmRemove]=useState(null);
  const removeRound=i=>{const rounds=(data.rounds||[]).filter((_,ri)=>ri!==i).map((r,ri)=>({...r,round:ri+1}));commit({...data,rounds});setConfirmRemove(null);};
  const handleApproval=date=>{const d=date?new Date(date):null;const exp=d?(()=>{const x=new Date(d);x.setFullYear(x.getFullYear()+1);return x.toISOString().slice(0,10);})():'';updMany({permitApprovalDate:date,...(!data.permitExpiryDate&&exp?{permitExpiryDate:exp}:{})});};
  const badge=CITY_STATUS_BADGE[data.planCheckStatus]||CITY_STATUS_BADGE['Not Submitted'];
  const Lbl=({t})=><div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>{t}</div>;
  const Fld=({label,children})=><div style={{marginBottom:12}}><Lbl t={label}/>{children}</div>;
  return(
    <div style={{position:'fixed',top:0,right:0,width:'55%',height:'100vh',background:'var(--bg-card)',borderLeft:'2px solid var(--border-primary)',zIndex:183,display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border-primary)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text-bright)'}}>{project.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>City Submission Tracker</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
          <span style={{background:badge.bg,color:badge.text,padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700,fontFamily:'monospace',whiteSpace:'nowrap'}}>{data.planCheckStatus}</span>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:14}}>City Submittal</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
          <Fld label="City / Jurisdiction"><input style={{...S.input,fontSize:12}} value={data.jurisdiction} onChange={e=>updT('jurisdiction',e.target.value)}/></Fld>
          <Fld label="Plan Check Status"><select style={{...S.input,width:'100%',fontSize:12}} value={data.planCheckStatus} onChange={e=>upd('planCheckStatus',e.target.value)}>{CITY_STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></Fld>
          <Fld label="First Submittal Date"><input type="date" style={{...S.input,fontSize:12}} value={data.firstSubmittalDate ? data.firstSubmittalDate.substring(0,10) : ''} onChange={e=>upd('firstSubmittalDate',fixDateYear(e.target.value))}/></Fld>
          <Fld label="Package / Reference #"><input style={{...S.input,fontSize:12}} value={data.packageRef} onChange={e=>updT('packageRef',e.target.value)} placeholder="e.g. PC-2026-1234"/></Fld>
          <Fld label="Plan Check Number"><input style={{...S.input,fontSize:12}} value={data.planCheckNumber} onChange={e=>updT('planCheckNumber',e.target.value)} placeholder="Assigned by city"/></Fld>
          <Fld label="Plan Checker Name"><input style={{...S.input,fontSize:12}} value={data.planCheckerName} onChange={e=>updT('planCheckerName',e.target.value)}/></Fld>
          <Fld label="Plan Checker Phone"><input style={{...S.input,fontSize:12}} value={data.planCheckerPhone} onChange={e=>updT('planCheckerPhone',e.target.value)}/></Fld>
          <Fld label="Plan Checker Email"><input style={{...S.input,fontSize:12}} value={data.planCheckerEmail} onChange={e=>updT('planCheckerEmail',e.target.value)}/></Fld>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace'}}>Correction Rounds</div>
          <button onClick={addRound} style={{...S.ghost,fontSize:10,padding:'3px 10px'}}>+ Add Round</button>
        </div>
        {(data.rounds||[]).length===0&&<div style={{fontSize:11,color:'var(--text-faint)',textAlign:'center',padding:'10px 0',marginBottom:16}}>No correction rounds yet.</div>}
        {(data.rounds||[]).map((r,i)=>(
          <div key={i} style={{background:'var(--bg-page)',border:'1px solid var(--border-primary)',borderRadius:8,padding:'12px',marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--accent)',fontFamily:'monospace'}}>Round {r.round}</span>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {confirmRemove===i?(
                  <span style={{display:'flex',gap:6,alignItems:'center',fontSize:10,fontFamily:'monospace'}}>
                    <span style={{color:'var(--text-muted)'}}>Remove Round {r.round}?</span>
                    <button onClick={()=>removeRound(i)} style={{background:'#e74c3c',color:'#fff',border:'none',borderRadius:4,padding:'2px 10px',fontSize:10,cursor:'pointer',fontWeight:700}}>Yes</button>
                    <button onClick={()=>setConfirmRemove(null)} style={{...S.ghost,padding:'2px 8px',fontSize:10}}>No</button>
                  </span>
                ):(
                  <button onClick={()=>setConfirmRemove(i)} style={{background:'none',border:'1px solid #e74c3c44',color:'#e74c3c',borderRadius:4,padding:'2px 8px',fontSize:10,cursor:'pointer',fontFamily:'monospace'}}>✕ Remove</button>
                )}
                <select value={r.status} onChange={e=>updRound(i,'status',e.target.value)} style={{...S.input,width:'auto',fontSize:11,padding:'2px 8px'}}>{ROUND_STATUS.map(s=><option key={s}>{s}</option>)}</select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <Fld label="Comments Received"><input type="date" style={{...S.input,fontSize:11}} value={r.commentsDate ? r.commentsDate.substring(0,10) : ''} onChange={e=>updRound(i,'commentsDate',fixDateYear(e.target.value))}/></Fld>
              <Fld label="Corrections Submitted"><input type="date" style={{...S.input,fontSize:11}} value={r.submittedDate ? r.submittedDate.substring(0,10) : ''} onChange={e=>updRound(i,'submittedDate',fixDateYear(e.target.value))}/></Fld>
              <Fld label="# of Comments"><input type="number" style={{...S.input,fontSize:11}} value={r.numComments} onChange={e=>updRound(i,'numComments',e.target.value,true)}/></Fld>
            </div>
          </div>
        ))}
        <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:14,marginTop:8}}>Permit</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Fld label="Permit Number"><input style={{...S.input,fontSize:12}} value={data.permitNumber} onChange={e=>updT('permitNumber',e.target.value)} placeholder="Issued by city"/></Fld>
          <Fld label="Permit Type"><input style={{...S.input,fontSize:12}} value={data.permitType} onChange={e=>updT('permitType',e.target.value)} placeholder="e.g. Building Permit"/></Fld>
          <Fld label="Permit Approval Date"><input type="date" style={{...S.input,fontSize:12}} value={data.permitApprovalDate ? data.permitApprovalDate.substring(0,10) : ''} onChange={e=>handleApproval(fixDateYear(e.target.value))}/></Fld>
          <Fld label="Permit Expiry Date"><input type="date" style={{...S.input,fontSize:12}} value={data.permitExpiryDate ? String(data.permitExpiryDate).substring(0,10) : ''} onChange={e=>upd('permitExpiryDate',fixDateYear(e.target.value))}/></Fld>
        </div>
      </div>
    </div>
  );
}


function HOAPanel({project,initData,onClose,onUpdate}){
  const [data,setData]=useState(initData);
  const dr=useRef(data);dr.current=data;
  const commit=next=>{setData(next);onUpdate(project.id,next);};
  const upd=(field,value)=>commit({...data,[field]:value});
  const updT=(field,value)=>{const next={...data,[field]:value};setData(next);dbt(`hp-${project.id}`,()=>onUpdate(project.id,dr.current));};
  const [confirmRemove,setConfirmRemove]=useState(null);
  const addRevision=()=>{const revisions=[...(data.revisions||[]),{round:(data.revisions||[]).length+1,requestedDate:'',resubmittedDate:'',notes:'',status:'In Progress'}];commit({...data,revisions});};
  const updRevision=(i,field,value,txt=false)=>{const revisions=data.revisions.map((r,ri)=>ri===i?{...r,[field]:value}:r);const next={...data,revisions};if(txt){setData(next);dbt(`hp-${project.id}`,()=>onUpdate(project.id,dr.current));}else commit(next);};
  const removeRevision=i=>{const revisions=(data.revisions||[]).filter((_,ri)=>ri!==i).map((r,ri)=>({...r,round:ri+1}));commit({...data,revisions});setConfirmRemove(null);};
  const toggleDoc=name=>{const docs={...(data.docs||{}),[name]:!(data.docs||{})[name]};commit({...data,docs});};
  const letterInputRef=useRef(null);
  const pickLetter=async()=>{
    if(window.electronAPI?.openFile){const fp=await window.electronAPI.openFile();if(fp)upd('approvalLetterPath',fp);}
    else{letterInputRef.current?.click();}
  };
  const onLetterInputChange=e=>{const f=e.target.files?.[0];if(f){upd('approvalLetterPath',f.name);e.target.value='';}};
  const badge=HOA_STATUS_BADGE[data.hoaStatus]||HOA_STATUS_BADGE['Not Started'];
  const Lbl=({t})=><div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>{t}</div>;
  const Fld=({label,children,col})=><div style={{marginBottom:12,gridColumn:col||''}}><Lbl t={label}/>{children}</div>;
  const Toggle=({value,onChange})=>(
    <div style={{display:'flex',gap:4}}>
      {['No','Yes'].map((l,i)=><button key={l} onClick={()=>onChange(i===1)} style={{background:value===(i===1)?'var(--accent)':'transparent',color:value===(i===1)?'#fff':'var(--text-muted)',border:'1px solid var(--border-secondary)',borderRadius:4,padding:'3px 12px',fontSize:11,cursor:'pointer',fontWeight:value===(i===1)?700:400}}>{l}</button>)}
    </div>
  );
  return(
    <div style={{position:'fixed',top:0,right:0,width:'55%',height:'100vh',background:'var(--bg-card)',borderLeft:'2px solid var(--border-primary)',zIndex:184,display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border-primary)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
        <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:'var(--text-bright)'}}>{project.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>HOA Submittal Tracker</div></div>
        <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
          {data.hoaRequired&&<span style={{background:badge.bg,color:badge.text,padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700,fontFamily:'monospace',whiteSpace:'nowrap'}}>{data.hoaStatus}</span>}
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'10px 14px',background:'var(--bg-page)',borderRadius:8,border:'1px solid var(--border-primary)'}}>
          <div><div style={{fontSize:12,fontWeight:700,color:'var(--text-bright)'}}>HOA Required</div><div style={{fontSize:10,color:'var(--text-muted)'}}>Does this project require HOA approval?</div></div>
          <Toggle value={data.hoaRequired} onChange={v=>upd('hoaRequired',v)}/>
        </div>
        {!data.hoaRequired?(
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-faint)',fontSize:12}}>No HOA required for this project.</div>
        ):(
          <>
            <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:14}}>HOA Info</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              <Fld label="HOA Name"><input style={{...S.input,fontSize:12}} value={data.hoaName} onChange={e=>updT('hoaName',e.target.value)} placeholder="e.g. Irvine Company"/></Fld>
              <Fld label="Management Company"><input style={{...S.input,fontSize:12}} value={data.managementCompany} onChange={e=>updT('managementCompany',e.target.value)}/></Fld>
              <Fld label="Contact Name"><input style={{...S.input,fontSize:12}} value={data.contactName} onChange={e=>updT('contactName',e.target.value)}/></Fld>
              <Fld label="Contact Phone"><input style={{...S.input,fontSize:12}} value={data.contactPhone} onChange={e=>updT('contactPhone',e.target.value)}/></Fld>
              <Fld label="Contact Email" col="1/-1"><input style={{...S.input,fontSize:12}} value={data.contactEmail} onChange={e=>updT('contactEmail',e.target.value)}/></Fld>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,padding:'10px 14px',background:'var(--bg-page)',borderRadius:8,border:'1px solid var(--border-primary)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-bright)'}}>HOA Fee Required</div>
              <Toggle value={data.feeRequired} onChange={v=>upd('feeRequired',v)}/>
            </div>
            {data.feeRequired&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
              <Fld label="Fee Amount ($)"><input type="number" style={{...S.input,fontSize:12}} value={data.feeAmount} onChange={e=>updT('feeAmount',e.target.value)}/></Fld>
              <Fld label="Fee Paid"><div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}><input type="checkbox" checked={!!data.feePaid} onChange={e=>upd('feePaid',e.target.checked)} style={{width:16,height:16,cursor:'pointer'}}/><span style={{fontSize:11,color:'var(--text-body)'}}>Paid</span></div></Fld>
              {data.feePaid&&<Fld label="Date Paid"><input type="date" style={{...S.input,fontSize:12}} value={data.feePaidDate ? String(data.feePaidDate).substring(0,10) : ''} onChange={e=>upd('feePaidDate',fixDateYear(e.target.value))}/></Fld>}
            </div>}
            <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:14}}>HOA Submittal</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <Fld label="HOA Status"><select style={{...S.input,width:'100%',fontSize:12}} value={data.hoaStatus} onChange={e=>upd('hoaStatus',e.target.value)}>{HOA_STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></Fld>
              <Fld label="Submittal Date"><input type="date" style={{...S.input,fontSize:12}} value={data.submittalDate ? String(data.submittalDate).substring(0,10) : ''} onChange={e=>upd('submittalDate',fixDateYear(e.target.value))}/></Fld>
              <Fld label="Expected Decision"><input type="date" style={{...S.input,fontSize:12}} value={data.expectedDecisionDate ? String(data.expectedDecisionDate).substring(0,10) : ''} onChange={e=>upd('expectedDecisionDate',fixDateYear(e.target.value))}/></Fld>
              <Fld label="Actual Decision"><input type="date" style={{...S.input,fontSize:12}} value={data.actualDecisionDate ? String(data.actualDecisionDate).substring(0,10) : ''} onChange={e=>upd('actualDecisionDate',fixDateYear(e.target.value))}/></Fld>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>Documents Submitted</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {HOA_DOCS.map(doc=><label key={doc} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:4,background:'var(--bg-page)',border:'1px solid var(--border-primary)',cursor:'pointer'}}><input type="checkbox" checked={!!(data.docs||{})[doc]} onChange={()=>toggleDoc(doc)} style={{width:14,height:14,cursor:'pointer'}}/><span style={{fontSize:11,color:'var(--text-body)'}}>{doc}</span></label>)}
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace'}}>Revision Rounds</div>
              <button onClick={addRevision} style={{...S.ghost,fontSize:10,padding:'3px 10px'}}>+ Add Revision</button>
            </div>
            {(data.revisions||[]).length===0&&<div style={{fontSize:11,color:'var(--text-faint)',textAlign:'center',padding:'10px 0',marginBottom:12}}>No revision rounds yet.</div>}
            {(data.revisions||[]).map((r,i)=>(
              <div key={i} style={{background:'var(--bg-page)',border:'1px solid var(--border-primary)',borderRadius:8,padding:'12px',marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--accent)',fontFamily:'monospace'}}>Revision {r.round}</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {confirmRemove===i?(<span style={{display:'flex',gap:6,alignItems:'center',fontSize:10,fontFamily:'monospace'}}><span style={{color:'var(--text-muted)'}}>Remove?</span><button onClick={()=>removeRevision(i)} style={{background:'#e74c3c',color:'#fff',border:'none',borderRadius:4,padding:'2px 10px',fontSize:10,cursor:'pointer',fontWeight:700}}>Yes</button><button onClick={()=>setConfirmRemove(null)} style={{...S.ghost,padding:'2px 8px',fontSize:10}}>No</button></span>):(<button onClick={()=>setConfirmRemove(i)} style={{background:'none',border:'1px solid #e74c3c44',color:'#e74c3c',borderRadius:4,padding:'2px 8px',fontSize:10,cursor:'pointer',fontFamily:'monospace'}}>✕ Remove</button>)}
                    <select value={r.status} onChange={e=>updRevision(i,'status',e.target.value)} style={{...S.input,width:'auto',fontSize:11,padding:'2px 8px'}}>{ROUND_STATUS.map(s=><option key={s}>{s}</option>)}</select>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <Fld label="Date Requested"><input type="date" style={{...S.input,fontSize:11}} value={r.requestedDate ? String(r.requestedDate).substring(0,10) : ''} onChange={e=>updRevision(i,'requestedDate',fixDateYear(e.target.value))}/></Fld>
                  <Fld label="Date Resubmitted"><input type="date" style={{...S.input,fontSize:11}} value={r.resubmittedDate ? String(r.resubmittedDate).substring(0,10) : ''} onChange={e=>updRevision(i,'resubmittedDate',fixDateYear(e.target.value))}/></Fld>
                </div>
                <Fld label="Notes"><textarea style={{...S.input,height:50,resize:'vertical',fontSize:11}} value={r.notes} onChange={e=>updRevision(i,'notes',e.target.value,true)}/></Fld>
              </div>
            ))}
            <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:14,marginTop:8}}>Approval</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <Fld label="Approval Date"><input type="date" style={{...S.input,fontSize:12}} value={data.approvalDate ? String(data.approvalDate).substring(0,10) : ''} onChange={e=>upd('approvalDate',fixDateYear(e.target.value))}/></Fld>
              <Fld label="Approval Letter">
                <input ref={letterInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg" style={{display:'none'}} onChange={onLetterInputChange}/>
                {data.approvalLetterPath?(<div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}><span style={{fontSize:10,color:'var(--status-done-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>📄 {typeof data.approvalLetterPath==='string'?data.approvalLetterPath.split(/[/\\]/).pop():data.approvalLetterPath}</span><button onClick={()=>doOpenPath(data.approvalLetterPath)} style={{...S.ghost,fontSize:9,padding:'2px 8px',flexShrink:0}}>Open</button><button onClick={pickLetter} style={{fontSize:9,color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',flexShrink:0}}>↺</button></div>):(<button onClick={pickLetter} style={{...S.ghost,fontSize:10,padding:'4px 10px',marginTop:4}}>📎 Attach</button>)}
              </Fld>
            </div>
            <Fld label="Conditions of Approval"><textarea style={{...S.input,height:80,resize:'vertical',fontSize:12}} value={data.approvalConditions} onChange={e=>updT('approvalConditions',e.target.value)} placeholder="List any conditions attached to the approval..."/></Fld>
          </>
        )}
      </div>
    </div>
  );
}

const ANALYSE_PROMPT=`You are analysing a construction or architectural services contract PDF.

STEP 1 — DETECT FORMAT:
- If the document contains "CALOFT CORP" or "HIGH CEILING CONVERSION" → FORMAT 2 (CALOFT Construction Contract)
- If the document contains "TRUADDITIONS CORP" → FORMAT 3 (TruAdditions Construction Contract)
- Otherwise → FORMAT 1 (TruPlans Work Order)

STEP 2 — EXTRACT based on detected format:

=== FORMAT 1: TruPlans Work Order ===
Set contractFormat: "TRUPLANS"
PAGE 1: clientLastName, clientFirstNames (HOMEOWNER/CLIENT INFORMATION section), fullAddress, phone1, phone2, email, workOrderDate (DATE field top right), signedDate (SIGNED ON field), projectNumber (PROJECT #), docusignId (DocuSign Envelope ID at top)
PAGE 3: archTotal — Architectural Design & Construction Documents total (yellow highlighted)
PAGE 4: civilTotal — Civil/Soils/Special Engineering total (ESTIMATE PAYMENT E)
PAGE 5: structuralTotal — Structural Engineering total (ESTIMATE PAYMENT S)
PAGE 6: landscapeTotal — Landscape total (ESTIMATE PAYMENT L)
PAGE 7 — PAYMENT SCHEDULE: Extract EVERY payment line item (numbered 1+, plus E1/S1/L1 if present) with exact name and dollar amount. Each item: code, description, amount, trigger.
PAGE 12: signatureDate, signedByName from client signature block.

=== FORMAT 2: CALOFT Construction Contract ===
Set contractFormat: "CALOFT"
- docusignId: Docusign Envelope ID at top
- contractorCompany: "CALOFT CORP"
- contractorLicense: CSLB number (e.g. "CSLB #970476")
- clientLastName, clientFirstNames: from HOMEOWNER / PROPERTY INFO section
- fullAddress: street, city, zip
- phone1, phone2 (if present)
- email: Email 1 field
- contractDate: DATE field top right of page 1
- signedDate: date from client signature page
- grandTotal: CONTRACT TOTAL AMOUNT
- approxStartDate: approximate start date if stated
- approxCompletionDate: approximate completion date if stated
- estimatedConstructionTime: e.g. "3-4 weeks"
- paymentMilestones: all 8 milestones from PAYMENT SCHEDULE — code=1-8, description=milestone name, amount=dollar amount, trigger=payment trigger text:
  1=DEPOSIT, 2=HOUSE SCANNING, 3=DESIGN, 4=MATERIAL DEPOSITS, 5=PREP & DEMO, 6=ROUGH INSPECTION, 7=DRYWALL SCREW, 8=FINAL INSPECTION
- scopeOfWork: scan every line item in the contract. Extract ALL items — both included and excluded — as { category, description, included: "Y" or "N" }. Set included="Y" for items marked Y, YES, or checked/green box; included="N" for items marked N, NO, or unchecked. Use the section heading as category (e.g. "Structural", "Electrical", "Plumbing", "Mechanical", "Framing", "Insulation", "Drywall", "Flooring", "Painting", "Cabinetry", "Countertops", "Roofing", "Windows & Doors", "HVAC", "Other").
- includedItems: [], excludedItems: []
- signatureDate, signedByName from signature page

=== FORMAT 3: TruAdditions Construction Contract ===
Set contractFormat: "TRUADDITIONS"
- docusignId: Docusign Envelope ID at top
- contractorCompany: "TRUADDITIONS CORP"
- contractorLicense: CSLB number if present
- clientLastName, clientFirstNames: from HOMEOWNER / PROPERTY INFO section
- fullAddress: street, city, zip
- phone1, phone2 (if present)
- email: client email field
- contractDate: DATE field top right of page 1
- signedDate: date from client signature page
- grandTotal: CONTRACT TOTAL AMOUNT
- approxStartDate: approximate start date if stated
- approxCompletionDate: approximate completion date if stated
- estimatedConstructionTime: e.g. "3-4 weeks"
- paymentMilestones: all milestones from PAYMENT SCHEDULE — code=milestone number, description=milestone name, amount=dollar amount, trigger=payment trigger text
- scopeOfWork: scan every line item in the contract. Extract ALL items — both included and excluded — as { category, description, included: "Y" or "N" }. Set included="Y" for items marked Y, YES, or checked/green box; included="N" for items marked N, NO, or unchecked. Use the section heading as category.
- includedItems: [], excludedItems: []
- signatureDate, signedByName from signature page

=== ALL FORMATS — SCOPE OF WORK (FORMAT 1 additional instruction) ===
For FORMAT 1 (TruPlans Work Order): also extract scopeOfWork by scanning all service line items across pages 3–6. Extract ALL items as { category, description, included: "Y" or "N" } where category matches the page section (e.g. "Architectural", "Civil", "Structural", "Landscape"). Set included="Y" for items in scope, included="N" for items out of scope.

Return ONLY valid JSON, no markdown, no backticks. Leave fields empty/0/[] if not applicable to the detected format:
{"contractFormat":"","clientLastName":"","clientFirstNames":"","fullAddress":"","phone1":"","phone2":"","email":"","workOrderDate":"","contractDate":"","signedDate":"","projectNumber":"","docusignId":"","contractorCompany":"","contractorLicense":"","archTotal":0,"civilTotal":0,"structuralTotal":0,"landscapeTotal":0,"grandTotal":0,"approxStartDate":"","approxCompletionDate":"","estimatedConstructionTime":"","paymentMilestones":[{"code":"","description":"","amount":0,"trigger":""}],"scopeOfWork":[{"category":"","description":"","included":"Y"}],"signatureDate":"","signedByName":"","includedItems":[],"excludedItems":[]}`;


function ProjectDetail({project,paymentData,contractPaths,teamMembers,onBack,onUpdateProject,onUpdateType,onPaymentUpdate,onPickPDF,onViewPDF,threads=[],onOpenThread,onUpdateName,onDelete,onWorkflow,onAssign,onContracts,onTogglePhase,onAnalyse,onUpdateFields,onSaveReminders,onPatchNow,onChangeJobNumber,taskInstructions=[],onEditInstruction=()=>{}}){
  const [editNotes,setEditNotes]=useState(project.notes||'');
  const [editingNotes,setEditingNotes]=useState(false);
  const [reminders,setReminders]=useState(Array.isArray(project.reminders)?project.reminders:[]);
  const [newReminder,setNewReminder]=useState('');
  const saveReminders=(next)=>{setReminders(next);onSaveReminders?.(project.id,next);};
  const addReminder=()=>{const t=newReminder.trim();if(!t)return;saveReminders([...reminders,t]);setNewReminder('');};
  const removeReminder=(i)=>saveReminders(reminders.filter((_,idx)=>idx!==i));
  const parsedContact=useMemo(()=>parseNotes(project.notes||''),[]);
  const [clientPhone,setClientPhone]=useState(project.clientPhone||(parsedContact.phone||''));
  const [clientEmail,setClientEmail]=useState(project.clientEmail||(parsedContact.email||''));
  const [clientAddress,setClientAddress]=useState(project.clientAddress||(parsedContact.address||''));
  const CONTACT_DB={'clientPhone':'client_phone','clientEmail':'client_email','clientAddress':'client_address'};
  const saveContact=(field,val)=>{onUpdateFields?.(project.id,{[field]:val});if(CONTACT_DB[field])onPatchNow?.(project.id,{[CONTACT_DB[field]]:val});};
  const [howToStepId,setHowToStepId]=useState(null);
  const getInstr=id=>taskInstructions.find(r=>r.workflow_step_id===id&&r.city===project.city)||taskInstructions.find(r=>r.workflow_step_id===id&&!r.city)||null;
  const [renaming,setRenaming]=useState(false);
  const [renameVal,setRenameVal]=useState(project.name);
  const [editingDate,setEditingDate]=useState(false);
  const [renumberOpen,setRenumberOpen]=useState(false);
  const [renumberVal,setRenumberVal]=useState('');
  const [renumberErr,setRenumberErr]=useState('');
  const [renumberBusy,setRenumberBusy]=useState(false);
  const doRenumber=async()=>{
    setRenumberErr('');
    const trimmed=(renumberVal||'').trim();
    if(!trimmed){setRenumberErr('Please enter a new job number');return;}
    setRenumberBusy(true);
    const r=await(onChangeJobNumber?.(project.id,trimmed)??{ok:false,error:'No handler'});
    setRenumberBusy(false);
    if(r.ok){setRenumberOpen(false);setRenumberVal('');}
    else setRenumberErr(r.error||'Failed to change job number');
  };
  const saveSiteMeasurementDate=(newDate)=>{
    onUpdateFields?.(project.id,{siteMeasurementDate:newDate||null});
    setEditingDate(false);
  };
  const saveName=()=>{if(renameVal.trim()&&renameVal.trim()!==project.name)onUpdateName?.(project.id,renameVal.trim());setRenaming(false);};
  const milestones=getProjectMilestones(project,paymentData);
  const {phone,email,docusign,address}=parseNotes(project.notes||'');
  const getStepStatus=id=>{
    if(project.workflow?.length>0){return project.workflow.find(m=>m.milestoneId===id)?.status||'Not Started';}
    const ph=project.phases?.find(p=>p.id===id);
    if(!ph) return 'Not Started';
    return ph.status==='done'?'Completed':ph.status==='in_progress'?'In Progress':'Not Started';
  };
  const completedCount=PHASES_WILLIS_WORKFLOW.filter(p=>getStepStatus(p.id)==='Completed').length;
  const progressPct=Math.round(completedCount/PHASES_WILLIS_WORKFLOW.length*100);
  const collected=milestones.filter(m=>m.status==='Collected').reduce((a,m)=>a+m.amount,0);
  const invoiced=milestones.filter(m=>m.status==='Invoiced').reduce((a,m)=>a+m.amount,0);
  const totalPmt=milestones.reduce((a,m)=>a+m.amount,0);
  const SCOL={'Completed':'var(--status-done-text)','In Progress':'#3498db','Blocked':'var(--sla-red-text)','Not Started':'var(--text-faint)'};
  const SBG={'Completed':'var(--status-done-bg)','In Progress':'var(--status-ip-bg)','Blocked':'var(--sla-red-bg)','Not Started':'var(--bg-subtle)'};
  const PMT_SS={Pending:{bg:'var(--status-ns-bg)',text:'var(--status-ns-text)'},Invoiced:{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)'},Collected:{bg:'var(--status-done-bg)',text:'var(--status-done-text)'}};
  const CYCLE=['Pending','Invoiced','Collected'];
  const cyclePmt=code=>{const u=milestones.map(m=>m.code!==code?m:{...m,status:CYCLE[(CYCLE.indexOf(m.status)+1)%CYCLE.length]});onPaymentUpdate(project.id,u);};
  const contractPath=contractPaths[project.id];
  const contractFilename=contractPath?contractPath.split(/[/\\]/).pop():null;
  const internalSteps=PHASES_WILLIS_WORKFLOW.filter(p=>!EXTERNAL_IDS.has(p.id));
  const externalSteps=PHASES_WILLIS_WORKFLOW.filter(p=>EXTERNAL_IDS.has(p.id));
  const slaStatus=getSLAStatus(project);
  const currentWeek=Math.min(Math.max(slaStatus.weekNum||1,1),8);
  const currentBucket=WEEK_BUCKETS.find(b=>b.week===currentWeek);
  const dueThisWeek=(currentBucket?.steps||[]).map(id=>({...PHASES_WILLIS_WORKFLOW.find(p=>p.id===id),status:getStepStatus(id)}));
  const behindSchedule=WEEK_BUCKETS.filter(b=>b.week<currentWeek).flatMap(b=>b.steps).filter(id=>getStepStatus(id)!=='Completed').map(id=>({...PHASES_WILLIS_WORKFLOW.find(p=>p.id===id),status:getStepStatus(id)}));
  const InfoRow=({label,value,href,onClick})=>value?(<div style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10}}><span style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',minWidth:84,textTransform:'uppercase',letterSpacing:'1px',paddingTop:2,flexShrink:0}}>{label}</span>{href?<a href={href} style={{fontSize:12,color:'var(--accent)',textDecoration:'underline',wordBreak:'break-all'}}>{value}</a>:onClick?<span onClick={onClick} style={{fontSize:12,color:'var(--accent)',textDecoration:'underline',cursor:'pointer',wordBreak:'break-all'}}>{value}</span>:<span style={{fontSize:12,color:'var(--text-body)',wordBreak:'break-all'}}>{value}</span>}</div>):null;
  const ContactField=({label,value,onChange,onBlur,href,placeholder})=>(<div style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:8}}><span style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',minWidth:84,textTransform:'uppercase',letterSpacing:'1px',paddingTop:7,flexShrink:0}}>{label}</span><div style={{flex:1,display:'flex',gap:6,alignItems:'center'}}><input value={value} onChange={e=>onChange(e.target.value)} onBlur={e=>onBlur(e.target.value)} placeholder={placeholder} style={{...S.input,fontSize:11,flex:1,padding:'4px 8px'}}/>{value&&href&&<a href={href} target="_blank" rel="noreferrer" style={{fontSize:10,color:'var(--accent)',fontFamily:'monospace',flexShrink:0,opacity:0.8}}>↗</a>}</div></div>);
  return(
    <div style={{animation:'slideInRight 0.2s ease-out'}}>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,flexWrap:'wrap'}}>
        <button onClick={onBack} style={{...S.ghost,padding:'6px 14px',fontSize:11,flexShrink:0}}>← Projects</button>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:10,color:'var(--accent)',fontFamily:'monospace',letterSpacing:'2px'}}>
            <span>{project.id}</span>
            <span
              onClick={()=>{setRenumberVal(project.id);setRenumberErr('');setRenumberOpen(true);}}
              style={{cursor:'pointer',marginLeft:6,opacity:0.6}}
              title="Change job number"
            >✎</span>
            {project.type&&` · ${project.type}`}
          </div>
          {renaming?(
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2,marginBottom:2}}>
              <input
                autoFocus
                value={renameVal}
                onChange={e=>setRenameVal(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')saveName();if(e.key==='Escape'){setRenaming(false);setRenameVal(project.name);}}}
                style={{...S.input,fontSize:18,fontWeight:700,padding:'3px 8px',width:280}}
              />
              <button onClick={saveName} style={{...S.btn,padding:'4px 14px',fontSize:11}}>Save</button>
              <button onClick={()=>{setRenaming(false);setRenameVal(project.name);}} style={{...S.ghost,padding:'4px 10px',fontSize:11}}>Cancel</button>
            </div>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontSize:22,fontWeight:700,color:'var(--text-bright)',lineHeight:1.2}}>{project.name}</div>
              <button onClick={()=>{setRenameVal(project.name);setRenaming(true);}} style={{background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:11,fontFamily:'monospace',padding:'2px 6px',borderRadius:3,marginTop:2}} title="Rename project">✎</button>
            </div>
          )}
          <div style={{fontSize:12,color:'var(--text-muted)'}}>{project.client}{project.city&&` · ${project.city}`}</div>
          {(()=>{const addr=parseNotes(project.notes||'').address;return addr?<div style={{fontSize:11,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2}}>📍 {addr}</div>:null;})()}
        </div>
        {(()=>{
          const anchor=slaAnchorDate(project);
          const hasDate=!!project.siteMeasurementDate;
          const fmtDate=(d)=>{if(!d)return'';const dt=new Date(d);if(isNaN(dt))return d;return dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});};
          let countdown=null;
          if(anchor){
            const today=new Date();today.setHours(0,0,0,0);
            const start=new Date(anchor);start.setHours(0,0,0,0);
            const days=Math.floor((today-start)/86400000);
            if(days>=0){
              const weekNum=Math.max(1,Math.ceil(days/7));
              const weeksRemaining=Math.max(0,8-weekNum);
              const zoneColor=weekNum<=6?'#27ae60':weekNum<=8?'#f0a842':'#e74c3c';
              countdown=<div style={{fontSize:10,color:zoneColor,fontFamily:'monospace',marginTop:2,letterSpacing:'1px'}}>WEEK {weekNum} OF 8 · {weeksRemaining} LEFT</div>;
            }else{
              countdown=<div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2,letterSpacing:'1px'}}>FUTURE · {Math.abs(days)}d AWAY</div>;
            }
          }
          return(
            <div style={{flexShrink:0,textAlign:'right',minWidth:170}}>
              <div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',letterSpacing:'2px',marginBottom:2}}>PROJECT START DATE</div>
              {editingDate?(
                <input
                  type="date"
                  autoFocus
                  defaultValue={project.siteMeasurementDate||project.start||''}
                  onBlur={e=>saveSiteMeasurementDate(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')saveSiteMeasurementDate(e.target.value);if(e.key==='Escape')setEditingDate(false);}}
                  style={{...S.input,fontSize:13,padding:'3px 6px',width:140}}
                />
              ):(
                <div onClick={()=>setEditingDate(true)} style={{cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6}} title="Click to set/change site measurement date">
                  <span style={{fontSize:14,fontWeight:600,color:hasDate?'var(--text-body)':'var(--text-faint)'}}>{hasDate?fmtDate(project.siteMeasurementDate):(anchor?`${fmtDate(anchor)} (contract)`:'— set date —')}</span>
                  <span style={{fontSize:10,color:'var(--text-faint)'}}>✎</span>
                </div>
              )}
              {countdown}
            </div>
          );
        })()}
        <SLABadge project={project}/>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          {(()=>{
            const CITY_RESOURCES={
              'San Diego':{ zoningMap:'https://experience.arcgis.com/experience/dd3f4e26f10c4cf9a3101ca096c2eaa5#zoom_to_selection=true', municipalCode:'https://www.sandiego.gov/city-clerk/officialdocs/municipal-code/chapter-13' },
              'Irvine':{ zoningMap:'https://www.cityofirvine.org/community-development/planning/zoning', municipalCode:'https://library.municode.com/ca/irvine/codes/zoning' },
              'Carlsbad':{ zoningMap:'https://www.carlsbadca.gov/services/depts/planning/zoning.asp', municipalCode:'https://library.municode.com/ca/carlsbad/codes/code_of_ordinances?nodeId=TIT21ZO' },
              'San Clemente':{ zoningMap:'https://san-clemente.org/departments/community-development/planning/', municipalCode:'https://library.municode.com/ca/san_clemente/codes/code_of_ordinances?nodeId=TIT17ZO' },
              'Mission Viejo':{ zoningMap:'https://cityofmissionviejo.org/departments/planning/', municipalCode:'https://library.municode.com/ca/mission_viejo/codes/code_of_ordinances?nodeId=TIT9LAUSDE' },
              'Rancho Santa Margarita':{ zoningMap:'https://www.cityofrsm.org/city-hall/departments/community-development/planning', municipalCode:'https://library.municode.com/ca/rancho_santa_margarita/codes/code_of_ordinances' },
            };
            const res=CITY_RESOURCES[project.city];
            if(!res) return null;
            const open=u=>window.electronAPI?.openExternal(u)||window.open(u,'_blank');
            return(<>
              <button onClick={()=>open(res.zoningMap)} style={{padding:'4px 10px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid #2196f3',color:'#2196f3',background:'none'}} title={`${project.city} Zoning Map`}>🗺 Zoning Map</button>
              <button onClick={()=>open(res.municipalCode)} style={{padding:'4px 10px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid #2196f3',color:'#2196f3',background:'none'}} title={`${project.city} Municipal Code`}>📋 Municipal Code</button>
            </>);
          })()}
          <button onClick={onDelete} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid #e74c3c',color:'#e74c3c',background:'none'}}>Delete</button>
          <button onClick={onWorkflow} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-muted)',background:'none'}}>Workflow</button>
          <button onClick={onAssign} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-muted)',background:'none'}}>Assign Team</button>
          <button onClick={onContracts} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid #f0a842',color:'#f0a842',background:'none'}}>Contracts</button>
          <button onClick={onBack} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-body)',background:'none',fontWeight:700}}>✕ Close</button>
        </div>
      </div>
      {/* ROW 1 — 50/50 */}
      <div style={{display:'flex',gap:20,alignItems:'flex-start',marginBottom:20}}>
        <div style={{flex:'0 0 calc(50% - 10px)',minWidth:0}}>
          <div style={{...S.card}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:24}}>
              <div style={{flexShrink:0,textAlign:'center',minWidth:64}}>
                <div style={{fontSize:36,fontWeight:700,color:'var(--accent)',fontFamily:'monospace',lineHeight:1}}>W{currentWeek}</div>
                <div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',letterSpacing:'1px',marginTop:2}}>of 8</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'2px',marginBottom:6}}>
                  This Week · {currentBucket?.label||'—'}
                </div>
                {!project.start?(
                  <div style={{fontSize:11,color:'var(--text-faint)',fontFamily:'monospace'}}>Set a start date to activate the milestone tracker</div>
                ):slaStatus.isExternal?(
                  <div style={{fontSize:11,color:'var(--status-hold-text)',fontFamily:'monospace'}}>⏸ SLA paused — external review in progress</div>
                ):(
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {dueThisWeek.map(step=>{
                      const done=step.status==='Completed';
                      const ip=step.status==='In Progress';
                      return(
                        <div key={step.id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:4,background:done?'var(--status-done-bg)':ip?'var(--status-ip-bg)':'var(--bg-subtle)',border:`1px solid ${done?'var(--status-done-text)':ip?'#3498db33':'var(--border-primary)'}`}}>
                          <span style={{fontSize:10,fontWeight:700,fontFamily:'monospace',color:done?'var(--status-done-text)':ip?'#3498db':'var(--text-faint)'}}>{done?'✓':ip?'▶':'○'}</span>
                          <span style={{fontSize:9,color:done?'var(--status-done-text)':ip?'#3498db':'var(--text-muted)'}}><span style={{fontFamily:'monospace',fontWeight:700}}>{step.id}</span> {step.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {behindSchedule.length>0&&(
                <div style={{flexShrink:0,minWidth:220,maxWidth:280}}>
                  <div style={{fontSize:9,fontWeight:700,color:'var(--sla-red-text)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:6}}>⚠ Behind Schedule ({behindSchedule.length})</div>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    {behindSchedule.map(step=>(
                      <div key={step.id} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:3,background:'var(--sla-red-bg)'}}>
                        <span style={{fontSize:9,fontWeight:700,fontFamily:'monospace',color:'var(--sla-red-text)'}}>✗</span>
                        <span style={{fontSize:9,color:'var(--sla-red-text)'}}><span style={{fontFamily:'monospace',fontWeight:700}}>{step.id}</span> {step.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{flex:'0 0 calc(50% - 10px)',minWidth:0}}>
          <ContractModule project={project} onUpdate={updates=>onUpdateFields?.(project.id,updates)} inline={true}/>
        </div>
      </div>
      {/* ROW 2 — full width */}
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <ST>Client Info</ST>
          <InfoRow label="Client" value={project.client}/>
          <InfoRow label="Start Date" value={project.start}/>
          <InfoRow label="Contract" value={project.contract>0?fmt$(project.contract):'Not set'}/>
          <InfoRow label="Phase" value={project.phase}/>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>Type</div>
            <select style={{...S.input,fontSize:12}} value={project.type||''} onChange={e=>onUpdateType&&onUpdateType(project.id,e.target.value)}>
              {!PROJECT_TYPES.includes(project.type||'')&&<option value={project.type}>{project.type||'—'}</option>}
              {PROJECT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{marginTop:16,borderTop:'1px solid var(--border-primary)',paddingTop:16}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',fontFamily:'monospace',letterSpacing:'2px',textTransform:'uppercase',marginBottom:10}}>Contact</div>
            <ContactField label="Phone" value={clientPhone} onChange={setClientPhone} onBlur={v=>saveContact('clientPhone',v)} href={clientPhone?`tel:${clientPhone}`:undefined} placeholder="(555) 000-0000"/>
            <ContactField label="Email" value={clientEmail} onChange={setClientEmail} onBlur={v=>saveContact('clientEmail',v)} href={clientEmail?`mailto:${clientEmail}`:undefined} placeholder="client@email.com"/>
            <ContactField label="Address" value={clientAddress} onChange={setClientAddress} onBlur={v=>saveContact('clientAddress',v)} href={clientAddress?`https://maps.google.com/?q=${encodeURIComponent(clientAddress)}`:undefined} placeholder="123 Main St, Los Angeles, CA 90001"/>
          </div>
          <div style={{marginTop:16,borderTop:'1px solid var(--border-primary)',paddingTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* NOTES */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px'}}>Notes</div>
                <button onClick={()=>setEditingNotes(e=>!e)} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',cursor:'pointer',fontSize:9,fontFamily:'monospace',padding:'2px 8px',borderRadius:3}}>{editingNotes?'Done':'Edit'}</button>
              </div>
              {editingNotes?(
                <textarea value={editNotes} onChange={e=>{const v=e.target.value;setEditNotes(v);dbt(`notes-${project.id}`,()=>onUpdateProject(project.id,v));}} style={{...S.input,height:120,resize:'vertical',fontSize:11}} placeholder="Add project notes..." autoFocus/>
              ):(
                <div onClick={()=>setEditingNotes(true)} style={{cursor:'text',minHeight:60,padding:'4px 0'}}>
                  {editNotes.trim()?(
                    editNotes.split('\n').map((line,i)=>{
                      const kv=line.match(/^([^:]{1,30}):\s*(.+)$/);
                      if(kv)return(
                        <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:5}}>
                          <span style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',minWidth:76,textTransform:'uppercase',letterSpacing:'0.5px',paddingTop:1,flexShrink:0}}>{kv[1]}</span>
                          <span style={{fontSize:11,color:'var(--text-body)',wordBreak:'break-all'}}>{kv[2]}</span>
                        </div>
                      );
                      return line.trim()?<p key={i} style={{fontSize:11,color:'var(--text-body)',margin:'0 0 5px 0',lineHeight:1.5}}>{line}</p>:null;
                    })
                  ):(
                    <span style={{fontSize:11,color:'var(--text-ghost)',fontFamily:'monospace'}}>Click to add notes…</span>
                  )}
                </div>
              )}
            </div>
            {/* REMINDERS */}
            <div>
              <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>To Do</div>
              <div style={{marginBottom:8}}>
                {reminders.length===0&&<div style={{fontSize:11,color:'var(--text-ghost)',fontFamily:'monospace',marginBottom:8}}>No reminders yet.</div>}
                {reminders.map((r,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:5}}>
                    <span style={{color:'var(--accent)',fontFamily:'monospace',fontSize:12,flexShrink:0,marginTop:1}}>—</span>
                    <span style={{fontSize:11,color:'var(--text-body)',flex:1,lineHeight:1.4}}>{r}</span>
                    <button onClick={()=>removeReminder(i)} style={{background:'none',border:'none',color:'var(--text-ghost)',cursor:'pointer',fontSize:12,padding:0,lineHeight:1,flexShrink:0}}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:6}}>
                <input value={newReminder} onChange={e=>setNewReminder(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addReminder()} placeholder="Add reminder…" style={{...S.input,fontSize:11,flex:1,padding:'4px 8px'}}/>
                <button onClick={addReminder} style={{background:'var(--accent)',border:'none',color:'#000',cursor:'pointer',fontSize:11,fontFamily:'monospace',fontWeight:700,padding:'4px 10px',borderRadius:4}}>+</button>
              </div>
            </div>
          </div>
        </div>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace'}}>Workflow Progress</div>
            <span style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace'}}>{completedCount}/{PHASES_WILLIS_WORKFLOW.length} · {progressPct}%</span>
          </div>
          <Pb pct={progressPct}/>
          <div style={{marginTop:14}}>
            <div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Internal Steps 5.1–5.20</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
              {internalSteps.map(step=>{const st=getStepStatus(step.id);return<div key={step.id} onClick={()=>onTogglePhase?.(project.id,step.id)} title={`Click to toggle ${step.id}`} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:4,background:SBG[st],cursor:'pointer',userSelect:'none'}}><span style={{fontSize:8,fontFamily:'monospace',color:SCOL[st],fontWeight:700,minWidth:26}}>{step.id}</span><span style={{fontSize:9,color:SCOL[st],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{step.label}</span>{getInstr(step.id)&&<span onClick={e=>{e.stopPropagation();setHowToStepId(howToStepId===step.id?null:step.id);}} style={{fontSize:9,color:SCOL[st],opacity:0.7,cursor:'pointer',marginLeft:4,fontFamily:'monospace',flexShrink:0}}>?</span>}</div>;})}
            </div>
            <div style={{fontSize:9,color:'var(--sla-red-text)',fontFamily:'monospace',letterSpacing:'1px',textTransform:'uppercase',marginTop:12,marginBottom:8}}>External 5.21–5.23 — SLA Paused</div>
            <div style={{display:'flex',gap:6}}>
              {externalSteps.map(step=>{const st=getStepStatus(step.id);return<div key={step.id} onClick={()=>onTogglePhase?.(project.id,step.id)} title={`Click to toggle ${step.id}`} style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:4,background:SBG[st],border:`1px solid ${SCOL[st]}44`,cursor:'pointer',userSelect:'none'}}><span style={{fontSize:9,fontFamily:'monospace',color:SCOL[st],fontWeight:700,minWidth:28}}>{step.id}</span><span style={{fontSize:9,color:SCOL[st],flex:1}}>{step.label}</span>{getInstr(step.id)&&<span onClick={e=>{e.stopPropagation();setHowToStepId(howToStepId===step.id?null:step.id);}} style={{fontSize:9,color:SCOL[st],opacity:0.7,cursor:'pointer',marginLeft:4,fontFamily:'monospace',flexShrink:0}}>?</span>}</div>;})}
            </div>
            {howToStepId&&(()=>{const instr=getInstr(howToStepId);if(!instr)return null;return(
              <div style={{marginTop:16,borderTop:'1px solid var(--border-primary)',paddingTop:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div style={{fontSize:9,color:'var(--text-dim)',fontFamily:'monospace',letterSpacing:'2px',textTransform:'uppercase',marginBottom:3}}>{instr.workflow_step_id} — HOW TO</div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{instr.step_name}</div>
                    {instr.last_updated_by&&<div style={{fontSize:9,color:'var(--text-ghost)',fontFamily:'monospace',marginTop:2}}>v{instr.version} · by {instr.last_updated_by}</div>}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={()=>onEditInstruction(howToStepId)} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',cursor:'pointer',fontSize:9,fontFamily:'monospace',padding:'2px 8px',borderRadius:3}}>Edit</button>
                    <button onClick={()=>setHowToStepId(null)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:14,lineHeight:1}}>✕</button>
                  </div>
                </div>
                {instr.body_text&&<p style={{fontSize:11,color:'var(--text-body)',lineHeight:1.6,margin:'0 0 12px 0'}}>{instr.body_text}</p>}
                {Array.isArray(instr.checklist)&&instr.checklist.length>0&&<div style={{marginBottom:12}}><div style={{fontSize:9,color:'var(--text-dim)',fontFamily:'monospace',letterSpacing:'2px',textTransform:'uppercase',marginBottom:6}}>Checklist</div>{instr.checklist.map((item,i)=><div key={i} style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:4}}><span style={{color:'var(--accent)',fontFamily:'monospace',fontSize:10,marginTop:1}}>☐</span><span style={{fontSize:10,color:'var(--text-body)',lineHeight:1.5}}>{item}</span></div>)}</div>}
                {Array.isArray(instr.links)&&instr.links.length>0&&<div><div style={{fontSize:9,color:'var(--text-dim)',fontFamily:'monospace',letterSpacing:'2px',textTransform:'uppercase',marginBottom:6}}>Links</div>{instr.links.map((lk,i)=><div key={i} style={{marginBottom:4}}><a href={lk.url} target="_blank" rel="noreferrer" style={{fontSize:10,color:'var(--accent)',textDecoration:'none',fontFamily:'monospace'}}>{lk.label||lk.url}</a></div>)}</div>}
              </div>
            );})()}
          </div>
        </div>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace'}}>Payment Milestones</div>
            <div style={{fontSize:11,fontFamily:'monospace',display:'flex',gap:16,flexWrap:'wrap'}}>
              <span style={{color:'var(--status-done-text)'}}>Collected: {fmt$(collected)}</span>
              <span style={{color:'var(--status-hold-text)'}}>Invoiced: {fmt$(invoiced)}</span>
              <span style={{color:'var(--sla-red-text)'}}>Outstanding: {fmt$(totalPmt-collected)}</span>
            </div>
          </div>
          <Pb pct={totalPmt>0?Math.round(collected/totalPmt*100):0} color="var(--status-done-text)"/>
          <div style={{display:'flex',gap:12,marginTop:16,flexWrap:'wrap'}}>
            {milestones.map(m=>(
              <div key={m.code} style={{flex:'1 1 140px',minWidth:130,background:'var(--bg-page)',border:'1px solid var(--border-primary)',borderRadius:8,padding:'12px',borderTop:`3px solid ${PMT_SS[m.status].text}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--accent)',fontFamily:'monospace'}}>{m.code}</span>
                  <button onClick={()=>cyclePmt(m.code)} style={{background:PMT_SS[m.status].bg,color:PMT_SS[m.status].text,border:'none',borderRadius:99,padding:'2px 8px',fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:'monospace'}}>{m.status}</button>
                </div>
                <div style={{fontSize:11,color:'var(--text-bright)',fontWeight:600,marginBottom:2}}>{m.label}</div>
                <div style={{fontSize:9,color:'var(--text-muted)',marginBottom:8}}>{m.desc}</div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text-bright)',fontFamily:'monospace'}}>{fmt$(m.amount)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <ST>Documents</ST>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
            {contractPath?(
              <div style={{background:'var(--bg-page)',border:'1px solid var(--border-primary)',borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,minWidth:220}}>
                <span style={{fontSize:28}}>📄</span>
                <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:11,color:'var(--text-body)',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{contractFilename}</div><div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2}}>Contract PDF</div></div>
                <button onClick={()=>doOpenPath(contractPath)} style={{...S.ghost,padding:'4px 10px',fontSize:10}}>Open</button>
              </div>
            ):(
              <div style={{background:'var(--bg-subtle)',border:'1px dashed var(--border-secondary)',borderRadius:8,padding:'14px 20px',display:'flex',alignItems:'center',gap:10,color:'var(--text-muted)'}}>
                <span style={{fontSize:20}}>📎</span><span style={{fontSize:11}}>No contract PDF attached</span>
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>onPickPDF(project)} style={{...S.ghost,padding:'8px 16px',fontSize:11}}>{contractPath?'↺ Replace PDF':'+ Attach Contract PDF'}</button>
            <button onClick={onAnalyse} style={{...S.ghost,fontSize:11,padding:'8px 16px',border:'1px solid #3498db',color:'#3498db'}}>🔍 Analyse Contract</button>
            <button onClick={onContracts} style={{...S.ghost,fontSize:11,padding:'8px 16px',border:'1px solid #f0a842',color:'#f0a842'}}>+ Add Addendum</button>
          </div>
        </div>
        <div style={S.card}>
          <ST>Scope of Work</ST>
          {(project.scopeOfWork||[]).length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {Object.entries((project.scopeOfWork||[]).reduce((acc,item)=>{const cat=item.category||'Other';(acc[cat]=acc[cat]||[]).push({description:item.description,included:item.included});return acc},{})).map(([cat,items])=>(
                <div key={cat}>
                  <div style={{fontSize:9,fontWeight:700,color:'var(--accent)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:5}}>{cat}</div>
                  {items.map((it,i)=><div key={i} style={{display:'flex',gap:7,alignItems:'flex-start',marginBottom:3}}><span style={{color:it.included==='N'?'var(--status-overdue-text)':'var(--status-done-text)',fontSize:11,fontWeight:700,flexShrink:0}}>{it.included==='N'?'✗':'✓'}</span><span style={{fontSize:11,color:'var(--text-body)',lineHeight:1.4}}>{it.description}</span></div>)}
                </div>
              ))}
            </div>
          ):(
            <div style={{fontSize:11,color:'var(--text-faint)',fontFamily:'monospace'}}>No scope of work — analyse a contract to populate.</div>
          )}
        </div>
        {((project.newWork||[]).length>0||(project.demoWork||[]).length>0)&&<div style={S.card}>
          <ST>New vs Demo</ST>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'var(--status-done-text)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>🔨 New Work ({(project.newWork||[]).length})</div>
              {(project.newWork||[]).length>0?(project.newWork||[]).map((w,i)=><div key={i} style={{display:'flex',gap:7,alignItems:'flex-start',marginBottom:4}}><span style={{color:'var(--status-done-text)',fontSize:12,fontWeight:700,flexShrink:0}}>+</span><span style={{fontSize:11,color:'var(--text-body)',lineHeight:1.4}}>{w}</span></div>):(<div style={{fontSize:11,color:'var(--text-faint)'}}>—</div>)}
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'var(--status-overdue-text)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>🧨 Demo / Remove ({(project.demoWork||[]).length})</div>
              {(project.demoWork||[]).length>0?(project.demoWork||[]).map((w,i)=><div key={i} style={{display:'flex',gap:7,alignItems:'flex-start',marginBottom:4}}><span style={{color:'var(--status-overdue-text)',fontSize:12,fontWeight:700,flexShrink:0}}>−</span><span style={{fontSize:11,color:'var(--text-body)',lineHeight:1.4}}>{w}</span></div>):(<div style={{fontSize:11,color:'var(--text-faint)'}}>—</div>)}
            </div>
          </div>
        </div>}
        <div style={S.card}>
          <ST>Emails</ST>
          {(() => {
            const related = threads.filter(t => matchProject(t.from, t.subject)?.split(' · ')[0] === project.id);
            if (related.length === 0) return (
              <div style={{fontSize:11,color:'var(--text-faint)',fontFamily:'monospace'}}>No emails found</div>
            );
            const fFrom = raw => { const m = raw.match(/^"?([^"<]+)"?\s*</); return m ? m[1].trim() : raw.replace(/<.*>/,'').trim()||raw; };
            const fDate = raw => { if(!raw) return ''; const d=new Date(raw); if(isNaN(d)) return raw; const now=new Date(); if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',...(d.getFullYear()!==now.getFullYear()?{year:'numeric'}:{})}); };
            return (
              <div style={{display:'flex',flexDirection:'column',gap:1}}>
                {related.map(t => (
                  <div key={t.id} onClick={() => onOpenThread?.(t)} style={{background:'var(--bg-page)',border:'1px solid var(--border-primary)',borderRadius:6,padding:'9px 14px',display:'grid',gridTemplateColumns:'160px 1fr auto',gap:'0 12px',alignItems:'center',cursor:onOpenThread?'pointer':'default'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-bright)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.from}>{fFrom(t.from)}</div>
                    <div style={{fontSize:11,color:'var(--text-body)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</div>
                    <div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fDate(t.date)}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
      {renumberOpen&&(
        <div style={S.ov} onClick={()=>!renumberBusy&&setRenumberOpen(false)}>
          <div style={{...S.mod,maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'#e94560',letterSpacing:'2px',fontFamily:'monospace'}}>CHANGE JOB #</div>
              <div style={{fontSize:18,fontWeight:700,color:'var(--text-body)'}}>Renumber Project</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Current: <span style={{fontFamily:'monospace',color:'var(--accent)'}}>{project.id}</span> · {project.name}</div>
            </div>
            <label style={S.label}>New Job Number</label>
            <input
              autoFocus
              value={renumberVal}
              onChange={e=>setRenumberVal(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')doRenumber();if(e.key==='Escape'&&!renumberBusy)setRenumberOpen(false);}}
              placeholder="e.g. 656"
              disabled={renumberBusy}
              style={{...S.input,width:'100%',fontFamily:'monospace',fontSize:14}}
            />
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:8,lineHeight:1.4}}>
              All linked data (payments, city, HOA) will move to the new number. The change applies immediately on cloud and across all computers.
            </div>
            {renumberErr&&<div style={{fontSize:12,color:'#e94560',marginTop:10,padding:'8px 10px',background:'rgba(233,69,96,0.1)',borderRadius:4}}>{renumberErr}</div>}
            <div style={{marginTop:18,display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button style={S.ghost} onClick={()=>setRenumberOpen(false)} disabled={renumberBusy}>Cancel</button>
              <button style={S.btn} onClick={doRenumber} disabled={renumberBusy}>{renumberBusy?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function WorkflowModal({project,projects,setProjects,teamMembers,onClose}){
  const [wf,setWf]=useState(project.workflow&&project.workflow.length>0?project.workflow:generateWorkflow(project.start||new Date().toISOString().slice(0,10),project.designer));
  const [expanded,setExpanded]=useState(null);
  const members=Object.keys(teamMembers);
  const update=(idx,field,val)=>setWf(prev=>prev.map((m,i)=>i===idx?{...m,[field]:val}:m));
  const toggleTask=(mi,ti)=>setWf(prev=>prev.map((m,i)=>i!==mi?m:{...m,tasks:m.tasks.map((t,j)=>j!==ti?t:{...t,done:!t.done})}));
  const cycleStatus=(idx)=>{const o=["Not Started","In Progress","Completed","Blocked"];setWf(prev=>prev.map((m,i)=>i!==idx?m:{...m,status:o[(o.indexOf(m.status)+1)%o.length]}));};
  const _wfInit=useRef(false);
  const _wfLastHash=useRef('');
  useEffect(()=>{
    if(!_wfInit.current){_wfInit.current=true;try{_wfLastHash.current=JSON.stringify(wf);}catch{}return;}
    let h;try{h=JSON.stringify(wf);}catch{h='';}
    if(h===_wfLastHash.current)return;
    _wfLastHash.current=h;
    setProjects(prev=>prev.map(p=>p.id===project.id?{...p,workflow:wf}:p));
  },[wf]);
  const resetDates=()=>setWf(generateWorkflow(wf[0]?.startDate||new Date().toISOString().slice(0,10),project.designer));
  const completedCount=wf.filter(m=>m.status==="Completed").length;
  const pct=Math.round(completedCount/wf.length*100);
  const SC={"Not Started":"#555","In Progress":"#3498db","Completed":"#27ae60","Blocked":"#e74c3c"};

  return(
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:780}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:10,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>PROJECT WORKFLOW 5.1 - 5.23</div>
            <div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginTop:2}}>{project.name}</div>
            <div style={{fontSize:11,color:"#888"}}>{project.id} · {project.city}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.ghost,fontSize:10,borderColor:"#555",color:"#888"}} onClick={resetDates}>Reset Dates</button>
            <button style={{...S.ghost,fontSize:10,borderColor:"#555",color:"#888"}} onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:"monospace",color:"#888",marginBottom:4}}>
            <span>PROGRESS</span><span style={{color:"#e94560"}}>{completedCount}/{wf.length} milestones · {pct}%</span>
          </div>
          <div style={{background:"#0d0d1a",borderRadius:99,height:6,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct===100?"#27ae60":"#e94560",borderRadius:99,transition:"width .4s"}}/></div>
        </div>

        <div style={{maxHeight:560,overflowY:"auto",paddingRight:4}}>
          {wf.map((m,idx)=>{
            const isExp=expanded===idx;
            const sc=SC[m.status]||"#555";
            const isPayment=m.payment!==null&&m.payment!==undefined;
            const tasksDone=m.tasks.filter(t=>t.done).length;
            return(
              <div key={m.milestoneId} style={{marginBottom:5,borderRadius:6,border:`1px solid ${isExp?"#2a2a4a":"#1a1a2e"}`,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:m.status==="Completed"?"#0d1a0d":m.status==="Blocked"?"#1a0d0d":"#0d0d1a",cursor:"pointer"}} onClick={()=>setExpanded(isExp?null:idx)}>
                  <div onClick={e=>{e.stopPropagation();cycleStatus(idx);}} style={{width:18,height:18,borderRadius:"50%",background:sc+"33",border:`2px solid ${sc}`,flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>
                    {m.status==="Completed"&&<span style={{color:"#27ae60"}}>✓</span>}
                    {m.status==="Blocked"&&<span style={{color:"#e74c3c"}}>!</span>}
                    {m.status==="In Progress"&&<span style={{color:"#3498db",fontSize:7}}>●</span>}
                  </div>
                  <span style={{fontSize:10,color:"#e94560",fontFamily:"monospace",minWidth:28,fontWeight:700}}>{m.milestoneId}</span>
                  <span style={{flex:1,fontSize:11,color:m.status==="Completed"?"#52d68a":m.status==="Blocked"?"#e74c3c":"#ccc",fontWeight:m.status==="In Progress"?700:400}}>{m.label}</span>
                  {isPayment&&<span style={{fontSize:9,background:"#f0a84222",color:"#f0a842",border:"1px solid #f0a84244",borderRadius:99,padding:"1px 7px",fontFamily:"monospace"}}>💰 PMT #{m.payment}</span>}
                  <span style={{fontSize:9,color:"#555",fontFamily:"monospace",minWidth:28}}>{tasksDone}/{m.tasks.length}</span>
                  <span style={{fontSize:9,color:"#555",fontFamily:"monospace",minWidth:80}}>{m.startDate}</span>
                  <span style={{color:"#333",fontSize:10}}>{isExp?"▲":"▼"}</span>
                </div>
                {isExp&&(
                  <div style={{padding:"12px 14px",background:"#080810",borderTop:"1px solid #1a1a2e"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
                      <div><label style={S.label}>Status</label><select style={{...S.sel,width:"100%"}} value={m.status} onChange={e=>update(idx,"status",e.target.value)}>{["Not Started","In Progress","Completed","Blocked"].map(s=><option key={s}>{s}</option>)}</select></div>
                      <div><label style={S.label}>Assigned</label><select style={{...S.sel,width:"100%"}} value={m.assigned} onChange={e=>update(idx,"assigned",e.target.value)}>{members.map(n=><option key={n}>{n}</option>)}</select></div>
                      <div><label style={S.label}>Start Date</label><input type="date" style={S.input} value={m.startDate ? String(m.startDate).substring(0,10) : ''} onChange={e=>update(idx,"startDate",fixDateYear(e.target.value))}/></div>
                      <div><label style={S.label}>End Date</label><input type="date" style={S.input} value={m.endDate ? String(m.endDate).substring(0,10) : ''} onChange={e=>update(idx,"endDate",fixDateYear(e.target.value))}/></div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:9,color:"#888",fontFamily:"monospace",letterSpacing:"1px",marginBottom:6}}>TASKS</div>
                      {m.tasks.map((t,ti)=>(
                        <div key={ti} onClick={()=>toggleTask(idx,ti)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:4,marginBottom:3,background:"#0d0d1a",cursor:"pointer"}}>
                          <div style={{width:14,height:14,borderRadius:2,border:`1.5px solid ${t.done?"#27ae60":"#333"}`,background:t.done?"#27ae6033":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.done&&<span style={{fontSize:9,color:"#27ae60"}}>✓</span>}</div>
                          <span style={{fontSize:10,color:t.done?"#52d68a":"#aaa",textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
                        </div>
                      ))}
                    </div>
                    {isPayment&&(()=>{
                      const ctr=project.contracts?.[0];
                      const pm=ctr?.paymentMilestones?.find(p=>p.id===m.payment);
                      return pm?(<div style={{padding:"8px 10px",background:"#1a1000",borderRadius:4,border:"1px solid #f0a84233",marginBottom:10}}>
                        <div style={{fontSize:9,color:"#f0a842",fontFamily:"monospace",marginBottom:2}}>PAYMENT TRIGGER — Milestone #{pm.id}</div>
                        <div style={{fontSize:11,color:"#f0c060"}}>{pm.label}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#f0a842",fontFamily:"monospace",marginTop:2}}>${pm.amount.toLocaleString()} {pm.paid?"PAID":"PENDING"}</div>
                      </div>):null;
                    })()}
                    <div><label style={S.label}>Notes</label><textarea style={{...S.input,height:48,resize:"vertical",fontSize:10}} value={m.notes} onChange={e=>update(idx,"notes",e.target.value)} placeholder="Notes for this milestone..."/></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <button style={S.ghost} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── TEAM SETTINGS MODAL ──────────────────────────────────────────────────────

function AssignModal({project,projects,setProjects,teamMembers,onClose}){
  const [lead,setLead]=useState(project.designer);
  const [team,setTeam]=useState(project.team||[]);
  const [roles,setRoles]=useState(project.teamRoles||{});
  const [notes,setNotes]=useState(project.assignNote||"");
  const toggleMember=(name)=>{if(name===lead)return;setTeam(prev=>prev.includes(name)?prev.filter(m=>m!==name):[...prev,name]);};
  const save=()=>{setProjects(prev=>prev.map(p=>p.id===project.id?{...p,designer:lead,team,teamRoles:roles,assignNote:notes}:p));onClose();};
  const workload=(name)=>projects.filter(p=>(p.designer===name||(p.team||[]).includes(name))&&p.status==="In Progress").length;
  const members=Object.keys(teamMembers);
  return(
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:620}} onClick={e=>e.stopPropagation()}>
        <div style={{marginBottom:20}}><div style={{fontSize:10,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>TEAM ASSIGNMENT</div><div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginTop:2}}>{project.name}</div><div style={{fontSize:11,color:"#888"}}>{project.id} · {project.city}</div></div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,color:"#e94560",fontFamily:"monospace",letterSpacing:"1px",marginBottom:10}}>LEAD DESIGNER</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {members.map(name=>{const isLead=name===lead;const wl=workload(name);const color=teamMembers[name];return(
              <div key={name} onClick={()=>setLead(name)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"10px 12px",borderRadius:8,cursor:"pointer",minWidth:68,background:isLead?"#1a0d1a":"#0d0d1a",border:`2px solid ${isLead?color:"#2a2a4a"}`}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:color+"33",border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color,fontFamily:"monospace"}}>{name[0]}</div>
                <div style={{fontSize:10,color:isLead?"#f0f0f0":"#777",fontWeight:isLead?700:400}}>{name}</div>
                <div style={{fontSize:9,color:wl>=4?"#e74c3c":wl>=2?"#f39c12":"#52d68a",fontFamily:"monospace"}}>{wl} active</div>
                {isLead&&<div style={{fontSize:8,color,fontFamily:"monospace"}}>LEAD</div>}
              </div>
            );})}
          </div>
        </div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,color:"#3498db",fontFamily:"monospace",letterSpacing:"1px",marginBottom:10}}>SUPPORT TEAM <span style={{color:"#444"}}>(click to toggle)</span></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {members.filter(n=>n!==lead).map(name=>{const isIn=team.includes(name);const wl=workload(name);const color=teamMembers[name];return(
              <div key={name} onClick={()=>toggleMember(name)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 10px",borderRadius:8,cursor:"pointer",minWidth:60,background:isIn?"#0a1520":"#0d0d1a",border:`1.5px solid ${isIn?color:"#2a2a4a"}`,opacity:isIn?1:0.55}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:isIn?color+"33":"#1a1a2e",border:`1.5px solid ${isIn?color:"#333"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isIn?color:"#555",fontFamily:"monospace"}}>{name[0]}</div>
                <div style={{fontSize:10,color:isIn?"#ccc":"#555"}}>{name}</div>
                <div style={{fontSize:9,color:wl>=4?"#e74c3c":wl>=2?"#f39c12":"#52d68a",fontFamily:"monospace"}}>{wl} active</div>
              </div>
            );})}
          </div>
          {team.length>0&&<div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {team.map(name=>(
              <div key={name} style={{display:"flex",alignItems:"center",gap:8,background:"#0a0a15",padding:"7px 10px",borderRadius:6,border:"1px solid #1e1e3a"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:teamMembers[name]+"33",border:`1.5px solid ${teamMembers[name]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:teamMembers[name],fontFamily:"monospace",flexShrink:0}}>{name[0]}</div>
                <span style={{fontSize:10,color:"#aaa",minWidth:48}}>{name}</span>
                <select style={{...S.sel,fontSize:9,flex:1,padding:"2px 5px"}} value={roles[name]||""} onChange={e=>setRoles(r=>({...r,[name]:e.target.value}))}>
                  <option value="">Role...</option>
                  {TEAM_ROLES.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            ))}
          </div>}
        </div>
        <div style={{background:"#0a0a15",borderRadius:6,padding:"10px 12px",marginBottom:14,border:"1px solid #1e1e3a"}}>
          <div style={{fontSize:9,color:"#555",fontFamily:"monospace",letterSpacing:"1px",marginBottom:6}}>WORKLOAD</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[lead,...team].map(name=>{const wl=workload(name);return(
              <div key={name} style={{flex:1,minWidth:70}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,fontSize:9,fontFamily:"monospace"}}><span style={{color:teamMembers[name]}}>{name}</span><span style={{color:wl>=5?"#e74c3c":wl>=3?"#f39c12":"#52d68a"}}>{wl}/6</span></div>
                <div style={{background:"#1a1a2e",borderRadius:99,height:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(wl/6*100,100)+"%",background:wl>=5?"#e74c3c":wl>=3?"#f39c12":"#52d68a",borderRadius:99}}/></div>
              </div>
            );})}
          </div>
        </div>
        <div style={{marginBottom:14}}><label style={S.label}>Assignment Note</label><textarea style={{...S.input,height:56,resize:"vertical",fontSize:11}} placeholder="Instructions for the team..." value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Cancel</button><button style={S.btn} onClick={save}>Save Assignment</button></div>
      </div>
    </div>
  );
}


export { PDFPanel, PaymentPanel, CityPanel, HOAPanel, ProjectDetail, WorkflowModal, AssignModal };
