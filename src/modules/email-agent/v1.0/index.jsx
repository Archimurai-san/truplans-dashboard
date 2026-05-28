import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { S, fmt$, doOpenPath, parseNotes, Av, Sb, Pb, ST, SLABadge, getSLAStatus, calculateZone, STATUS_COLOR, PRIORITY_COLOR, DC_INIT, WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE, PHASES_WILLIS_WORKFLOW, makeDefaultPhases, addDays, EXTERNAL_IDS, WEEK_BUCKETS, getProjectMilestones, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_BADGE, CITY_STATUS_DOT, CITY_DEFAULTS, CITY_EMPTY, getCityData, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_BADGE, HOA_STATUS_DOT, HOA_REQUIRED_IDS, HOA_EMPTY, getHOAData, CONTRACT_TEMPLATE, NELSON_CONTRACT, fixDateYear, API_BASE, ANTHROPIC_API_KEY, dbt, sbClient, PHASES } from "../../../shared/core.jsx";

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


function EmailModal({project,extra,onClose,onLog}){
  const [activeIdx,setActiveIdx]=useState(0);
  const [subject,setSubject]=useState(()=>EMAIL_TEMPLATES[0].subject(project));
  const [body,setBody]=useState(()=>EMAIL_TEMPLATES[0].body(project,extra));
  const [copied,setCopied]=useState(false);
  const [logged,setLogged]=useState(false);
  const [openFeedback,setOpenFeedback]=useState(false);
  const [showFallback,setShowFallback]=useState(false);

  const switchTmpl=idx=>{
    setActiveIdx(idx);
    setSubject(EMAIL_TEMPLATES[idx].subject(project));
    setBody(EMAIL_TEMPLATES[idx].body(project,extra));
    setCopied(false);setLogged(false);setOpenFeedback(false);setShowFallback(false);
  };

  const copyAll=()=>{
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  const openEmailApp=async()=>{
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    const gmailUrl=`https://mail.google.com/mail/u/0/?view=cm&fs=1&su=${encodeURIComponent(subject)}`;
    try{
      await window.electronAPI.openExternal(gmailUrl);
      setOpenFeedback(true);setTimeout(()=>setOpenFeedback(false),5000);
    }catch(e){
      setShowFallback(true);
    }
  };

  const logSent=()=>{
    onLog(project.id,{date:new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}),template:EMAIL_TEMPLATES[activeIdx].label,subject});
    setLogged(true);setTimeout(()=>setLogged(false),2000);
  };

  const charCount=(subject.length+body.length).toLocaleString();

  return(
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:900,height:'88vh',display:'flex',flexDirection:'column',position:'relative'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexShrink:0}}>
          <div>
            <div style={{fontSize:10,color:'var(--accent)',letterSpacing:'2px',fontFamily:'monospace',fontWeight:700}}>EMAIL TEMPLATES</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--text-bright)'}}>{project.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>{project.client}{extra.email&&` · ${extra.email}`}</div>
          </div>
          <button onClick={onClose} style={{...S.ghost,padding:'4px 10px',fontSize:16,lineHeight:1}}>✕</button>
        </div>

        <div style={{display:'flex',gap:16,flex:1,minHeight:0}}>
          <div style={{width:148,flexShrink:0,display:'flex',flexDirection:'column',gap:4}}>
            <div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',letterSpacing:'1px',textTransform:'uppercase',marginBottom:6}}>Templates</div>
            {EMAIL_TEMPLATES.map((t,i)=>(
              <button key={t.id} onClick={()=>switchTmpl(i)} style={{background:activeIdx===i?'var(--accent)':'transparent',color:activeIdx===i?'#fff':'var(--text-muted)',border:`1px solid ${activeIdx===i?'var(--accent)':'var(--border-secondary)'}`,borderRadius:4,padding:'7px 10px',cursor:'pointer',textAlign:'left',fontSize:11,fontFamily:'monospace',display:'flex',alignItems:'center',gap:6,width:'100%'}}>
                <span>{t.icon}</span><span style={{fontWeight:activeIdx===i?700:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.label}</span>
              </button>
            ))}
          </div>

          <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,minHeight:0}}>
            <div style={{flexShrink:0}}>
              <div style={S.label}>Subject</div>
              <input value={subject} onChange={e=>setSubject(e.target.value)} style={{...S.input,fontSize:12}}/>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
              <div style={S.label}>Body</div>
              <textarea value={body} onChange={e=>setBody(e.target.value)} style={{...S.input,flex:1,resize:'none',fontSize:11,lineHeight:1.65,fontFamily:'Georgia,serif'}}/>
            </div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTop:'1px solid var(--border-primary)',flexShrink:0}}>
          <span style={{fontSize:10,color:'var(--text-faint)',fontFamily:'monospace'}}>{charCount} characters</span>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <button onClick={logSent} style={{...S.ghost,fontSize:10,padding:'5px 12px',borderColor:logged?'var(--status-done-text)':'var(--border-secondary)',color:logged?'var(--status-done-text)':'var(--text-muted)'}}>
              {logged?'✓ Logged':'📋 Log Sent'}
            </button>
            <button onClick={copyAll} style={{...S.ghost,fontSize:10,padding:'5px 12px',background:copied?'var(--status-done-bg)':'transparent',color:copied?'var(--status-done-text)':'var(--accent)',borderColor:copied?'var(--status-done-text)':'var(--accent)'}}>
              {copied?'✓ Copied!':'📋 Copy to Clipboard'}
            </button>
            <button onClick={openEmailApp} style={{...S.btn,fontSize:10,padding:'5px 14px',background:openFeedback?'#27ae60':'var(--accent)'}}>
              {openFeedback?'✓ Gmail opened — paste body in':'✉️ Open in Gmail'}
            </button>
          </div>
        </div>

        {showFallback&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',borderRadius:10,display:'flex',flexDirection:'column',padding:24,zIndex:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#f0f0f0'}}>Could not open browser — copy this manually</div>
                <div style={{fontSize:11,color:'#888',marginTop:2}}>Select all and copy, then paste into your email client</div>
              </div>
              <button onClick={()=>setShowFallback(false)} style={{background:'none',border:'1px solid #444',color:'#888',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:14}}>✕</button>
            </div>
            <textarea readOnly value={`Subject: ${subject}\n\n${body}`} style={{...S.input,flex:1,resize:'none',fontSize:11,lineHeight:1.6,fontFamily:'Georgia,serif'}} onClick={e=>e.target.select()}/>
            <button onClick={()=>{navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);setShowFallback(false);}} style={{...S.btn,marginTop:10,width:'100%'}}>📋 Copy All to Clipboard &amp; Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

