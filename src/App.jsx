import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:3001';

const _sbUrl  = import.meta.env.VITE_SUPABASE_URL;
const _sbKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sbClient = (_sbUrl && _sbKey) ? createClient(_sbUrl, _sbKey, { auth: { flowType: 'implicit' } }) : null;

function fixDateYear(val) {
  if (!val || !val.includes('-')) return val;
  const [y, m, d] = val.split('-');
  const year = parseInt(y);
  if (year < 2000) {
    return `${new Date().getFullYear()}-${m}-${d}`;
  }
  return val;
}

const ANTHROPIC_API_KEY = "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";

const CONTRACT_TEMPLATE = {
  designScope: [
    { id:"0001", label:"Planning, Zoning & Research", included:true, status:"Not Started" },
    { id:"0002", label:"Design Meeting(s)", included:true, status:"Not Started", qty:1 },
    { id:"0003", label:"Wholesale Showroom Access", included:true, status:"N/A" },
    { id:"0004", label:"Architectural Plans / Construction Documents", included:true, status:"Not Started" },
    { id:"0005", label:"Title 24 Energy Report", included:true, status:"Not Started" },
    { id:"0006", label:"HOA Package & Submission", included:true, status:"Not Started" },
    { id:"0008", label:"Structural Drawings & Engineer Wet Stamp", included:true, status:"Not Started" },
    { id:"0009", label:"Plan Check & Permit Process", included:true, status:"Not Started" },
  ],
  constructionScope: [
    { id:"0100", label:"Pre-Construction Meeting / Project Mgmt", included:true, status:"Not Started" },
    { id:"0101", label:"Site Protection & Temp Toilet", included:true, status:"Not Started" },
    { id:"0102", label:"Demolition, Shoring & De-installations", included:true, status:"Not Started" },
    { id:"0103", label:"Debris & Haul Away", included:true, status:"Not Started" },
    { id:"0104", label:"New Footings", included:false, status:"N/A" },
    { id:"0151", label:"Retrofit Structural Shear Wall", included:false, status:"N/A" },
    { id:"0153", label:"Interior Walls", included:false, status:"N/A" },
    { id:"0154", label:"Low Wall (Pony Wall)", included:true, status:"Not Started" },
    { id:"0155", label:"Floor System Framing (10-Star Proprietary)", included:true, status:"Not Started" },
    { id:"0175", label:"Forced Air Unit (FAU)", included:false, status:"N/A" },
    { id:"0177", label:"Air Ducts / Vents", included:true, status:"Not Started" },
    { id:"0201", label:"Electrical Panel Upgrade / Sub Panel", included:false, status:"N/A" },
    { id:"0202", label:"New Electrical Circuits", included:true, status:"Not Started" },
    { id:"0203", label:"Power Outlets", included:true, status:"Not Started" },
    { id:"0204", label:"Recessed Lights", included:true, status:"Not Started" },
    { id:"0206", label:"Light Switches", included:true, status:"Not Started" },
    { id:"0210", label:"Smoke & Carbon Monoxide Detectors", included:true, status:"Not Started" },
    { id:"0330", label:"Fire Sprinklers", included:true, status:"Not Started" },
    { id:"0400", label:"Stucco / Siding Repair at Windows", included:true, status:"Not Started" },
    { id:"0404", label:"Thermal Insulation", included:true, status:"Not Started" },
    { id:"0405", label:"Insulate New Floor System (R19)", included:true, status:"Not Started" },
    { id:"0406", label:"Drywall (Textured to Match)", included:true, status:"Not Started" },
    { id:"0407", label:"Misc Drywall Patching", included:true, status:"Not Started" },
    { id:"0700", label:"Interior Doors", included:false, status:"N/A" },
    { id:"0708", label:"New Construction Windows (Milgard)", included:true, status:"Not Started" },
    { id:"0752", label:"Baseboards (5\" MDF)", included:true, status:"Not Started" },
    { id:"0754", label:"Stair / Balcony Railing Connection", included:true, status:"Not Started" },
    { id:"0758", label:"Finish Flooring", included:false, status:"N/A" },
    { id:"0759", label:"Painting / Staining", included:false, status:"N/A" },
  ],
  paymentMilestones: [
    { id:1, label:"Deposit – at contract signing", amount:1000, paid:false, paidDate:"" },
    { id:2, label:"House Scanning – at time of scan", amount:1800, paid:false, paidDate:"" },
    { id:3, label:"Design – at first design meeting", amount:7975, paid:false, paidDate:"" },
    { id:4, label:"Material Deposits – pre-construction", amount:3500, paid:false, paidDate:"" },
    { id:5, label:"Prep & Demo – initial delivery", amount:10230, paid:false, paidDate:"" },
    { id:6, label:"Rough Inspection", amount:19775, paid:false, paidDate:"" },
    { id:7, label:"Drywall Screw Inspection", amount:18640, paid:false, paidDate:"" },
    { id:8, label:"Final Inspection – passing", amount:12976, paid:false, paidDate:"" },
  ],
  homeownerObligations: [
    { id:"ho1", label:"Provide house key to contractor for lockbox", done:false },
    { id:"ho2", label:"Provide alarm system access / codes", done:false },
    { id:"ho3", label:"HOA contact info submitted to contractor", done:false },
    { id:"ho4", label:"Signed HOA application + neighbor awareness form", done:false },
    { id:"ho5", label:"HOA application fee / deposit paid by homeowner", done:false },
    { id:"ho6", label:"All plan check & permit fees paid by homeowner", done:false },
    { id:"ho7", label:"Maintain electrical power & water during construction", done:false },
    { id:"ho8", label:"Punch list submitted within 7 days of substantial completion", done:false },
  ],
  hiddenConditionFlags: [
    { id:"hc1", label:"New Footings required (not included – hidden condition §4.0)", flagged:false, notes:"" },
    { id:"hc2", label:"Retrofit Shear Wall required (not included – hidden condition §4.1)", flagged:false, notes:"" },
    { id:"hc3", label:"Lateral analysis required (not in contract)", flagged:false, notes:"" },
    { id:"hc4", label:"T24 / HERS failure – additional inspection & upgrade cost", flagged:false, notes:"" },
    { id:"hc5", label:"Electrical panel inadequate – sub-panel required (§5.2)", flagged:false, notes:"" },
    { id:"hc6", label:"Mold / structural damage / termite found during demo", flagged:false, notes:"" },
    { id:"hc7", label:"Duct soffit required due to routing constraints (§5.1)", flagged:false, notes:"" },
  ],
  changeOrders: [],
  aiAnalysis: null,
};

