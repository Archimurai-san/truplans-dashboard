import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  API_BASE, ANTHROPIC_API_KEY, sbClient, fixDateYear,
  CONTRACT_TEMPLATE, NELSON_CONTRACT,
  PHASES_WILLIS_WORKFLOW, makeDefaultPhases, phaseMinor, CURRENT_PHASE_MAP, makeProjectPhases,
  addDays, SLA_DAYS, EXTERNAL_IDS, WEEK_BUCKETS, getSLAStatus, calculateZone,
  SEARCH_PRI, searchProjects, PROJECTS_INIT, PHASES, getStepDays,
  generateTasksFromProjects, getNotificationAlerts,
  STATUS_COLOR, PRIORITY_COLOR, DC_INIT,
  WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE,
  GANTT_S, GANTT_E, TDAYS, fmt$,
  PMT_TEMPLATE, PMT_OVERRIDES, getProjectMilestones,
  CITY_DEFAULTS, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_DOT, CITY_STATUS_BADGE, CITY_EMPTY, getCityData,
  HOA_REQUIRED_IDS, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_DOT, HOA_STATUS_BADGE, HOA_EMPTY, getHOAData,
  dbt, doOpenPath, parseNotes,
  Av, Sb, Pb, ST, SLABadge, S,
  getRevenueData, getSLADonut, getFinancialSummary, computeDue, formatDue, STEP_WEEKS, gBar
} from "./shared/core.jsx";
import { PDFPanel, PaymentPanel, CityPanel, HOAPanel, ProjectDetail, WorkflowModal, AssignModal } from "./modules/projects/v1.0/index.jsx";
import { AnalyseModal, ContractModule } from "./modules/contract-analyser/v1.0/index.jsx";
import { EmailModal, Inbox } from "./modules/email-agent/v1.0/index.jsx";
import { TeamSettingsModal, UserSelectModal } from "./modules/team/v1.0/index.jsx";
import { NotificationPanel } from "./modules/notifications/v1.0/index.jsx";
import { LoginScreen } from "./modules/auth/v1.0/index.jsx";

