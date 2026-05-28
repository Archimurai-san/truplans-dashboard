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
  addendums: [],
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
const fmt$ = n => { const v = Number(n); return "$" + (isNaN(v) ? 0 : v).toLocaleString(); };
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
  if(s.zone==='future') return<span style={{fontSize:10,color:'var(--text-ghost)',fontFamily:'monospace'}}>Future</span>;
  if(s.isExternal) return<div><span style={{background:'var(--status-ns-bg)',color:'var(--text-muted)',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600,fontFamily:'monospace'}}>⏸ External</span>{!compact&&<div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2,textAlign:'center'}}>SLA paused</div>}</div>;
  const cfg={green:{bg:'var(--status-done-bg)',text:'var(--status-done-text)',icon:'✓'},amber:{bg:'var(--status-hold-bg)',text:'var(--status-hold-text)',icon:'⚠'},red:{bg:'var(--sla-red-bg)',text:'var(--sla-red-text)',icon:''}};
  const c=cfg[s.zone];
  const label=s.zone==='red'?'RED ZONE':`W${s.weekNum}${c.icon}`;
  const sub=s.daysRemaining>0?`${s.daysRemaining}d left`:`${Math.abs(s.daysRemaining)}d over SLA`;
  return<div style={{textAlign:'center'}}><span style={{background:c.bg,color:c.text,padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700,fontFamily:'monospace',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{label}</span>{!compact&&<div style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',marginTop:2}}>{sub}</div>}</div>;
}

const S={
  app:{minHeight:"100vh",overflowX:"hidden",background:"var(--bg-page)",color:"var(--text-primary)",fontFamily:"Georgia,serif"},
  nav:{background:"var(--bg-nav)",borderBottom:"var(--nav-border-bottom)",padding:"0 24px",display:"flex",alignItems:"center",gap:0,position:"sticky",top:0,zIndex:100},
  logo:{color:"var(--accent)",fontWeight:700,fontSize:16,letterSpacing:"2px",marginRight:16,padding:"14px 0",fontFamily:"monospace"},
  tab:a=>({padding:"14px 10px",cursor:"pointer",fontSize:11,letterSpacing:"1px",fontWeight:a?700:400,color:a?"var(--tab-active)":"var(--tab-inactive)",background:"none",border:"none",borderBottom:a?"2px solid var(--tab-active)":"2px solid transparent",fontFamily:"monospace",textTransform:"uppercase"}),
  main:{padding:"24px",maxWidth:1500,margin:"0 auto",overflowX:"hidden"},
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


// ===== DASHBOARD HELPERS (relocated to shared in v1.0.4) =====
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

// ===== MODULE EXPORTS (added by modular restructure v1.0.4) =====
export {
  getRevenueData, getSLADonut, getFinancialSummary, computeDue, formatDue, STEP_WEEKS,
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
  Av, Sb, Pb, ST, SLABadge, S, gBar
};