const PROJECT_CONTACTS = {
  'mjwjr11@gmail.com':          '637-W · Walker',
  'wendytan1213@gmail.com':     '638 · Tan',
  'attiaarbios@gmail.com':      '624 · Attia-Arbios',
  'ashishvdeshpande@gmail.com': '647 · Deshpande',
  'lenibenbicaco@gmail.com':    '649 · Benbicaco',
};

const SUBJECT_KEYWORDS = [
  ['DESHPANDE',      '647 · Deshpande'],
  ['SHAH',           '626 · Shah'],
  ['WALKER',         '637-W · Walker'],
  ['ALSACE',         '637-W · Walker'],
  ['TAN',            '638 · Tan'],
  ['MARBELLA',       '638 · Tan'],
  ['CANTILENA',      '638 · Tan'],
  ['ATTIA',          '624 · Attia-Arbios'],
  ['ARBIOS',         '624 · Attia-Arbios'],
  ['CASTLE ROCK',    '624 · Attia-Arbios'],
  ['BENBICACO',      '649 · Benbicaco'],
  ['SANTA CATALINA', '649 · Benbicaco'],
  ['PEECHA',         '648 · Peecha-Gonzalez'],
  ['GONZALEZ',       '648 · Peecha-Gonzalez'],
  ['ROTHERHAM',      '648 · Peecha-Gonzalez'],
  ['IYER',           '621 · Iyer'],
  ['CHAPPALLI',      '629 · Chappalli'],
  ['THOMPSON',       '645 · Thompson'],
  ['GREY',           '651 · Grey'],
  ['LARSON',         '610 · Larson'],
  ['SAMIA',          '637-S · Samia'],
  ['BROWN',          '642 · Brown'],
  ['DOYLE',          '634 · Doyle'],
  ['MONTERREY',      '528 · Monterrey'],
];

function matchProject(from, subject = '') {
  const m = from.match(/<([^>]+)>/);
  const email = (m ? m[1] : from).toLowerCase().trim();
  if (PROJECT_CONTACTS[email]) return PROJECT_CONTACTS[email];
  const sub = (subject || '').toUpperCase();
  for (const [kw, label] of SUBJECT_KEYWORDS) {
    if (sub.includes(kw)) return label;
  }
  return null;
}


