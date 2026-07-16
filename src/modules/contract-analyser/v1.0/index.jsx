import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { S, fmt$, doOpenPath, parseNotes, Av, Sb, Pb, ST, SLABadge, getSLAStatus, calculateZone, STATUS_COLOR, PRIORITY_COLOR, DC_INIT, WORKFLOW_MILESTONES, generateWorkflow, TEAM_ROLES, PALETTE, PHASES_WILLIS_WORKFLOW, makeDefaultPhases, addDays, EXTERNAL_IDS, WEEK_BUCKETS, getProjectMilestones, CITY_STATUS_OPTIONS, ROUND_STATUS, CITY_STATUS_BADGE, CITY_STATUS_DOT, CITY_DEFAULTS, CITY_EMPTY, getCityData, HOA_STATUS_OPTIONS, HOA_DOCS, HOA_STATUS_BADGE, HOA_STATUS_DOT, HOA_REQUIRED_IDS, HOA_EMPTY, getHOAData, CONTRACT_TEMPLATE, NELSON_CONTRACT, fixDateYear, API_BASE, ANTHROPIC_API_KEY, dbt, sbClient, PHASES } from "../../../shared/core.jsx";

const ANALYSE_PROMPT=`You are analysing a construction or architectural services contract PDF.

STEP 1 — DETECT FORMAT:
- If the document contains "CALOFT CORP" → FORMAT 2 (CALOFT Construction Contract)
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

=== ALL FORMATS — NEW vs DEMO BREAKDOWN ===
Based on the INCLUDED scope items (included="Y"), produce a clear plain-language Scope of Work split into two lists:
- newWork: array of short strings describing what will be NEW — anything built, added, installed, framed, or created (e.g. "New 10-Star floor system", "2 new casement windows", "10 recessed LED lights", "New electrical circuit").
- demoWork: array of short strings describing what will be DEMOLISHED or REMOVED — anything torn out, demolished, de-installed, or hauled away (e.g. "Demolition of existing ceiling", "Remove existing window", "Haul away debris").
If an item involves both (e.g. "enlarge existing window" = remove old + install new), list the removal part under demoWork and the install part under newWork. Only base these on items that are actually INCLUDED in the contract. Keep each entry concise (under 12 words).

Return ONLY valid JSON, no markdown, no backticks. Leave fields empty/0/[] if not applicable to the detected format:
{"contractFormat":"","clientLastName":"","clientFirstNames":"","fullAddress":"","phone1":"","phone2":"","email":"","workOrderDate":"","contractDate":"","signedDate":"","projectNumber":"","docusignId":"","contractorCompany":"","contractorLicense":"","archTotal":0,"civilTotal":0,"structuralTotal":0,"landscapeTotal":0,"grandTotal":0,"approxStartDate":"","approxCompletionDate":"","estimatedConstructionTime":"","paymentMilestones":[{"code":"","description":"","amount":0,"trigger":""}],"scopeOfWork":[{"category":"","description":"","included":"Y"}],"newWork":[],"demoWork":[],"signatureDate":"","signedByName":"","includedItems":[],"excludedItems":[]}`;


const SAVE_CONTRACT_TOOL={name:"save_contract",description:"Save the extracted contract data in the TruPlans dashboard field shape.",input_schema:{type:"object",properties:{contractFormat:{type:"string"},clientLastName:{type:"string"},clientFirstNames:{type:"string"},fullAddress:{type:"string"},phone1:{type:"string"},phone2:{type:"string"},email:{type:"string"},workOrderDate:{type:"string"},contractDate:{type:"string"},signedDate:{type:"string"},projectNumber:{type:"string"},docusignId:{type:"string"},contractorCompany:{type:"string"},contractorLicense:{type:"string"},archTotal:{type:"number"},civilTotal:{type:"number"},structuralTotal:{type:"number"},landscapeTotal:{type:"number"},grandTotal:{type:"number"},approxStartDate:{type:"string"},approxCompletionDate:{type:"string"},estimatedConstructionTime:{type:"string"},paymentMilestones:{type:"array",items:{type:"object",properties:{code:{type:"string"},description:{type:"string"},amount:{type:"number"},trigger:{type:"string"}}}},scopeOfWork:{type:"array",items:{type:"object",properties:{category:{type:"string"},description:{type:"string"},included:{type:"string",enum:["Y","N"]}}}},newWork:{type:"array",items:{type:"string"}},demoWork:{type:"array",items:{type:"string"}},signatureDate:{type:"string"},signedByName:{type:"string"},includedItems:{type:"array",items:{type:"string"}},excludedItems:{type:"array",items:{type:"string"}}},required:["contractFormat","clientLastName","grandTotal","scopeOfWork","paymentMilestones"]}};