const NELSON_CONTRACT = {
  id:"CTR-001", type:"Design + Construction",
  contractor:"CALOFT Corp / TRULOFT by TruPlans",
  contractorLic:"CSLB #970476", signedDate:"2026-03-09", totalAmount:75896,
  estStart:"2026-06-01", estCompletion:"2026-07-31", constructionWeeks:"3-4",
  docusignId:"3D6EAD03-4076-40AA-ADB1-C61722D0A1CC",
  designScope: [
    { id:"0001", label:"Planning, Zoning & Research", included:true, status:"In Progress" },
    { id:"0002", label:"Design Meeting(s) – 1 included", included:true, status:"Not Started", qty:1 },
    { id:"0003", label:"Wholesale Showroom Access", included:true, status:"N/A" },
    { id:"0004", label:"Architectural Plans / Construction Documents", included:true, status:"Not Started" },
    { id:"0005", label:"Title 24 Energy Report", included:true, status:"Not Started" },
    { id:"0006", label:"HOA Package & Submission", included:true, status:"Not Started" },
    { id:"0008", label:"Structural Drawings & Engineer Wet Stamp", included:true, status:"Not Started" },
    { id:"0009", label:"Plan Check & Permit – City of Carlsbad", included:true, status:"Not Started" },
  ],
  constructionScope: [
    { id:"0100", label:"Pre-Construction Meeting / Project Mgmt", included:true, status:"Not Started" },
    { id:"0101", label:"Site Protection & Temp Toilet", included:true, status:"Not Started" },
    { id:"0102", label:"Demolition, Shoring & De-installations", included:true, status:"Not Started" },
    { id:"0103", label:"Debris & Haul Away", included:true, status:"Not Started" },
    { id:"0104", label:"New Footings", included:false, status:"N/A" },
    { id:"0151", label:"Retrofit Structural Shear Wall", included:false, status:"N/A" },
    { id:"0153", label:"Interior Walls", included:false, status:"N/A" },
    { id:"0154", label:"Low Wall / Pony Wall (min 42\" + rail cap)", included:true, status:"Not Started" },
    { id:"0155", label:"Floor System Framing – 10 Star Proprietary System", included:true, status:"Not Started" },
    { id:"0175", label:"Forced Air Unit (FAU)", included:false, status:"N/A" },
    { id:"0177", label:"Air Ducts / Vents – 2 new upstairs", included:true, status:"Not Started" },
    { id:"0201", label:"Electrical Panel Upgrade / Sub Panel", included:false, status:"N/A" },
    { id:"0202", label:"New Electrical Circuit – 1 (15amp home run)", included:true, status:"Not Started" },
    { id:"0203", label:"Power Outlets – 7 (tamper resistant arc-fault)", included:true, status:"Not Started" },
    { id:"0204", label:"Recessed LED Lights – 10 (4\" or 6\")", included:true, status:"Not Started" },
    { id:"0206", label:"Light Switches – 3 (dimmer by contractor)", included:true, status:"Not Started" },
    { id:"0210", label:"Smoke & Carbon Monoxide Detectors", included:true, status:"Not Started" },
    { id:"0330", label:"Fire Sprinklers – 4 heads (NFPA code)", included:true, status:"Not Started" },
    { id:"0400", label:"Stucco Repair at 2 New Window Locations", included:true, status:"Not Started" },
    { id:"0404", label:"Thermal Insulation at old window locations", included:true, status:"Not Started" },
    { id:"0405", label:"Floor System Insulation – R19", included:true, status:"Not Started" },
    { id:"0406", label:"Textured Drywall – match existing", included:true, status:"Not Started" },
    { id:"0407", label:"Misc Drywall Patching", included:true, status:"Not Started" },
    { id:"0700", label:"Interior Doors", included:false, status:"N/A" },
    { id:"0708", label:"New Windows – 2 Casement Milgard (enlarge existing)", included:true, status:"Not Started" },
    { id:"0710", label:"Special Windows", included:false, status:"Removed – step-up conflict" },
    { id:"0752", label:"Baseboards – 5\" MDF to match existing", included:true, status:"Not Started" },
    { id:"0754", label:"Stair / Balcony Railing – connect existing to new low wall", included:true, status:"Not Started" },
    { id:"0758", label:"Finish Flooring", included:false, status:"N/A" },
    { id:"0759", label:"Painting / Staining", included:false, status:"N/A" },
  ],
  paymentMilestones: [
    { id:1, label:"Deposit – at contract signing", amount:1000, paid:true, paidDate:"2026-03-09" },
    { id:2, label:"House Scanning – at time of scan", amount:1800, paid:false, paidDate:"" },
    { id:3, label:"Design – at first design meeting", amount:7975, paid:false, paidDate:"" },
    { id:4, label:"Material Deposits – pre-construction meeting", amount:3500, paid:false, paidDate:"" },
    { id:5, label:"Prep & Demo – includes initial material delivery", amount:10230, paid:false, paidDate:"" },
    { id:6, label:"Rough Inspection – at rough inspection", amount:19775, paid:false, paidDate:"" },
    { id:7, label:"Drywall Screw – at drywall screw inspection", amount:18640, paid:false, paidDate:"" },
    { id:8, label:"Final Inspection – at passing final", amount:12976, paid:false, paidDate:"" },
  ],
  homeownerObligations: [
    { id:"ho1", label:"Provide house key to CALOFT for lockbox", done:false },
    { id:"ho2", label:"Provide alarm system access / codes", done:false },
    { id:"ho3", label:"HOA contact info submitted to CALOFT", done:false },
    { id:"ho4", label:"Signed HOA application + neighbor awareness form", done:false },
    { id:"ho5", label:"HOA application fee / deposit paid by homeowner", done:false },
    { id:"ho6", label:"All plan check & permit fees paid by homeowner (§5.0)", done:false },
    { id:"ho7", label:"Maintain electrical power & water during construction", done:false },
    { id:"ho8", label:"Punch list submitted within 7 days of substantial completion", done:false },
  ],
  hiddenConditionFlags: [
    { id:"hc1", label:"New Footings required (not included – §4.0)", flagged:false, notes:"" },
    { id:"hc2", label:"Retrofit Shear Wall required (not included – §4.1)", flagged:false, notes:"" },
    { id:"hc3", label:"Lateral analysis required (not included unless specified)", flagged:false, notes:"" },
    { id:"hc4", label:"T24 / HERS failure – additional inspection & upgrade costs", flagged:false, notes:"" },
    { id:"hc5", label:"Electrical panel inadequate – sub-panel required (§5.2)", flagged:false, notes:"" },
    { id:"hc6", label:"Mold / structural damage / termite found during demo", flagged:false, notes:"" },
    { id:"hc7", label:"Duct soffit required due to routing constraints (§5.1)", flagged:false, notes:"" },
  ],
  changeOrders: [],
  aiAnalysis: {
    generatedAt:"2026-03-24",
    summary:"High ceiling to loft conversion at 7984 Paseo Esmerado, Carlsbad for Natalie Nelson. Total contract $75,896 covering full TruPlans design/engineering and CALOFT construction. Proprietary 10-Star floor system with lifetime structural warranty. 3–4 weeks construction post-permit. Signed via DocuSign 3/9/2026.",
    scopeSummary:"• Convert vaulted/high ceiling to open loft bonus room\n• Low wall (pony wall) min 42\" + decorative rail cap + 2 steps\n• Proprietary 10-Star retrofitted floor diaphragm (lifetime warranty)\n• 2 new enlarged casement windows (Milgard or equal)\n• HVAC: 2 new upstairs ducts\n• Electrical: 1 circuit, 7 outlets, 10 recessed lights, 3 switches, smoke/CO\n• Fire sprinklers: 4 heads\n• Stucco repair at 2 new window locations\n• R19 floor insulation + thermal insulation\n• Textured drywall to match existing\n• 5\" MDF baseboards\n• Railing connection to existing\n• NOT included: footings, shear wall, interior doors, flooring, painting",
    paymentSummary:"8 milestone payments tied to project phases (NOT trade cost). Deposit $1,000 paid 3/9/26. Remaining $74,896 due across 7 milestones from house scanning to final inspection. Credit card accepted with 2.9% surcharge (except deposit). Preferred: direct bank transfer. Late = breach of contract; penalties 3%/week. Insufficient funds = $65 fee + immediate late charge.",
    obligations:"TruPlans must deliver: (0001) Planning & zoning research with City of Carlsbad, (0002) 1 design meeting Mon-Fri 9-5, (0004) Architectural plans & construction documents, (0005) Title 24 energy report, (0006) HOA architectural review package, (0008) Structural drawings with licensed engineer wet stamp, (0009) Plan check submittal, building dept correspondence, permit pull. Homeowner responsible for: ALL permit/plan check fees, HOA fees, T24 upgrade costs if fail, landscape/soils reports if required.",
    riskFlags:[
      { level:"HIGH", text:"Homeowner pays ALL permit & plan check fees separately (§5.0). Carlsbad fees can be $3,000–$8,000+. Confirm client is aware and has budget for this before plan check submittal." },
      { level:"HIGH", text:"Proposal valid 30 days from 3/9/26 — EXPIRES 4/8/2026. Any addenda or amendments must be executed before this date." },
      { level:"HIGH", text:"Hidden conditions clause (§4.0/4.1): footings and shear wall currently N/A — if found inadequate during structural review, cost falls entirely on homeowner. Monitor closely during engineering phase." },
      { level:"MEDIUM", text:"T24/HERS risk (§3.1A): if energy score fails, homeowner pays additional inspection + upgrade work. Engage Title 24 consultant early to assess risk." },
      { level:"MEDIUM", text:"Verbal change orders still billable under CA B&P 7159(e)(3)(C) (§3.4). ALL scope changes must be documented in writing — instruct client and field team accordingly." },
      { level:"MEDIUM", text:"Start date contingent on permit issuance. Estimated Jun-26 may shift if plan check takes longer than expected. Communicate proactively with client." },
      { level:"LOW", text:"3-day right to cancel expired 3/12/26. Post-cancellation: contractor bills T&M at $65/hr skilled / $35/hr admin for all work performed." },
      { level:"LOW", text:"Photography/video permission granted to CALOFT for marketing (§2.3/2.4). Chris Doering to schedule post-completion session." },
    ],
    actionItems:[
      { done:true,  text:"Deposit $1,000 received — confirmed via DocuSign 3/9/2026" },
      { done:false, text:"Confirm Natalie Nelson's HOA contact info and submit to CALOFT" },
      { done:false, text:"Schedule house scanning appointment ($1,800 due at scan)" },
      { done:false, text:"Initiate Planning & Zoning research with City of Carlsbad (item 0001)" },
      { done:false, text:"Schedule first design meeting — Mon–Fri 9–5 only, 1 included" },
      { done:false, text:"Order Title 24 / energy calculations (item 0005)" },
      { done:false, text:"Prepare HOA architectural review package (item 0006)" },
      { done:false, text:"Coordinate licensed structural engineer for wet-stamp drawings (item 0008)" },
      { done:false, text:"Submit plans to City of Carlsbad building dept for plan check (item 0009)" },
      { done:false, text:"Confirm client understands permit fees are NOT included in contract total" },
    ],
  },
};

