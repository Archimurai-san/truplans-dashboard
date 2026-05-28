import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { S, fmt$, doOpenPath, parseNotes, Av, Sb, Pb, ST, SLABadge, getSLAStatus, calculateZone, STATUS_COLOR, PRIORITY_COLOR, DC_INIT, WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE, PHASES_WILLIS_WORKFLOW, makeDefaultPhases, addDays, EXTERNAL_IDS, WEEK_BUCKETS, getProjectMilestones, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_BADGE, CITY_STATUS_DOT, CITY_DEFAULTS, CITY_EMPTY, getCityData, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_BADGE, HOA_STATUS_DOT, HOA_REQUIRED_IDS, HOA_EMPTY, getHOAData, CONTRACT_TEMPLATE, NELSON_CONTRACT, fixDateYear, API_BASE, ANTHROPIC_API_KEY, dbt, sbClient, PHASES } from "../../../shared/core.jsx";

function NotificationPanel({prefs,history,onClose,onUpdatePrefs}){
  const DEF={enabled:true,redZone:true,week78:true,payment:true,workflow:false};
  const p={...DEF,...prefs};
  const tog=k=>onUpdatePrefs({...p,[k]:!p[k]});
  const TYPE_COLOR={red:'var(--sla-red-text)',amber:'var(--status-hold-text)',payment:'var(--kpi-4)',workflow:'#3498db',summary:'var(--text-muted)'};
  const TYPE_LABEL={red:'🔴 RED ZONE',amber:'🟡 Week 7/8',payment:'💰 Payment',workflow:'📋 Workflow',summary:'📊 Summary'};
  return(
    <div style={{position:'fixed',top:0,right:0,width:'340px',height:'100vh',background:'var(--bg-card)',borderLeft:'2px solid var(--border-primary)',zIndex:185,display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border-primary)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:700,color:'var(--text-bright)'}}>🔔 Notifications</div>
        <button onClick={onClose} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:12}}>Settings</div>
        {[['enabled','🔔 Notifications enabled'],['redZone','🔴 RED ZONE alerts'],['week78','🟡 Week 7 & 8 warnings'],['payment','💰 Payment milestone alerts'],['workflow','📋 Workflow stuck alerts (14+ days)']].map(([k,label])=>(
          <label key={k} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,cursor:'pointer',padding:'6px 8px',borderRadius:4,background:'var(--bg-page)',border:'1px solid var(--border-primary)'}}>
            <input type="checkbox" checked={!!p[k]} onChange={()=>tog(k)} style={{width:15,height:15,cursor:'pointer'}}/>
            <span style={{fontSize:11,color:'var(--text-body)'}}>{label}</span>
          </label>
        ))}
        <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:12,marginTop:20}}>Recent ({history.length})</div>
        {history.length===0&&<div style={{fontSize:11,color:'var(--text-faint)',textAlign:'center',padding:'20px 0'}}>No notifications yet</div>}
        {history.slice(0,30).map((h,i)=>(
          <div key={i} style={{padding:'8px 10px',borderRadius:6,marginBottom:5,background:'var(--bg-page)',border:'1px solid var(--border-primary)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:9,color:TYPE_COLOR[h.type]||'var(--text-muted)',fontFamily:'monospace',fontWeight:700}}>{TYPE_LABEL[h.type]||h.type}</span>
              <span style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace'}}>{h.date}</span>
            </div>
            <div style={{fontSize:11,color:'var(--text-body)'}}>{h.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PROJECT_TYPES=["Room Addition","ADU - New","ADU - Garage Conv.","Garage Conv.","Commercial Int.","High Ceiling Conv.","Single Story Addition","Two Story Addition","Simple Remodel","Open Concept Remodel","Whole House Makeover","Build a Deck","Patio Cover","Build a Garage"];

export { NotificationPanel };