function Inbox({ projects = [], onOpenProject, threads = [], onSetThreads, initialThread = null, onInitialThreadConsumed, searchFilter = '', userEmail = '' }) {
  const [connected, setConnected] = useState(null);
  const [gmailEmail, setGmailEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadContent, setThreadContent] = useState(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);

  const checkStatus = () => {
    setLoading(true);
    setError(null);
    const url = userEmail
      ? `${API_BASE}/api/gmail/token/${encodeURIComponent(userEmail)}`
      : `${API_BASE}/api/gmail/status`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setConnected(data.connected);
        if (data.gmailEmail) setGmailEmail(data.gmailEmail);
        if (data.connected) return fetchThreads();
        setLoading(false);
      })
      .catch(() => { setError('Cannot reach server'); setLoading(false); });
  };

  const fetchThreads = () => {
    const url = userEmail
      ? `${API_BASE}/api/gmail/list?userEmail=${encodeURIComponent(userEmail)}`
      : `${API_BASE}/api/gmail/list`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); } else { onSetThreads?.(data); }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load emails'); setLoading(false); });
  };

  const openThread = (t) => {
    setSelectedThread(t);
    setThreadContent({ loading: true, error: null });
    setReplyOpen(false); setReplyBody(''); setReplyStatus(null);
    const url = userEmail
      ? `${API_BASE}/api/gmail/thread/${t.id}?userEmail=${encodeURIComponent(userEmail)}`
      : `${API_BASE}/api/gmail/thread/${t.id}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) setThreadContent({ loading: false, error: data.error });
        else setThreadContent({ loading: false, error: null, ...data });
      })
      .catch(() => setThreadContent({ loading: false, error: 'Failed to load email' }));
  };

  const closeThread = () => { setSelectedThread(null); setThreadContent(null); setReplyOpen(false); setReplyBody(''); setReplyStatus(null); };

  const sendReply = () => {
    if (!replyBody.trim() || !selectedThread) return;
    setReplySending(true); setReplyStatus(null);
    const to = selectedThread.from.match(/<([^>]+)>/)?.[1] || selectedThread.from;
    fetch(`${API_BASE}/api/gmail/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: selectedThread.id, to, subject: selectedThread.subject, body: replyBody, userEmail }),
    })
      .then(r => r.json())
      .then(data => {
        setReplySending(false);
        if (data.error) { setReplyStatus({ ok: false, msg: data.error }); }
        else { setReplyStatus({ ok: true, msg: 'Sent!' }); setReplyBody(''); setTimeout(() => { setReplyOpen(false); setReplyStatus(null); }, 2000); }
      })
      .catch(() => { setReplySending(false); setReplyStatus({ ok: false, msg: 'Failed to send' }); });
  };

  useEffect(() => { checkStatus(); }, []);
  useEffect(() => {
    if (initialThread) { openThread(initialThread); onInitialThreadConsumed?.(); }
  }, [initialThread]);

  const formatFrom = raw => {
    const m = raw.match(/^"?([^"<]+)"?\s*</);
    return m ? m[1].trim() : raw.replace(/<.*>/, '').trim() || raw;
  };

  const formatDate = raw => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
  };

  const centerWrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 };

  if (loading) return (
    <div style={centerWrap}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '2px' }}>LOADING...</div>
    </div>
  );

  if (error) return (
    <div style={centerWrap}>
      <div style={{ fontSize: 12, color: 'var(--sla-red-text)', fontFamily: 'monospace' }}>{error}</div>
      <button onClick={checkStatus} style={{ padding: '7px 18px', background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>Retry</button>
    </div>
  );

  if (!connected) return (
    <div style={centerWrap}>
      <div style={{ fontSize: 22, color: 'var(--text-bright)', fontWeight: 700, marginBottom: 4 }}>Connect Gmail</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, textAlign: 'center', maxWidth: 380 }}>
        Link your Google account to view your inbox here. A browser window will open to complete sign-in.
      </div>
      <button
        onClick={() => window.open(`${API_BASE}/api/gmail/auth${userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : ''}`, '_blank')}
        style={{ padding: '10px 28px', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px' }}
      >
        CONNECT GMAIL
      </button>
      <button onClick={checkStatus} style={{ marginTop: 8, padding: '5px 14px', background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
        I've connected — Refresh
      </button>
    </div>
  );

  const sfq = searchFilter.trim().toLowerCase();
  const displayedThreads = sfq
    ? threads.filter(t =>
        formatFrom(t.from).toLowerCase().includes(sfq) ||
        t.subject.toLowerCase().includes(sfq) ||
        (matchProject(t.from, t.subject)||'').toLowerCase().includes(sfq)
      )
    : threads;

  const threadList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {displayedThreads.map(t => {
        const isSelected = selectedThread?.id === t.id;
        return (
          <div
            key={t.id}
            onClick={() => openThread(t)}
            style={{
              background: isSelected ? 'var(--bg-hover, rgba(255,255,255,0.06))' : 'var(--bg-card)',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-primary)'}`,
              borderRadius: 6,
              padding: '11px 16px',
              display: 'grid',
              gridTemplateColumns: selectedThread ? '1fr auto' : '180px 1fr auto',
              gap: '0 14px',
              alignItems: 'start',
              cursor: 'pointer',
            }}
          >
            {!selectedThread && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-bright)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.from}>
                  {formatFrom(t.from)}
                </div>
                {(() => {
                  const p = matchProject(t.from, t.subject);
                  if (!p) return <span style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'monospace', letterSpacing: '.5px' }}>—</span>;
                  const projId = p.split(' · ')[0];
                  return (
                    <span
                      onClick={onOpenProject ? e => { e.stopPropagation(); onOpenProject(projId); } : undefined}
                      style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#2e7d32', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', letterSpacing: '.5px', whiteSpace: 'nowrap', display: 'inline-block', cursor: onOpenProject ? 'pointer' : 'default' }}
                    >{p}</span>
                  );
                })()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: selectedThread ? 11 : 12, fontWeight: 700, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
              {!selectedThread && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{t.snippet}</div>}
              {selectedThread && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{formatFrom(t.from)}</div>}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2 }}>{formatDate(t.date)}</div>
          </div>
        );
      })}
    </div>
  );

  const detailPanel = selectedThread && (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 160px)' }}>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {sfq && (
          <button
            onClick={closeThread}
            style={{ flexShrink: 0, background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '3px 10px', fontFamily: 'monospace', alignSelf: 'center' }}
            title="Back to results"
          >← Back</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4, lineHeight: 1.3 }}>{selectedThread.subject}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedThread.from}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace', marginTop: 2 }}>{formatDate(selectedThread.date)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => { setReplyOpen(o => !o); setReplyStatus(null); }}
            style={{ background: replyOpen ? 'var(--accent)' : 'none', border: '1px solid var(--accent)', color: replyOpen ? '#fff' : 'var(--accent)', borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '3px 10px', fontFamily: 'monospace', fontWeight: 700 }}
          >↩ Reply</button>
          <button
            onClick={closeThread}
            style={{ background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '3px 8px', fontFamily: 'monospace' }}
            title="Close"
          >×</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {threadContent?.loading && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '2px' }}>LOADING...</div>
        )}
        {threadContent?.error && (
          <div style={{ fontSize: 12, color: 'var(--sla-red-text)', fontFamily: 'monospace' }}>{threadContent.error}</div>
        )}
        {threadContent && !threadContent.loading && !threadContent.error && (
          threadContent.bodyHtml
            ? <iframe
                srcDoc={threadContent.bodyHtml}
                style={{ flex: 1, width: '100%', minHeight: 'calc(100vh - 260px)', border: 'none', background: '#fff', borderRadius: 4 }}
                sandbox="allow-same-origin"
                title="Email body"
              />
            : <pre style={{ flex: 1, overflow: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'monospace', lineHeight: 1.6 }}>{threadContent.bodyText || '(no body)'}</pre>
        )}
      </div>
      {replyOpen && (
        <div style={{ borderTop: '1px solid var(--border-primary)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace' }}>
            To: <span style={{ color: 'var(--text-muted)' }}>{selectedThread.from}</span>
          </div>
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write your reply..."
            disabled={replySending}
            style={{ background: 'var(--bg-input, var(--bg-page))', border: '1px solid var(--border-secondary)', borderRadius: 4, color: 'var(--text-body)', fontSize: 12, fontFamily: 'inherit', padding: '8px 10px', resize: 'vertical', minHeight: 90, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={sendReply}
              disabled={replySending || !replyBody.trim()}
              style={{ padding: '6px 18px', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 4, cursor: replySending || !replyBody.trim() ? 'default' : 'pointer', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, opacity: replySending || !replyBody.trim() ? 0.5 : 1 }}
            >{replySending ? 'Sending...' : 'Send'}</button>
            <button
              onClick={() => { setReplyOpen(false); setReplyBody(''); setReplyStatus(null); }}
              disabled={replySending}
              style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}
            >Cancel</button>
            {replyStatus && (
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: replyStatus.ok ? 'var(--status-done-text)' : 'var(--sla-red-text)' }}>
                {replyStatus.ok ? '✓ ' : '⚠ '}{replyStatus.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '1px' }}>
          INBOX{gmailEmail ? ` · ${gmailEmail}` : ''} · {sfq ? `${displayedThreads.length} of ${threads.length}` : `${threads.length} threads`}
        </div>
        <button onClick={checkStatus} style={{ padding: '5px 14px', background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>↺ Refresh</button>
      </div>
      {threads.length === 0 ? (
        <div style={{ ...centerWrap, color: 'var(--text-faint)', fontSize: 12, fontFamily: 'monospace' }}>No emails</div>
      ) : selectedThread ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 280, flexShrink: 0, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>{threadList}</div>
          {detailPanel}
        </div>
      ) : (
        threadList
      )}
    </div>
  );
}


export { EmailModal, Inbox, matchProject };