const PHASES_WILLIS_WORKFLOW = [
  { id:"5.1",  name:"Contract Handover",                    sla:"internal", description:"Review signed contract, scope, and client expectations. Confirm deliverables and timelines. Identify key stakeholders (client, contractor, engineer)." },
  { id:"5.2",  name:"Matterport and Measurement",            sla:"internal", description:"Schedule site visit. Perform Matterport scan. Take field measurements and photos. Upload and organize files per SOP." },
  { id:"5.3",  name:"Drawing Existing Plan",                 sla:"internal", description:"Draft existing conditions based on measurements. Include all structural and architectural elements. Follow TruPlans drafting standards." },
  { id:"5.4",  name:"Zoning / HOA Research",                 sla:"internal", description:"Verify zoning requirements (setbacks, height, FAR, etc.). Identify HOA requirements and submission process. Document restrictions." },
  { id:"5.5",  name:"Existing Plan Preparation",             sla:"internal", description:"Clean up and organize existing drawings. Add necessary notes, dimensions, and labels." },
  { id:"5.6",  name:"Office Pre-Scope Meeting",              sla:"internal", description:"Internal review of scope with team. Identify constraints and opportunities. Align before design phase." },
  { id:"5.7",  name:"Finalize Existing Plan",                sla:"internal", description:"Incorporate feedback. Lock existing plan for design phase." },
  { id:"5.8",  name:"Schedule Design Meeting",               sla:"internal", description:"Coordinate with client and internal team. Prepare agenda and materials." },
  { id:"5.9",  name:"Proposed Plan and 3D",                  sla:"internal", description:"Develop conceptual layout. Create 3D visuals for client presentation." },
  { id:"5.10", name:"Office Pre-Design Meeting",             sla:"internal", description:"Internal alignment before client meeting. Review options and strategy." },
  { id:"5.11", name:"Design Meeting",                        sla:"internal", description:"Present design to client. Capture feedback and decisions." },
  { id:"5.12", name:"Plan Revision (Pre-Proposed Plan)",     sla:"internal", description:"Update plans based on internal/client feedback." },
  { id:"5.13", name:"Send Out Proposed for Customer Review", sla:"internal", description:"Share plans and 3Ds. Request formal feedback." },
  { id:"5.14", name:"CMOC \u2013 Critical Moment of Change", sla:"internal", description:"Confirm final direction. Ensure client alignment before proceeding." },
  { id:"5.15", name:"Send Out DocuSign Link",                sla:"internal", description:"Send addendum/approval documents. Track signatures." },
  { id:"5.16", name:"Prepare HOA Submission",                sla:"internal", description:"Compile application package. Include plans, elevations, and forms." },
  { id:"5.17", name:"Prepare CD1",                           sla:"internal", description:"Prepare initial construction document set. (Elevations may have different legend than plan sheets.)" },
  { id:"5.18", name:"Engineering Coordination",              sla:"internal", description:"Send plans to engineer. Coordinate structural, MEP, and revisions." },
  { id:"5.19", name:"Prepare Construction Documents",        sla:"internal", description:"Finalize full CD set. Ensure compliance with codes and city requirements." },
  { id:"5.20", name:"City Submission",                       sla:"internal", description:"Submit plans to city portal. Track submission status. [END OF TRUPLANS 8-WEEK SLA CLOCK]" },
  { id:"5.21", name:"City Corrections",                      sla:"external", description:"Review correction comments. Coordinate revisions with team. [EXTERNAL \u2014 3\u20135 WEEKS]" },
  { id:"5.22", name:"Permit Approval & Issuance",            sla:"external", description:"Confirm approval. Coordinate permit issuance. [EXTERNAL]" },
  { id:"5.23", name:"Pre-Construction Meeting",              sla:"external", description:"Review plans with contractor and client. Align on construction expectations. [EXTERNAL \u2014 PROJECT END]" },
];
function makeDefaultPhases(){return PHASES_WILLIS_WORKFLOW.map(p=>({id:p.id,status:"not_started",dateCompleted:null,initials:"",notes:""}));}
function phaseMinor(id){return parseInt(id.split(".")[1],10);}
const CURRENT_PHASE_MAP={"528":"5.18","621":"5.20","624":"5.16","629":"5.21","638":"5.2","645":"5.18","651":"5.2","626":"5.16","610":"5.20","642":"5.17","634":"5.16","637-W":"5.18","637-S":"5.16"};
function makeProjectPhases(p){
  const curId=CURRENT_PHASE_MAP[p.id];
  if(!curId)return makeDefaultPhases();
  const cur=phaseMinor(curId);
  return PHASES_WILLIS_WORKFLOW.map(pw=>{const m=phaseMinor(pw.id);return{id:pw.id,status:m<cur?"done":m===cur?"in_progress":"not_started",dateCompleted:null,initials:"",notes:""};});
}
function addDays(dateStr,n){if(!dateStr)return null;const d=new Date(dateStr);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const SLA_DAYS=56;
const EXTERNAL_IDS=new Set(['5.21','5.22','5.23']);
const WEEK_BUCKETS=[
  {week:1,label:'Kickoff & Site Capture',   steps:['5.1','5.2','5.3']},
  {week:2,label:'Existing Conditions',       steps:['5.4','5.5','5.6']},
  {week:3,label:'Schematic Design',          steps:['5.7','5.8','5.9']},
  {week:4,label:'Design Development',        steps:['5.10','5.11','5.12','5.13']},
  {week:5,label:'Engineering & T24',         steps:['5.14','5.15','5.16']},
  {week:6,label:'Construction Documents',    steps:['5.17','5.18','5.19']},
  {week:7,label:'HOA / Pre-Submission',      steps:['5.20','5.21']},
  {week:8,label:'City Submission',           steps:['5.22','5.23']},
];
function getSLAStatus(project){
  const startDate=project.start;
  if(!startDate) return {zone:'none'};
  const today=new Date(); today.setHours(0,0,0,0);
  const start=new Date(startDate); start.setHours(0,0,0,0);
  const totalDays=Math.floor((today-start)/86400000);
  if(totalDays<0) return {zone:'future',weekNum:0,daysRemaining:SLA_DAYS};
  let externalDays=0;
  if(project.workflow&&project.workflow.length>0){
    for(const m of project.workflow){
      if(!EXTERNAL_IDS.has(m.milestoneId)) continue;
      if(m.status==='Completed'&&m.startDate&&m.endDate)
        externalDays+=Math.max(0,Math.floor((new Date(m.endDate)-new Date(m.startDate))/86400000));
      else if(m.status==='In Progress'&&m.startDate)
        externalDays+=Math.max(0,Math.floor((today-new Date(m.startDate))/86400000));
    }
  }
  const effectiveDays=Math.max(0,totalDays-externalDays);
  const weekNum=Math.max(1,Math.ceil(effectiveDays/7));
  const daysRemaining=SLA_DAYS-effectiveDays;
  const isExternal=!!(project.workflow?.find(m=>m.status==='In Progress'&&EXTERNAL_IDS.has(m.milestoneId)));
  const zone=weekNum<=6?'green':weekNum<=8?'amber':'red';
  return{zone,weekNum,effectiveDays,daysRemaining,isExternal};
}

function calculateZone(startDate){
  if(!startDate) return{week:0,zone:'green',daysUntilTarget:SLA_DAYS};
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(startDate);start.setHours(0,0,0,0);
  const effectiveDays=Math.max(0,Math.floor((today-start)/86400000));
  const weekNum=Math.max(1,Math.ceil(effectiveDays/7));
  const daysUntilTarget=SLA_DAYS-effectiveDays;
  const zone=effectiveDays>SLA_DAYS+28?'overdue':effectiveDays>SLA_DAYS?'red':weekNum<=6?'green':'yellow';
  return{week:weekNum,zone,daysUntilTarget};
}

const SEARCH_PRI={project:0,contract:1,workflow:2,phase:3};
function searchProjects(query,projects){
  if(!query||!query.trim()) return[];
  const q=query.toLowerCase().trim();
  const byProject=new Map();
  const check=(p,field,text,type)=>{
    if(!text) return;
    const str=String(text).toLowerCase();
    if(!str.includes(q)) return;
    const ex=byProject.get(p.id);
    if(!ex||SEARCH_PRI[type]<SEARCH_PRI[ex.type])
      byProject.set(p.id,{projectId:p.id,projectName:p.name,field,text:String(text),type});
  };
  for(const p of projects){
    check(p,'Name',p.name,'project');
    check(p,'Job #',p.id,'project');
    check(p,'Client',p.client,'project');
    check(p,'City',p.city,'project');
    check(p,'Type',p.type,'project');
    check(p,'Designer',p.designer,'project');
    check(p,'Status',p.status,'project');
    check(p,'Phase',p.phase,'project');
    check(p,'Notes',p.notes,'project');
    for(const c of(p.contracts||[])){
      for(const s of(c.designScope||[])) check(p,'Design scope',s.label,'contract');
      for(const s of(c.constructionScope||[])) check(p,'Scope',s.label,'contract');
      for(const m of(c.paymentMilestones||[])) check(p,'Payment',m.label,'contract');
      for(const co of(c.changeOrders||[])) check(p,'Change order',co.description,'contract');
      if(c.aiAnalysis?.summary) check(p,'AI summary',c.aiAnalysis.summary,'contract');
      for(const r of(c.aiAnalysis?.riskFlags||[])) check(p,'Risk flag',r.text,'contract');
      for(const a of(c.aiAnalysis?.actionItems||[])) check(p,'Action item',a.text,'contract');
    }
    for(const m of(p.workflow||[])){
      check(p,'Workflow',m.label,'workflow');
      if(m.notes) check(p,'Workflow note',m.notes,'workflow');
      for(const t of(m.tasks||[])) check(p,'Task',t.text,'workflow');
    }
    for(const ph of(p.phases||[])){
      if(ph.notes) check(p,'Phase note',ph.notes,'phase');
    }
  }
  return[...byProject.values()]
    .sort((a,b)=>SEARCH_PRI[a.type]-SEARCH_PRI[b.type])
    .slice(0,10);
}

const PROJECTS_INIT = [
  // ── MOLLY'S PROJECTS ──────────────────────────────────────────────────────
  { id:"528",     name:"Monterrey",    client:"", city:"", type:"", designer:"Molly",   status:"In Progress", phase:"Engineering Coordination",  start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"Structural engineering in progress" },
  { id:"621",     name:"Iyer",         client:"", city:"", type:"", designer:"Molly",   status:"In Progress", phase:"City Submission",            start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"1st city submission complete, awaiting city review" },
  // ── ATTIA-ARBIOS — PRESERVED EXACTLY ───────────────────────────────────────
  { id:"624",     name:"Attia-Arbios", client:"Cooper & Ashley Attia-Arbios", city:"Mission Viejo", type:"Open Concept Remodel + Loft", designer:"Molly",   status:"In Progress", phase:"HOA Submission",     start:"2025-08-12", end:"2025-10-07", pct:78, stamp:"", permit:"", contract:27851, invoiced:0, team:[], workflow:[], contracts:[], notes:"Signed 8/12/25. Work Order date 7/1/25. Arch $19,401 + Structural $8,450 = $27,851. Open concept remodel / home extension / loft addition. 23668 Castle Rock Mission Viejo 92692. HOA submittal included. TRUADDITIONS in-house contractor. Client prepping HOA. Phone: (707) 490-2677. Email: attiaarbios@gmail.com. DocuSign: DDD4698E-505C-419D-B0CC-7E7C0CA69BBD." },
  { id:"629",     name:"Chappalli",    client:"", city:"", type:"", designer:"Molly",   status:"In Progress", phase:"City Corrections",           start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"Working on 1st city review corrections" },
  // ── WALKER — PRESERVED EXACTLY ─────────────────────────────────────────────
  { id:"637-W",   name:"Walker",       client:"Michael Walker Jr", city:"Irvine", type:"Room Extension + Major Remodel", designer:"Molly",   status:"In Progress", phase:"Schematic Design",   start:"2025-12-30", end:"2026-02-24", pct:18, stamp:"", permit:"", contract:15525, invoiced:0, team:[], workflow:[], contracts:[], notes:"Arch $11,960 + Structural $3,565 = $15,525. Retainer $1,000. TRUADDITIONS CORP in-house. DocuSign 8A997607. Structural engineering proposal in progress. Design meeting approx 2/12/26. Phone: (626) 236-7606. Email: mjwjr11@gmail.com. 15422 Alsace Cir, Irvine, CA 92618." },
  // ── TAN — PRESERVED EXACTLY ─────────────────────────────────────────────────
  { id:"638",     name:"Tan",          client:"Wendy/Wenjin Tan", city:"San Clemente", type:"Preliminary Research + New Home Redesign", designer:"Molly",   status:"In Progress", phase:"Site Measurement / Data Collection", start:"2026-01-29", end:"2026-03-26", pct:12, stamp:"", permit:"", contract:57054, invoiced:0, team:[], workflow:[], contracts:[], notes:"Two contracts: 91 Marbella $24,013 + 25 Cantilena $33,041. Both San Clemente 92673. Verify two properties with Molly. Waiting on topo map. DocuSign C8B59244. Phone: (951) 463-1098. Email: Wendytan1213@gmail.com." },
  { id:"645",     name:"Thompson",     client:"", city:"", type:"", designer:"Molly",   status:"In Progress", phase:"Engineering Coordination",   start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"Structural engineering, construction documents, T24" },
  { id:"651",     name:"Grey",         client:"", city:"", type:"", designer:"Molly",   status:"In Progress", phase:"Matterport and Measurement", start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"Home scan and measurement scheduled" },
  // ── SHIRLEY'S PROJECTS ────────────────────────────────────────────────────
  { id:"626",     name:"Shah",         client:"", city:"", type:"", designer:"Shirley", status:"In Progress", phase:"Prepare HOA Submission",     start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"NC — HOA Submittal. Needs proposed structural plan, T-24, CDs. Contract NEEDED." },
  { id:"610",     name:"Larson",       client:"", city:"", type:"", designer:"Shirley", status:"In Progress", phase:"City Submission",            start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"I (Irvine) — 2nd Submission. Signed Apr 9 2025. Needs customer signature on Irvine City cover page (Lorena handling). Contract NEEDED." },
  { id:"637-S",   name:"Samia",        client:"", city:"", type:"", designer:"Shirley", status:"In Progress", phase:"Zoning / HOA Research",      start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"LN — Research stage. Homeowner to pay HOA app fee. Contract NEEDED. (NOTE: ID 637 also on Molly's Walker — verify)" },
  { id:"642",     name:"Brown",        client:"", city:"", type:"", designer:"Shirley", status:"In Progress", phase:"Prepare CD1",                start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"OS — Structural plans client approved. Signed Feb 9. Obtain structural plan, T-24, CDs, submit to city + HOA. Contract NEEDED." },
  { id:"634",     name:"Doyle",        client:"", city:"", type:"", designer:"Shirley", status:"In Progress", phase:"Prepare HOA Submission",     start:null, end:null, pct:0, stamp:"", permit:"", contract:0, invoiced:0, team:[], workflow:[], contracts:[], notes:"AV — HOA Submittal. HOA still holding up / submittal not approved. Contract NEEDED." },
  // ── RADOVAN'S PROJECTS ───────────────────────────────────────────────────
  // ── NELSON — PRESERVED EXACTLY ────────────────────────────────────────────
  // ── DESHPANDE — PRESERVED EXACTLY ──────────────────────────────────────────
  { id:"647",     name:"Deshpande",         client:"Deshpande",                      city:"San Diego", type:"CALOFT",       designer:"Radovan", status:"In Progress", phase:"", start:null,         end:null, pct:0, stamp:"", permit:"", contract:0,     invoiced:0, team:[], workflow:[], contracts:[], notes:"CALOFT garage/loft conversion. Scripps Ranch. RM-1-1 zone. APN 319-581-22. HOA submittal pending. 10874 Caminito Arcada, San Diego, CA 92131." },
  // ── PEECHA-GONZALEZ — PRESERVED EXACTLY ────────────────────────────────────
  { id:"648",     name:"Peecha-Gonzalez",   client:"Julie & Jorge Peecha-Gonzalez",  city:"San Diego", type:"TruAdditions", designer:"Radovan", status:"In Progress", phase:"", start:"2026-04-20", end:null, pct:0, stamp:"", permit:"", contract:19831, invoiced:0, team:[], workflow:[], contracts:[], notes:"Bonus room conversion + stair relocation. DocuSign 78625E8E. Signed 4/20/2026. Total $19,831. 8925 Rotherham Ave, San Diego, CA 92129." },
  { id:"649",     name:"Benbicaco",         client:"Leni Benbicaco",                 city:"Irvine",     type:"TruAdditions", designer:"TBD",     status:"In Progress", phase:"", start:"2026-04-28", end:null, pct:0, stamp:"", permit:"", contract:69922, invoiced:0, team:[], workflow:[], contracts:[], notes:"DocuSign D4487145. Signed 4/28/26. 23 Santa Catalina Aisle, Irvine 92606. Phone: (310) 592-7089. Email: lenibenbicaco@gmail.com." },
].map(p=>({
  ...p,
  startDate:p.start,
  targetDate:addDays(p.start,56),
  phases:makeProjectPhases(p)
}));

const PHASES = ["Schematic","Design Dev","Construction Docs","Permit Docs","Permit Review","Construction","Closeout"];

function getStepDays(stepId){let t=0;for(const m of PHASES_WILLIS_WORKFLOW){t+=m.days;if(m.id===stepId)return t;}return t;}

function generateTasksFromProjects(projects){
  try{
    const tasks=[];
    for(const project of projects){
      try{
        if(!project||project.status!=='In Progress') continue;
        let slaZone='none';
        try{slaZone=getSLAStatus(project).zone;}catch{}
        const priority=slaZone==='red'?'High':slaZone==='amber'?'Medium':'Low';
        const designer=String(project.designer||'Unknown');

        // Use workflow milestones if user has actively tracked them (any non-default status)
        const wf=Array.isArray(project.workflow)?project.workflow:[];
        const wfTracked=wf.length>0&&wf.some(m=>m&&m.status!=='Not Started');

        const startDate=String(project.start||project.startDate||'');
        if(wfTracked){
          for(const m of wf){
            if(!m||m.status==='Completed') continue;
            const status=m.status==='In Progress'?'In Progress':m.status==='Blocked'?'Blocked':'Not Started';
            tasks.push({job:String(project.id||''),projectName:String(project.name||''),desc:String(m.label||m.milestoneId||''),assigned:String(m.assigned||designer),due:String(m.endDate||''),stepId:String(m.milestoneId||''),startDate,priority,status});
          }
        } else {
          const phases=Array.isArray(project.phases)?project.phases:[];
          const startIdx=Math.max(0,phases.findIndex(ph=>ph&&(ph.status==='in_progress'||ph.status==='not_started')));
          for(let i=startIdx;i<phases.length;i++){
            try{
              const ph=phases[i];
              if(!ph||ph.status==='done') continue;
              const def=PHASES_WILLIS_WORKFLOW.find(w=>w&&w.id===ph.id);
              const desc=String(def?def.name:ph.id||'Unknown step');
              const status=ph.status==='done'?'Completed':ph.status==='in_progress'?'In Progress':'Not Started';
              tasks.push({job:String(project.id||''),projectName:String(project.name||''),desc,assigned:designer,due:'',stepId:String(ph.id||''),startDate,priority,status});
            }catch{}
          }
          if(!tasks.some(t=>t.job===String(project.id||''))&&project.phase){
            tasks.push({job:String(project.id||''),projectName:String(project.name||''),desc:String(project.phase),assigned:designer,due:'',stepId:'',startDate,priority,status:'In Progress'});
          }
        }
      }catch(pe){console.error('Task gen error for',project?.id,pe);}
    }
    const pO={High:0,Medium:1,Low:2},sO={'In Progress':0,'Blocked':1,'Not Started':2};
    tasks.sort((a,b)=>{const p=(pO[a.priority]??2)-(pO[b.priority]??2);return p!==0?p:(sO[a.status]??2)-(sO[b.status]??2);});
    return tasks;
  }catch(e){console.error('generateTasksFromProjects failed:',e);return [];}
}

function getNotificationAlerts(projects,paymentData,shownToday,prefs){
  const alerts=[];
  const today=new Date();today.setHours(0,0,0,0);
  for(const p of projects){
    try{
      if(p.status!=='In Progress') continue;
      const sla=getSLAStatus(p);
      if(prefs.redZone&&sla.zone==='red'){
        const key=`rz-${p.id}-w${sla.weekNum}`;
        if(!shownToday[key]) alerts.push({key,project:p,type:'red',priority:0,body:`${p.id} ${p.name} — RED ZONE (Week ${sla.weekNum}). Immediate action required.`});
      }
      if(prefs.week78&&sla.weekNum===7){
        const key=`w7-${p.id}`;
        if(!shownToday[key]) alerts.push({key,project:p,type:'amber',priority:1,body:`${p.id} ${p.name} — Week 7. Approaching SLA deadline.`});
      }
      if(prefs.week78&&sla.weekNum===8){
        const key=`w8-${p.id}`;
        if(!shownToday[key]) alerts.push({key,project:p,type:'amber',priority:1,body:`${p.id} ${p.name} — Week 8. Final week before SLA breach.`});
      }
      if(prefs.payment&&p.start){
        const days=Math.floor((today-new Date(p.start))/86400000);
        if(days>=30){
          const ms=getProjectMilestones(p,paymentData);
          const a1=ms.find(m=>m.code==='A1');
          if(a1&&a1.status==='Pending'){
            const key=`pay-a1-${p.id}`;
            if(!shownToday[key]) alerts.push({key,project:p,type:'payment',priority:2,body:`${p.id} ${p.name} — Retainer (A1) unpaid after ${days} days.`});
          }
        }
      }
      if(prefs.workflow&&p.workflow&&p.workflow.length>0){
        for(const m of p.workflow){
          if(m.status==='In Progress'&&m.startDate){
            const days=Math.floor((today-new Date(m.startDate))/86400000);
            if(days>=14){
              const key=`wf-${p.id}-${m.milestoneId}`;
              if(!shownToday[key]) alerts.push({key,project:p,type:'workflow',priority:3,body:`${p.id} ${p.name} — "${m.label}" stuck for ${days} days.`});
              break;
            }
          }
        }
      }
    }catch(e){console.error('Notif check error for',p?.id,e);}
  }
  return alerts.sort((a,b)=>a.priority-b.priority);
}

const STATUS_COLOR = {
  "In Progress":{ bg:"var(--status-ip-bg)",   text:"var(--status-ip-text)",   dot:"var(--status-ip-dot)" },
  "Completed":  { bg:"var(--status-done-bg)",  text:"var(--status-done-text)", dot:"var(--status-done-dot)" },
  "On Hold":    { bg:"var(--status-hold-bg)",  text:"var(--status-hold-text)", dot:"var(--status-hold-dot)" },
  "Not Started":{ bg:"var(--status-ns-bg)",    text:"var(--status-ns-text)",   dot:"var(--status-ns-dot)" },
  "Blocked":    { bg:"var(--sla-red-bg)",      text:"var(--sla-red-text)",     dot:"var(--sla-red-text)" },
  "Pending":    { bg:"var(--status-hold-bg)",  text:"var(--status-hold-text)", dot:"var(--status-hold-dot)" },
  "N/A":        { bg:"var(--status-na-bg)",    text:"var(--status-na-text)",   dot:"var(--status-na-dot)" },
};
const PRIORITY_COLOR = { High:"#e74c3c",Medium:"#f39c12",Low:"#3498db" };
const DC_INIT = { Radovan:"#e94560",Willis:"#3498db",Molly:"#9b59b6",Shirley:"#27ae60",Ayana:"#f39c12",Chris:"#1abc9c" };

const WORKFLOW_MILESTONES = [
  {id:"5.1",  label:"Contract Handover Meeting",       days:3,  payment:null, tasks:["Review signed contract, scope, and client expectations","Confirm deliverables and timelines","Identify key stakeholders (client, contractor, engineer)"]},
  {id:"5.2",  label:"Matterport & Measurement",         days:5,  payment:2,    tasks:["Schedule site visit","Perform Matterport scan","Take field measurements and photos","Upload and organize files per SOP"]},
  {id:"5.3",  label:"Drawing Existing Plan",            days:7,  payment:null, tasks:["Draft existing conditions based on measurements","Include all structural and architectural elements","Follow TruPlans drafting standards"]},
  {id:"5.4",  label:"Zoning & HOA Research",            days:5,  payment:null, tasks:["Verify zoning requirements (setbacks, height, FAR)","Identify HOA requirements and submission process","Document restrictions"]},
  {id:"5.5",  label:"Existing Plan Preparation",        days:4,  payment:null, tasks:["Clean up and organize existing drawings","Add necessary notes, dimensions, and labels"]},
  {id:"5.6",  label:"Office Pre-Scope Meeting",         days:2,  payment:null, tasks:["Internal review of scope with team","Identify constraints and opportunities","Align before design phase"]},
  {id:"5.7",  label:"Finalize Existing Plan",           days:3,  payment:null, tasks:["Incorporate feedback","Lock existing plan for design phase"]},
  {id:"5.8",  label:"Schedule Design Meeting",          days:2,  payment:null, tasks:["Coordinate with client and internal team","Prepare agenda and materials"]},
  {id:"5.9",  label:"Proposed Plan & 3D",               days:7,  payment:null, tasks:["Develop conceptual layout","Create 3D visuals for client presentation"]},
  {id:"5.10", label:"Office Pre-Design Meeting",        days:2,  payment:null, tasks:["Internal alignment before client meeting","Review options and strategy"]},
  {id:"5.11", label:"Design Meeting",                   days:1,  payment:3,    tasks:["Present design to client","Capture feedback and decisions"]},
  {id:"5.12", label:"Plan Revision (Pre-Proposed)",     days:5,  payment:null, tasks:["Update plans based on internal/client feedback"]},
  {id:"5.13", label:"Send Proposed for Client Review",  days:3,  payment:null, tasks:["Share plans and 3Ds with client","Request formal feedback"]},
  {id:"5.14", label:"CMOC - Critical Moment of Change", days:2,  payment:null, tasks:["Confirm final direction","Ensure client alignment before proceeding"]},
  {id:"5.15", label:"Send DocuSign Link",               days:2,  payment:null, tasks:["Send addendum/approval documents","Track signatures"]},
  {id:"5.16", label:"Prepare HOA Submission",           days:5,  payment:null, tasks:["Compile HOA application package","Include plans, elevations, and forms"]},
  {id:"5.17", label:"Prepare CD1",                      days:7,  payment:null, tasks:["Prepare initial construction document set","Note: Elevations may have different legend than plan sheets"]},
  {id:"5.18", label:"Engineering Coordination",         days:10, payment:null, tasks:["Send plans to engineer","Coordinate structural, MEP, and revisions"]},
  {id:"5.19", label:"Prepare Construction Documents",   days:7,  payment:null, tasks:["Finalize full CD set","Ensure compliance with codes and city requirements"]},
  {id:"5.20", label:"City Submission",                  days:3,  payment:4,    tasks:["Submit plans to city portal","Track submission status"]},
  {id:"5.21", label:"City Corrections",                 days:14, payment:null, tasks:["Review correction comments","Coordinate revisions with team"]},
  {id:"5.22", label:"Permit Approval & Issuance",       days:5,  payment:5,    tasks:["Confirm approval","Coordinate permit issuance"]},
  {id:"5.23", label:"Pre-Construction Meeting",         days:3,  payment:null, tasks:["Review plans with contractor and client","Align on construction expectations"]},
];

function generateWorkflow(startDate, designer) {
  let cur = new Date(startDate || new Date());
  return WORKFLOW_MILESTONES.map(m => {
    const s = cur.toISOString().slice(0,10);
    cur = new Date(cur.getTime() + m.days * 86400000);
    const e = cur.toISOString().slice(0,10);
    return { milestoneId:m.id, label:m.label, status:"Not Started", assigned:designer||"Radovan", startDate:s, endDate:e, days:m.days, payment:m.payment, tasks:m.tasks.map(t=>({text:t,done:false})), notes:"" };
  });
}

const TEAM_ROLES = ["Lead Designer","Design Support","Permit Coordinator","Drafting","Project Manager","Trainee","Engineer","Admin"];
const PALETTE = [
  "#e94560", // Crimson
  "#e74c3c", // Red
  "#ff6348", // Coral
  "#e67e22", // Orange
  "#f39c12", // Amber
  "#f1c40f", // Yellow
  "#2ecc71", // Lime Green
  "#27ae60", // Forest Green
  "#1abc9c", // Teal
  "#00cec9", // Cyan
  "#0984e3", // Sky Blue
  "#3498db", // Royal Blue
  "#6c5ce7", // Indigo
  "#9b59b6", // Purple
  "#e84393", // Magenta
  "#fd79a8", // Pink
  "#c0392b", // Dark Red
  "#d4ac0d", // Gold
  "#8d6e63", // Brown
  "#95a5a6", // Gray
];
const fmt$ = n => "$" + Number(n).toLocaleString();
const GANTT_S = new Date("2026-01-01"), GANTT_E = new Date("2026-12-31");
const TDAYS = (GANTT_E - GANTT_S) / 86400000;
function gBar(s,e) {
  const sd=new Date(s),ed=new Date(e);
  const l=Math.max(0,(sd-GANTT_S)/86400000/TDAYS*100);
  const w=Math.min(100-l,(ed-sd)/86400000/TDAYS*100);
  return {left:l.toFixed(1)+"%",width:Math.max(0.5,w).toFixed(1)+"%"};
}

const PMT_TEMPLATE=[
  {code:'A1',label:'Retainer',                desc:'Due at contract signing', pct:0.10},
  {code:'A2',label:'Site Scan & Measurements',desc:'Due at site visit',       pct:0.15},
  {code:'A3',label:'Design Meeting',          desc:'Due at design meeting',   pct:0.15},
  {code:'A4',label:'Construction Documents',  desc:'Due when CDs complete',   pct:0.30},
  {code:'A5',label:'City Submittal',          desc:'Due at first submittal',  pct:0.20},
  {code:'A6',label:'Permit Approval',         desc:'Due when permit issued',  pct:0.10},
];
const PMT_OVERRIDES={'637-W':{A1:1000}};
function getProjectMilestones(project,saved){
  const savedMs=saved?.[project.id];
  if(savedMs&&savedMs.length>0) return savedMs;
  return PMT_TEMPLATE.map(t=>{
    const override=PMT_OVERRIDES[project.id]?.[t.code];
    const auto=override!==undefined?override:project.contract>0?Math.round(project.contract*t.pct):0;
    return{code:t.code,label:t.label,desc:t.desc,pct:t.pct,amount:auto,status:'Pending'};
  });
}

const CITY_DEFAULTS={'647':'City of San Diego DSD','648':'City of San Diego'};
const CITY_STATUS_OPTIONS=['Not Submitted','Submitted','Comments Received','Corrections In Progress','Resubmitted','Approved'];
const ROUND_STATUS=['In Progress','Submitted','Cleared'];
const CITY_STATUS_DOT={'Not Submitted':'var(--text-ghost)','Submitted':'#3498db','Comments Received':'var(--status-hold-text)','Corrections In Progress':'var(--status-hold-text)','Resubmitted':'#3498db','Approved':'var(--status-done-text)'};
const CITY_STATUS_BADGE={'Not Submitted':{bg:'var(--status-ns-bg)',text:'var(--status-ns-text)'},'Submitted':{bg:'var(--status-ip-bg)',text:'var(--status-ip-text)'},'Comments Received':{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)'},'Corrections In Progress':{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)'},'Resubmitted':{bg:'var(--status-ip-bg)',text:'var(--status-ip-text)'},'Approved':{bg:'var(--status-done-bg)',text:'var(--status-done-text)'}};
const CITY_EMPTY={jurisdiction:'',planCheckStatus:'Not Submitted',planCheckNumber:'',firstSubmittalDate:'',packageRef:'',planCheckerName:'',planCheckerPhone:'',planCheckerEmail:'',permitNumber:'',permitApprovalDate:'',permitExpiryDate:'',permitType:'',rounds:[]};
function getCityData(projectId,saved){return{...CITY_EMPTY,jurisdiction:CITY_DEFAULTS[projectId]||'City of Irvine',...(saved?.[projectId]||{})};}

