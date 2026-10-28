"use strict";
(function(){
const $=id=>document.getElementById(id);let evidence=null;
const demoEvents=[
{id:"EV1",date:"2026-11-01",type:"ADD",member:"TEST0042",plan:"MCO-A",source:"state-834-batch-001",segment:"INS/HD/DTP",effective:"2026-11-01"},
{id:"EV2",date:"2026-12-01",type:"TRANSFER",member:"TEST0042",from:"MCO-A",plan:"MCO-B",source:"state-834-batch-002",segment:"HD/DTP",effective:"2026-12-01"},
{id:"EV3",date:"2026-12-05",type:"CORRECT_END",member:"TEST0042",plan:"MCO-A",end:"2026-11-29",source:"retro-update-003",segment:"DTP*349"}
];
const observed=[{member:"TEST0042",plan:"MCO-A",start:"2026-11-01",end:"2026-11-30"},{member:"TEST0042",plan:"MCO-B",start:"2026-12-01",end:null}];
const date=s=>{if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+"T00:00:00Z").toISOString().slice(0,10)!==s)throw Error("Invalid ISO date: "+s);return s;};
const before=s=>new Date(Date.parse(date(s)+"T00:00:00Z")-86400000).toISOString().slice(0,10);
function build(events,actual){
if(!Array.isArray(events)||!Array.isArray(actual)||events.length>200||actual.length>200)throw Error("Provide arrays with at most 200 entries.");
const periods=[],log=[],ids=new Set();
for(const ev of events){
if(!ev||!ev.id||ids.has(ev.id))throw Error("Event IDs must be unique.");ids.add(ev.id);
date(ev.date);if(ev.effective)date(ev.effective);if(ev.end)date(ev.end);
const target=periods.findLast(p=>p.member===ev.member&&p.plan===(ev.from||ev.plan));
if(ev.type==="ADD"){if(!ev.member||!ev.plan||!ev.effective)throw Error("ADD requires member, plan and effective.");periods.push({member:ev.member,plan:ev.plan,start:ev.effective,end:null,events:[ev.id]});}
else if(ev.type==="TRANSFER"){if(!target||!ev.plan||!ev.effective)throw Error("TRANSFER requires prior coverage and new plan.");target.end=before(ev.effective);target.events.push(ev.id);periods.push({member:ev.member,plan:ev.plan,start:ev.effective,end:null,events:[ev.id]});}
else if(ev.type==="TERMINATE"||ev.type==="CORRECT_END"){if(!target||!ev.end)throw Error(ev.type+" requires a matching coverage and end date.");target.end=ev.end;target.events.push(ev.id);}
else throw Error("Unsupported event type "+ev.type);
log.push({id:ev.id,source:ev.source||"unknown",segment:ev.segment||"not supplied",type:ev.type});
}
for(const p of periods)if(p.end&&p.end<p.start)throw Error("Coverage ends before starting for "+p.plan);
const actualMap=new Map();for(const a of actual){const k=a.member+"|"+a.plan+"|"+a.start;if(actualMap.has(k))throw Error("Duplicate observed key "+k);actualMap.set(k,a);}
const findings=[];
for(const p of periods){const key=p.member+"|"+p.plan+"|"+p.start,a=actualMap.get(key);if(!a){findings.push({member:p.member,plan:p.plan,kind:"MISSING_COVERAGE",expected:p,observed:null,evidence:p.events});continue;}if((a.end||null)!==(p.end||null))findings.push({member:p.member,plan:p.plan,kind:"END_DATE_MISMATCH",expected:p.end,observed:a.end||null,evidence:p.events});actualMap.delete(key);}
for(const a of actualMap.values())findings.push({member:a.member,plan:a.plan,kind:"UNEXPECTED_COVERAGE",expected:null,observed:a,evidence:[]});
return {periods,findings,events:log,summary:{expected:periods.length,observed:actual.length,discrepancies:findings.length},assumption:"Training-only effective-date semantics. Confirm payer-specific rules."};
}
function displayTable(id,headers,rows){const table=document.createElement("table"),th=document.createElement("tr");for(const name of headers){const c=document.createElement("th");c.textContent=name;th.appendChild(c);}table.appendChild(th);for(const row of rows){const tr=document.createElement("tr");for(const x of row){const td=document.createElement("td");td.textContent=String(x??"");tr.appendChild(td);}table.appendChild(tr);}$(id).replaceChildren(table);}
$("truthExample").addEventListener("click",()=>{$("truthEvents").value=JSON.stringify(demoEvents,null,2);$("truthActual").value=JSON.stringify(observed,null,2);$("truthRun").click();});
$("truthRun").addEventListener("click",()=>{try{evidence=build(JSON.parse($("truthEvents").value),JSON.parse($("truthActual").value));displayTable("truthTimeline",["Member","Plan","Effective","End","Source event IDs"],evidence.periods.map(p=>[p.member,p.plan,p.start,p.end||"Open",p.events.join(", ")]));displayTable("truthFindings",["Member","Plan","Discrepancy","Expected","Observed","Evidence IDs"],evidence.findings.map(x=>[x.member,x.plan,x.kind,JSON.stringify(x.expected),JSON.stringify(x.observed),x.evidence.join(", ")]));$("truthStatus").textContent="Investigated "+evidence.periods.length+" expected coverage periods; "+evidence.findings.length+" discrepancy(s).";}catch(err){evidence=null;$("truthStatus").textContent=err.message;$("truthTimeline").replaceChildren();$("truthFindings").replaceChildren();}});
$("truthExport").addEventListener("click",()=>{if(!evidence){$("truthStatus").textContent="Run an investigation first.";return;}const url=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="synthetic-enrollment-investigation.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();