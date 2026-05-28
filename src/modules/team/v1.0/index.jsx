import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { S, fmt$, doOpenPath, parseNotes, Av, Sb, Pb, ST, SLABadge, getSLAStatus, calculateZone, STATUS_COLOR, PRIORITY_COLOR, DC_INIT, WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE, PHASES_WILLIS_WORKFLOW, makeDefaultPhases, addDays, EXTERNAL_IDS, WEEK_BUCKETS, getProjectMilestones, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_BADGE, CITY_STATUS_DOT, CITY_DEFAULTS, CITY_EMPTY, getCityData, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_BADGE, HOA_STATUS_DOT, HOA_REQUIRED_IDS, HOA_EMPTY, getHOAData, CONTRACT_TEMPLATE, NELSON_CONTRACT, fixDateYear, API_BASE, ANTHROPIC_API_KEY, dbt, sbClient, PHASES } from "../../../shared/core.jsx";

function TeamSettingsModal({teamMembers,setTeamMembers,onClose}){
  const [members,setMembers]=useState({...teamMembers});
  const [newName,setNewName]=useState("");
  const [newColor,setNewColor]=useState(PALETTE[0]);
  const [error,setError]=useState("");
  const addMember=()=>{const name=newName.trim();if(!name){setError("Name required");return;}if(members[name]){setError("Already exists");return;}setMembers(prev=>({...prev,[name]:newColor}));setNewName("");setError("");const next=PALETTE.find(c=>!Object.values(members).includes(c))||PALETTE[0];setNewColor(next);};
  const removeMember=(name)=>{if(Object.keys(members).length<=1){setError("Need at least one member");return;}const u={...members};delete u[name];setMembers(u);};
  const changeColor=(name,color)=>setMembers(prev=>({...prev,[name]:color}));
  const save=()=>{setTeamMembers(members);onClose();};
  return(
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <div style={{marginBottom:20}}><div style={{fontSize:10,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>SETTINGS</div><div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginTop:2}}>Team Members</div></div>
        <div style={{marginBottom:16}}>
          {Object.entries(members).map(([name,color])=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,marginBottom:6,background:"#0d0d1a",border:"1px solid #1e1e3a"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:color+"33",border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color,fontFamily:"monospace",flexShrink:0}}>{name[0]}</div>
              <span style={{width:70,flexShrink:0,fontSize:12,color:"#e0e0e0"}}>{name}</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:3,width:200,flexShrink:0}}>{PALETTE.map(c=><div key={c} onClick={()=>changeColor(name,c)} style={{width:13,height:13,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?"2px solid #fff":"1px solid transparent"}}/>)}</div>
              <button onClick={()=>removeMember(name)} style={{flexShrink:0,background:"none",border:"1px solid #e74c3c44",color:"#e74c3c",borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:11}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{background:"#0a0a15",border:"1px solid #2a2a4a",borderRadius:8,padding:"14px",marginBottom:16}}>
          <div style={{fontSize:10,color:"#e94560",fontFamily:"monospace",marginBottom:10}}>+ ADD MEMBER</div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:8}}>
            <div style={{flex:1}}><label style={S.label}>Name</label><input style={S.input} placeholder="First name..." value={newName} onChange={e=>{setNewName(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&addMember()}/></div>
          </div>
          <div style={{display:"flex",gap:3,marginBottom:8}}>{PALETTE.map(c=><div key={c} onClick={()=>setNewColor(c)} style={{width:18,height:18,borderRadius:"50%",background:c,cursor:"pointer",border:newColor===c?"2.5px solid #fff":"2px solid transparent"}}/>)}</div>
          {error&&<div style={{color:"#e74c3c",fontSize:11,marginBottom:8}}>{error}</div>}
          <button style={{...S.btn,width:"100%"}} onClick={addMember}>Add Member</button>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Cancel</button><button style={S.btn} onClick={save}>Save</button></div>
      </div>
    </div>
  );
}