const HOA_REQUIRED_IDS=new Set(['624','626','634','637-S','642','638']);
const HOA_STATUS_OPTIONS=['Not Started','Fee Pending','Submitted','Under Review','Revision Requested','Approved','Rejected'];
const HOA_DOCS=['Architectural drawings','Site plan','Elevation drawings','Material/color board','Application form','Fee check/payment'];
const HOA_STATUS_DOT={'Not Started':'var(--text-ghost)','Fee Pending':'var(--status-hold-text)','Submitted':'#3498db','Under Review':'var(--status-hold-text)','Revision Requested':'#e67e22','Approved':'var(--status-done-text)','Rejected':'var(--sla-red-text)'};
const HOA_STATUS_BADGE={'Not Started':{bg:'var(--status-ns-bg)',text:'var(--status-ns-text)'},'Fee Pending':{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)'},'Submitted':{bg:'var(--status-ip-bg)',text:'var(--status-ip-text)'},'Under Review':{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)'},'Revision Requested':{bg:'var(--status-hold-bg)',text:'#e67e22'},'Approved':{bg:'var(--status-done-bg)',text:'var(--status-done-text)'},'Rejected':{bg:'var(--sla-red-bg)',text:'var(--sla-red-text)'}};
const HOA_EMPTY={hoaRequired:false,hoaName:'',managementCompany:'',contactName:'',contactPhone:'',contactEmail:'',feeRequired:false,feeAmount:'',feePaid:false,feePaidDate:'',submittalDate:'',docs:{},hoaStatus:'Not Started',expectedDecisionDate:'',actualDecisionDate:'',revisions:[],approvalDate:'',approvalConditions:'',approvalLetterPath:''};
function getHOAData(projectId,saved){return{...HOA_EMPTY,hoaRequired:HOA_REQUIRED_IDS.has(projectId),...(saved?.[projectId]||{})};}