function AnalyseModal({project,onClose,onSave}){
  const [phase,setPhase]=useState('pick');
  const [addAsNew,setAddAsNew]=useState(false);
  const [filePath,setFilePath]=useState('');
  const [filename,setFilename]=useState('');
  const [errMsg,setErrMsg]=useState('');
  const [edited,setEdited]=useState(null);
  const fileInputRef=useRef(null);
  const b64Ref=useRef(null);

  const pickFile=async()=>{
    if(window.electronAPI?.openFile){
      const fp=await window.electronAPI.openFile();
      if(fp){setFilePath(fp);setFilename(fp.split(/[/\\]/).pop());}
    } else {
      fileInputRef.current?.click();
    }
  };

  const onFileInputChange=e=>{
    const f=e.target.files?.[0];
    if(!f) return;
    setFilename(f.name);
    const reader=new FileReader();
    reader.onload=ev=>{setFilePath({_blob:true,data:ev.target.result.split(',')[1],name:f.name});};
    reader.readAsDataURL(f);
  };

  const analyse=async()=>{
    if(!filePath)return;
    setPhase('analysing');setErrMsg('');
    try{
      const b64=filePath?._blob ? filePath.data : await window.electronAPI?.readFileBase64(filePath);
      if(!b64)throw new Error('Could not read file — check the path is accessible');
      b64Ref.current=b64;
      const payload={model:'claude-sonnet-4-6',max_tokens:8000,tools:[SAVE_CONTRACT_TOOL],tool_choice:{type:'tool',name:'save_contract'},messages:[{role:'user',content:[
        {type:'document',source:{type:'base64',media_type:'application/pdf',data:b64}},
        {type:'text',text:ANALYSE_PROMPT}
      ]}]};
      let data;
      if(window.electronAPI?.analyseContract){
        const result=await window.electronAPI.analyseContract(payload);
        if(!result.ok)throw new Error(result.error);
        data=result.data;
      } else {
        const res=await fetch(`${API_BASE}/api/claude`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!res.ok)throw new Error(`Server error ${res.status}`);
        data=await res.json();
      }
      if(data.error)throw new Error(JSON.stringify(data.error));
      const toolUse=(data.content||[]).find(b=>b.type==='tool_use'&&b.name==='save_contract');
      if(!toolUse)throw new Error('No structured data in AI response');
      const parsed=toolUse.input;
      if(!parsed.grandTotal){
        parsed.grandTotal=(parsed.archTotal||0)+(parsed.civilTotal||0)+(parsed.structuralTotal||0)+(parsed.landscapeTotal||0);
      }
      setEdited(JSON.parse(JSON.stringify(parsed)));
      setPhase('review');
    }catch(e){setErrMsg(String(e));setPhase('pick');}
  };

  const upd=(k,v)=>setEdited(p=>({...p,[k]:v}));
  const updMs=(i,k,v)=>setEdited(p=>({...p,paymentMilestones:p.paymentMilestones.map((m,mi)=>mi===i?{...m,[k]:v}:m)}));

  const save=async()=>{
    const e=edited;
    const clientName=[e.clientFirstNames,e.clientLastName].filter(Boolean).join(' ');
    const notesParts=[];
    if(e.contractorCompany)notesParts.push(`${e.contractorCompany}${e.contractorLicense?' '+e.contractorLicense:''}.`);
    if(e.signedDate)notesParts.push(`Signed ${e.signedDate}.`);
    if(e.contractDate)notesParts.push(`Contract ${e.contractDate}.`);
    if(e.workOrderDate)notesParts.push(`Work Order ${e.workOrderDate}.`);
    if(e.archTotal)notesParts.push(`Arch $${Number(e.archTotal).toLocaleString()}`);
    if(e.structuralTotal)notesParts.push(`Structural $${Number(e.structuralTotal).toLocaleString()}`);
    if(e.civilTotal)notesParts.push(`Civil $${Number(e.civilTotal).toLocaleString()}`);
    if(e.grandTotal)notesParts.push(`Total $${Number(e.grandTotal).toLocaleString()}.`);
    if(e.estimatedConstructionTime)notesParts.push(`Duration: ${e.estimatedConstructionTime}.`);
    if(e.fullAddress)notesParts.push(e.fullAddress+'.');
    if(e.phone1)notesParts.push(`Phone: ${e.phone1}.`);
    if(e.email)notesParts.push(`Email: ${e.email}.`);
    if(e.docusignId)notesParts.push(`DocuSign: ${e.docusignId}.`);
    const milestones=(e.paymentMilestones||[]).map(m=>({
      code:String(m.code||''),label:String(m.description||m.code||''),
      desc:String(m.trigger||''),amount:Number(m.amount)||0,status:'Pending'
    }));
    const cityFromAddr=e.fullAddress?(e.fullAddress.match(/,\s*([A-Za-z\s]+),?\s*(?:CA\s*)?\d{5}/)?.[1]?.trim()||null):null;
    let contractPath=filename;
    try{
      if(b64Ref.current){
        const r=await fetch(`${API_BASE}/api/storage/upload-contract`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:project.id,filename,base64:b64Ref.current})});
        const j=await r.json();
        if(j.ok&&j.url) contractPath=j.url;
      }
    }catch(_){}
    onSave(project.id,{
      client:clientName||project.client,
      contract:Number(e.grandTotal)||0,
      start:e.signedDate||e.signatureDate||e.contractDate||e.workOrderDate||project.start,
      notes:notesParts.join(' '),
      scopeOfWork:e.scopeOfWork||[],
      newWork:e.newWork||[],
      demoWork:e.demoWork||[],
      contractPath,
      ...(cityFromAddr&&!project.city?{city:cityFromAddr}:{}),
      contracts:project.contracts&&project.contracts.length>0&&!addAsNew?project.contracts.map((c,i)=>i===0?{...CONTRACT_TEMPLATE,...e,id:c.id}:c):[...(addAsNew&&project.contracts.length>0?project.contracts:[]),{...CONTRACT_TEMPLATE,...e,id:Date.now()}]
    },milestones);
    setPhase('saved');
    setTimeout(()=>onClose(),2200);
  };

  const FIELDS=[
    ['contractFormat','Contract Format'],
    ['clientLastName','Last Name'],['clientFirstNames','First Name(s)'],
    ['fullAddress','Property Address'],['phone1','Phone 1'],['phone2','Phone 2'],
    ['email','Email'],['workOrderDate','Work Order Date'],['contractDate','Contract Date'],
    ['signedDate','Signed On Date'],['projectNumber','Project #'],['docusignId','DocuSign ID'],
    ['contractorCompany','Contractor Company'],['contractorLicense','CSLB License'],
    ['archTotal','Arch Total ($)'],['civilTotal','Civil Total ($)'],
    ['structuralTotal','Structural Total ($)'],['landscapeTotal','Landscape Total ($)'],
    ['grandTotal','Grand Total ($)'],
    ['approxStartDate','Approx Start Date'],['approxCompletionDate','Approx Completion'],
    ['estimatedConstructionTime','Est. Construction Time'],
    ['signatureDate','Signature Date'],['signedByName','Signed By'],
  ];

  return(
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod,maxWidth:1000,position:'relative'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <div style={{fontSize:10,color:'var(--accent)',letterSpacing:'2px',fontFamily:'monospace',fontWeight:700}}>CONTRACT ANALYSER</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--text-bright)'}}>Analyse Contract — {project.name}</div>
          </div>
          <button onClick={onClose} style={{...S.ghost,padding:'4px 10px',fontSize:16,lineHeight:1}}>✕</button>
        </div>

        {phase==='pick'&&(
          <div>
            {errMsg&&<div style={{background:'var(--sla-red-bg)',color:'var(--sla-red-text)',padding:'8px 12px',borderRadius:4,marginBottom:14,fontSize:11,fontFamily:'monospace'}}>⚠ {errMsg}</div>}
            <input ref={fileInputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={onFileInputChange}/>
            <div
              onClick={pickFile}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(!f)return;if(f.path){setFilePath(f.path);setFilename(f.name);}else{setFilename(f.name);const r=new FileReader();r.onload=ev=>{setFilePath({_blob:true,data:ev.target.result.split(',')[1],name:f.name});};r.readAsDataURL(f);}}}
              style={{border:'2px dashed var(--border-secondary)',borderRadius:8,padding:'48px 32px',textAlign:'center',cursor:'pointer',background:'var(--bg-page)',marginBottom:16,transition:'border-color .2s'}}
            >
              <div style={{fontSize:40,marginBottom:10}}>📄</div>
              <div style={{fontSize:14,color:'var(--text-body)',marginBottom:4}}>Drop TruPlans Work Order, CALOFT, or TruAdditions Construction Contract PDF here or click to browse</div>
              <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace'}}>Auto-detects format (TruPlans / CALOFT / TruAdditions) — server must be running on port 3001</div>
            </div>
            {filename&&<div style={{fontSize:12,color:'var(--status-done-text)',marginBottom:14,fontFamily:'monospace',display:'flex',alignItems:'center',gap:6}}>✓ {filename}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button style={S.ghost} onClick={onClose}>Cancel</button>
              {filename&&<button style={S.btn} onClick={analyse}>🔍 Analyse Contract</button>}
            </div>
          </div>
        )}

        {phase==='analysing'&&(
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <div style={{fontSize:44,marginBottom:16}}>⏳</div>
            <div style={{fontSize:16,color:'var(--text-bright)',marginBottom:8,fontWeight:600}}>Sending to Claude AI...</div>
            <div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace',marginBottom:24}}>Extracting TruPlans contract data — this takes 20–30 seconds</div>
            <Pb pct={65} color="var(--accent)"/>
          </div>
        )}

        {phase==='review'&&edited&&(
          <div>
            {(!edited.grandTotal||edited.grandTotal===0)&&<div style={{background:'var(--sla-red-bg)',color:'var(--sla-red-text)',padding:'8px 14px',borderRadius:4,marginBottom:12,fontSize:12,fontWeight:600}}>⚠ Contract value not found — enter manually in Grand Total field below</div>}
            <div style={{display:'grid',gridTemplateColumns:'42% 1fr',gap:20,marginBottom:16}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>Extracted Data</div>
                {FIELDS.map(([k,label])=>(
                  <div key={k} style={{marginBottom:7}}>
                    <div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:2}}>{label}</div>
                    <input
                      type={['archTotal','civilTotal','structuralTotal','landscapeTotal','grandTotal'].includes(k)?'number':'text'}
                      value={edited[k]??''}
                      onChange={e=>upd(k,['archTotal','civilTotal','structuralTotal','landscapeTotal','grandTotal'].includes(k)?parseFloat(e.target.value)||0:e.target.value)}
                      style={{...S.input,fontSize:11,background:(!edited[k]&&edited[k]!==0)?'var(--status-hold-bg)':'var(--bg-input)'}}
                    />
                  </div>
                ))}
                {(edited.scopeOfWork||[]).length>0&&<div style={{marginBottom:7}}>
                  <div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Scope of Work ({edited.scopeOfWork.length} items)</div>
                  {Object.entries((edited.scopeOfWork||[]).reduce((acc,item)=>{const cat=item.category||'Other';(acc[cat]=acc[cat]||[]).push({description:item.description,included:item.included});return acc},{})).map(([cat,items])=>(
                    <div key={cat} style={{marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:700,color:'var(--accent)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:3}}>{cat}</div>
                      {items.map((it,i)=><div key={i} style={{fontSize:10,display:'flex',gap:5,marginBottom:2}}><span style={{color:it.included==='N'?'var(--status-overdue-text)':'var(--status-done-text)',flexShrink:0}}>{it.included==='N'?'✗':'✓'}</span><span style={{color:'var(--text-body)'}}>{it.description}</span></div>)}
                    </div>
                  ))}
                </div>}
                {((edited.newWork||[]).length>0||(edited.demoWork||[]).length>0)&&<div style={{marginBottom:7,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <div style={{fontSize:9,fontWeight:700,color:'var(--status-done-text)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>🔨 New Work ({(edited.newWork||[]).length})</div>
                    {(edited.newWork||[]).map((w,i)=><div key={i} style={{fontSize:10,display:'flex',gap:5,marginBottom:3}}><span style={{color:'var(--status-done-text)',flexShrink:0}}>+</span><span style={{color:'var(--text-body)'}}>{w}</span></div>)}
                    {!(edited.newWork||[]).length&&<div style={{fontSize:10,color:'var(--text-faint)'}}>—</div>}
                  </div>
                  <div>
                    <div style={{fontSize:9,fontWeight:700,color:'var(--status-overdue-text)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>🧨 Demo / Remove ({(edited.demoWork||[]).length})</div>
                    {(edited.demoWork||[]).map((w,i)=><div key={i} style={{fontSize:10,display:'flex',gap:5,marginBottom:3}}><span style={{color:'var(--status-overdue-text)',flexShrink:0}}>−</span><span style={{color:'var(--text-body)'}}>{w}</span></div>)}
                    {!(edited.demoWork||[]).length&&<div style={{fontSize:10,color:'var(--text-faint)'}}>—</div>}
                  </div>
                </div>}
                <table style={S.tbl}>
                  <thead><tr>{['Code','Description','Amount ($)','Trigger'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {(edited.paymentMilestones||[]).map((m,i)=>(
                      <tr key={i} style={{background:i%2===0?'transparent':'var(--bg-row-alt)'}}>
                        <td style={S.td}><input value={m.code||''} onChange={e=>updMs(i,'code',e.target.value)} style={{...S.input,width:48,padding:'3px 6px',fontSize:10}}/></td>
                        <td style={S.td}><input value={m.description||''} onChange={e=>updMs(i,'description',e.target.value)} style={{...S.input,fontSize:10,padding:'3px 6px'}}/></td>
                        <td style={S.td}><input type="number" value={m.amount||0} onChange={e=>updMs(i,'amount',parseFloat(e.target.value)||0)} style={{...S.input,width:80,padding:'3px 6px',fontSize:10}}/></td>
                        <td style={S.td}><input value={m.trigger||''} onChange={e=>updMs(i,'trigger',e.target.value)} style={{...S.input,fontSize:10,padding:'3px 6px'}}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(edited.paymentMilestones||[]).length&&<div style={{fontSize:11,color:'var(--text-faint)',padding:'20px 0',textAlign:'center'}}>No payment milestones extracted</div>}
              </div>
            </div>
            <div style={{borderTop:'1px solid var(--border-primary)',paddingTop:14}}>
              {project.contracts&&project.contracts.length>0&&(
                <div style={{marginBottom:12,padding:'10px 14px',background:'var(--bg-secondary)',borderRadius:6,border:'1px solid var(--border-primary)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-bright)',marginBottom:8}}>This project already has a contract. What would you like to do?</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setAddAsNew(false)} style={{flex:1,padding:'7px',fontSize:11,fontFamily:'monospace',borderRadius:4,border:`2px solid ${!addAsNew?'var(--accent)':'var(--border-secondary)'}`,background:!addAsNew?'var(--accent)':'none',color:!addAsNew?'#fff':'var(--text-muted)',cursor:'pointer'}}>🔄 Update existing contract</button>
                    <button onClick={()=>setAddAsNew(true)} style={{flex:1,padding:'7px',fontSize:11,fontFamily:'monospace',borderRadius:4,border:`2px solid ${addAsNew?'var(--accent)':'var(--border-secondary)'}`,background:addAsNew?'var(--accent)':'none',color:addAsNew?'#fff':'var(--text-muted)',cursor:'pointer'}}>➕ Add as new contract</button>
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button style={S.ghost} onClick={onClose}>Cancel</button>
                <button style={S.btn} onClick={save}>💾 Save to Project</button>
              </div>
            </div>
          </div>
        )}

        {phase==='saved'&&(
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <div style={{fontSize:44,marginBottom:12}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--status-done-text)'}}>Contract data saved to {project.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:6,fontFamily:'monospace'}}>Payment milestones and project fields updated</div>
          </div>
        )}
      </div>
    </div>
  );
}


function ContractModule({project,onClose,onUpdate,inline=false}){
  const [ci,setCi]=useState(0);
  const [ctab,setCtab]=useState("overview");
  const [ctrs,setCtrs]=useState(project.contracts.length>0?project.contracts:[{...CONTRACT_TEMPLATE,id:Date.now()}]);
  const [analyzing,setAnalyzing]=useState(false);
  const [pdfTxt,setPdfTxt]=useState("");
  const [aiRes,setAiRes]=useState(null);
  const [newCO,setNewCO]=useState({date:"",description:"",amount:"",status:"Pending"});
  const [phases,setPhases]=useState(()=>{
    const wf=Array.isArray(project.workflow)?project.workflow:[];
    if(wf.length>0){
      const oldById={};
      for(const p of(project.phases||[])) if(p&&p.id) oldById[p.id]=p;
      const WF_STATUS_MAP={Completed:'done','In Progress':'in_progress',Blocked:'in_progress','Not Started':'not_started'};
      return PHASES_WILLIS_WORKFLOW.map(def=>{
        const m=wf.find(w=>w&&w.milestoneId===def.id);
        const old=oldById[def.id]||{};
        return{
          id:def.id,
          status:m?(WF_STATUS_MAP[m.status]||'not_started'):(old.status||'not_started'),
          dateCompleted:old.dateCompleted||null,
          initials:old.initials||'',
          notes:old.notes||''
        };
      });
    }
    return project.phases&&project.phases.length===23?project.phases.map(p=>({...p})):makeDefaultPhases();
  });
  const [expandedPhase,setExpandedPhase]=useState(null);
  const [inlineOpen,setInlineOpen]=useState(false);
  const cyclePhase=id=>{const o=["not_started","in_progress","done"];const phToW={done:'Completed',not_started:'Not Started',in_progress:'In Progress'};const cur=phases.find(p=>p.id===id);if(!cur)return;const ni=(o.indexOf(cur.status)+1)%o.length;const ns=o[ni];const today=new Date().toISOString().slice(0,10);setPhases(prev=>prev.map(p=>p.id!==id?p:{...p,status:ns,dateCompleted:ns==="done"?today:p.dateCompleted}));const baseWF=Array.isArray(project.workflow)&&project.workflow.length>0?project.workflow:[];onUpdate?.({workflow:baseWF.map(m=>m&&m.milestoneId===id?{...m,status:phToW[ns]||m.status}:m)});};
  const _phInit=useRef(false);
  const _phLastHash=useRef('');
  useEffect(()=>{
    if(!_phInit.current){_phInit.current=true;try{_phLastHash.current=JSON.stringify(phases);}catch{}return;}
    let h;try{h=JSON.stringify(phases);}catch{h='';}
    if(h===_phLastHash.current)return;
    _phLastHash.current=h;
    onUpdate?.({phases});
  },[phases]);
  const _ctrsInit=useRef(false);
  const _ctrsLastHash=useRef('');
  useEffect(()=>{
    if(!_ctrsInit.current){_ctrsInit.current=true;try{_ctrsLastHash.current=JSON.stringify(ctrs);}catch{}return;}
    let h;try{h=JSON.stringify(ctrs);}catch{h='';}
    if(h===_ctrsLastHash.current)return;
    _ctrsLastHash.current=h;
    onUpdate?.({contracts:ctrs});
  },[ctrs]);
  const _lastContractsLen=useRef(project.contracts.length);
  useEffect(()=>{
    if(project.contracts.length!==_lastContractsLen.current&&project.contracts.length>0){
      _lastContractsLen.current=project.contracts.length;
      setCtrs(project.contracts);
      setCi(0);
    }
  },[project.contracts.length]);

  const [newAdd,setNewAdd]=useState({title:'',description:'',amount:'',date:new Date().toISOString().slice(0,10),status:'Draft',notes:''});
  const ADD_STATUSES=['Draft','Sent to Client','Signed','Approved'];
  const ADD_COLORS={Draft:'#888','Sent to Client':'#3498db',Signed:'#f0a842',Approved:'#27ae60'};
  const addAddendum=()=>{if(!newAdd.title.trim())return;setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,addendums:[...(c.addendums||[]),{...newAdd,id:`ADD-${Date.now()}`,amount:parseFloat(newAdd.amount)||0}]}));setNewAdd({title:'',description:'',amount:'',date:new Date().toISOString().slice(0,10),status:'Draft',notes:''});};
  const updateAddendum=(id,field,value)=>setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,addendums:(c.addendums||[]).map(a=>a.id!==id?a:{...a,[field]:value})}));
  const removeAddendum=(id)=>setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,addendums:(c.addendums||[]).filter(a=>a.id!==id)}));
  const cycleAddStatus=(id)=>setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,addendums:(c.addendums||[]).map(a=>a.id!==id?a:{...a,status:ADD_STATUSES[(ADD_STATUSES.indexOf(a.status)+1)%ADD_STATUSES.length]})}));

  const ctr=ci!==null?ctrs[ci]:null;
  const paid=ctr?ctr.paymentMilestones.filter(m=>m.paid).reduce((a,m)=>a+m.amount,0):0;
  const milestonesTotal=ctr?ctr.paymentMilestones.reduce((a,m)=>a+(m.amount||0),0):0;
  const addendumTotal=ctr?(ctr.addendums||[]).filter(a=>a.status==='Signed'||a.status==='Approved').reduce((s,a)=>s+(Number(a.amount)||0),0):0;
  const effectiveTotal=ctr?((Number(ctr.totalAmount)||0)||milestonesTotal)+addendumTotal:0;
  const due=ctr?effectiveTotal-paid:0;
  const pctP=ctr&&effectiveTotal>0?Math.round(paid/effectiveTotal*100):0;

  async function analyze(){
    if(!pdfTxt.trim())return;
    setAnalyzing(true);
    try{
      const payload={model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:`You are an expert architectural project manager at TruPlans Inc., a California residential design firm. Analyze this contract and return ONLY valid JSON (no markdown, no backticks):
{"summary":"2-3 sentence overview","scopeSummary":"included items as bullet list with \\n separators","paymentSummary":"payment schedule summary","obligations":"what TruPlans must deliver","riskFlags":[{"level":"HIGH|MEDIUM|LOW","text":"description"}],"actionItems":[{"done":false,"text":"action item"}]}

CONTRACT:
${pdfTxt.slice(0,8000)}`}]};
      let d;
      if(window.electronAPI?.analyseContract){
        const result=await window.electronAPI.analyseContract(payload);
        if(!result.ok)throw new Error(result.error);
        d=result.data;
      } else {
        const res=await fetch(`${API_BASE}/api/claude`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!res.ok)throw new Error(`Server error ${res.status}`);
        d=await res.json();
      }
      const raw=d.content?.[0]?.text||"{}";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const final={...parsed,generatedAt:new Date().toISOString().slice(0,10)};
      setAiRes(final);
      setCtrs(prev=>prev.map((c,i)=>i===ci?{...c,aiAnalysis:final}:c));
    }catch(e){setAiRes({error:"Analysis failed. Paste contract text and retry."});}
    setAnalyzing(false);
  }

  const tog=(section,id)=>setCtrs(prev=>prev.map((c,i)=>{if(i!==ci)return c;return{...c,[section]:c[section].map(s=>s.id!==id?s:{...s,status:s.status==="Completed"?"In Progress":s.status==="In Progress"?"Not Started":"Completed"})};}));
  const togPay=idx=>setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,paymentMilestones:c.paymentMilestones.map((m,mi)=>mi!==idx?m:{...m,paid:!m.paid,paidDate:!m.paid?new Date().toISOString().slice(0,10):""})}));
  const togHO=id=>setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,homeownerObligations:c.homeownerObligations.map(o=>o.id!==id?o:{...o,done:!o.done})}));
  const togHC=id=>setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,hiddenConditionFlags:c.hiddenConditionFlags.map(h=>h.id!==id?h:{...h,flagged:!h.flagged})}));
  const addCO=()=>{if(!newCO.description)return;setCtrs(prev=>prev.map((c,i)=>i!==ci?c:{...c,changeOrders:[...c.changeOrders,{...newCO,id:`CO-${Date.now()}`,amount:parseFloat(newCO.amount)||0}]}));setNewCO({date:"",description:"",amount:"",status:"Pending"});};
  const addContract=()=>{const nc={id:`CTR-${Date.now()}`,type:"Design + Construction",contractor:"",contractorLic:"",signedDate:"",totalAmount:0,estStart:"",estCompletion:"",constructionWeeks:"",docusignId:"",...JSON.parse(JSON.stringify(CONTRACT_TEMPLATE)),aiAnalysis:null};setCtrs(p=>[...p,nc]);setCi(ctrs.length);};
  const deleteContract=(i,e)=>{e.stopPropagation();if(!window.confirm('Remove this contract?'))return;const next=ctrs.filter((_,idx)=>idx!==i);setCtrs(next);onUpdate?.({contracts:next});setCi(Math.max(0,Math.min(ci,next.length-1)));};
  const clearAI=()=>{setAiRes(null);setCtrs(prev=>prev.map((c,i)=>i===ci?{...c,aiAnalysis:null}:c));};

  const CTABS=["overview","phases","design scope","construction scope","payments","homeowner","hidden conditions","change orders","ai analysis"];
  const ai=aiRes||(ctr?.aiAnalysis);

  const tabContentEl=ctr&&(
    <>
      {/* OVERVIEW */}
      {ctab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[["Contractor",ctr.contractor],["License",ctr.contractorLic],["Contract Type",ctr.type],["Signed",ctr.signedDate],["DocuSign ID",ctr.docusignId],["Construction",ctr.constructionWeeks?(ctr.constructionWeeks+" weeks"):"—"]].map(([l,v])=>(
          <div key={l} style={{background:"var(--bg-secondary)",padding:"10px 12px",borderRadius:4}}><div style={{fontSize:9,color:"#555",fontFamily:"monospace",letterSpacing:"1px",textTransform:"uppercase"}}>{l}</div><div style={{fontSize:11,color:"var(--text-body)",marginTop:3}}>{v||"—"}</div></div>
        ))}
      </div>}

      {/* PHASES */}
      {ctab==="phases"&&(()=>{
        const sd=project.siteMeasurementDate||project.startDate||project.start||new Date().toISOString().slice(0,10);
        const td=project.targetDate||addDays(sd,56);
        const{week,zone,daysUntilTarget}=calculateZone(project);
        const iPhases=phases.filter(p=>!["5.21","5.22","5.23"].includes(p.id));
        const ePhases=phases.filter(p=>["5.21","5.22","5.23"].includes(p.id));
        const doneCt=iPhases.filter(p=>p.status==="done").length;
        const phasePct=Math.round(doneCt/20*100);
        const ZC={green:"#27ae60",yellow:"#f0a842",red:"#e74c3c",overdue:"#666"};
        const ZL={green:"🟢 GREEN ZONE — On Track",yellow:"🟡 YELLOW ZONE — Finish Up",red:"🔴 RED ZONE — Overdue",overdue:"⚫ PAST HARD DEADLINE"};
        const zc=ZC[zone];
        const renderPhaseRow=(ph)=>{
          const def=PHASES_WILLIS_WORKFLOW.find(d=>d.id===ph.id);
          const isExp=expandedPhase===ph.id;
          const isIP=ph.status==="in_progress";
          return(
            <div key={ph.id} style={{marginBottom:3,borderRadius:5,overflow:"hidden",border:`1px solid ${isExp?"var(--border-primary)":"var(--border-secondary)"}`,...(isIP?{borderLeft:"3px solid #3498db"}:{})}}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:ph.status==="done"?"#0d1a0d":isIP?"#0a0d14":"#0d0d1a",cursor:"pointer"}} onClick={()=>setExpandedPhase(isExp?null:ph.id)}>
                <div onClick={e=>{e.stopPropagation();cyclePhase(ph.id);}} style={{width:17,height:17,borderRadius:3,border:`1.5px solid ${ph.status==="done"?"#27ae60":isIP?"#3498db":"#333"}`,background:ph.status==="done"?"#27ae6033":isIP?"#3498db22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
                  {ph.status==="done"&&<span style={{color:"#27ae60",fontSize:10,lineHeight:1}}>✓</span>}
                  {isIP&&<span style={{color:"#3498db",fontSize:7,lineHeight:1}}>●</span>}
                </div>
                <span style={{flex:1,fontSize:11,color:ph.status==="done"?"#52d68a":isIP?"#7bc8f5":"#ccc",fontWeight:isIP?700:400}}>{def?.name}</span>
                {ph.dateCompleted&&<span style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{ph.dateCompleted}</span>}
                {ph.initials&&<span style={{fontSize:9,color:ph.status==="done"?"#27ae6077":"#555",fontFamily:"monospace",fontWeight:700,minWidth:22,textAlign:"right"}}>{ph.initials}</span>}
                <span style={{color:"#2a2a4a",fontSize:9,marginLeft:2}}>{isExp?"▲":"▼"}</span>
              </div>
              {isExp&&(
                <div style={{padding:"10px 14px",background:"var(--bg-page)",borderTop:"1px solid #1a1a2e"}}>
                  <div style={{fontSize:10,color:"#555",lineHeight:1.65,marginBottom:10,fontStyle:"italic"}}>{def?.description}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 90px 140px",gap:8,marginBottom:8}}>
                    <div><label style={S.label}>Notes</label><input style={{...S.input,fontSize:10}} value={ph.notes} onChange={e=>setPhases(prev=>prev.map(p=>p.id===ph.id?{...p,notes:e.target.value}:p))} placeholder="Notes..."/></div>
                    <div><label style={S.label}>Initials</label><input style={{...S.input,fontSize:10}} value={ph.initials} onChange={e=>setPhases(prev=>prev.map(p=>p.id===ph.id?{...p,initials:e.target.value.toUpperCase().slice(0,3)}:p))} placeholder="WT" maxLength={3}/></div>
                    <div><label style={S.label}>Date Completed</label><input type="date" style={{...S.input,fontSize:10}} value={ph.dateCompleted ? String(ph.dateCompleted).substring(0,10) : ''} onChange={e=>setPhases(prev=>prev.map(p=>p.id===ph.id?{...p,dateCompleted:fixDateYear(e.target.value)}:p))}/></div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {["not_started","in_progress","done"].map(s=>(
                      <button key={s} onClick={()=>setPhases(prev=>prev.map(p=>p.id===ph.id?{...p,status:s,dateCompleted:s==="done"&&!p.dateCompleted?new Date().toISOString().slice(0,10):p.dateCompleted}:p))} style={{flex:1,padding:"4px 0",fontSize:9,fontFamily:"monospace",cursor:"pointer",borderRadius:3,border:`1px solid ${ph.status===s?"#e94560":"#2a2a4a"}`,background:ph.status===s?"#e9456022":"transparent",color:ph.status===s?"#e94560":"#555",letterSpacing:"0.5px"}}>{s.replace("_"," ").toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        };
        return(
          <div>
            <div style={{background:"var(--bg-page)",borderRadius:8,padding:"16px",marginBottom:16,border:"1px solid var(--border-primary)"}}>
              <div style={{fontSize:14,fontWeight:700,color:"var(--text-bright)",marginBottom:8}}>{project.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:zc,flexShrink:0}}/>
                <span style={{fontSize:11,color:"var(--text-body)",fontFamily:"monospace"}}>Week {week} of 8 (Target)</span>
                <span style={{fontSize:9,color:daysUntilTarget>0?"#555":"#e74c3c",fontFamily:"monospace"}}>{daysUntilTarget>0?daysUntilTarget+" days left":Math.abs(daysUntilTarget)+" days over"}</span>
              </div>
              <div style={{fontSize:9,color:"#444",fontFamily:"monospace",marginBottom:10,letterSpacing:"0.5px"}}>Started: {sd}  ·  Target: {td}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:"monospace",color:"#666",marginBottom:4}}>
                <span>TRUPLANS STEPS COMPLETE</span><span style={{color:zc,fontWeight:700}}>{doneCt} / 20</span>
              </div>
              <Pb pct={phasePct} color={zc}/>
              <div style={{marginTop:10,fontSize:11,fontWeight:700,fontFamily:"monospace",color:zc}}>{ZL[zone]}</div>
            </div>
            <div style={{fontSize:10,color:"#e94560",letterSpacing:"1.5px",fontFamily:"monospace",marginBottom:10,fontWeight:700}}>TRUPLANS WORK (8-WEEK SLA)</div>
            {iPhases.map(ph=>renderPhaseRow(ph))}
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 10px",opacity:0.45}}>
              <div style={{flex:1,height:1,background:"var(--border-secondary)"}}/>
              <span style={{fontSize:8,color:"#555",fontFamily:"monospace",whiteSpace:"nowrap",letterSpacing:"1.5px"}}>— END OF TRUPLANS CLOCK —</span>
              <div style={{flex:1,height:1,background:"var(--border-secondary)"}}/>
            </div>
            <div style={{fontSize:10,color:"#9b59b6",letterSpacing:"1.5px",fontFamily:"monospace",marginBottom:10,fontWeight:700}}>EXTERNAL WAITING (CITY-CONTROLLED)</div>
            {ePhases.map(ph=>renderPhaseRow(ph))}
          </div>
        );
      })()}

      {/* DESIGN SCOPE */}
      {ctab==="design scope"&&<div>
        <ST>TruPlans Design Deliverables (Items 0001–0009)</ST>
        {ctr.designScope.map(item=>(
          <div key={item.id} onClick={()=>item.included&&tog("designScope",item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:4,marginBottom:4,background:item.included?"#0d0d1a":"#080810",cursor:item.included?"pointer":"default",opacity:item.included?1:0.35}}>
            <div style={{width:18,height:18,borderRadius:3,border:`1.5px solid ${item.status==="Completed"?"#27ae60":item.status==="In Progress"?"#3498db":"#333"}`,background:item.status==="Completed"?"#27ae6033":item.status==="In Progress"?"#3498db22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {item.status==="Completed"&&<span style={{fontSize:10,color:"#27ae60"}}>✓</span>}
              {item.status==="In Progress"&&<span style={{fontSize:8,color:"#3498db"}}>●</span>}
            </div>
            <span style={{fontSize:10,color:"#e94560",minWidth:36,fontFamily:"monospace"}}>{item.id}</span>
            <span style={{flex:1,fontSize:11,color:item.included?"#ccc":"#444"}}>{item.label}</span>
            <Sb status={item.included?item.status:"N/A"}/>
          </div>
        ))}
        <div style={{fontSize:10,color:"#444",marginTop:8,fontFamily:"monospace"}}>Click to cycle: Not Started → In Progress → Completed</div>
      </div>}

      {/* CONSTRUCTION SCOPE */}
      {ctab==="construction scope"&&<div>
        <ST>CALOFT Construction Scope (Items 0100–0759)</ST>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
          {ctr.constructionScope.map(item=>(
            <div key={item.id} onClick={()=>item.included&&tog("constructionScope",item.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:4,background:item.included?"#0d0d1a":"#080810",cursor:item.included?"pointer":"default",opacity:item.included?1:0.3}}>
              <div style={{width:14,height:14,borderRadius:2,border:`1.5px solid ${item.status==="Completed"?"#27ae60":"#333"}`,background:item.status==="Completed"?"#27ae6033":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {item.status==="Completed"&&<span style={{fontSize:9,color:"#27ae60"}}>✓</span>}
              </div>
              <span style={{fontSize:9,color:"#555",minWidth:32,fontFamily:"monospace"}}>{item.id}</span>
              <span style={{fontSize:10,color:item.included?"#bbb":"#333",flex:1}}>{item.label}</span>
              {!item.included&&<span style={{fontSize:9,color:"#333",fontFamily:"monospace"}}>N/I</span>}
            </div>
          ))}
        </div>
      </div>}

      {/* PAYMENTS */}
      {ctab==="payments"&&<div>
        <ST>Payment Milestone Tracker</ST>
        <div style={{marginBottom:12,fontSize:10,color:"#f0a842",padding:"8px 12px",background:"rgba(240,168,66,0.1)",borderRadius:4,borderLeft:"3px solid #f0a842",fontFamily:"monospace"}}>
          ⚠ Payments are milestone-based, NOT trade-cost based. Late = 3%/week penalty + possible project suspension.
        </div>
        {ctr.paymentMilestones.map((m,i)=>(
          <div key={m.id} onClick={()=>togPay(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:6,marginBottom:6,background:m.paid?"#1a3d2b":"#0d0d1a",border:`1px solid ${m.paid?"#27ae6033":"#1e1e3a"}`,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${m.paid?"#27ae60":"#333"}`,background:m.paid?"#27ae60":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff",fontWeight:700}}>{m.paid?"✓":m.id}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:m.paid?"#52d68a":"#ccc"}}>{m.label}</div>
              {m.paid&&m.paidDate&&<div style={{fontSize:9,color:"#52d68a55",marginTop:1,fontFamily:"monospace"}}>Paid {m.paidDate}</div>}
            </div>
            <div style={{fontSize:13,fontWeight:700,color:m.paid?"#52d68a":"#f0a842",fontFamily:"monospace"}}>{fmt$(m.amount)}</div>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"12px",background:"var(--bg-page)",borderRadius:6,marginTop:8}}>
          <span style={{fontSize:11,color:"#888",fontFamily:"monospace"}}>PAID / TOTAL</span>
          <span style={{fontSize:14,fontWeight:700,color:"#52d68a",fontFamily:"monospace"}}>{fmt$(paid)} / {fmt$(effectiveTotal)}</span>
        </div>
      </div>}

      {/* HOMEOWNER OBLIGATIONS */}
      {ctab==="homeowner"&&<div>
        <ST>Homeowner Obligations Checklist</ST>
        <div style={{marginBottom:12,fontSize:10,color:"#3498db",padding:"8px 12px",background:"rgba(52,152,219,0.08)",borderRadius:4,borderLeft:"3px solid #3498db",fontFamily:"monospace"}}>
          Track these to prevent delays. Missing items = your deliverables get blocked.
        </div>
        {ctr.homeownerObligations.map(o=>(
          <div key={o.id} onClick={()=>togHO(o.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:4,marginBottom:5,background:o.done?"#1a3d2b":"#0d0d1a",cursor:"pointer",border:`1px solid ${o.done?"#27ae6033":"#1e1e3a"}`}}>
            <div style={{width:18,height:18,borderRadius:3,border:`1.5px solid ${o.done?"#27ae60":"#444"}`,background:o.done?"#27ae6033":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{o.done&&<span style={{fontSize:11,color:"#27ae60"}}>✓</span>}</div>
            <span style={{fontSize:11,color:o.done?"#52d68a":"#ccc"}}>{o.label}</span>
          </div>
        ))}
      </div>}

      {/* HIDDEN CONDITIONS */}
      {ctab==="hidden conditions"&&<div>
        <ST color="#e74c3c">Hidden Condition Risk Flags (§4.0 / §4.1)</ST>
        <div style={{marginBottom:12,fontSize:10,color:"#e74c3c",padding:"8px 12px",background:"rgba(231,76,60,0.08)",borderRadius:4,borderLeft:"3px solid #e74c3c",fontFamily:"monospace"}}>
          Per §4.0–4.1: hidden conditions = additional cost to homeowner. Flag any that arise during design or construction.
        </div>
        {ctr.hiddenConditionFlags.map(h=>(
          <div key={h.id} onClick={()=>togHC(h.id)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:4,marginBottom:5,background:h.flagged?"#2d0d0d":"#0d0d1a",cursor:"pointer",border:`1px solid ${h.flagged?"#e74c3c55":"#1e1e3a"}`}}>
            <div style={{width:18,height:18,borderRadius:3,border:`1.5px solid ${h.flagged?"#e74c3c":"#444"}`,background:h.flagged?"#e74c3c33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{h.flagged&&<span style={{fontSize:11,color:"#e74c3c"}}>!</span>}</div>
            <span style={{fontSize:11,color:h.flagged?"#e74c3c":"#aaa",flex:1}}>{h.label}</span>
            {h.flagged&&<span style={{fontSize:9,color:"#e74c3c",fontFamily:"monospace",fontWeight:700}}>FLAGGED</span>}
          </div>
        ))}
      </div>}

      {/* CHANGE ORDERS */}
      {ctab==="change orders"&&<div>
        <ST color="#9b59b6">Change Order Log (§3.3 / §3.4)</ST>
        <div style={{marginBottom:12,fontSize:10,color:"#9b59b6",padding:"8px 12px",background:"rgba(155,89,182,0.08)",borderRadius:4,borderLeft:"3px solid #9b59b6",fontFamily:"monospace"}}>
          Per CA B&P 7159: verbal changes are still billable. Document ALL changes here before work begins.
        </div>
        {ctr.changeOrders.length===0&&<div style={{color:"#444",fontSize:11,marginBottom:16}}>No change orders logged.</div>}
        {ctr.changeOrders.map(co=>(
          <div key={co.id} style={{background:"var(--bg-secondary)",border:"1px solid #2a2a4a",borderRadius:6,padding:"12px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:10,color:"#9b59b6",fontFamily:"monospace"}}>{co.id} · {co.date}</div><div style={{fontSize:11,color:"var(--text-body)",marginTop:3}}>{co.description}</div></div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,color:"#f0a842",fontFamily:"monospace"}}>{co.amount>=0?"+":""}{fmt$(co.amount)}</span><Sb status={co.status}/></div>
            </div>
          </div>
        ))}
        <div style={{background:"var(--bg-page)",border:"1px solid #2a2a4a",borderRadius:6,padding:"14px",marginTop:8}}>
          <div style={{fontSize:10,color:"#9b59b6",letterSpacing:"1px",fontFamily:"monospace",marginBottom:10}}>+ NEW CHANGE ORDER</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 100px",gap:8,alignItems:"end"}}>
            <div><label style={S.label}>Date</label><input type="date" style={S.input} value={newCO.date ? String(newCO.date).substring(0,10) : ''} onChange={e=>setNewCO({...newCO,date:fixDateYear(e.target.value)})}/></div>
            <div><label style={S.label}>Description</label><input style={S.input} value={newCO.description} onChange={e=>setNewCO({...newCO,description:e.target.value})} placeholder="Scope change..."/></div>
            <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} value={newCO.amount} onChange={e=>setNewCO({...newCO,amount:e.target.value})} placeholder="0"/></div>
            <button style={S.btn} onClick={addCO}>Add</button>
          </div>
        </div>
      </div>}

      {/* ADDENDUMS */}
      {ctab==="addendums"&&<div>
        <ST color="#d4ac0d">Addendums</ST>
        <div style={{fontSize:10,color:"#888",marginBottom:14,padding:"8px 12px",background:"rgba(212,172,13,0.08)",borderRadius:4,borderLeft:"3px solid #d4ac0d",fontFamily:"monospace"}}>
          Addendums modify the original contract scope or value. Only Signed or Approved addendums are included in the Contract Total.
        </div>
        {(ctr.addendums||[]).length===0&&<div style={{color:"#444",fontSize:11,marginBottom:16}}>No addendums yet.</div>}
        {(ctr.addendums||[]).map(a=>(
          <div key={a.id} style={{background:"var(--bg-secondary)",border:"1px solid #2a2a4a",borderRadius:6,padding:"14px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1,marginRight:12}}>
                <input value={a.title} onChange={e=>updateAddendum(a.id,'title',e.target.value)} style={{...S.input,fontSize:12,fontWeight:700,marginBottom:6}} placeholder="Addendum title..."/>
                <textarea value={a.description} onChange={e=>updateAddendum(a.id,'description',e.target.value)} style={{...S.input,fontSize:11,height:60,resize:'vertical'}} placeholder="Scope change description..."/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
                <button onClick={()=>cycleAddStatus(a.id)} style={{background:ADD_COLORS[a.status]+'22',color:ADD_COLORS[a.status],border:`1px solid ${ADD_COLORS[a.status]}66`,borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize:9,fontFamily:'monospace',fontWeight:700,whiteSpace:'nowrap'}}>{a.status}</button>
                <button onClick={()=>removeAddendum(a.id)} style={{background:"none",border:"1px solid #e74c3c44",color:"#e74c3c",borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:11}}>✕</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:8}}>
              <div><label style={S.label}>Amount ($)</label><input type="number" value={a.amount} onChange={e=>updateAddendum(a.id,'amount',parseFloat(e.target.value)||0)} style={S.input} placeholder="0"/></div>
              <div><label style={S.label}>Date</label><input type="date" value={a.date?String(a.date).substring(0,10):''} onChange={e=>updateAddendum(a.id,'date',fixDateYear(e.target.value))} style={S.input}/></div>
              <div><label style={S.label}>Notes</label><input value={a.notes} onChange={e=>updateAddendum(a.id,'notes',e.target.value)} style={S.input} placeholder="Internal notes..."/></div>
            </div>
          </div>
        ))}
        <div style={{background:"var(--bg-page)",border:"1px solid #2a2a4a",borderRadius:6,padding:"14px",marginTop:8}}>
          <div style={{fontSize:10,color:"#d4ac0d",letterSpacing:"1px",fontFamily:"monospace",marginBottom:10}}>+ NEW ADDENDUM</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:8,marginBottom:8}}>
            <div><label style={S.label}>Title</label><input style={S.input} value={newAdd.title} onChange={e=>setNewAdd({...newAdd,title:e.target.value})} placeholder="Addendum #1 — ..."/></div>
            <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} value={newAdd.amount} onChange={e=>setNewAdd({...newAdd,amount:e.target.value})} placeholder="0"/></div>
            <div><label style={S.label}>Date</label><input type="date" style={S.input} value={newAdd.date?String(newAdd.date).substring(0,10):''} onChange={e=>setNewAdd({...newAdd,date:fixDateYear(e.target.value)})}/></div>
          </div>
          <div style={{marginBottom:8}}><label style={S.label}>Description</label><input style={S.input} value={newAdd.description} onChange={e=>setNewAdd({...newAdd,description:e.target.value})} placeholder="Scope change description..."/></div>
          <button style={S.btn} onClick={addAddendum}>+ Add Addendum</button>
        </div>
      </div>}

      {/* AI ANALYSIS */}
      {ctab==="ai analysis"&&<div>
        <ST>AI Contract Analysis</ST>
        {!ai?(
          <div style={{background:"var(--bg-page)",border:"1px solid #2a2a4a",borderRadius:8,padding:"20px"}}>
            <div style={{fontSize:11,color:"#888",marginBottom:12,lineHeight:1.6}}>Paste the contract text below. The AI will extract key obligations, risk flags, scope summary, payment breakdown, and action items tailored to TruPlans' role as the design firm.</div>
            <textarea style={{...S.input,height:140,resize:"vertical",marginBottom:12,fontSize:11}} placeholder="Paste contract text here..." value={pdfTxt} onChange={e=>setPdfTxt(e.target.value)}/>
            <button style={{...S.btn,opacity:analyzing?0.6:1}} onClick={analyze} disabled={analyzing}>{analyzing?"⏳ Analyzing...":"🤖 Analyze Contract"}</button>
          </div>
        ):(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>Generated: {ai.generatedAt||"just now"}</div>
              <button style={{...S.ghost,fontSize:10}} onClick={clearAI}>Re-analyze</button>
            </div>
            {ai.error?<div style={{color:"#e74c3c",fontSize:11}}>{ai.error}</div>:<>
              <div style={{background:"var(--bg-secondary)",borderRadius:6,padding:"14px",marginBottom:12,borderLeft:"3px solid #e94560"}}>
                <div style={{fontSize:10,color:"#e94560",fontFamily:"monospace",letterSpacing:"1px",marginBottom:6}}>PROJECT SUMMARY</div>
                <div style={{fontSize:11,color:"var(--text-body)",lineHeight:1.6}}>{ai.summary}</div>
              </div>
              {ai.riskFlags?.length>0&&<div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"#e74c3c",fontFamily:"monospace",letterSpacing:"1px",marginBottom:8}}>RISK FLAGS</div>
                {ai.riskFlags.map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"8px 12px",borderRadius:4,marginBottom:5,background:r.level==="HIGH"?"#200a0a":r.level==="MEDIUM"?"#1a1000":"#0a0f1a",borderLeft:`3px solid ${r.level==="HIGH"?"#e74c3c":r.level==="MEDIUM"?"#f39c12":"#3498db"}`}}>
                    <span style={{fontSize:9,fontWeight:700,color:r.level==="HIGH"?"#e74c3c":r.level==="MEDIUM"?"#f39c12":"#3498db",minWidth:52,fontFamily:"monospace",marginTop:1}}>{r.level}</span>
                    <span style={{fontSize:11,color:"var(--text-body)",lineHeight:1.5}}>{r.text}</span>
                  </div>
                ))}
              </div>}
              {ai.actionItems?.length>0&&<div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"#27ae60",fontFamily:"monospace",letterSpacing:"1px",marginBottom:8}}>ACTION ITEMS</div>
                {ai.actionItems.map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:4,marginBottom:4,background:"var(--bg-secondary)"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",border:`1.5px solid ${item.done?"#27ae60":"#333"}`,background:item.done?"#27ae6033":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,marginTop:1}}>{item.done&&"✓"}</div>
                    <span style={{fontSize:11,color:item.done?"#52d68a":"#ccc",lineHeight:1.5,textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                  </div>
                ))}
              </div>}
              {[["Scope Summary",ai.scopeSummary,"#27ae60"],["TruPlans Obligations",ai.obligations,"#3498db"],["Payment Summary",ai.paymentSummary,"#f0a842"]].map(([title,content,color])=>content&&(
                <div key={title} style={{background:"var(--bg-secondary)",borderRadius:6,padding:"12px",marginBottom:10,borderLeft:`3px solid ${color}`}}>
                  <div style={{fontSize:10,color,fontFamily:"monospace",letterSpacing:"1px",marginBottom:6}}>{title.toUpperCase()}</div>
                  <div style={{fontSize:11,color:"#bbb",lineHeight:1.7,whiteSpace:"pre-line"}}>{content}</div>
                </div>
              ))}
            </>}
          </div>
        )}
      </div>}
    </>
  );
  const moduleBody=(
    <div style={inline?{}:{...S.mod}} onClick={inline?undefined:e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:inline?10:20}}>
          {inline
            ?<div style={{fontSize:9,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace",fontWeight:700}}>CONTRACT</div>
            :<div>
              <div style={{fontSize:10,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>CONTRACT MODULE</div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--text-bright)",marginTop:2}}>{project.name}</div>
              <div style={{fontSize:11,color:"#888"}}>{project.client} · {project.city}</div>
            </div>}
          <div style={{display:"flex",gap:8}}>
            {!inline&&<button style={{...S.ghost,fontSize:10,color:"#555",borderColor:"#333"}} onClick={onClose}>✕</button>}
          </div>
        </div>

        {ctrs.length===0?(
          <div style={{textAlign:"center",padding:"48px 0",color:"#555"}}>
            <div style={{fontSize:32,marginBottom:12}}>📄</div>
            <div style={{fontSize:13,marginBottom:16}}>No contracts attached yet.</div>
            <button style={S.btn} onClick={addContract}>+ Add First Contract</button>
          </div>
        ):(
          <>
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              {ctrs.map((c,i)=>(
                <div key={c.id} style={{display:"flex",alignItems:"center"}}>
                  <button onClick={()=>setCi(i)} style={{...S.ghost,...(ci===i?{background:"#e94560",color:"#fff",borderColor:"#e94560"}:{}),fontSize:10,borderRadius:"4px 0 0 4px",borderRight:"none",paddingRight:8}}>{c.contractFormat==='CALOFT'?'CALOFT Construction':c.contractFormat==='TRUADDITIONS'?'TruAdditions':c.type||`Contract ${i+1}`}</button>
                  <button onClick={e=>deleteContract(i,e)} title="Remove contract" style={{...S.ghost,...(ci===i?{borderColor:"#e94560",color:"#e94560"}:{color:"#666"}),fontSize:10,padding:"4px 7px",borderRadius:"0 4px 4px 0"}}>✕</button>
                </div>
              ))}
            </div>

            {ctr&&<>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
                {[["Contract Total",fmt$(effectiveTotal),"var(--text-bright)"],["Paid",fmt$(paid),"#52d68a"],["Outstanding",fmt$(due),due>0?"#f0a842":"#52d68a"],["Est. Start",ctr.estStart||"TBD","var(--text-body)"],["Completion",ctr.estCompletion||"TBD","var(--text-body)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"var(--bg-secondary)",borderRadius:6,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:"var(--text-muted)",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"monospace"}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:c,marginTop:3,fontFamily:"monospace"}}>{v}</div>
                    {l==="Contract Total"&&addendumTotal>0&&<div style={{fontSize:8,color:"#27ae60",fontFamily:"monospace",marginTop:2}}>{`+${fmt$(addendumTotal)} addendums`}</div>}
                  </div>
                ))}
              </div>
              <div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:10,color:"#888",fontFamily:"monospace"}}><span>Payment progress</span><span style={{color:"#52d68a"}}>{pctP}%</span></div><Pb pct={pctP} color="#27ae60"/></div>

              <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--border-primary)",marginBottom:18,flexWrap:"wrap"}}>
                {CTABS.map(t=><button key={t} onClick={()=>{setCtab(t);if(inline)setInlineOpen(true);}} style={{padding:"8px 12px",cursor:"pointer",fontSize:9,letterSpacing:"1px",fontWeight:ctab===t?700:400,color:ctab===t?"#e94560":"#555",background:"none",border:"none",borderBottom:ctab===t?"2px solid #e94560":"2px solid transparent",fontFamily:"monospace",textTransform:"uppercase"}}>{t}</button>)}
              </div>

              {!inline&&tabContentEl}
            </>}
          </>
        )}
    </div>
  );
  if(inline) return(
    <>
      {moduleBody}
      {inlineOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{pointerEvents:"auto",background:"var(--bg-card)",borderRadius:12,boxShadow:"0 8px 48px rgba(0,0,0,0.22)",border:"1px solid var(--border-primary)",width:860,maxWidth:"92vw",maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{background:"var(--bg-secondary)",borderBottom:"1px solid var(--border-primary)",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text-bright)",fontFamily:"monospace",letterSpacing:"1px",textTransform:"capitalize"}}>{ctab}</div>
              <button onClick={()=>setInlineOpen(false)} style={{background:"none",border:"1px solid #ccc",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,color:"#555",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
            </div>
            <div style={{padding:24,overflowY:"auto",flex:1}}>
              {tabContentEl}
            </div>
          </div>
        </div>
      )}
    </>
  );
  return <div style={S.ov} onClick={onClose}>{moduleBody}</div>;
}



export { AnalyseModal, ContractModule };