// ── TEAM ASSIGNMENT MODAL ────────────────────────────────────────────────────

function UserSelectModal({teamMembers,onSelect}){
  const [sel,setSel]=useState(Object.keys(teamMembers)[0]||'Radovan');
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border-primary)',borderRadius:12,padding:'36px 32px',width:340,textAlign:'center',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
        <div style={{fontSize:36,marginBottom:12}}>👋</div>
        <div style={{fontSize:18,fontWeight:700,color:'var(--text-bright)',marginBottom:6}}>Who are you?</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:24,lineHeight:1.5}}>Tasks will default to showing your work.</div>
        <select value={sel} onChange={e=>setSel(e.target.value)} style={{...S.input,fontSize:14,marginBottom:20,textAlign:'center'}}>
          {Object.keys(teamMembers).sort().map(n=><option key={n}>{n}</option>)}
        </select>
        <button onClick={()=>onSelect(sel)} style={{...S.btn,width:'100%',fontSize:13,padding:'10px 0'}}>Let's go →</button>
      </div>
    </div>
  );
}

const _fn=p=>p.client?p.client.trim().split(/\s+/)[0]:'there';
const _td=()=>new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

const EMAIL_TEMPLATES=[
  { id:'design-meeting', label:'Design Meeting', icon:'📐',
    subject:p=>`Design Meeting Confirmation — ${p.client||'Client'} | TruPlans`,
    body:(p,x)=>`Hi ${_fn(p)},

I hope this message finds you well! We're excited to confirm your upcoming design meeting with TruPlans.

📅 Meeting Details:
• Project: ${p.name} (Job #${p.id})
• Property: ${x.address||p.city||'TBD'}
• Meeting Format: In-Person / Zoom (link below)
• Zoom Link: [INSERT ZOOM LINK HERE]

To make the most of our time together, please come prepared with:
✓ Any inspiration photos or Pinterest boards
✓ Questions about the project scope and deliverables
✓ Ideas for finishes, materials, or layout preferences
✓ Any HOA guidelines or architectural restrictions you're aware of

Our design meeting is your opportunity to shape the vision for your project. We'll review the existing conditions, walk through design options, and align on next steps toward construction documents.

Please reply to confirm you received this email, and let us know if you have any scheduling questions.

Looking forward to meeting with you!

Warm regards,
${p.designer}
TruPlans Design Team
📞 [Phone Number]
✉️ [Email Address]
www.truplans.com`,
  },
  { id:'city-submittal', label:'City Submittal', icon:'🏛',
    subject:p=>`Plans Submitted to City — ${p.client||'Client'} | TruPlans`,
    body:(p,x)=>`Hi ${_fn(p)},

Great news — we have officially submitted your architectural plans to the city building department!

📋 Submittal Details:
• Project: ${p.name} (Job #${p.id})
• Property: ${x.address||p.city||'TBD'}
• City / Jurisdiction: ${x.jurisdiction||p.city||'TBD'}
• Plan Check #: ${x.planCheckNumber||'[Pending — will update once assigned]'}
• Date Submitted: ${_td()}

⏱ What to Expect:
The city plan check process typically takes 4–6 weeks for initial review. During this time, the city may issue correction comments, which our team will address promptly on your behalf. You do not need to contact the city directly — all correspondence will be handled by TruPlans.

📌 Important Reminder:
Per your contract (§5.0), all plan check and permit fees are the homeowner's responsibility and are paid directly to the city. We will notify you when payment is required.

We will keep you updated at every stage of the process. Please don't hesitate to reach out with any questions.

Best regards,
${p.designer}
TruPlans Design Team
📞 [Phone Number]
✉️ [Email Address]
www.truplans.com`,
  },
  { id:'hoa-submittal', label:'HOA Submittal', icon:'🏠',
    subject:p=>`HOA Submittal Update — ${p.client||'Client'} | TruPlans`,
    body:(p,x)=>`Hi ${_fn(p)},

We're pleased to inform you that your architectural plans have been submitted to your Homeowners Association for approval.

📋 HOA Submittal Details:
• Project: ${p.name} (Job #${p.id})
• Property: ${x.address||p.city||'TBD'}
• HOA / Management Company: ${x.hoaName||'[HOA Name]'}
• Date Submitted: ${_td()}
• Expected Response: 4–6 weeks (varies by HOA)

📌 What Happens Next:
Your HOA will review the plans and either approve, request revisions, or request additional information. In the event revisions are requested, we will coordinate the updates and resubmit on your behalf.

HOA Contact Information:
• Contact: ${x.hoaContact||'[HOA Contact Name]'}
• Phone: ${x.hoaPhone||'[HOA Phone]'}
• Email: ${x.hoaEmail||'[HOA Email]'}

Please note that HOA application fees and deposits are the homeowner's responsibility per your contract agreement. We will notify you immediately upon receiving the HOA's decision.

Best regards,
${p.designer}
TruPlans Design Team
📞 [Phone Number]
✉️ [Email Address]
www.truplans.com`,
  },
  { id:'payment-reminder', label:'Payment Reminder', icon:'💰',
    subject:p=>`Payment Due — ${p.client||'Client'} | TruPlans Project ${p.id}`,
    body:(p,x)=>`Hi ${_fn(p)},

I hope all is going well with your project! This is a friendly reminder that a payment milestone is now due.

💳 Payment Details:
• Project: ${p.name} (Job #${p.id})
• Milestone: ${x.milestoneName||'[Milestone Name]'}
• Amount Due: ${x.milestoneAmount||'[Amount]'}
• Due: Upon receipt of this notice

Payment Options:
• Preferred: Direct bank transfer (Zelle / ACH) — no processing fee
• Credit / Debit Card: Accepted with a 2.9% surcharge
• Check: Payable to TruPlans Inc. — please reference Job #${p.id}

Per your contract agreement (§3.0), timely payments ensure your project remains on schedule. Late payments are subject to a 3% weekly penalty. If you have any questions about your invoice or need to discuss payment arrangements, please contact us right away.

If you have already submitted payment, please disregard this notice — thank you!

Best regards,
${p.designer}
TruPlans Design Team
📞 [Phone Number]
✉️ [Email Address]
www.truplans.com`,
  },
  { id:'permit-approved', label:'Permit Approved!', icon:'✅',
    subject:p=>`Permit Approved! — ${p.client||'Client'} | TruPlans`,
    body:(p,x)=>`Hi ${_fn(p)},

We have excellent news — your building permit has been approved! 🎉

🏆 Permit Details:
• Project: ${p.name} (Job #${p.id})
• Property: ${x.address||p.city||'TBD'}
• Permit Number: ${x.permitNumber||'[Permit Number]'}
• Issued By: ${x.jurisdiction||'City Building Department'}
• Approval Date: ${_td()}

🔨 Next Steps:
Your approved plans will now be coordinated with your contractor to begin construction. Here is what to expect:

1. Pre-Construction Meeting — Your contractor will schedule a walkthrough to review the approved plans, timeline, and site logistics
2. Material Confirmation — Please confirm any remaining material or finish selections before work begins
3. Site Preparation — Contractor will set up site protection and temporary facilities
4. Construction Begins — Estimated start: ${x.estStart||'[To be confirmed with contractor]'}

📌 Important Reminders:
• The approved permit must be visibly posted on-site during all construction phases
• Keep your copy of the approved stamped plans in a safe place
• All inspections will be coordinated by your contractor

This is a major milestone — congratulations on getting here! We're proud to have guided your project through design and permitting. For questions regarding construction next steps, please coordinate directly with your contractor.

Best regards,
${p.designer}
TruPlans Design Team
📞 [Phone Number]
✉️ [Email Address]
www.truplans.com`,
  },
];


export { TeamSettingsModal, UserSelectModal };