const _dbt={};
function dbt(key,fn,ms=500){clearTimeout(_dbt[key]);_dbt[key]=setTimeout(fn,ms);}
let _saveTimer=null;

function doOpenPath(rawPath){
  if(!window.electronAPI){alert('This feature requires the desktop app');return;}
  let p=String(rawPath||'');
  if(p.startsWith('file:///')) p=p.slice(8);
  else if(p.startsWith('file://')) p=p.slice(7);
  const fileUrl='file:///'+p.replace(/\\/g,'/');
  console.log('doOpenPath | original:',rawPath,'| fileUrl:',fileUrl);
  window.electronAPI.openExternal(fileUrl)
    .then(()=>console.log('openExternal success'))
    .catch(e=>{console.log('openExternal error:',e);alert('Could not open file. Error: '+String(e));});
}

function parseNotes(notes){
  if(!notes) return {};
  const phone=notes.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0];
  const email=notes.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const docusign=notes.match(/[Dd]ocu[Ss]ign\s*:?\s*([A-Z0-9-]{6,})/)?.[1];
  const address=notes.match(/\d+\s+[\w\s]+,\s*[\w\s]+,?\s*CA\s*\d{5}/)?.[0]?.trim();
  return {phone,email,docusign,address};
}

function Av({name,size=28,colorMap}){const c=(colorMap&&colorMap[name])||DC_INIT[name]||"#666";return<div style={{width:size,height:size,borderRadius:"50%",background:c+"33",border:`1.5px solid ${c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color:c,flexShrink:0,fontFamily:"monospace"}}>{name[0]}</div>;}
function Sb({status}){const c=STATUS_COLOR[status]||STATUS_COLOR["Not Started"];return<span style={{background:c.bg,color:c.text,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:600,letterSpacing:".5px",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:c.dot,display:"inline-block"}}/>{status}</span>;}
function Pb({pct,color="var(--accent)"}){return<div style={{background:"var(--bg-subtle)",borderRadius:99,height:5,width:"100%",overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",borderRadius:99,background:pct===100?"var(--kpi-2)":color,transition:"width .4s"}}/></div>;}
function ST({children,color="var(--section-header)"}){return<div style={{fontSize:10,fontWeight:700,color,letterSpacing:"2px",textTransform:"uppercase",marginBottom:14,fontFamily:"monospace"}}>{children}</div>;}
function SLABadge({project,compact=false}){
  const s=getSLAStatus(project);
  if(s.zone==='none') return<span style={{fontSize:10,color:'var(--text-ghost)',fontFamily:'monospace'}}>No date</span>;
  if(s.isExternal) return<div><span style={{background:'var(--status-ns-bg)',color:'var(--text-muted)',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600,fontFamily:'monospace'}}>⏸ External</span>{!compact&&<div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2,textAlign:'center'}}>SLA paused</div>}</div>;
  const cfg={green:{bg:'var(--status-done-bg)',text:'var(--status-done-text)',icon:'✓'},amber:{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)',icon:'⚠'},red:{bg:'var(--sla-red-bg)',text:'var(--sla-red-text)',icon:''}};
  const c=cfg[s.zone];
  const label=s.zone==='red'?'RED ZONE':`W${s.weekNum}${c.icon}`;
  const sub=s.daysRemaining>0?`${s.daysRemaining}d left`:`${Math.abs(s.daysRemaining)}d over SLA`;
  return<div style={{textAlign:'center'}}><span style={{background:c.bg,color:c.text,padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700,fontFamily:'monospace',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{label}</span>{!compact&&<div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2}}>{sub}</div>}</div>;
}

const S={
  app:{minHeight:"100vh",background:"var(--bg-page)",color:"var(--text-primary)",fontFamily:"Georgia,serif"},
  nav:{background:"var(--bg-nav)",borderBottom:"var(--nav-border-bottom)",padding:"0 24px",display:"flex",alignItems:"center",gap:0,position:"sticky",top:0,zIndex:100},
  logo:{color:"var(--accent)",fontWeight:700,fontSize:16,letterSpacing:"2px",marginRight:32,padding:"14px 0",fontFamily:"monospace"},
  tab:a=>({padding:"14px 18px",cursor:"pointer",fontSize:11,letterSpacing:"1px",fontWeight:a?700:400,color:a?"var(--tab-active)":"var(--tab-inactive)",background:"none",border:"none",borderBottom:a?"2px solid var(--tab-active)":"2px solid transparent",fontFamily:"monospace",textTransform:"uppercase"}),
  main:{padding:"24px",maxWidth:1500,margin:"0 auto"},
  card:{background:"var(--bg-card)",border:"1px solid var(--border-primary)",borderRadius:8,padding:"16px 20px"},
  metric:{background:"var(--bg-card)",border:"1px solid var(--border-primary)",borderRadius:8,padding:"20px",flex:1,minWidth:140},
  sel:{background:"var(--bg-card)",border:"1px solid var(--border-secondary)",color:"var(--text-body)",padding:"5px 10px",borderRadius:4,fontSize:11,cursor:"pointer",fontFamily:"monospace"},
  tbl:{width:"100%",borderCollapse:"collapse"},
  th:{textAlign:"left",padding:"5px 8px",fontSize:9,color:"var(--th-color)",letterSpacing:"1.5px",textTransform:"uppercase",borderBottom:"1px solid var(--th-border)",background:"var(--th-bg)",fontFamily:"monospace",whiteSpace:"nowrap"},
  td:{padding:"5px 8px",fontSize:10,borderBottom:"1px solid var(--border-td)",verticalAlign:"middle"},
  btn:{background:"var(--accent)",color:"#fff",border:"none",padding:"7px 16px",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:700,letterSpacing:"1px",fontFamily:"monospace"},
  ghost:{background:"transparent",color:"var(--accent)",border:"1px solid var(--accent)",padding:"6px 14px",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:700,letterSpacing:"1px",fontFamily:"monospace"},
  input:{background:"var(--bg-input)",border:"1px solid var(--border-secondary)",color:"var(--text-primary)",padding:"7px 10px",borderRadius:4,fontSize:12,width:"100%",boxSizing:"border-box",fontFamily:"Georgia,serif"},
  label:{fontSize:10,color:"var(--text-muted)",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"monospace",display:"block",marginBottom:4},
  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:30,overflowY:"auto"},
  mod:{background:"var(--bg-card)",border:"1px solid var(--border-secondary)",borderRadius:10,padding:"28px",width:"95%",maxWidth:960,marginBottom:40},
};

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
- scopeOfWork: scan every line item in the contract. For each item where the included indicator is Y, YES, or a checked/green box, extract { category, description }. Use the section heading as category (e.g. "Structural", "Electrical", "Plumbing", "Mechanical", "Framing", "Insulation", "Drywall", "Flooring", "Painting", "Cabinetry", "Countertops", "Roofing", "Windows & Doors", "HVAC", "Other"). Omit items where the indicator is N, NO, or unchecked.
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
- scopeOfWork: scan every line item in the contract. For each item where the included indicator is Y, YES, or a checked/green box, extract { category, description }. Use the section heading as category. Omit items where the indicator is N, NO, or unchecked.
- includedItems: [], excludedItems: []
- signatureDate, signedByName from signature page

=== ALL FORMATS — SCOPE OF WORK (FORMAT 1 additional instruction) ===
For FORMAT 1 (TruPlans Work Order): also extract scopeOfWork by scanning all service line items across pages 3–6. For each line item that is included in the scope (marked, listed, or described as part of the work), extract { category, description } where category matches the page section (e.g. "Architectural", "Civil", "Structural", "Landscape").

Return ONLY valid JSON, no markdown, no backticks. Leave fields empty/0/[] if not applicable to the detected format:
{"contractFormat":"","clientLastName":"","clientFirstNames":"","fullAddress":"","phone1":"","phone2":"","email":"","workOrderDate":"","contractDate":"","signedDate":"","projectNumber":"","docusignId":"","contractorCompany":"","contractorLicense":"","archTotal":0,"civilTotal":0,"structuralTotal":0,"landscapeTotal":0,"grandTotal":0,"approxStartDate":"","approxCompletionDate":"","estimatedConstructionTime":"","paymentMilestones":[{"code":"","description":"","amount":0,"trigger":""}],"scopeOfWork":[{"category":"","description":""}],"signatureDate":"","signedByName":"","includedItems":[],"excludedItems":[]}`;

function AnalyseModal({project,onClose,onSave}){
  const [phase,setPhase]=useState('pick');
  const [filePath,setFilePath]=useState('');
  const [filename,setFilename]=useState('');
  const [errMsg,setErrMsg]=useState('');
  const [edited,setEdited]=useState(null);
  const fileInputRef=useRef(null);

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
      const payload={model:'claude-sonnet-4-20250514',max_tokens:6000,messages:[{role:'user',content:[
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
      const raw=data.content?.[0]?.text||'{}';
      const m=raw.match(/\{[\s\S]*\}/);
      if(!m)throw new Error('No JSON in AI response');
      const parsed=JSON.parse(m[0]);
      if(!parsed.grandTotal){
        parsed.grandTotal=(parsed.archTotal||0)+(parsed.civilTotal||0)+(parsed.structuralTotal||0)+(parsed.landscapeTotal||0);
      }
      setEdited(JSON.parse(JSON.stringify(parsed)));
      setPhase('review');
    }catch(e){setErrMsg(String(e));setPhase('pick');}
  };

  const upd=(k,v)=>setEdited(p=>({...p,[k]:v}));
  const updMs=(i,k,v)=>setEdited(p=>({...p,paymentMilestones:p.paymentMilestones.map((m,mi)=>mi===i?{...m,[k]:v}:m)}));

  const save=()=>{
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
    onSave(project.id,{
      client:clientName||project.client,
      contract:Number(e.grandTotal)||0,
      start:e.signedDate||e.signatureDate||e.contractDate||e.workOrderDate||project.start,
      notes:notesParts.join(' '),
      scopeOfWork:e.scopeOfWork||[]
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
                  {Object.entries((edited.scopeOfWork||[]).reduce((acc,item)=>{const cat=item.category||'Other';(acc[cat]=acc[cat]||[]).push(item.description);return acc},{})).map(([cat,descs])=>(
                    <div key={cat} style={{marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:700,color:'var(--accent)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:3}}>{cat}</div>
                      {descs.map((d,i)=><div key={i} style={{fontSize:10,color:'var(--status-done-text)',display:'flex',gap:5,marginBottom:2}}><span>✓</span><span style={{color:'var(--text-body)'}}>{d}</span></div>)}
                    </div>
                  ))}
                </div>}
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--section-header)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>Payment Milestones ({(edited.paymentMilestones||[]).length})</div>
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
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid var(--border-primary)',paddingTop:14}}>
              <button style={S.ghost} onClick={onClose}>Cancel</button>
              <button style={S.btn} onClick={save}>💾 Save to Project</button>
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
function ProjectDetail({project,paymentData,contractPaths,teamMembers,onBack,onUpdateProject,onUpdateType,onPaymentUpdate,onPickPDF,onViewPDF,threads=[],onOpenThread,onUpdateName,onDelete,onWorkflow,onAssign,onContracts,onTogglePhase}){
  const [editNotes,setEditNotes]=useState(project.notes||'');
  const [renaming,setRenaming]=useState(false);
  const [renameVal,setRenameVal]=useState(project.name);
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
  return(
    <div style={{animation:'slideInRight 0.2s ease-out'}}>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,flexWrap:'wrap'}}>
        <button onClick={onBack} style={{...S.ghost,padding:'6px 14px',fontSize:11,flexShrink:0}}>← Projects</button>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:10,color:'var(--accent)',fontFamily:'monospace',letterSpacing:'2px'}}>{project.id}{project.type&&` · ${project.type}`}</div>
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
        </div>
        <SLABadge project={project}/>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <button onClick={onDelete} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid #e74c3c',color:'#e74c3c',background:'none'}}>Delete</button>
          <button onClick={onWorkflow} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-muted)',background:'none'}}>Workflow</button>
          <button onClick={onAssign} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-muted)',background:'none'}}>Assign Team</button>
          <button onClick={onContracts} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-muted)',background:'none'}}>Contracts</button>
          <button onClick={onBack} style={{padding:'4px 12px',fontSize:10,fontFamily:'monospace',cursor:'pointer',borderRadius:4,border:'1px solid var(--border-secondary)',color:'var(--text-body)',background:'none',fontWeight:700}}>✕ Close</button>
        </div>
      </div>
      <div style={{...S.card,marginBottom:20}}>
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
      <div style={{display:'grid',gridTemplateColumns:'38% 1fr',gap:20,marginBottom:20,alignItems:'start'}}>
        <div style={S.card}>
          <ST>Client Info</ST>
          <InfoRow label="Client" value={project.client}/>
          <InfoRow label="Phone" value={phone} href={phone?`tel:${phone}`:undefined}/>
          <InfoRow label="Email" value={email} href={email?`mailto:${email}`:undefined}/>
          <InfoRow label="Address" value={address} onClick={address?()=>window.electronAPI?.openExternal(`https://maps.google.com/?q=${encodeURIComponent(address)}`):undefined}/>
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
          <InfoRow label="DocuSign" value={docusign}/>
          <div style={{marginTop:16,borderTop:'1px solid var(--border-primary)',paddingTop:16}}>
            <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Notes</div>
            <textarea value={editNotes} onChange={e=>{const v=e.target.value;setEditNotes(v);dbt(`notes-${project.id}`,()=>onUpdateProject(project.id,v));}} style={{...S.input,height:100,resize:'vertical',fontSize:11}} placeholder="Add project notes..."/>
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
              {internalSteps.map(step=>{const st=getStepStatus(step.id);return<div key={step.id} onClick={()=>onTogglePhase?.(project.id,step.id)} title={`Click to toggle ${step.id}`} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:4,background:SBG[st],cursor:'pointer',userSelect:'none'}}><span style={{fontSize:8,fontFamily:'monospace',color:SCOL[st],fontWeight:700,minWidth:26}}>{step.id}</span><span style={{fontSize:9,color:SCOL[st],overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{step.label}</span></div>;})}
            </div>
            <div style={{fontSize:9,color:'var(--sla-red-text)',fontFamily:'monospace',letterSpacing:'1px',textTransform:'uppercase',marginTop:12,marginBottom:8}}>External 5.21–5.23 — SLA Paused</div>
            <div style={{display:'flex',gap:6}}>
              {externalSteps.map(step=>{const st=getStepStatus(step.id);return<div key={step.id} onClick={()=>onTogglePhase?.(project.id,step.id)} title={`Click to toggle ${step.id}`} style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:4,background:SBG[st],border:`1px solid ${SCOL[st]}44`,cursor:'pointer',userSelect:'none'}}><span style={{fontSize:9,fontFamily:'monospace',color:SCOL[st],fontWeight:700,minWidth:28}}>{step.id}</span><span style={{fontSize:9,color:SCOL[st],flex:1}}>{step.label}</span></div>;})}
            </div>
          </div>
        </div>
      </div>
      <div style={{...S.card,marginBottom:20}}>
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
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
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
          <button onClick={()=>onPickPDF(project)} style={{...S.ghost,padding:'8px 16px',fontSize:11}}>{contractPath?'↺ Replace PDF':'+ Attach Contract PDF'}</button>
        </div>
      </div>
      <div style={{...S.card,marginTop:20}}>
        <ST>Scope of Work</ST>
        {(project.scopeOfWork||[]).length>0?(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {Object.entries((project.scopeOfWork||[]).reduce((acc,item)=>{const cat=item.category||'Other';(acc[cat]=acc[cat]||[]).push(item.description);return acc},{})).map(([cat,descs])=>(
              <div key={cat}>
                <div style={{fontSize:9,fontWeight:700,color:'var(--accent)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:5}}>{cat}</div>
                {descs.map((d,i)=><div key={i} style={{display:'flex',gap:7,alignItems:'flex-start',marginBottom:3}}><span style={{color:'var(--status-done-text)',fontSize:11,fontWeight:700,flexShrink:0}}>✓</span><span style={{fontSize:11,color:'var(--text-body)',lineHeight:1.4}}>{d}</span></div>)}
              </div>
            ))}
          </div>
        ):(
          <div style={{fontSize:11,color:'var(--text-faint)',fontFamily:'monospace'}}>No scope of work — analyse a contract to populate.</div>
        )}
      </div>
      <div style={{...S.card,marginTop:20}}>
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
  useEffect(()=>{if(!_wfInit.current){_wfInit.current=true;return;}setProjects(prev=>prev.map(p=>p.id===project.id?{...p,workflow:wf}:p));},[wf]);
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

function ContractModule({project,onClose,onUpdate}){
  const [ci,setCi]=useState(project.contracts.length>0?0:null);
  const [ctab,setCtab]=useState("overview");
  const [ctrs,setCtrs]=useState(project.contracts);
  const [analyzing,setAnalyzing]=useState(false);
  const [pdfTxt,setPdfTxt]=useState("");
  const [aiRes,setAiRes]=useState(null);
  const [newCO,setNewCO]=useState({date:"",description:"",amount:"",status:"Pending"});
  const [phases,setPhases]=useState(()=>project.phases&&project.phases.length===23?project.phases.map(p=>({...p})):makeDefaultPhases());
  const [expandedPhase,setExpandedPhase]=useState(null);
  const cyclePhase=id=>{const o=["not_started","in_progress","done"];setPhases(prev=>prev.map(p=>{if(p.id!==id)return p;const ni=(o.indexOf(p.status)+1)%o.length;return{...p,status:o[ni],dateCompleted:o[ni]==="done"?new Date().toISOString().slice(0,10):p.dateCompleted};}));};
  const _phInit=useRef(false);
  useEffect(()=>{if(!_phInit.current){_phInit.current=true;return;}onUpdate?.({phases});},[phases]);
  const _ctrsInit=useRef(false);
  useEffect(()=>{if(!_ctrsInit.current){_ctrsInit.current=true;return;}onUpdate?.({contracts:ctrs});},[ctrs]);

  const ctr=ci!==null?ctrs[ci]:null;
  const paid=ctr?ctr.paymentMilestones.filter(m=>m.paid).reduce((a,m)=>a+m.amount,0):0;
  const due=ctr?ctr.totalAmount-paid:0;
  const pctP=ctr?Math.round(paid/ctr.totalAmount*100):0;

  async function analyze(){
    if(!pdfTxt.trim())return;
    setAnalyzing(true);
    try{
      const result=await window.electronAPI.analyseContract({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`You are an expert architectural project manager at TruPlans Inc., a California residential design firm. Analyze this contract and return ONLY valid JSON (no markdown, no backticks):
{"summary":"2-3 sentence overview","scopeSummary":"included items as bullet list with \\n separators","paymentSummary":"payment schedule summary","obligations":"what TruPlans must deliver","riskFlags":[{"level":"HIGH|MEDIUM|LOW","text":"description"}],"actionItems":[{"done":false,"text":"action item"}]}

CONTRACT:
${pdfTxt.slice(0,8000)}`}]});
      if(!result.ok)throw new Error(result.error);
      const d=result.data;
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
  const clearAI=()=>{setAiRes(null);setCtrs(prev=>prev.map((c,i)=>i===ci?{...c,aiAnalysis:null}:c));};

  const CTABS=["overview","phases","design scope","construction scope","payments","homeowner","hidden conditions","change orders","ai analysis"];
  const ai=aiRes||(ctr?.aiAnalysis);

  return(
    <div style={S.ov} onClick={onClose}>
      <div style={{...S.mod}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:10,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>CONTRACT MODULE</div>
            <div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginTop:2}}>{project.name}</div>
            <div style={{fontSize:11,color:"#888"}}>{project.client} · {project.city}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.ghost,fontSize:10}} onClick={addContract}>+ Add Contract</button>
            <button style={{...S.ghost,fontSize:10,color:"#555",borderColor:"#333"}} onClick={onClose}>✕</button>
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
            {ctrs.length>1&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{ctrs.map((c,i)=><button key={c.id} onClick={()=>setCi(i)} style={{...S.ghost,...(ci===i?{background:"#e94560",color:"#fff"}:{}),fontSize:10}}>{c.id} — {c.type}</button>)}</div>}

            {ctr&&<>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
                {[["Total",fmt$(ctr.totalAmount),"#f0f0f0"],["Paid",fmt$(paid),"#52d68a"],["Outstanding",fmt$(due),due>0?"#f0a842":"#52d68a"],["Est. Start",ctr.estStart||"TBD","#ccc"],["Completion",ctr.estCompletion||"TBD","#ccc"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#0d0d1a",borderRadius:6,padding:"10px 12px"}}><div style={{fontSize:9,color:"#555",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"monospace"}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:c,marginTop:3,fontFamily:"monospace"}}>{v}</div></div>
                ))}
              </div>
              <div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:10,color:"#888",fontFamily:"monospace"}}><span>Payment progress</span><span style={{color:"#52d68a"}}>{pctP}%</span></div><Pb pct={pctP} color="#27ae60"/></div>

              <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e1e3a",marginBottom:18,flexWrap:"wrap"}}>
                {CTABS.map(t=><button key={t} onClick={()=>setCtab(t)} style={{padding:"8px 12px",cursor:"pointer",fontSize:9,letterSpacing:"1px",fontWeight:ctab===t?700:400,color:ctab===t?"#e94560":"#555",background:"none",border:"none",borderBottom:ctab===t?"2px solid #e94560":"2px solid transparent",fontFamily:"monospace",textTransform:"uppercase"}}>{t}</button>)}
              </div>

              {/* OVERVIEW */}
              {ctab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Contractor",ctr.contractor],["License",ctr.contractorLic],["Contract Type",ctr.type],["Signed",ctr.signedDate],["DocuSign ID",ctr.docusignId],["Construction",ctr.constructionWeeks+" weeks"]].map(([l,v])=>(
                  <div key={l} style={{background:"#0d0d1a",padding:"10px 12px",borderRadius:4}}><div style={{fontSize:9,color:"#555",fontFamily:"monospace",letterSpacing:"1px",textTransform:"uppercase"}}>{l}</div><div style={{fontSize:11,color:"#ccc",marginTop:3}}>{v||"—"}</div></div>
                ))}
              </div>}

              {/* PHASES */}
              {ctab==="phases"&&(()=>{
                const sd=project.startDate||project.start||new Date().toISOString().slice(0,10);
                const td=project.targetDate||addDays(sd,56);
                const{week,zone,daysUntilTarget}=calculateZone(sd);
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
                    <div key={ph.id} style={{marginBottom:3,borderRadius:5,overflow:"hidden",border:`1px solid ${isExp?"#2a2a4a":"#1a1a2e"}`,...(isIP?{borderLeft:"3px solid #3498db"}:{})}}>
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
                        <div style={{padding:"10px 14px",background:"#080810",borderTop:"1px solid #1a1a2e"}}>
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
                    <div style={{background:"#0a0a15",borderRadius:8,padding:"16px",marginBottom:16,border:"1px solid #1e1e3a"}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0",marginBottom:8}}>{project.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:zc,flexShrink:0}}/>
                        <span style={{fontSize:11,color:"#ccc",fontFamily:"monospace"}}>Week {week} of 8 (Target)</span>
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
                      <div style={{flex:1,height:1,background:"#2a2a4a"}}/>
                      <span style={{fontSize:8,color:"#555",fontFamily:"monospace",whiteSpace:"nowrap",letterSpacing:"1.5px"}}>— END OF TRUPLANS CLOCK —</span>
                      <div style={{flex:1,height:1,background:"#2a2a4a"}}/>
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
                <div style={{marginBottom:12,fontSize:10,color:"#f0a842",padding:"8px 12px",background:"#1a0d00",borderRadius:4,borderLeft:"3px solid #f0a842",fontFamily:"monospace"}}>
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
                <div style={{display:"flex",justifyContent:"space-between",padding:"12px",background:"#0a0a15",borderRadius:6,marginTop:8}}>
                  <span style={{fontSize:11,color:"#888",fontFamily:"monospace"}}>PAID / TOTAL</span>
                  <span style={{fontSize:14,fontWeight:700,color:"#52d68a",fontFamily:"monospace"}}>{fmt$(paid)} / {fmt$(ctr.totalAmount)}</span>
                </div>
              </div>}

              {/* HOMEOWNER OBLIGATIONS */}
              {ctab==="homeowner"&&<div>
                <ST>Homeowner Obligations Checklist</ST>
                <div style={{marginBottom:12,fontSize:10,color:"#3498db",padding:"8px 12px",background:"#0a0f1a",borderRadius:4,borderLeft:"3px solid #3498db",fontFamily:"monospace"}}>
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
                <div style={{marginBottom:12,fontSize:10,color:"#e74c3c",padding:"8px 12px",background:"#1a0808",borderRadius:4,borderLeft:"3px solid #e74c3c",fontFamily:"monospace"}}>
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
                <div style={{marginBottom:12,fontSize:10,color:"#9b59b6",padding:"8px 12px",background:"#0f0a1a",borderRadius:4,borderLeft:"3px solid #9b59b6",fontFamily:"monospace"}}>
                  Per CA B&P 7159: verbal changes are still billable. Document ALL changes here before work begins.
                </div>
                {ctr.changeOrders.length===0&&<div style={{color:"#444",fontSize:11,marginBottom:16}}>No change orders logged.</div>}
                {ctr.changeOrders.map(co=>(
                  <div key={co.id} style={{background:"#0d0d1a",border:"1px solid #2a2a4a",borderRadius:6,padding:"12px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:10,color:"#9b59b6",fontFamily:"monospace"}}>{co.id} · {co.date}</div><div style={{fontSize:11,color:"#ccc",marginTop:3}}>{co.description}</div></div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,color:"#f0a842",fontFamily:"monospace"}}>{co.amount>=0?"+":""}{fmt$(co.amount)}</span><Sb status={co.status}/></div>
                    </div>
                  </div>
                ))}
                <div style={{background:"#0a0a15",border:"1px solid #2a2a4a",borderRadius:6,padding:"14px",marginTop:8}}>
                  <div style={{fontSize:10,color:"#9b59b6",letterSpacing:"1px",fontFamily:"monospace",marginBottom:10}}>+ NEW CHANGE ORDER</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 100px",gap:8,alignItems:"end"}}>
                    <div><label style={S.label}>Date</label><input type="date" style={S.input} value={newCO.date ? String(newCO.date).substring(0,10) : ''} onChange={e=>setNewCO({...newCO,date:fixDateYear(e.target.value)})}/></div>
                    <div><label style={S.label}>Description</label><input style={S.input} value={newCO.description} onChange={e=>setNewCO({...newCO,description:e.target.value})} placeholder="Scope change..."/></div>
                    <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} value={newCO.amount} onChange={e=>setNewCO({...newCO,amount:e.target.value})} placeholder="0"/></div>
                    <button style={S.btn} onClick={addCO}>Add</button>
                  </div>
                </div>
              </div>}

              {/* AI ANALYSIS */}
              {ctab==="ai analysis"&&<div>
                <ST>AI Contract Analysis</ST>
                {!ai?(
                  <div style={{background:"#0a0a15",border:"1px solid #2a2a4a",borderRadius:8,padding:"20px"}}>
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
                      <div style={{background:"#0d0d1a",borderRadius:6,padding:"14px",marginBottom:12,borderLeft:"3px solid #e94560"}}>
                        <div style={{fontSize:10,color:"#e94560",fontFamily:"monospace",letterSpacing:"1px",marginBottom:6}}>PROJECT SUMMARY</div>
                        <div style={{fontSize:11,color:"#ccc",lineHeight:1.6}}>{ai.summary}</div>
                      </div>
                      {ai.riskFlags?.length>0&&<div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:"#e74c3c",fontFamily:"monospace",letterSpacing:"1px",marginBottom:8}}>RISK FLAGS</div>
                        {ai.riskFlags.map((r,i)=>(
                          <div key={i} style={{display:"flex",gap:10,padding:"8px 12px",borderRadius:4,marginBottom:5,background:r.level==="HIGH"?"#200a0a":r.level==="MEDIUM"?"#1a1000":"#0a0f1a",borderLeft:`3px solid ${r.level==="HIGH"?"#e74c3c":r.level==="MEDIUM"?"#f39c12":"#3498db"}`}}>
                            <span style={{fontSize:9,fontWeight:700,color:r.level==="HIGH"?"#e74c3c":r.level==="MEDIUM"?"#f39c12":"#3498db",minWidth:52,fontFamily:"monospace",marginTop:1}}>{r.level}</span>
                            <span style={{fontSize:11,color:"#ccc",lineHeight:1.5}}>{r.text}</span>
                          </div>
                        ))}
                      </div>}
                      {ai.actionItems?.length>0&&<div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:"#27ae60",fontFamily:"monospace",letterSpacing:"1px",marginBottom:8}}>ACTION ITEMS</div>
                        {ai.actionItems.map((item,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:4,marginBottom:4,background:"#0d0d1a"}}>
                            <div style={{width:16,height:16,borderRadius:"50%",border:`1.5px solid ${item.done?"#27ae60":"#333"}`,background:item.done?"#27ae6033":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,marginTop:1}}>{item.done&&"✓"}</div>
                            <span style={{fontSize:11,color:item.done?"#52d68a":"#ccc",lineHeight:1.5,textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                          </div>
                        ))}
                      </div>}
                      {[["Scope Summary",ai.scopeSummary,"#27ae60"],["TruPlans Obligations",ai.obligations,"#3498db"],["Payment Summary",ai.paymentSummary,"#f0a842"]].map(([title,content,color])=>content&&(
                        <div key={title} style={{background:"#0d0d1a",borderRadius:6,padding:"12px",marginBottom:10,borderLeft:`3px solid ${color}`}}>
                          <div style={{fontSize:10,color,fontFamily:"monospace",letterSpacing:"1px",marginBottom:6}}>{title.toUpperCase()}</div>
                          <div style={{fontSize:11,color:"#bbb",lineHeight:1.7,whiteSpace:"pre-line"}}>{content}</div>
                        </div>
                      ))}
                    </>}
                  </div>
                )}
              </div>}
            </>}
          </>
        )}
      </div>
    </div>
  );
}