let _saveTimer=null;
export default function App(){
  const [session,setSession]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [userRole,setUserRole]=useState(null);
  const [userDesignerName,setUserDesignerName]=useState(null);

  const applyUserRole=(user)=>{
    if(!sbClient||!user?.email) return;
    sbClient.from('user_roles').select('role,designer_name').eq('email',user.email).single()
      .then(({data})=>{
        if(data?.role){
          setUserRole(data.role);
          setUserDesignerName(data.designer_name||null);
          if(data.role==='designer'&&data.designer_name){
            setCurrentUser(data.designer_name);
            setFD(data.designer_name);
            setFTD(data.designer_name);
          }
        }
      })
      .catch(()=>{});
  };

  useEffect(()=>{
    if(!sbClient){setAuthLoading(false);return;}
    sbClient.auth.getSession().then(({data:{session:s}})=>{
      setSession(s||null);
      if(s?.user){
        const name=s.user.user_metadata?.full_name||s.user.user_metadata?.name||'';
        const first=name.split(' ')[0];
        if(first)setCurrentUser(first);
        applyUserRole(s.user);
      }
      setAuthLoading(false);
    }).catch(()=>setAuthLoading(false));
    const{data:{subscription}}=sbClient.auth.onAuthStateChange((_e,s)=>{
      setSession(s||null);
      if(s?.user){
        const name=s.user.user_metadata?.full_name||s.user.user_metadata?.name||'';
        const first=name.split(' ')[0];
        if(first)setCurrentUser(first);
        applyUserRole(s.user);
      } else {
        setUserRole(null);setUserDesignerName(null);
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  const [tab,setTab]=useState("dashboard");
  const [fD,setFD]=useState("All");
  const [fS,setFS]=useState("All");
  const [fT,setFT]=useState("All");
  const [selP,setSelP]=useState(null);
  const [ctrP,setCtrP]=useState(null);
  const [intake,setIntake]=useState(false);
  const [form,setForm]=useState({job:"",client:"",city:"",type:"Room Addition",designer:"Radovan",contract:"",notes:""});

  const [teamMembers,setTeamMembers]=useState(()=>{
    try{const s=localStorage.getItem('team-members');if(s){const p=JSON.parse(s);if(p&&typeof p==='object'&&Object.keys(p).length>0)return p;}}catch{}
    return DC_INIT;
  });
  // Persist teamMembers to localStorage whenever they change
  useEffect(()=>{
    try{localStorage.setItem('team-members',JSON.stringify(teamMembers));}catch{}
  },[teamMembers]);
  const [showTeamSettings,setShowTeamSettings]=useState(false);
  const [projects,setProjects]=useState(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("project-state")||"null");
      if(!saved||!Array.isArray(saved)||saved.length===0) return PROJECTS_INIT;
      const savedIds=new Set(saved.map(p=>p.id));
      const newFromInit=PROJECTS_INIT.filter(p=>!savedIds.has(p.id));
      return [...saved,...newFromInit];
    }catch{return PROJECTS_INIT;}
  });
  const [searchQ,setSearchQ]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const searchRef=useRef(null);
  const [showImport,setShowImport]=useState(false);
  const [assignP,setAssignP]=useState(null);
  const [workflowP,setWorkflowP]=useState(null);
  const [importing,setImporting]=useState(false);
  const [importStep,setImportStep]=useState("");
  const [importError,setImportError]=useState("");
  const [theme,setTheme]=useState(()=>localStorage.getItem("truplans-theme")||"dark");
  const toggleTheme=()=>{const t=theme==="dark"?"light":"dark";setTheme(t);localStorage.setItem("truplans-theme",t);};
  const [saveStatus,setSaveStatus]=useState('idle');
  const triggerSave=()=>{setSaveStatus('saved');clearTimeout(_saveTimer);_saveTimer=setTimeout(()=>setSaveStatus('idle'),1500);};
  const [contractPaths,setContractPaths]=useState(()=>{try{return JSON.parse(localStorage.getItem("contract-paths")||"{}");}catch{return {};}});
  const [paymentData,setPaymentData]=useState(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("payment-milestones")||"{}");
      if(!saved['624']||saved['624'].length===0){
        saved['624']=[
          {code:'A1',label:'Retainer',                               desc:'Due at signing',                        amount:1000,status:'Pending'},
          {code:'A2',label:'Existing Plan Preparations (site scan)', desc:'Due at site scan',                     amount:1800,status:'Pending'},
          {code:'A3',label:'Layout Design Meeting #1',               desc:'Due at first layout meeting',          amount:3680,status:'Pending'},
          {code:'A4',label:'3D Design Meeting #3',                   desc:'Due at 3rd design meeting',           amount:4020,status:'Pending'},
          {code:'A5',label:'Presentation of Proposed Design',        desc:'Due at design presentation',          amount:4015,status:'Pending'},
          {code:'A6',label:'Documents Ready',                        desc:'Due when construction docs ready',    amount:4236,status:'Pending'},
          {code:'A7',label:'Plans Submitted, Corrected & Approved',  desc:'Due when plans approved',             amount:650, status:'Pending'},
          {code:'S1',label:'Structural Engineering',                 desc:'Due at structural engineering phase', amount:8450,status:'Pending'},
        ];
        localStorage.setItem("payment-milestones",JSON.stringify(saved));
      }
      return saved;
    }catch{return {};}
  });
  const savePaymentData=(projectId,ms)=>{const u={...paymentData,[projectId]:ms};setPaymentData(u);try{localStorage.setItem("payment-milestones",JSON.stringify(u));}catch{}triggerSave();};
  const [paymentPanel,setPaymentPanel]=useState(null);
  const [cityData,setCityData]=useState(()=>{try{return JSON.parse(localStorage.getItem("city-submissions")||"{}");}catch{return {};}});
  const saveCityData=(projectId,d)=>{const u={...cityData,[projectId]:d};setCityData(u);try{localStorage.setItem("city-submissions",JSON.stringify(u));}catch{}triggerSave();};
  const [cityPanel,setCityPanel]=useState(null);
  const [hoaData,setHoaData]=useState(()=>{try{return JSON.parse(localStorage.getItem("hoa-submissions")||"{}");}catch{return {};}});
  const saveHoaData=(projectId,d)=>{const u={...hoaData,[projectId]:d};setHoaData(u);try{localStorage.setItem("hoa-submissions",JSON.stringify(u));}catch{}triggerSave();};
  const [hoaPanel,setHoaPanel]=useState(null);
  const [emailLog,setEmailLog]=useState(()=>{try{return JSON.parse(localStorage.getItem("email-log")||"{}");}catch{return {};}});
  const saveEmailLog=(projectId,entry)=>{const u={...emailLog,[projectId]:[...(emailLog[projectId]||[]),entry].slice(0,50)};setEmailLog(u);try{localStorage.setItem("email-log",JSON.stringify(u));}catch{}};
  const [emailModal,setEmailModal]=useState(null);
  const buildEmailExtra=p=>{const notes=parseNotes(p.notes||'');const city=getCityData(p.id,cityData);const hoa=getHOAData(p.id,hoaData);const ms=getProjectMilestones(p,paymentData);const pend=ms.find(m=>m.status==='Pending'&&m.amount>0);const ctr=p.contracts?.[0];return{address:notes.address,email:notes.email,phone:notes.phone,jurisdiction:city.jurisdiction,planCheckNumber:city.planCheckNumber,permitNumber:city.permitNumber,hoaName:hoa.hoaName,hoaContact:hoa.contactName,hoaPhone:hoa.contactPhone,hoaEmail:hoa.contactEmail,milestoneName:pend?.label||'',milestoneAmount:pend?'$'+Number(pend.amount).toLocaleString():'',estStart:ctr?.estStart||p.start||''};};
  const [analyseModal,setAnalyseModal]=useState(null);
  const handleAnalyseSave=(projectId,updates,milestones)=>{
    saveProjects(prev=>prev.map(p=>p.id===projectId?{...p,...updates}:p));
    if(milestones&&milestones.length>0){const u={...paymentData,[projectId]:milestones};setPaymentData(u);try{localStorage.setItem("payment-milestones",JSON.stringify(u));}catch{}}
    triggerSave();
  };

  const NOTIF_DEF={enabled:true,redZone:true,week78:true,payment:true,workflow:false};
  const [notifPrefs,setNotifPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem("notification-prefs")||"{}");}catch{return {};}});
  const [notifPanel,setNotifPanel]=useState(false);
  const [notifHistory,setNotifHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("notification-history")||"[]");}catch{return [];}});
  const [notifUnread,setNotifUnread]=useState(0);
  const saveNotifPrefs=p=>{setNotifPrefs(p);try{localStorage.setItem("notification-prefs",JSON.stringify(p));}catch{}};
  const addToHistory=entry=>{const h={id:Date.now(),date:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),...entry};setNotifHistory(prev=>{const u=[h,...prev].slice(0,30);try{localStorage.setItem("notification-history",JSON.stringify(u));}catch{}return u;});setNotifUnread(n=>n+1);};
  const projectsRef=useRef(projects);projectsRef.current=projects;
  const paymentDataRef=useRef(paymentData);paymentDataRef.current=paymentData;
  const notifPrefsRef=useRef(notifPrefs);notifPrefsRef.current=notifPrefs;
  const _projInit=useRef(false);
  const _syncTimer=useRef(null);
  const _remoteUpdate=useRef(false);
  const [realtimeStatus,setRealtimeStatus]=useState('connecting');
  useEffect(()=>{
    fetch(`${API_BASE}/api/supabase/projects`)
      .then(r=>r.json())
      .then(data=>{
        if(!data.error&&Array.isArray(data)&&data.length>0){
          const remoteIds=new Set(data.map(p=>p.id));
          const newFromInit=PROJECTS_INIT.filter(p=>!remoteIds.has(p.id));
          setProjects(prev=>{
            const prevById=new Map(prev.map(p=>[p.id,p]));
            const dataMerged=data.map(d=>{const local=prevById.get(d.id);return local?{...d,team:local.team||d.team||[],teamRoles:local.teamRoles||d.teamRoles||{},assignNote:local.assignNote||d.assignNote||'',contracts:local.contracts||d.contracts||[]}:{...d,team:d.team||[],contracts:d.contracts||[]};});
            const merged=[...dataMerged,...newFromInit];
            _projInit.current=false;
            return merged;
          });
        }
      })
      .catch(err=>console.error('[supabase] Failed to load projects from cloud:', err.message));
  },[]);
  // localStorage persistence — fires on every render, cheap, no network
  useEffect(()=>{
    if(!_projInit.current){_projInit.current=true;return;}
    try{localStorage.setItem("project-state",JSON.stringify(projects));}catch{}
  },[projects]);

  // Helper: push projects to Supabase cloud (debounced).
  // Called explicitly from user-action paths only. Render alone never triggers a cloud push.
  const pushProjectsToCloud=(nextProjects)=>{
    if(_syncTimer.current) clearTimeout(_syncTimer.current);
    _syncTimer.current=setTimeout(()=>{
      _syncTimer.current=null;
      triggerSave();
      fetch(`${API_BASE}/api/supabase/sync`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({projects:nextProjects}),
      }).catch(err=>console.error('[supabase] Failed to sync projects to cloud:', err.message));
    },1000);
  };

  // saveProjects(updater) — same shape as setProjects, but also queues a cloud sync.
  // Use this everywhere a USER ACTION mutates projects. Do NOT use for realtime echoes.
  const saveProjects=(updater)=>{
    setProjects(prev=>{
      const next=typeof updater==='function'?updater(prev):updater;
      pushProjectsToCloud(next);
      return next;
    });
  };
  useEffect(()=>{
    if(!sbClient||!session) return;
    const dbToApp=row=>({
      id:row.id, name:row.name||'', client:row.client||'', designer:row.designer||'',
      type:row.type||'', status:row.status||'In Progress', phase:row.phase||'',
      city:row.city||'', contract:Number(row.contract)||0, invoiced:Number(row.invoiced)||0,
      pct:Number(row.pct)||0, stamp:row.stamp||'', permit:row.permit||'',
      start:row.start_date||null, end:row.end_date||null, notes:row.notes||'',
      scopeOfWork:row.scope_of_work||[], workflow:row.workflow||[],
    });
    const channel=sbClient.channel('projects-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'projects'},payload=>{
        if(payload.eventType==='INSERT'||payload.eventType==='UPDATE'){
          const updated=dbToApp(payload.new);
          _remoteUpdate.current=true;
          setProjects(prev=>{
            const exists=prev.some(p=>p.id===updated.id);
            return exists?prev.map(p=>p.id===updated.id?{...p,...updated,team:p.team||[],teamRoles:p.teamRoles||{},assignNote:p.assignNote||'',contracts:p.contracts||[]}:p):[...prev,{...updated,team:[],contracts:[]}];
          });
        } else if(payload.eventType==='DELETE'&&payload.old?.id){
          _remoteUpdate.current=true;
          setProjects(prev=>prev.filter(p=>p.id!==payload.old.id));
        }
      })
      .subscribe(status=>{
        setRealtimeStatus(status==='SUBSCRIBED'?'connected':'disconnected');
      });
    return()=>{sbClient.removeChannel(channel);setRealtimeStatus('connecting');};
  },[session]);
  useEffect(()=>{
    const h=e=>{if(searchRef.current&&!searchRef.current.contains(e.target)){setSearchOpen(false);}};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);
  useEffect(()=>{
    const runCheck=()=>{
      const np={...NOTIF_DEF,...notifPrefsRef.current};
      if(!np.enabled) return;
      const today=new Date().toISOString().slice(0,10);
      let shownData={};try{shownData=JSON.parse(localStorage.getItem("notifications-shown")||"{}");}catch{}
      const shownToday=shownData[today]||{};
      const alerts=getNotificationAlerts(projectsRef.current,paymentDataRef.current,shownToday,np);
      if(!alerts.length) return;
      const newShown={...shownToday};
      let sent=0;
      if(alerts.length>=3){
        const key=`summary-${today}-${alerts.length}`;
        if(!shownToday[key]){
          window.electronAPI?.showNotification({title:'TruPlans Dashboard',body:`${alerts.length} projects need attention — click to review`,projectId:null});
          newShown[key]=true;
          addToHistory({type:'summary',body:`${alerts.length} projects need attention`,actedOn:false});
          sent++;
        }
      }else{
        for(const a of alerts){
          if(sent>=5) break;
          if(!shownToday[a.key]){
            window.electronAPI?.showNotification({title:'TruPlans Dashboard',body:a.body,projectId:a.project.id});
            newShown[a.key]=true;
            addToHistory({type:a.type,body:a.body,projectId:a.project.id,actedOn:false});
            sent++;
          }
        }
      }
      shownData[today]=newShown;
      try{localStorage.setItem("notifications-shown",JSON.stringify(shownData));}catch{}
    };
    const t=setTimeout(runCheck,3000);
    const iv=setInterval(runCheck,4*60*60*1000);
    return()=>{clearTimeout(t);clearInterval(iv);};
  },[]);
  useEffect(()=>{
    if(!window.electronAPI?.onOpenProject) return;
    const cleanup=window.electronAPI.onOpenProject(id=>{setDetailProjectId(id);setTab('projects');});
    return cleanup;
  },[]);
  const [detailProjectId,setDetailProjectId]=useState(null);
  const [gmailThreads,setGmailThreads]=useState([]);
  const [pendingThread,setPendingThread]=useState(null);
  const detailProject=detailProjectId?projects.find(p=>p.id===detailProjectId):null;
  const updateProjectNotes=(id,notes)=>{saveProjects(prev=>prev.map(p=>p.id===id?{...p,notes}:p));};
  const updateProjectName=(id,name)=>{saveProjects(prev=>prev.map(p=>p.id===id?{...p,name}:p));};
  const updateProjectFields=(id,updates)=>{saveProjects(prev=>prev.map(p=>p.id===id?{...p,...updates}:p));};
  const togglePhaseFromDetail=(projectId,stepId)=>{
    const today=new Date().toISOString().slice(0,10);
    saveProjects(prev=>prev.map(p=>{
      if(String(p.id)!==String(projectId)) return p;
      const phases=(Array.isArray(p.phases)?p.phases:[]).map(ph=>ph&&ph.id===stepId?{...ph,status:ph.status==='done'?'not_started':'done',dateCompleted:ph.status==='done'?null:today}:ph);
      const workflow=(Array.isArray(p.workflow)?p.workflow:[]).map(m=>m&&m.milestoneId===stepId?{...m,status:m.status==='Completed'?'Not Started':'Completed'}:m);
      return{...p,phases,workflow};
    }));
  };
  const updateProjectType=(id,type)=>{saveProjects(prev=>prev.map(p=>p.id===id?{...p,type}:p));};
  const [pdfPanel,setPdfPanel]=useState(null);
  const saveContractPath=(projectId,filePath)=>{const u={...contractPaths,[projectId]:filePath};setContractPaths(u);localStorage.setItem("contract-paths",JSON.stringify(u));};
  const handleContractModuleUpdate=(updates)=>{
    if(!ctrP) return;
    saveProjects(prev=>prev.map(p=>p.id===ctrP.id?{...p,...updates}:p));
  };
  const pdfInputRef=useRef(null);
  const [pendingPdfProject,setPendingPdfProject]=useState(null);
  const pickPDF=async(project)=>{
    if(window.electronAPI?.openFile){const fp=await window.electronAPI.openFile();if(fp)saveContractPath(project.id,fp);}
    else{setPendingPdfProject(project);pdfInputRef.current?.click();}
  };
  const onPdfInputChange=e=>{const f=e.target.files?.[0];if(f&&pendingPdfProject){saveContractPath(pendingPdfProject.id,f.name);setPendingPdfProject(null);e.target.value='';}};
  const toggleTaskComplete=(projectId,stepId,done)=>{
    if(!projectId||!stepId) return;
    const today=new Date().toISOString().slice(0,10);
    saveProjects(prev=>prev.map(p=>{
      if(String(p.id)!==String(projectId)) return p;
      const phases=(Array.isArray(p.phases)?p.phases:[]).map(ph=>ph&&ph.id===stepId?{...ph,status:done?'done':'not_started',dateCompleted:done?today:null}:ph);
      const workflow=(Array.isArray(p.workflow)?p.workflow:[]).map(m=>m&&m.milestoneId===stepId?{...m,status:done?'Completed':'Not Started'}:m);
      return{...p,phases,workflow};
    }));
  };

  const MemberAv=({name,size})=><Av name={name} size={size} colorMap={teamMembers}/>;
  const [confirmDelete,setConfirmDelete]=useState(null);
  const deleteProject=(id)=>{
    saveProjects(prev=>prev.filter(p=>p.id!==id));
    setConfirmDelete(null);setSelP(null);setDetailProjectId(null);setTab('projects');
    // Remove from Supabase cloud
    fetch(`${API_BASE}/api/supabase/projects/${encodeURIComponent(id)}`,{method:'DELETE'})
      .then(r=>r.json())
      .then(d=>{ if(d.error) console.error('[supabase] delete failed:',d.error); else console.log('[supabase] project deleted from cloud:',id); })
      .catch(err=>console.error('[supabase] delete request failed:',err.message));
  };
  const [currentUser,setCurrentUser]=useState(()=>{try{return localStorage.getItem("current-user")||null;}catch{return null;}});
  const [showUserSelect,setShowUserSelect]=useState(()=>{
    try{
      const stored=localStorage.getItem("current-user");
      const lastLaunch=localStorage.getItem("last-launch-date");
      const today=new Date().toISOString().slice(0,10);
      localStorage.setItem("last-launch-date",today);
      const noUser=!stored||stored.trim()==='';
      const newDay=lastLaunch!==today;
      console.log('[TruPlans] current-user value:',JSON.stringify(stored),'| last-launch-date:',lastLaunch,'| today:',today,'| noUser:',noUser,'| newDay:',newDay);
      return noUser||newDay;
    }catch(e){console.error('[TruPlans] showUserSelect init error:',e);return true;}
  });
  const selectUser=name=>{setCurrentUser(name);try{localStorage.setItem("current-user",name);}catch{}setFTD(name);setShowUserSelect(false);};
  const [fSLA,setFSLA]=useState("All");
  const [fTD,setFTD]=useState(()=>{try{return localStorage.getItem("current-user")||"All";}catch{return "All";}});
  const [fTP,setFTP]=useState("All");
  const [fTS,setFTS]=useState("All");
  const [fTQ,setFTQ]=useState("");
  const visibleProjects=useMemo(()=>
    userRole==='designer'&&userDesignerName
      ?projects.filter(p=>p.designer===userDesignerName)
      :projects,
  [projects,userRole,userDesignerName]);
  const generatedTasks=useMemo(()=>generateTasksFromProjects(visibleProjects),[visibleProjects]);
  const activeProjectIds=useMemo(()=>new Set(projects.map(p=>String(p.id))),[projects]);
  const filteredTasks=useMemo(()=>{
    try{
      const q=fTQ.trim().toLowerCase();
      return generatedTasks.filter(t=>{
        if(!activeProjectIds.has(String(t.job))) return false;
        if(fTD!=="All"&&t.assigned!==fTD) return false;
        if(fTP!=="All"&&t.priority!==fTP) return false;
        if(fTS!=="All"&&t.status!==fTS) return false;
        if(q&&!String(t.projectName||'').toLowerCase().includes(q)&&!String(t.desc||'').toLowerCase().includes(q)&&!String(t.job||'').toLowerCase().includes(q)) return false;
        return true;
      });
    }catch{return generatedTasks;}
  },[generatedTasks,activeProjectIds,fTD,fTP,fTS,fTQ]);
  const searchResults=useMemo(()=>searchProjects(searchQ,projects),[searchQ,projects]);
  const goToProject=id=>{setDetailProjectId(id);setTab('projects');setSearchQ('');setSearchOpen(false);};
  const handleSearchKeyDown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setSearchQ('');setSearchOpen(false);}};
  const [reportGenerating,setReportGenerating]=useState(false);
  const [reportStatus,setReportStatus]=useState(null);
  const generateWeeklyReport=async()=>{
    if(!window.electronAPI?.generateWeeklyReport){alert('PDF export requires the desktop app.');return;}
    setReportGenerating(true);setReportStatus(null);
    try{
      const today=new Date();
      const dateStr=today.toISOString().slice(0,10);
      const generatedAt=today.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const active=projects.filter(p=>p.status==='In Progress');
      const reportData={
        date:dateStr,generatedAt,
        projects:active.map(p=>{
          const sla=getSLAStatus(p);
          const ms=getProjectMilestones(p,paymentData);
          const collected=ms.filter(m=>m.status==='Collected').reduce((a,m)=>a+m.amount,0);
          const invoiced=ms.filter(m=>m.status==='Invoiced').reduce((a,m)=>a+m.amount,0);
          const totalMs=ms.reduce((a,m)=>a+m.amount,0);
          return{id:p.id,name:p.name,client:p.client,city:p.city,type:p.type,designer:p.designer,
            status:p.status,phase:p.phase,pct:p.pct,contract:p.contract,start:p.start,
            slaZone:sla.zone,slaWeek:sla.weekNum,slaDaysRemaining:sla.daysRemaining,slaIsExternal:sla.isExternal,
            collected,invoiced,outstanding:totalMs-collected};
        }),
        designers:Object.keys(teamMembers).map(name=>({
          name,
          active:projects.filter(p=>(p.designer===name||(p.team||[]).includes(name))&&p.status==='In Progress').length,
          asLead:projects.filter(p=>p.designer===name&&p.status==='In Progress').length,
        })),
      };
      const result=await window.electronAPI.generateWeeklyReport(reportData);
      setReportStatus({ok:true,filepath:result.filepath});
      setTimeout(()=>setReportStatus(null),4000);
    }catch(e){setReportStatus({ok:false,msg:String(e)});setTimeout(()=>setReportStatus(null),5000);}
    setReportGenerating(false);
  };
  const DS=["All",...Object.keys(teamMembers)];
  const SS=["All","In Progress","Completed","On Hold","Not Started"];
  const TS=["All","Room Addition","ADU - New","ADU - Garage Conv.","Garage Conv.","Commercial Int.","High Ceiling Conv.","Single Story Addition","Two Story Addition","Simple Remodel","Open Concept Remodel","Whole House Makeover","Build a Deck","Patio Cover","Build a Garage"];
  const filtered=useMemo(()=>visibleProjects.filter(p=>{
    if(fD!=="All"&&p.designer!==fD) return false;
    if(fS!=="All"&&p.status!==fS) return false;
    if(fT!=="All"&&p.type!==fT) return false;
    if(fSLA!=="All"&&getSLAStatus(p).zone!==fSLA) return false;
    return true;
  }),[projects,fD,fS,fT,fSLA]);
  const active=projects.filter(p=>p.status==="In Progress").length;
  const done=projects.filter(p=>p.status==="Completed").length;
  const avgP=Math.round(projects.filter(p=>p.status==="In Progress").reduce((a,p)=>a+p.pct,0)/Math.max(active,1));
  const totC=projects.reduce((a,p)=>a+p.contract,0);
  const totI=projects.reduce((a,p)=>a+p.invoiced,0);
  const totCollected=useMemo(()=>projects.reduce((a,p)=>a+getProjectMilestones(p,paymentData).filter(m=>m.status==='Collected').reduce((s,m)=>s+m.amount,0),0),[projects,paymentData]);
  const totInvoiced=useMemo(()=>projects.reduce((a,p)=>a+getProjectMilestones(p,paymentData).filter(m=>m.status==='Invoiced'||m.status==='Collected').reduce((s,m)=>s+m.amount,0),0),[projects,paymentData]);
  const slaRed=projects.filter(p=>p.status==="In Progress"&&getSLAStatus(p).zone==='red').length;
  const slaAmber=projects.filter(p=>p.status==="In Progress"&&getSLAStatus(p).zone==='amber').length;

  async function importFromPDF(file){
    setImporting(true);setImportError("");setImportStep("Reading PDF...");
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      setImportStep("AI is analyzing contract...");
      const apiResult=await window.electronAPI.analyseContract({
        model:"claude-sonnet-4-20250514",max_tokens:4000,
        messages:[{role:"user",content:[
          {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},
          {type:"text",text:`You are a project manager at TruPlans Inc., a California architectural design firm. Extract all info from this contract. Return ONLY valid JSON, no markdown, no backticks:
{"project":{"id":"TRU-NEW","name":"short project name","client":"full client name","city":"city","type":"ADU - Accessory Dwelling Unit|Single Story Addition|Two Story Addition|Loft Addition|Garage Conversion|Simple Remodel|Open Concept Remodel|Whole House Makeover|Room Addition|Kitchen Remodel|Bathroom Remodel|Master Suite Addition|Build a Deck|Patio Cover|Build a Garage|CALOFT (Garage/Loft Conversion)|TruAdditions","designer":"Radovan","status":"In Progress","phase":"Design Dev","start":"YYYY-MM-DD","end":"YYYY-MM-DD","pct":0,"stamp":"No","permit":"No","contract":0,"invoiced":0},"contractData":{"id":"CTR-NEW","type":"Design + Construction","contractor":"contractor name","contractorLic":"license","signedDate":"YYYY-MM-DD","totalAmount":0,"estStart":"YYYY-MM-DD","estCompletion":"YYYY-MM-DD","constructionWeeks":"3-4","docusignId":"","designScope":[{"id":"0001","label":"Planning, Zoning & Research","included":true,"status":"Not Started"},{"id":"0002","label":"Design Meeting(s)","included":true,"status":"Not Started"},{"id":"0003","label":"Wholesale Showroom Access","included":true,"status":"N/A"},{"id":"0004","label":"Architectural Plans / Construction Documents","included":true,"status":"Not Started"},{"id":"0005","label":"Title 24 Energy Report","included":true,"status":"Not Started"},{"id":"0006","label":"HOA Package & Submission","included":true,"status":"Not Started"},{"id":"0008","label":"Structural Drawings & Engineer Wet Stamp","included":true,"status":"Not Started"},{"id":"0009","label":"Plan Check & Permit Process","included":true,"status":"Not Started"}],"constructionScope":[{"id":"0100","label":"Pre-Construction Meeting","included":true,"status":"Not Started"},{"id":"0101","label":"Site Protection","included":true,"status":"Not Started"},{"id":"0102","label":"Demolition & Shoring","included":true,"status":"Not Started"},{"id":"0103","label":"Debris & Haul Away","included":true,"status":"Not Started"},{"id":"0104","label":"New Footings","included":false,"status":"N/A"},{"id":"0151","label":"Retrofit Structural Shear Wall","included":false,"status":"N/A"},{"id":"0153","label":"Interior Walls","included":false,"status":"N/A"},{"id":"0154","label":"Low Wall (Pony Wall)","included":true,"status":"Not Started"},{"id":"0155","label":"Floor System Framing","included":true,"status":"Not Started"},{"id":"0175","label":"Forced Air Unit (FAU)","included":false,"status":"N/A"},{"id":"0177","label":"Air Ducts / Vents","included":true,"status":"Not Started"},{"id":"0201","label":"Electrical Panel Upgrade","included":false,"status":"N/A"},{"id":"0202","label":"New Electrical Circuits","included":true,"status":"Not Started"},{"id":"0203","label":"Power Outlets","included":true,"status":"Not Started"},{"id":"0204","label":"Recessed Lights","included":true,"status":"Not Started"},{"id":"0206","label":"Light Switches","included":true,"status":"Not Started"},{"id":"0210","label":"Smoke & CO Detectors","included":true,"status":"Not Started"},{"id":"0330","label":"Fire Sprinklers","included":true,"status":"Not Started"},{"id":"0400","label":"Stucco / Siding Repair","included":true,"status":"Not Started"},{"id":"0404","label":"Thermal Insulation","included":true,"status":"Not Started"},{"id":"0405","label":"Insulate Floor System","included":true,"status":"Not Started"},{"id":"0406","label":"Drywall","included":true,"status":"Not Started"},{"id":"0407","label":"Misc Drywall Patching","included":true,"status":"Not Started"},{"id":"0700","label":"Interior Doors","included":false,"status":"N/A"},{"id":"0708","label":"New Construction Windows","included":true,"status":"Not Started"},{"id":"0752","label":"Baseboards","included":true,"status":"Not Started"},{"id":"0754","label":"Stair / Balcony Railing","included":true,"status":"Not Started"},{"id":"0758","label":"Finish Flooring","included":false,"status":"N/A"},{"id":"0759","label":"Painting / Staining","included":false,"status":"N/A"}],"paymentMilestones":[],"homeownerObligations":[{"id":"ho1","label":"Provide house key / lockbox","done":false},{"id":"ho2","label":"Alarm system access / codes","done":false},{"id":"ho3","label":"HOA contact info submitted","done":false},{"id":"ho4","label":"Signed HOA application + neighbor form","done":false},{"id":"ho5","label":"HOA application fee paid","done":false},{"id":"ho6","label":"All plan check & permit fees paid by homeowner","done":false},{"id":"ho7","label":"Maintain utilities during construction","done":false},{"id":"ho8","label":"Punch list within 7 days of completion","done":false}],"hiddenConditionFlags":[{"id":"hc1","label":"New Footings required","flagged":false,"notes":""},{"id":"hc2","label":"Retrofit Shear Wall required","flagged":false,"notes":""},{"id":"hc3","label":"Lateral analysis required","flagged":false,"notes":""},{"id":"hc4","label":"T24 / HERS failure risk","flagged":false,"notes":""},{"id":"hc5","label":"Electrical panel inadequate","flagged":false,"notes":""},{"id":"hc6","label":"Mold / structural damage found","flagged":false,"notes":""},{"id":"hc7","label":"Duct soffit required","flagged":false,"notes":""}],"changeOrders":[],"aiAnalysis":{"generatedAt":"TODAY","summary":"summary here","scopeSummary":"scope bullets","paymentSummary":"payment summary","obligations":"TruPlans obligations","riskFlags":[{"level":"HIGH","text":"risk"}],"actionItems":[{"done":false,"text":"action item"}]}}}
Set included:true/false per contract. Extract real payment milestones with amounts. project.contract=totalAmount. project.invoiced=deposit if paid else 0.`}
        ]}]});
      if(!apiResult.ok)throw new Error(apiResult.error);
      setImportStep("Building project...");
      const d=apiResult.data;
      if(d.error) throw new Error("API error: "+d.error);
      const raw=d.content?.[0]?.text||"{}";
      // Extract JSON even if wrapped in markdown
      const jsonMatch=raw.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No JSON found in AI response");
      const parsed=JSON.parse(jsonMatch[0]);
      const project=parsed.project||parsed;
      const contractData=parsed.contractData||parsed.contract||{};
      if(!project.name) throw new Error("Could not extract project info from contract");
      // Fill defaults for any missing fields
      const maxId=projects.reduce((mx,p)=>{const n=parseInt(p.id.replace("TRU-",""))||0;return Math.max(mx,n);},0);
      project.id="TRU-"+String(maxId+1).padStart(3,"0");
      project.team=project.team||[];
      project.workflow=generateWorkflow(project.start||new Date().toISOString().slice(0,10), project.designer||'Radovan');
      project.contracts=[];
      project.status=project.status||"In Progress";
      project.phase=project.phase||"Design Dev";
      project.pct=project.pct||0;
      project.stamp=project.stamp||"No";
      project.permit=project.permit||"No";
      project.invoiced=project.invoiced||0;
      contractData.id="CTR-"+Date.now();
      contractData.designScope=contractData.designScope||[];
      contractData.constructionScope=contractData.constructionScope||[];
      contractData.paymentMilestones=contractData.paymentMilestones||[];
      contractData.homeownerObligations=contractData.homeownerObligations||[];
      contractData.hiddenConditionFlags=contractData.hiddenConditionFlags||[];
      contractData.changeOrders=contractData.changeOrders||[];
      if(contractData.aiAnalysis) contractData.aiAnalysis.generatedAt=new Date().toISOString().slice(0,10);
      saveProjects(prev=>[...prev,{...project,contracts:[contractData]}]);
      setImporting(false);setShowImport(false);setTab("projects");
    }catch(e){const msg=e?.message||e?.error?.message||(typeof e==="string"?e:JSON.stringify(e,null,2));setImportError("API error: "+msg);setImporting(false);}
  }
  const todayL=((new Date()-GANTT_S)/86400000/TDAYS*100).toFixed(2);
  const MTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const PM=()=>{
    if(!selP)return null;const p=selP;
    return<div style={S.ov} onClick={()=>setSelP(null)}><div style={S.mod} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><div><div style={{fontSize:10,color:"var(--accent)",letterSpacing:"2px",fontFamily:"monospace"}}>{p.id}</div><div style={{fontSize:18,fontWeight:700,color:"var(--text-bright)"}}>{p.name}</div><div style={{fontSize:12,color:"var(--text-muted)"}}>{p.client} · {p.city}</div></div><Sb status={p.status}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>{[["Contract",fmt$(p.contract)],["Invoiced",fmt$(p.invoiced)],["Balance",fmt$(p.contract-p.invoiced)]].map(([l,v])=><div key={l} style={{background:"var(--bg-page)",borderRadius:6,padding:"12px"}}><div style={{fontSize:9,color:"var(--text-muted)",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"monospace"}}>{l}</div><div style={{fontSize:16,fontWeight:700,color:"var(--text-bright)",marginTop:4}}>{v}</div></div>)}</div>
      <div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:10,color:"var(--text-muted)",fontFamily:"monospace"}}><span>Progress</span><span style={{color:"var(--accent)"}}>{p.pct}%</span></div><Pb pct={p.pct}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20,fontSize:11}}>{[["Phase",p.phase],["Type",p.type],["Lead",p.designer],["Team",(p.team&&p.team.length>0)?p.team.join(", "):"—"],["Start",p.start],["Target",p.end],["Permit",p.permit],["Contracts",p.contracts.length>0?`${p.contracts.length} attached`:"None"]].map(([l,v])=><div key={l} style={{background:"var(--bg-page)",padding:"8px 10px",borderRadius:4,display:"flex",gap:8}}><span style={{color:"var(--text-faint)",minWidth:72,fontFamily:"monospace",fontSize:10}}>{l}:</span><span style={{color:"var(--text-body)"}}>{v}</span></div>)}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={{background:"none",border:"1px solid #e74c3c",color:"#e74c3c",borderRadius:4,padding:"6px 14px",fontSize:11,cursor:"pointer",fontFamily:"monospace"}} onClick={()=>setConfirmDelete(p)}>🗑 Delete</button><button style={{...S.ghost,borderColor:"#27ae60",color:"#27ae60"}} onClick={()=>{setWorkflowP(p);setSelP(null);}}>📋 Workflow</button><button style={{...S.ghost,borderColor:"#3498db",color:"#3498db"}} onClick={()=>{setAssignP(p);setSelP(null);}}>👥 Assign Team</button><button style={S.btn} onClick={()=>{setCtrP(p);setSelP(null);}}>📄 Contracts</button><button style={S.ghost} onClick={()=>setSelP(null)}>Close</button></div>
    </div></div>;
  };

  const IM=null;

  const Dash=()=>(
    <>
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        {[["Active",active,"var(--kpi-0)"],["Avg Progress",avgP+"%","var(--kpi-1)"],["Completed",done,"var(--kpi-2)"],["Total Contract",fmt$(totC),"var(--kpi-3)"],["Invoiced",fmt$(totInvoiced),"var(--kpi-4)"],["Outstanding",fmt$(totC-totCollected),"var(--kpi-5)"]].map(([l,v,c])=><div key={l} style={{...S.metric,borderTopWidth:"var(--kpi-top-w)",borderTopStyle:"solid",borderTopColor:c}}><div style={{fontSize:9,color:"var(--text-dim)",letterSpacing:"2px",textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>{l}</div><div style={{fontSize:22,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}</div></div>)}
        <div onClick={()=>{setFSLA('red');setTab('projects');}} style={{...S.metric,borderTopWidth:"var(--kpi-top-w)",borderTopStyle:"solid",borderTopColor:"var(--sla-red-text)",cursor:"pointer"}} title="Click to filter projects"><div style={{fontSize:9,color:"var(--text-dim)",letterSpacing:"2px",textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>Red Zone</div><div style={{fontSize:22,fontWeight:700,color:"var(--sla-red-text)",fontFamily:"monospace"}}>{slaRed}</div></div>
        <div onClick={()=>{setFSLA('amber');setTab('projects');}} style={{...S.metric,borderTopWidth:"var(--kpi-top-w)",borderTopStyle:"solid",borderTopColor:"var(--status-hold-text)",cursor:"pointer"}} title="Click to filter projects"><div style={{fontSize:9,color:"var(--text-dim)",letterSpacing:"2px",textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>Amber</div><div style={{fontSize:22,fontWeight:700,color:"var(--status-hold-text)",fontFamily:"monospace"}}>{slaAmber}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
        <div style={S.card}><ST>Designer Workload</ST>{Object.keys(teamMembers).map(d=>{const dp=projects.filter(p=>p.designer===d&&p.status==="In Progress");return<div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><MemberAv name={d}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"var(--text-body)"}}>{d}</span><span style={{fontSize:10,color:"var(--text-muted)",fontFamily:"monospace"}}>{dp.length} active</span></div><Pb pct={dp.length/5*100} color={teamMembers[d]}/></div></div>;})}</div>
        <div style={S.card}><ST>Phase Distribution</ST>{PHASES.map(ph=>{const n=projects.filter(p=>p.phase===ph).length;if(!n)return null;return<div key={ph} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{fontSize:10,color:"var(--text-muted)",minWidth:110,fontFamily:"monospace"}}>{ph}</div><div style={{flex:1,background:"var(--bg-page)",borderRadius:99,height:6,overflow:"hidden"}}><div style={{height:"100%",width:(n/projects.length*100)+"%",background:"var(--accent)",borderRadius:99}}/></div><div style={{fontSize:11,color:"var(--accent)",fontFamily:"monospace",minWidth:16,textAlign:"right"}}>{n}</div></div>;})}</div>
      </div>
      <div style={S.card}><ST>Open Tasks by Priority</ST>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {[["High Priority","var(--sla-red-text)","Tasks overdue / at risk","High"],["Medium Priority","var(--status-hold-text)","Tasks due soon","Medium"],["Low Priority","var(--status-done-text)","Tasks on track","Low"]].map(([label,color,sub,pri])=>(
            <div key={pri} onClick={()=>{setFTP(pri);setTab("tasks");}} style={{...S.metric,cursor:"pointer",borderTopWidth:"var(--kpi-top-w)",borderTopStyle:"solid",borderTopColor:color,flex:"1 1 120px"}}>
              <div style={{fontSize:9,color:"var(--text-dim)",letterSpacing:"2px",textTransform:"uppercase",fontFamily:"monospace",marginBottom:6}}>{label}</div>
              <div style={{fontSize:28,fontWeight:700,color,fontFamily:"monospace",lineHeight:1}}>{generatedTasks.filter(t=>t.priority===pri).length}</div>
              <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
      {(()=>{
        const isDark=theme==='dark';
        const revData=getRevenueData(projects,paymentData);
        const slaData=getSLADonut(projects);
        const fin=getFinancialSummary(projects,paymentData);
        const tickClr=isDark?'#888':'#757575';
        const gridClr=isDark?'#1e1e3a':'#e0e0e0';
        const ttStyle={background:isDark?'#12122a':'#fff',border:`1px solid ${isDark?'#2a2a4a':'#e0e0e0'}`,borderRadius:6,fontSize:11,color:isDark?'#e0e0e0':'#212121'};
        const lgStyle={fontSize:10,fontFamily:'monospace',color:isDark?'#888':'#757575'};
        const fmtK=v=>v>=1000?'$'+Math.round(v/1000)+'k':'$'+v;
        return(
          <>
            <div style={{marginTop:20,marginBottom:6}}><ST>Revenue Overview</ST></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              {/* Bar Chart */}
              <div style={S.card}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',fontFamily:'monospace',marginBottom:12,letterSpacing:'1px',textTransform:'uppercase'}}>Monthly Revenue — Last 6 Months</div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={revData} margin={{top:4,right:8,left:0,bottom:0}} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:tickClr,fontSize:10,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtK} tick={{fill:tickClr,fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} width={44}/>
                    <Tooltip formatter={(v,n)=>['$'+Number(v).toLocaleString(),n]} contentStyle={ttStyle} labelStyle={{fontWeight:700,marginBottom:4}}/>
                    <Legend wrapperStyle={lgStyle}/>
                    <Bar dataKey="contracted" name="Contracted" fill="#3498db" radius={[2,2,0,0]}/>
                    <Bar dataKey="invoiced"   name="Invoiced"   fill="#f39c12" radius={[2,2,0,0]}/>
                    <Bar dataKey="collected"  name="Collected"  fill="#27ae60" radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Donut Chart */}
              <div style={S.card}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',fontFamily:'monospace',marginBottom:12,letterSpacing:'1px',textTransform:'uppercase'}}>Project SLA Distribution — Click to Filter</div>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={slaData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2} dataKey="value"
                      onClick={entry=>{setFSLA(entry.zone);setTab('projects');}} cursor="pointer"
                      label={({name,pct,value})=>`${value} (${pct}%)`} labelLine={false}
                      labelStyle={{fontSize:9,fontFamily:'monospace',fill:tickClr}}>
                      {slaData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[`${v} project${v!==1?'s':''}`,'SLA Zone: '+n]} contentStyle={ttStyle}/>
                    <Legend wrapperStyle={lgStyle}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Financial Summary */}
            <div style={S.card}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',fontFamily:'monospace',marginBottom:14,letterSpacing:'1px',textTransform:'uppercase'}}>Financial Summary</div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                {[
                  ['This Month Contracted','var(--kpi-3)',fmt$(fin.thisMoC)],
                  ['This Month Collected', 'var(--kpi-2)',fmt$(fin.thisMoX)],
                  ['YTD Contracted',       'var(--kpi-0)',fmt$(fin.ytdC)],
                  ['YTD Collected',        'var(--kpi-2)',fmt$(fin.ytdX)],
                  ['Collection Rate',      fin.rate>=70?'var(--kpi-2)':fin.rate>=40?'var(--kpi-3)':'var(--kpi-5)',fin.rate+'%'],
                ].map(([label,color,value])=>(
                  <div key={label} style={{...S.metric,flex:'1 1 140px',borderTopWidth:'var(--kpi-top-w)',borderTopStyle:'solid',borderTopColor:color}}>
                    <div style={{fontSize:9,color:'var(--text-dim)',letterSpacing:'2px',textTransform:'uppercase',fontFamily:'monospace',marginBottom:8}}>{label}</div>
                    <div style={{fontSize:20,fontWeight:700,color,fontFamily:'monospace'}}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}
    </>
  );

  const Projs=()=>(
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {[[DS,fD,setFD],[SS,fS,setFS],[TS,fT,setFT]].map((a,i)=><select key={i} disabled={i===0&&userRole==='designer'} style={{...S.sel,opacity:i===0&&userRole==='designer'?0.5:1}} value={a[1]} onChange={e=>a[2](e.target.value)}>{a[0].map(o=><option key={o}>{o}</option>)}</select>)}
          <select style={S.sel} value={fSLA} onChange={e=>setFSLA(e.target.value)}><option value="All">All SLA</option><option value="green">🟢 On Track</option><option value="amber">🟡 Amber</option><option value="red">🔴 Red Zone</option></select>
          {fSLA!=="All"&&<button style={{...S.ghost,padding:"4px 10px",fontSize:10}} onClick={()=>setFSLA("All")}>✕ Clear SLA</button>}
          <span style={{fontSize:10,color:"#444",fontFamily:"monospace"}}>{filtered.length} projects</span>
        </div>
        <div style={{display:"flex",gap:8}}><button style={{...S.ghost}} onClick={()=>setShowImport(true)}>📄 Import from Contract</button><button style={S.btn} onClick={()=>setIntake(true)}>+ New Project</button></div>
      </div>
      <table style={S.tbl}>
        <thead><tr>{[["Job #",65],["Project",null],["Client",95],["Type",75],["Lead + Team",80],["Phase",105],["Status",82],["SLA",85],["Progress",75],["Contract",78],["Balance",72],["Contracts",62],["PDF",38],["Action",120]].map(([h,w])=><th key={h} style={{...S.th,...(w?{width:w,minWidth:w}:{})}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map((p,i)=><tr key={p.id} style={{background:i%2===0?"transparent":"var(--bg-row-alt)",cursor:"pointer"}} onClick={()=>setSelP(p)}>
          <td style={{...S.td,color:"var(--accent)",fontFamily:"monospace",fontSize:9,fontWeight:700}}><div style={{display:"flex",alignItems:"center",gap:3}}><div title={`City: ${getCityData(p.id,cityData).planCheckStatus}`} style={{width:5,height:5,borderRadius:"50%",background:CITY_STATUS_DOT[getCityData(p.id,cityData).planCheckStatus]||"var(--text-ghost)",flexShrink:0}}/>{getHOAData(p.id,hoaData).hoaRequired&&<div title={`HOA: ${getHOAData(p.id,hoaData).hoaStatus}`} style={{width:5,height:5,borderRadius:"50%",background:HOA_STATUS_DOT[getHOAData(p.id,hoaData).hoaStatus]||"var(--text-ghost)",flexShrink:0}}/>}{p.id}</div></td>
          <td style={{...S.td,color:"var(--accent)",maxWidth:160,cursor:"pointer",fontWeight:600,textDecoration:"underline",textUnderlineOffset:3}} onClick={e=>{e.stopPropagation();setDetailProjectId(p.id);}}>{p.name}</td>
          <td style={{...S.td,color:"var(--text-sub)",fontSize:10}}>{p.client}</td>
          <td style={{...S.td,color:"var(--text-muted)",fontSize:10}}>{p.type}</td>
          <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:3,flexWrap:"wrap"}}><div style={{position:"relative"}}><MemberAv name={p.designer} size={20}/><div style={{position:"absolute",bottom:-1,right:-1,width:6,height:6,borderRadius:"50%",background:"#e94560",border:"1px solid #0d0d1a"}}/></div>{(p.team||[]).map(m=><MemberAv key={m} name={m} size={16}/>)}<button onClick={e=>{e.stopPropagation();setAssignP(p);}} style={{background:"none",border:"1px dashed #333",borderRadius:"50%",width:16,height:16,cursor:"pointer",color:"#555",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button></div></td>
          <td style={{...S.td,fontSize:10,color:"#9b59b6"}}>{p.phase}</td>
          <td style={S.td}><Sb status={p.status}/></td>
          <td style={S.td} onClick={e=>e.stopPropagation()}><SLABadge project={p} compact/></td>
          <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{flex:1,minWidth:40}}><Pb pct={p.pct}/></div><span style={{fontSize:9,color:"var(--text-muted)",fontFamily:"monospace"}}>{p.pct}%</span></div></td>
          <td style={{...S.td,color:"var(--text-bright)",fontFamily:"monospace",fontSize:10,fontWeight:700}}>{fmt$(p.contract)}</td>
          <td style={{...S.td,color:p.contract-p.invoiced>0?"#f0a842":"#52d68a",fontFamily:"monospace",fontSize:10}}>{fmt$(p.contract-p.invoiced)}</td>
          <td style={S.td} onClick={e=>{e.stopPropagation();setCtrP(p);}}><span style={{fontSize:10,color:p.contracts.length>0?"var(--accent)":"var(--text-ghost)",cursor:"pointer",fontFamily:"monospace",fontWeight:700}}>{p.contracts.length>0?`📄 ${p.contracts.length}`:"+ Add"}</span></td>
          <td style={S.td} onClick={e=>e.stopPropagation()}>{contractPaths[p.id]?(<span title="View contract PDF" onClick={()=>setPdfPanel({project:p,filePath:contractPaths[p.id]})} style={{fontSize:18,cursor:"pointer",color:"#1565c0",userSelect:"none"}}>📄</span>):(<span title="Attach contract PDF" onClick={()=>pickPDF(p)} style={{fontSize:13,cursor:"pointer",color:"var(--text-ghost)",fontWeight:700,fontFamily:"monospace",userSelect:"none"}}>📎+</span>)}</td>
          <td style={S.td}><div style={{display:"flex",gap:2}}><button title="Analyse Contract" style={{background:"none",border:"1px solid #8e44ad44",color:"#8e44ad",borderRadius:3,padding:"1px 4px",fontSize:10,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setAnalyseModal(p);}}>🔍</button><button title="Workflow" style={{background:"none",border:"1px solid #27ae6044",color:"#27ae60",borderRadius:3,padding:"1px 4px",fontSize:10,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setWorkflowP(p);}}>📋</button><button title="Payments" style={{background:"none",border:"1px solid #f0a84244",color:"#f0a842",borderRadius:3,padding:"1px 4px",fontSize:10,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setPaymentPanel(p);}}>💰</button><button title="City" style={{background:"none",border:"1px solid #3498db44",color:"#3498db",borderRadius:3,padding:"1px 4px",fontSize:10,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setCityPanel(p);}}>🏛</button><button title="HOA" style={{background:"none",border:getHOAData(p.id,hoaData).hoaRequired?"1px solid #27ae6044":"1px solid var(--border-secondary)",color:getHOAData(p.id,hoaData).hoaRequired?"#27ae60":"var(--text-ghost)",borderRadius:3,padding:"1px 4px",fontSize:10,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setHoaPanel(p);}}>🏠</button><button title="Email Templates" style={{background:"none",border:"1px solid #1565c044",color:"#1565c0",borderRadius:3,padding:"1px 4px",fontSize:10,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setEmailModal(p);}}>✉️</button><button style={{...S.ghost,padding:"1px 6px",fontSize:9}} onClick={e=>{e.stopPropagation();setSelP(p);}}>View</button><button style={{background:"none",border:"1px solid #e74c3c44",color:"#e74c3c",borderRadius:3,padding:"1px 5px",fontSize:9,cursor:"pointer",fontFamily:"monospace"}} onClick={e=>{e.stopPropagation();setConfirmDelete(p);}}>✕</button></div></td>
        </tr>)}</tbody>
      </table>
    </>
  );

  const Gantt=()=>(
    <div style={{...S.card,overflowX:"auto"}}>
      <ST>2026 Project Timeline</ST>
      <div style={{display:"flex",marginBottom:4,marginLeft:260}}>{MTHS.map((m,i)=><div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:"var(--accent)",fontFamily:"monospace",borderLeft:"1px solid var(--bg-subtle)",paddingLeft:2}}>{m}</div>)}</div>
      {visibleProjects.map((p,i)=>{const bar=gBar(p.start,p.end),color=PALETTE[i%6];return<div key={p.id} style={{display:"flex",alignItems:"center",marginBottom:4,minWidth:900}}>
        <div style={{width:260,flexShrink:0,display:"flex",alignItems:"center",gap:6,paddingRight:10}}><MemberAv name={p.designer} size={20}/><div style={{overflow:"hidden"}}><div style={{fontSize:10,color:"var(--accent)",fontFamily:"monospace"}}>{p.id}</div><div style={{fontSize:10,color:"var(--text-body)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:190}}>{p.name}</div></div></div>
        <div style={{flex:1,position:"relative",height:22,background:"var(--bg-secondary)",borderRadius:2}}>
          {MTHS.map((_,mi)=><div key={mi} style={{position:"absolute",left:(mi/12*100)+"%",top:0,bottom:0,width:1,background:"var(--bg-subtle)"}}/>)}
          <div style={{position:"absolute",left:todayL+"%",top:-2,bottom:-2,width:1.5,background:"#e94560",zIndex:10}}/>
          {p.workflow&&p.workflow.length>0?(
            p.workflow.map((m,wi)=>{
              const wb=gBar(m.startDate,m.endDate);
              const wc=m.status==="Completed"?"#27ae60":m.status==="Blocked"?"#e74c3c":m.status==="In Progress"?"#3498db":"#2a2a4a";
              return <div key={wi} title={m.milestoneId+" - "+m.label} onClick={()=>setWorkflowP(p)} style={{position:"absolute",left:wb.left,width:wb.width,top:m.payment?1:5,bottom:m.payment?1:5,background:wc+"88",borderRadius:2,border:`1px solid ${wc}`,cursor:"pointer"}}/>;
            })
          ):(
            <div style={{position:"absolute",left:bar.left,width:bar.width,top:3,bottom:3,background:color+"cc",borderRadius:3,display:"flex",alignItems:"center",paddingLeft:4,overflow:"hidden",border:`1px solid ${color}`}}>
              <span style={{fontSize:8,color:"#fff",whiteSpace:"nowrap",fontWeight:700,fontFamily:"monospace"}}>{p.pct}%</span>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:p.pct+"%",background:color,opacity:0.4,borderRadius:3}}/>
            </div>
          )}
        </div>
        <div onClick={()=>setWorkflowP(p)} style={{width:100,flexShrink:0,paddingLeft:8,fontSize:9,color:"var(--text-faint)",fontFamily:"monospace",cursor:"pointer"}}>{p.workflow&&p.workflow.length>0?p.workflow.find(m=>m.status==="In Progress")?.milestoneId||p.phase:p.phase}</div>
      </div>;})}
    </div>
  );


  const Team=()=>(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:11,color:"var(--text-muted)"}}>Click a project name to open its detail page.</div>
        <button style={S.btn} onClick={()=>setShowTeamSettings(true)}>⚙ Manage Team</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12,marginBottom:24}}>
        {Object.keys(teamMembers).sort().map(name=>{
          const myProjects=projects.filter(p=>(p.designer===name||(p.team||[]).includes(name))&&p.status==="In Progress");
          const myTasks=generatedTasks.filter(t=>t.assigned===name);
          const isLead=p=>p.designer===name;
          const wl=myProjects.length;
          const wlColor=wl>=5?"#e74c3c":wl>=3?"#f39c12":"#52d68a";
          return(
            <div key={name} style={{background:"var(--bg-card)",border:"1px solid var(--border-primary)",borderRadius:8,padding:"12px",borderTop:`3px solid ${teamMembers[name]}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:teamMembers[name]+"33",border:`2px solid ${teamMembers[name]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:teamMembers[name],fontFamily:"monospace",flexShrink:0}}>{name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-bright)"}}>{name}</div>
                  <div style={{fontSize:9,color:wlColor,fontFamily:"monospace"}}>{wl} active · {myTasks.length} task{myTasks.length!==1?"s":""}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:wlColor,fontFamily:"monospace"}}>{wl}/6</div>
                  <div style={{fontSize:8,color:"var(--text-faint)",fontFamily:"monospace"}}>capacity</div>
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{background:"var(--bg-subtle)",borderRadius:99,height:4,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(wl/6*100,100)+"%",background:wlColor,borderRadius:99}}/></div>
              </div>
              {myProjects.length>0?(
                <div style={{maxHeight:200,overflowY:"auto"}}>
                  <div style={{fontSize:9,color:"var(--text-faint)",fontFamily:"monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:5}}>Projects</div>
                  {myProjects.map(p=>{
                    const sla=getSLAStatus(p);
                    const slaCfg={green:{bg:"var(--status-done-bg)",text:"var(--status-done-text)",lbl:`W${sla.weekNum}✓`},amber:{bg:"var(--status-hold-bg)",text:"var(--status-hold-text)",lbl:`W${sla.weekNum}⚠`},red:{bg:"var(--sla-red-bg)",text:"var(--sla-red-text)",lbl:"RED"},none:{bg:"var(--bg-subtle)",text:"var(--text-faint)",lbl:"–"},future:{bg:"var(--bg-subtle)",text:"var(--text-faint)",lbl:"–"}};
                    const sc=slaCfg[sla.zone]||slaCfg.none;
                    return(
                      <div key={p.id} onClick={()=>setDetailProjectId(p.id)} style={{padding:"5px 7px",borderRadius:4,marginBottom:3,background:"var(--bg-panel)",cursor:"pointer",border:"1px solid var(--bg-subtle)"}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                          <span style={{fontSize:10,fontFamily:"monospace",color:"var(--accent)",fontWeight:700,flexShrink:0}}>{p.id}</span>
                          <span style={{fontSize:11,color:"var(--text-body)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontWeight:600}}>— {p.name}</span>
                          <span style={{background:sc.bg,color:sc.text,padding:"1px 5px",borderRadius:99,fontSize:9,fontWeight:700,fontFamily:"monospace",whiteSpace:"nowrap",flexShrink:0}}>{sc.lbl}</span>
                          {isLead(p)&&<span style={{fontSize:8,color:teamMembers[name],fontFamily:"monospace",fontWeight:700,flexShrink:0}}>★</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{flex:1}}><Pb pct={p.pct} color={teamMembers[name]}/></div>
                          <span style={{fontSize:9,color:"var(--text-faint)",fontFamily:"monospace",minWidth:26,textAlign:"right"}}>{p.pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ):(
                <div style={{fontSize:10,color:"var(--text-faint)",padding:"8px 0",textAlign:"center"}}>No active projects</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  const Tasks=()=>{
    try{
      const hasFilters=fTD!=="All"||fTP!=="All"||fTS!=="All"||fTQ!=="";
      const cols=[["",28],["Job #",92],["Project",128],["Task",null],["Designer",82],["Priority",65],["Status",82],["Due",96]];
      return(
        <div>
          {/* Viewing as bar */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,padding:'7px 12px',background:'var(--bg-subtle)',borderRadius:6,border:'1px solid var(--border-primary)'}}>
            <span style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace'}}>Viewing as:</span>
            <span style={{fontSize:11,fontWeight:700,color:'var(--accent)',fontFamily:'monospace'}}>{currentUser||'Everyone'}</span>
            <button onClick={()=>setShowUserSelect(true)} style={{background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:10,fontFamily:'monospace',textDecoration:'underline',padding:0}}>Switch</button>
            {currentUser&&fTD===currentUser&&<span style={{fontSize:9,color:'var(--text-ghost)',fontFamily:'monospace',marginLeft:4}}>— filtered to your tasks</span>}
          </div>
          {/* Filter bar */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <select style={S.sel} value={fTD} onChange={e=>setFTD(e.target.value)}>{["All",...Object.keys(teamMembers).sort()].map(d=><option key={d}>{d}</option>)}</select>
            <select style={S.sel} value={fTP} onChange={e=>setFTP(e.target.value)}>{["All","High","Medium","Low"].map(p=><option key={p}>{p}</option>)}</select>
            <select style={S.sel} value={fTS} onChange={e=>setFTS(e.target.value)}>{["All","In Progress","Not Started","Blocked"].map(s=><option key={s}>{s}</option>)}</select>
            <input value={fTQ} onChange={e=>setFTQ(e.target.value)} placeholder="Search project or task..." style={{background:'var(--bg-input)',border:'1px solid var(--border-secondary)',color:'var(--text-primary)',padding:'4px 10px',borderRadius:4,fontSize:11,fontFamily:'monospace',width:190,outline:'none'}}/>
            {hasFilters&&<button style={{...S.ghost,padding:"4px 10px",fontSize:10}} onClick={()=>{setFTD(currentUser||"All");setFTP("All");setFTS("All");setFTQ("");}}>✕ Clear</button>}
            <span style={{fontSize:10,color:"var(--text-muted)",fontFamily:"monospace"}}>{filteredTasks.length} task{filteredTasks.length!==1?'s':''}</span>
          </div>
          <table style={S.tbl}>
            <thead><tr>{cols.map(([h,w])=><th key={h||'chk'} style={{...S.th,...(w?{width:w,minWidth:w}:{})}}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredTasks.map((t,i)=>{
                const due=computeDue(t.stepId,t.startDate);
                const dueFmt=due?formatDue(due):t.startDate?{text:'No date set',overdue:false}:null;
                return(
                  <tr key={i} style={{background:i%2===0?"transparent":"var(--bg-row-alt)"}}>
                    <td style={{...S.td,textAlign:'center',paddingLeft:8}}>
                      {t.stepId&&<input type="checkbox" title={t.status==='Completed'?'Mark incomplete':'Mark complete'} checked={t.status==='Completed'} style={{width:14,height:14,cursor:'pointer',accentColor:'var(--accent)'}}
                        onChange={e=>toggleTaskComplete(t.job,t.stepId,e.target.checked)}/>}
                    </td>
                    <td style={{...S.td,fontFamily:"monospace",fontSize:9,fontWeight:700,color:"var(--accent)",whiteSpace:"nowrap"}}>{t.job||'—'}</td>
                    <td style={{...S.td,fontSize:10,color:"var(--text-sub)",maxWidth:128,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.projectName||'—'}</td>
                    <td style={{...S.td,color:"var(--text-body)",maxWidth:280}}>{t.desc||'—'}</td>
                    <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:5}}>{t.assigned&&teamMembers[t.assigned]&&<MemberAv name={t.assigned} size={18}/>}<span style={{fontSize:10,color:"var(--text-sub)"}}>{t.assigned||'—'}</span></div></td>
                    <td style={S.td}><span style={{color:t.priority==='High'?"var(--sla-red-text)":t.priority==='Medium'?"var(--status-hold-text)":"var(--status-done-text)",fontSize:10,fontWeight:700,fontFamily:"monospace"}}>{t.priority||'Low'}</span></td>
                    <td style={S.td}><Sb status={t.status||'Not Started'}/></td>
                    <td style={{...S.td,fontFamily:'monospace',fontSize:9,color:dueFmt?.overdue?'var(--sla-red-text)':'var(--text-muted)',fontWeight:dueFmt?.overdue?700:400,whiteSpace:'nowrap'}}>
                      {dueFmt?dueFmt.text:<span style={{color:'var(--text-ghost)'}}>No date set</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length===0&&(
                <tr><td colSpan={8} style={{...S.td,textAlign:"center",padding:"32px"}}>
                  {hasFilters
                    ?<span style={{color:"var(--text-faint)",fontFamily:"monospace",fontSize:11}}>No tasks match the current filters.</span>
                    :<span style={{color:"var(--status-done-text)",fontFamily:"monospace",fontSize:13,fontWeight:700}}>✓ All caught up! No pending tasks.</span>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }catch(err){
      console.error('Tasks render error:',err);
      return(
        <div style={{padding:32,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
          <div style={{color:"var(--sla-red-text)",fontFamily:"monospace",fontSize:12,marginBottom:8}}>Tasks tab encountered an error</div>
          <div style={{color:"var(--text-muted)",fontSize:11,fontFamily:"monospace"}}>{String(err)}</div>
        </div>
      );
    }
  };

  const ImportModal=()=>(
    <div style={S.ov} onClick={()=>!importing&&setShowImport(false)}>
      <div style={{...S.mod,maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:10,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>AUTO-IMPORT</div>
          <div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginTop:2}}>Create Project from Contract PDF</div>
          <div style={{fontSize:11,color:"#888",marginTop:4}}>Upload a signed contract PDF. AI will extract all details and create the project automatically — including scope checklist, payment milestones, risk flags, and action items.</div>
        </div>
        {!importing?(
          <div>
            <label style={{display:"block",border:"2px dashed #2a2a4a",borderRadius:8,padding:"32px",textAlign:"center",cursor:"pointer",background:"#0a0a15",transition:"border-color .2s"}}
              onDragOver={e=>{e.preventDefault();}}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type==="application/pdf")importFromPDF(f);}}>
              <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>e.target.files[0]&&importFromPDF(e.target.files[0])}/>
              <div style={{fontSize:36,marginBottom:8}}>📄</div>
              <div style={{fontSize:13,color:"#ccc",marginBottom:4}}>Click to select PDF or drag & drop here</div>
              <div style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>Accepts: CALOFT / TruPlans contract PDFs</div>
            </label>
            {importError&&<div style={{marginTop:12,color:"#e74c3c",fontSize:11,padding:"8px 12px",background:"#1a0808",borderRadius:4}}>{importError}</div>}
            <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}><button style={S.ghost} onClick={()=>setShowImport(false)}>Cancel</button></div>
          </div>
        ):(
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:36,marginBottom:16,animation:"spin 1s linear infinite"}}>⏳</div>
            <div style={{fontSize:14,color:"#f0f0f0",marginBottom:8}}>{importStep}</div>
            <div style={{fontSize:11,color:"#555",fontFamily:"monospace"}}>This takes about 15–20 seconds...</div>
            <div style={{marginTop:20}}><Pb pct={importStep.includes("Building")?90:importStep.includes("Processing")?70:importStep.includes("AI")?40:10} color="#e94560"/></div>
          </div>
        )}
      </div>
    </div>
  );

  if(authLoading) return(
    <div style={{position:'fixed',inset:0,background:'#0d0d1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontSize:11,color:'#555',fontFamily:'monospace',letterSpacing:'3px'}}>LOADING...</div>
    </div>
  );
  if(!session) return(
    <div style={S.app} className={theme==="light"?"light-theme":""}>
      <style>{`:root{--bg-page:#0d0d1a;--bg-card:#12122a;--text-muted:#8888aa;--text-faint:#555577;--accent:#e94560;--sla-red-text:#ff6b6b;--border-primary:#1e1e3a;}`}</style>
      <LoginScreen sbClient={sbClient}/>
    </div>
  );

  return(
    <div style={S.app} className={theme==="light"?"light-theme":""}>
      <style>{`
        :root {
          --bg-page:#0d0d1a; --bg-card:#12122a; --bg-nav:#0a0a15;
          --bg-secondary:#0d0d1a; --bg-subtle:#1a1a2e; --bg-row-alt:#0a0a18;
          --bg-panel:#0a0a15; --bg-input:#0d0d1a;
          --border-primary:#1e1e3a; --border-secondary:#2a2a4a;
          --border-td:#0f0f22; --nav-border-bottom:1px solid #1e1e3a;
          --text-primary:#e0e0e0; --text-bright:#f0f0f0; --text-body:#ccc;
          --text-sub:#aaa; --text-muted:#888; --text-dim:#666;
          --text-faint:#555; --text-ghost:#444; --text-near:#333;
          --accent:#e94560; --tab-active:#e94560; --tab-inactive:#888;
          --th-color:#e94560; --th-bg:transparent; --th-border:#1e1e3a;
          --kpi-0:#5bb8f5; --kpi-1:#e94560; --kpi-2:#52d68a;
          --kpi-3:#f0a842; --kpi-4:#9b59b6; --kpi-5:#e74c3c; --kpi-top-w:0px;
          --status-ip-bg:#1a3a5c;   --status-ip-text:#5bb8f5;   --status-ip-dot:#5bb8f5;
          --status-done-bg:#1a3d2b; --status-done-text:#52d68a; --status-done-dot:#52d68a;
          --status-hold-bg:#3d2a0d; --status-hold-text:#f0a842; --status-hold-dot:#f0a842;
          --status-ns-bg:#1e1e2e;   --status-ns-text:#888;      --status-ns-dot:#888;
          --status-na-bg:#111;      --status-na-text:#444;      --status-na-dot:#444;
          --section-header:#e94560; --toggle-border:#e94560;
          --sla-red-bg:#3d0808; --sla-red-text:#e74c3c;
        }
        .light-theme {
          --bg-page:#ffffff; --bg-card:#ffffff; --bg-nav:#ffffff;
          --bg-secondary:#f5f5f5; --bg-subtle:#f0f0f0; --bg-row-alt:#f5f5f5;
          --bg-panel:#f5f5f5; --bg-input:#f5f5f5;
          --border-primary:#e0e0e0; --border-secondary:#e0e0e0;
          --border-td:#e0e0e0; --nav-border-bottom:2px solid #1565c0;
          --text-primary:#212121; --text-bright:#212121; --text-body:#424242;
          --text-sub:#616161; --text-muted:#757575; --text-dim:#757575;
          --text-faint:#9e9e9e; --text-ghost:#bdbdbd; --text-near:#e0e0e0;
          --accent:#1565c0; --tab-active:#1565c0; --tab-inactive:#757575;
          --th-color:#212121; --th-bg:#f5f5f5; --th-border:#e0e0e0;
          --kpi-0:#1565c0; --kpi-1:#1565c0; --kpi-2:#2e7d32;
          --kpi-3:#1565c0; --kpi-4:#2e7d32; --kpi-5:#c62828; --kpi-top-w:3px;
          --status-ip-bg:#e3f2fd;   --status-ip-text:#1565c0;  --status-ip-dot:#1565c0;
          --status-done-bg:#e8f5e9; --status-done-text:#2e7d32;--status-done-dot:#2e7d32;
          --status-hold-bg:#fff8e1; --status-hold-text:#f57f17;--status-hold-dot:#f57f17;
          --status-ns-bg:#f5f5f5;   --status-ns-text:#9e9e9e;  --status-ns-dot:#9e9e9e;
          --status-na-bg:#f5f5f5;   --status-na-text:#bdbdbd;  --status-na-dot:#bdbdbd;
          --section-header:#1565c0; --toggle-border:#1565c0;
          --sla-red-bg:#fce4ec; --sla-red-text:#c62828;
        }
        @keyframes slideInRight {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes slideOutLeft {
          from { opacity:1; transform:translateX(0); }
          to   { opacity:0; transform:translateX(-24px); }
        }
      `}</style>
      {showUserSelect&&!session&&<UserSelectModal teamMembers={teamMembers} onSelect={selectUser}/>}
      {pdfPanel&&<PDFPanel panel={pdfPanel} onClose={()=>setPdfPanel(null)}/>}
      {paymentPanel&&<PaymentPanel project={paymentPanel} milestones={getProjectMilestones(paymentPanel,paymentData)} onClose={()=>setPaymentPanel(null)} onUpdate={savePaymentData}/>}
      {cityPanel&&<CityPanel project={cityPanel} initData={getCityData(cityPanel.id,cityData)} onClose={()=>setCityPanel(null)} onUpdate={saveCityData}/>}
      {analyseModal&&<AnalyseModal project={analyseModal} onClose={()=>setAnalyseModal(null)} onSave={handleAnalyseSave}/>}
      {notifPanel&&<NotificationPanel prefs={notifPrefs} history={notifHistory} onClose={()=>setNotifPanel(false)} onUpdatePrefs={saveNotifPrefs}/>}
      {hoaPanel&&<HOAPanel project={hoaPanel} initData={getHOAData(hoaPanel.id,hoaData)} onClose={()=>setHoaPanel(null)} onUpdate={saveHoaData}/>}
      {selP&&<PM/>}
      {ctrP&&<ContractModule project={ctrP} onClose={()=>setCtrP(null)} onUpdate={handleContractModuleUpdate}/>}
      {emailModal&&<EmailModal project={emailModal} extra={buildEmailExtra(emailModal)} onClose={()=>setEmailModal(null)} onLog={saveEmailLog}/>}
      {intake&&(
    <div style={S.ov}><div style={S.mod}><div style={{marginBottom:20}}><div style={{fontSize:11,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>NEW PROJECT</div><div style={{fontSize:18,fontWeight:700,color:"#f0f0f0"}}>Job Intake Form</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {[["Job Number","job","text"],["Client Name","client","text"],["City","city","text"],["Fee ($)","contract","number"]].map(([l,k,t])=><div key={k}><label style={S.label}>{l}</label><input type={t} style={S.input} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
      <div><label style={S.label}>Type</label><select style={{...S.input,width:"100%"}} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{TS.slice(1).map(t=><option key={t}>{t}</option>)}</select></div>
      <div><label style={S.label}>Designer</label><select style={{...S.input,width:"100%"}} value={form.designer} onChange={e=>setForm({...form,designer:e.target.value})}>{Object.keys(teamMembers).map(d=><option key={d}>{d}</option>)}</select></div>
      <div style={{gridColumn:"1/-1"}}><label style={S.label}>Notes</label><textarea style={{...S.input,height:70,resize:"vertical"}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
    </div>
    <div style={{marginTop:20,display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.ghost} onClick={()=>setIntake(false)}>Cancel</button><button style={S.btn} onClick={()=>{saveProjects(prev=>[...prev,{id:'TRU-'+String(prev.length+1).padStart(3,'0'),name:form.job||'New Project',client:form.client||'',city:form.city||'',type:form.type,designer:form.designer,status:'In Progress',phase:'Schematic',start:new Date().toISOString().slice(0,10),end:'',pct:0,stamp:'No',permit:'No',contract:parseFloat(form.contract)||0,invoiced:0,team:[],workflow:generateWorkflow(new Date().toISOString().slice(0,10),form.designer),contracts:[]}]);setIntake(false);}}>Save</button></div>
    </div></div>
      )}
      {showImport&&<ImportModal/>}
      {confirmDelete&&(
        <div style={S.ov} onClick={()=>setConfirmDelete(null)}>
          <div style={{...S.mod,maxWidth:420,marginTop:120}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",padding:"10px 0 20px"}}>
              <div style={{fontSize:32,marginBottom:12}}>🗑</div>
              <div style={{fontSize:16,fontWeight:700,color:"#f0f0f0",marginBottom:8}}>Delete Project?</div>
              <div style={{fontSize:12,color:"#888",marginBottom:4}}>{confirmDelete.name}</div>
              <div style={{fontSize:11,color:"#e74c3c",marginBottom:20}}>This cannot be undone.</div>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                <button style={S.ghost} onClick={()=>setConfirmDelete(null)}>Cancel</button>
                <button style={{background:"#e74c3c",color:"#fff",border:"none",padding:"7px 20px",borderRadius:4,fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"monospace"}} onClick={()=>deleteProject(confirmDelete.id)}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {workflowP&&<WorkflowModal project={workflowP} projects={projects} setProjects={saveProjects} teamMembers={teamMembers} onClose={()=>setWorkflowP(null)}/> }
      {showTeamSettings&&<TeamSettingsModal teamMembers={teamMembers} setTeamMembers={setTeamMembers} onClose={()=>setShowTeamSettings(false)}/>}
      {assignP&&<AssignModal project={assignP} projects={projects} setProjects={saveProjects} teamMembers={teamMembers} onClose={()=>setAssignP(null)}/>}
      <nav style={S.nav}>
        <div style={S.logo}>TRUPLANS</div>
        {[["dashboard","Dashboard"],["projects","Projects"],["gantt","Gantt"],["tasks","Tasks"],["team","Team"],["inbox","Inbox"]].map(([id,l])=><button key={id} style={S.tab(tab===id)} onClick={()=>{setTab(id);setDetailProjectId(null);}}>{l}</button>)}
        <div ref={searchRef} style={{position:'relative',marginLeft:16,display:'flex',alignItems:'center'}}>
          <input
            value={searchQ}
            onChange={e=>{setSearchQ(e.target.value);if(tab!=='inbox')setSearchOpen(true);}}
            onFocus={()=>searchQ&&setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="🔍 Search projects..."
            style={{background:'var(--bg-input)',border:'1px solid var(--border-secondary)',color:'var(--text-primary)',padding:'5px 32px 5px 10px',borderRadius:4,fontSize:11,fontFamily:'monospace',width:210,outline:'none'}}
          />
          {searchQ&&<button onClick={()=>{setSearchQ('');setSearchOpen(false);}} style={{position:'absolute',right:6,background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px'}} title="Clear">✕</button>}
          {searchOpen&&searchResults.length>0&&tab!=='inbox'&&(
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,width:380,background:'var(--bg-card)',border:'1px solid var(--border-primary)',borderRadius:6,zIndex:300,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',maxHeight:420,overflowY:'auto'}}>
              {searchResults.map((r,i)=>(
                <div key={i} onClick={()=>goToProject(r.projectId)}
                  style={{padding:'9px 14px',cursor:'pointer',borderBottom:'1px solid var(--border-td)',display:'flex',gap:10,alignItems:'flex-start',background:i%2===0?'transparent':'var(--bg-row-alt)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'var(--bg-row-alt)'}
                >
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text-bright)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.projectName}</div>
                    <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',marginTop:2}}>
                      <span style={{color:'var(--accent)'}}>{r.field}:</span>{' '}
                      <span style={{color:'var(--text-body)'}}>{r.text.length>70?r.text.slice(0,70)+'…':r.text}</span>
                    </div>
                  </div>
                  <span style={{fontSize:9,color:'var(--accent)',fontFamily:'monospace',flexShrink:0,marginTop:2,opacity:0.7}}>{r.projectId}</span>
                </div>
              ))}
              <div style={{padding:'6px 14px',fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',textAlign:'center',borderTop:'1px solid var(--border-primary)'}}>
                {searchResults.length} result{searchResults.length!==1?'s':''} · Esc to close
              </div>
            </div>
          )}
          {searchOpen&&searchQ.trim()&&searchResults.length===0&&(
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,width:280,background:'var(--bg-card)',border:'1px solid var(--border-primary)',borderRadius:6,zIndex:300,padding:'14px',textAlign:'center',fontSize:11,color:'var(--text-faint)',fontFamily:'monospace',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
              No results for "{searchQ}"
            </div>
          )}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {session?.user?(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {session.user.user_metadata?.avatar_url
                ?<img src={session.user.user_metadata.avatar_url} alt="" style={{width:24,height:24,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--border-secondary)'}}/>
                :<div style={{width:24,height:24,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>{(currentUser||'?')[0]}</div>
              }
              <span style={{fontSize:10,color:'var(--accent)',fontFamily:'monospace',fontWeight:700}}>{currentUser||session.user.user_metadata?.full_name?.split(' ')[0]||'User'}</span>
              <button onClick={()=>sbClient?.auth.signOut()} style={{background:'none',border:'1px solid var(--border-secondary)',color:'var(--text-muted)',borderRadius:4,padding:'3px 8px',cursor:'pointer',fontSize:9,fontFamily:'monospace'}}>Sign out</button>
            </div>
          ):(
            <button onClick={()=>setShowUserSelect(true)} title="Switch active user" style={{background:"none",border:"1px solid var(--border-secondary)",color:"var(--text-muted)",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"monospace",display:"flex",alignItems:"center",gap:5}}>
              <span>👤</span><span style={{color:"var(--accent)",fontWeight:700}}>{currentUser||'?'}</span>
            </button>
          )}
          <button onClick={()=>setShowTeamSettings(true)} style={{background:"none",border:"1px solid var(--border-secondary)",color:"var(--text-muted)",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>⚙ Team</button>
          <div style={{fontSize:10,color:"var(--text-faint)",fontFamily:"monospace"}}>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
          <div style={{position:'relative'}}>
            <button onClick={()=>{setNotifPanel(v=>!v);setNotifUnread(0);}} style={{background:"none",border:"1px solid var(--border-secondary)",color:"var(--text-muted)",borderRadius:4,padding:"4px 8px",cursor:"pointer",fontSize:14,lineHeight:1}} title="Notifications">🔔</button>
            {notifUnread>0&&<div style={{position:'absolute',top:1,right:1,width:6,height:6,borderRadius:'50%',background:'var(--accent)',pointerEvents:'none'}}/>}
          </div>
          <div style={{minWidth:52,textAlign:'right'}}>{saveStatus==='saved'?<span style={{fontSize:10,color:'#27ae60',fontFamily:'monospace',fontWeight:700}}>Saved ✓</span>:<div style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'var(--border-secondary)'}}/>}</div>
          {session&&<div style={{display:'flex',alignItems:'center',gap:4}} title={`Realtime: ${realtimeStatus}`}>
            <div style={{width:6,height:6,borderRadius:'50%',background:realtimeStatus==='connected'?'#27ae60':'#666',boxShadow:realtimeStatus==='connected'?'0 0 5px #27ae60':'none',transition:'all .3s'}}/>
            <span style={{fontSize:8,color:realtimeStatus==='connected'?'#27ae60':'var(--text-faint)',fontFamily:'monospace',letterSpacing:'1px'}}>LIVE</span>
          </div>}
          <div style={{position:'relative'}}>
            <button onClick={generateWeeklyReport} disabled={reportGenerating} title="Generate Weekly Report PDF" style={{background:"none",border:"1px solid var(--border-secondary)",color:reportGenerating?"var(--text-faint)":"var(--text-muted)",borderRadius:4,padding:"4px 8px",cursor:reportGenerating?"default":"pointer",fontSize:15,lineHeight:1}}>
              {reportGenerating?'⏳':'🖨'}
            </button>
            {reportStatus&&<div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:reportStatus.ok?'var(--status-done-bg)':'var(--sla-red-bg)',color:reportStatus.ok?'var(--status-done-text)':'var(--sla-red-text)',border:`1px solid ${reportStatus.ok?'var(--status-done-text)':'var(--sla-red-text)'}33`,borderRadius:6,padding:'8px 12px',fontSize:10,fontFamily:'monospace',whiteSpace:'nowrap',zIndex:300,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>
              {reportStatus.ok?`✓ Saved to Desktop`:`✕ ${reportStatus.msg}`}
            </div>}
          </div>
          <button onClick={toggleTheme} style={{background:"none",border:"1px solid var(--toggle-border)",color:"var(--text-muted)",borderRadius:99,padding:"4px 12px",cursor:"pointer",fontSize:10,fontFamily:"monospace",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>{theme==="dark"?"☀️ Light":"🌙 Dark"}</button>
        </div>
      </nav>
      <input ref={pdfInputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={onPdfInputChange}/>
      <main style={S.main}>
        {detailProject?(
          <ProjectDetail
            project={detailProject}
            paymentData={paymentData}
            contractPaths={contractPaths}
            teamMembers={teamMembers}
            onBack={()=>{setDetailProjectId(null);setTab("projects");}}
            onUpdateProject={updateProjectNotes}
            onUpdateType={updateProjectType}
            onPaymentUpdate={savePaymentData}
            onPickPDF={pickPDF}
            onViewPDF={(p,fp)=>setPdfPanel({project:p,filePath:fp})}
            onUpdateName={updateProjectName}
            onDelete={()=>setConfirmDelete(detailProject)}
            onWorkflow={()=>setWorkflowP(detailProject)}
            onAssign={()=>setAssignP(detailProject)}
            onContracts={()=>setCtrP(detailProject)}
            onTogglePhase={togglePhaseFromDetail}
            onAnalyse={()=>setAnalyseModal(detailProject)}
            onUpdateFields={updateProjectFields}
            threads={gmailThreads}
            onOpenThread={t=>{setDetailProjectId(null);setTab("inbox");setPendingThread(t);}}
          />
        ):(
          <>
            {tab==="dashboard"&&<Dash/>}
            {tab==="projects"&&<Projs/>}
            {tab==="gantt"&&<Gantt/>}
            {tab==="tasks"&&<Tasks/>}
            {tab==="team"&&<Team/>}
            {tab==="inbox"&&<Inbox projects={projects} onOpenProject={goToProject} threads={gmailThreads} onSetThreads={setGmailThreads} initialThread={pendingThread} onInitialThreadConsumed={()=>setPendingThread(null)} searchFilter={searchQ} userEmail={session?.user?.email||''}/>}
          </>
        )}
      </main>
    </div>
  );
}
