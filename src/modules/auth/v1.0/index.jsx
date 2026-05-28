import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { S, fmt$, doOpenPath, parseNotes, Av, Sb, Pb, ST, SLABadge, getSLAStatus, calculateZone, STATUS_COLOR, PRIORITY_COLOR, DC_INIT, WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE, PHASES_WILLIS_WORKFLOW, makeDefaultPhases, addDays, EXTERNAL_IDS, WEEK_BUCKETS, getProjectMilestones, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_BADGE, CITY_STATUS_DOT, CITY_DEFAULTS, CITY_EMPTY, getCityData, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_BADGE, HOA_STATUS_DOT, HOA_REQUIRED_IDS, HOA_EMPTY, getHOAData, CONTRACT_TEMPLATE, NELSON_CONTRACT, fixDateYear, API_BASE, ANTHROPIC_API_KEY, dbt, sbClient, PHASES } from "../../../shared/core.jsx";

function LoginScreen({sbClient}){
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const signIn=async()=>{
    setLoading(true);setErr('');
    const{error}=await sbClient.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo:`${API_BASE}/api/auth/callback`},
    });
    if(error){setErr(error.message);setLoading(false);}
  };
  return(
    <div style={{position:'fixed',inset:0,background:'var(--bg-page)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:0,zIndex:9999}}>
      <div style={{textAlign:'center',maxWidth:400,padding:'0 24px'}}>
        <div style={{fontSize:36,fontWeight:700,color:'var(--accent)',fontFamily:'monospace',letterSpacing:'4px',marginBottom:8}}>TRUPLANS</div>
        <div style={{fontSize:13,color:'var(--text-muted)',fontFamily:'monospace',letterSpacing:'2px',marginBottom:48}}>PROJECT MANAGEMENT DASHBOARD</div>
        <button
          onClick={signIn}
          disabled={loading||!sbClient}
          style={{display:'flex',alignItems:'center',gap:12,background:'#fff',color:'#1a1a1a',border:'none',borderRadius:8,padding:'14px 28px',fontSize:14,fontWeight:600,cursor:loading||!sbClient?'default':'pointer',opacity:loading||!sbClient?0.6:1,margin:'0 auto',boxShadow:'0 2px 12px rgba(0,0,0,0.3)'}}
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          {loading?'Redirecting…':'Sign in with Google'}
        </button>
        {err&&<div style={{marginTop:16,fontSize:11,color:'var(--sla-red-text)',fontFamily:'monospace'}}>{err}</div>}
        <div style={{marginTop:48,fontSize:10,color:'var(--text-faint)',fontFamily:'monospace',letterSpacing:'1px'}}>TruPlans Inc. · Internal Use Only</div>
      </div>
    </div>
  );
}


export { LoginScreen };