function getRevenueData(projects,paymentData){
  const today=new Date();
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(today.getFullYear(),today.getMonth()-i,1);
    months.push({label:d.toLocaleDateString('en-US',{month:'short'}),year:d.getFullYear(),month:d.getMonth(),contracted:0,invoiced:0,collected:0});
  }
  for(const p of projects){
    if(!p.start) continue;
    const sd=new Date(p.start);
    const bucket=months.find(m=>m.year===sd.getFullYear()&&m.month===sd.getMonth());
    if(!bucket) continue;
    bucket.contracted+=p.contract||0;
    const ms=paymentData[p.id]||[];
    for(const m of ms){
      if(m.status==='Collected'){bucket.collected+=m.amount||0;bucket.invoiced+=m.amount||0;}
      else if(m.status==='Invoiced'){bucket.invoiced+=m.amount||0;}
    }
  }
  return months;
}

function getSLADonut(projects){
  const active=projects.filter(p=>p.status==='In Progress');
  const counts={green:0,amber:0,red:0,none:0};
  for(const p of active){const z=getSLAStatus(p).zone;counts[z in counts?z:'none']++;}
  const total=active.length||1;
  return[
    {name:'On Track (W1–6)',zone:'green', value:counts.green, color:'#27ae60',pct:Math.round(counts.green/total*100)},
    {name:'Amber (W7–8)',   zone:'amber', value:counts.amber, color:'#f39c12',pct:Math.round(counts.amber/total*100)},
    {name:'Red Zone',       zone:'red',   value:counts.red,   color:'#e74c3c',pct:Math.round(counts.red/total*100)},
    {name:'No Date',        zone:'none',  value:counts.none,  color:'#666',   pct:Math.round(counts.none/total*100)},
  ].filter(d=>d.value>0);
}

function getFinancialSummary(projects,paymentData){
  const today=new Date();const ty=today.getFullYear();const tm=today.getMonth();
  let thisMoC=0,thisMoX=0,ytdC=0,ytdX=0,totC=0,totX=0;
  for(const p of projects){
    const ms=paymentData[p.id]||[];
    const collected=ms.filter(m=>m.status==='Collected').reduce((a,m)=>a+(m.amount||0),0);
    totC+=p.contract||0;totX+=collected;
    if(p.start){
      const d=new Date(p.start);
      if(d.getFullYear()===ty){ytdC+=p.contract||0;ytdX+=collected;}
      if(d.getFullYear()===ty&&d.getMonth()===tm){thisMoC+=p.contract||0;thisMoX+=collected;}
    }
  }
  return{thisMoC,thisMoX,ytdC,ytdX,rate:totC>0?Math.round(totX/totC*100):0};
}

const STEP_WEEKS={'5.1':1,'5.2':1,'5.3':1,'5.4':2,'5.5':2,'5.6':3,'5.7':3,'5.8':4,'5.9':5,'5.10':5,'5.11':5,'5.12':6,'5.13':6,'5.14':6,'5.15':7,'5.19':7,'5.16':8,'5.20':8,'5.17':9,'5.18':10};
function computeDue(stepId,startDate){try{if(!stepId||!startDate||!STEP_WEEKS[stepId])return null;const d=new Date(startDate);if(isNaN(d.getTime()))return null;d.setDate(d.getDate()+STEP_WEEKS[stepId]*7);return d;}catch{return null;}}
function formatDue(dueDate){try{if(!dueDate)return null;const today=new Date();today.setHours(0,0,0,0);const diff=Math.round((dueDate-today)/86400000);if(diff<0)return{text:`Overdue ${Math.abs(diff)}d`,overdue:true};if(diff===0)return{text:'Due today',overdue:true};return{text:`Due ${dueDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,overdue:false};}catch{return null;}}

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

function Inbox({ projects = [], onOpenProject, threads = [], onSetThreads, initialThread = null, onInitialThreadConsumed, searchFilter = '' }) {
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
    fetch(`${API_BASE}/api/gmail/status`)
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
    fetch(`${API_BASE}/api/gmail/list`)
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
    fetch(`${API_BASE}/api/gmail/thread/${t.id}`)
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
      body: JSON.stringify({ threadId: selectedThread.id, to, subject: selectedThread.subject, body: replyBody }),
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
        onClick={() => window.open(`${API_BASE}/api/gmail/auth`, '_blank')}
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

  const [teamMembers,setTeamMembers]=useState(DC_INIT);
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
    setProjects(prev=>prev.map(p=>p.id===projectId?{...p,...updates}:p));
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
            const merged=[...data,...newFromInit];
            _projInit.current=false;
            return merged;
          });
        }
      })
      .catch(err=>console.error('[supabase] Failed to load projects from cloud:', err.message));
  },[]);
  useEffect(()=>{
    if(!_projInit.current){_projInit.current=true;return;}
    if(_remoteUpdate.current){_remoteUpdate.current=false;return;}
    try{localStorage.setItem("project-state",JSON.stringify(projects));}catch{}
    triggerSave();
    fetch(`${API_BASE}/api/supabase/sync`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({projects}),
    }).catch(err=>console.error('[supabase] Failed to sync projects to cloud:', err.message));
  },[projects]);
  useEffect(()=>{
    if(!sbClient||!session) return;
    const dbToApp=row=>({
      id:row.id, name:row.name||'', client:row.client||'', designer:row.designer||'',
      type:row.type||'', status:row.status||'In Progress', phase:row.phase||'',
      city:row.city||'', contract:Number(row.contract)||0, invoiced:Number(row.invoiced)||0,
      pct:Number(row.pct)||0, stamp:row.stamp||'', permit:row.permit||'',
      start:row.start_date||null, end:row.end_date||null, notes:row.notes||'',
      scopeOfWork:row.scope_of_work||[], workflow:row.workflow||[], team:[], contracts:[],
    });
    const channel=sbClient.channel('projects-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'projects'},payload=>{
        if(payload.eventType==='INSERT'||payload.eventType==='UPDATE'){
          const updated=dbToApp(payload.new);
          _remoteUpdate.current=true;
          setProjects(prev=>{
            const exists=prev.some(p=>p.id===updated.id);
            return exists?prev.map(p=>p.id===updated.id?{...p,...updated}:p):[...prev,updated];
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
  const updateProjectNotes=(id,notes)=>{setProjects(prev=>prev.map(p=>p.id===id?{...p,notes}:p));triggerSave();};
  const updateProjectName=(id,name)=>{setProjects(prev=>prev.map(p=>p.id===id?{...p,name}:p));};
  const togglePhaseFromDetail=(projectId,stepId)=>{
    const today=new Date().toISOString().slice(0,10);
    setProjects(prev=>prev.map(p=>{
      if(String(p.id)!==String(projectId)) return p;
      const phases=(Array.isArray(p.phases)?p.phases:[]).map(ph=>ph&&ph.id===stepId?{...ph,status:ph.status==='done'?'not_started':'done',dateCompleted:ph.status==='done'?null:today}:ph);
      const workflow=(Array.isArray(p.workflow)?p.workflow:[]).map(m=>m&&m.milestoneId===stepId?{...m,status:m.status==='Completed'?'Not Started':'Completed'}:m);
      return{...p,phases,workflow};
    }));
  };
  const updateProjectType=(id,type)=>{setProjects(prev=>prev.map(p=>p.id===id?{...p,type}:p));triggerSave();};
  const [pdfPanel,setPdfPanel]=useState(null);
  const saveContractPath=(projectId,filePath)=>{const u={...contractPaths,[projectId]:filePath};setContractPaths(u);localStorage.setItem("contract-paths",JSON.stringify(u));};
  const handleContractModuleUpdate=(updates)=>{
    if(!ctrP) return;
    setProjects(prev=>prev.map(p=>p.id===ctrP.id?{...p,...updates}:p));
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
    setProjects(prev=>prev.map(p=>{
      if(String(p.id)!==String(projectId)) return p;
      const phases=(Array.isArray(p.phases)?p.phases:[]).map(ph=>ph&&ph.id===stepId?{...ph,status:done?'done':'not_started',dateCompleted:done?today:null}:ph);
      const workflow=(Array.isArray(p.workflow)?p.workflow:[]).map(m=>m&&m.milestoneId===stepId?{...m,status:done?'Completed':'Not Started'}:m);
      return{...p,phases,workflow};
    }));
  };

  const MemberAv=({name,size})=><Av name={name} size={size} colorMap={teamMembers}/>;
  const [confirmDelete,setConfirmDelete]=useState(null);
  const deleteProject=(id)=>{setProjects(prev=>prev.filter(p=>p.id!==id));setConfirmDelete(null);setSelP(null);setDetailProjectId(null);setTab('projects');};
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
      setProjects(prev=>[...prev,{...project,contracts:[contractData]}]);
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

  const IM=()=>(
    <div style={S.ov}><div style={S.mod}><div style={{marginBottom:20}}><div style={{fontSize:11,color:"#e94560",letterSpacing:"2px",fontFamily:"monospace"}}>NEW PROJECT</div><div style={{fontSize:18,fontWeight:700,color:"#f0f0f0"}}>Job Intake Form</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {[["Job Number","job","text"],["Client Name","client","text"],["City","city","text"],["Fee ($)","contract","number"]].map(([l,k,t])=><div key={k}><label style={S.label}>{l}</label><input type={t} style={S.input} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
      <div><label style={S.label}>Type</label><select style={{...S.input,width:"100%"}} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{TS.slice(1).map(t=><option key={t}>{t}</option>)}</select></div>
      <div><label style={S.label}>Designer</label><select style={{...S.input,width:"100%"}} value={form.designer} onChange={e=>setForm({...form,designer:e.target.value})}>{Object.keys(teamMembers).map(d=><option key={d}>{d}</option>)}</select></div>
      <div style={{gridColumn:"1/-1"}}><label style={S.label}>Notes</label><textarea style={{...S.input,height:70,resize:"vertical"}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
    </div>
    <div style={{marginTop:20,display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.ghost} onClick={()=>setIntake(false)}>Cancel</button><button style={S.btn} onClick={()=>{setProjects(prev=>[...prev,{id:'TRU-'+String(prev.length+1).padStart(3,'0'),name:form.job||'New Project',client:form.client||'',city:form.city||'',type:form.type,designer:form.designer,status:'In Progress',phase:'Schematic',start:new Date().toISOString().slice(0,10),end:'',pct:0,stamp:'No',permit:'No',contract:parseFloat(form.contract)||0,invoiced:0,team:[],workflow:generateWorkflow(new Date().toISOString().slice(0,10),form.designer),contracts:[]}]);setIntake(false);}}>Save</button></div>
    </div></div>
  );

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
          from { opacity:0; transform:translateX(24px); }
          to   { opacity:1; transform:translateX(0); }
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
      {intake&&<IM/>}
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
      {workflowP&&<WorkflowModal project={workflowP} projects={projects} setProjects={u=>{setProjects(u);triggerSave();}} teamMembers={teamMembers} onClose={()=>setWorkflowP(null)}/> }
      {showTeamSettings&&<TeamSettingsModal teamMembers={teamMembers} setTeamMembers={setTeamMembers} onClose={()=>setShowTeamSettings(false)}/>}
      {assignP&&<AssignModal project={assignP} projects={projects} setProjects={setProjects} teamMembers={teamMembers} onClose={()=>setAssignP(null)}/>}
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
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
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
            {tab==="inbox"&&<Inbox projects={projects} onOpenProject={goToProject} threads={gmailThreads} onSetThreads={setGmailThreads} initialThread={pendingThread} onInitialThreadConsumed={()=>setPendingThread(null)} searchFilter={searchQ}/>}
          </>
        )}
      </main>
    </div>
  );
}
