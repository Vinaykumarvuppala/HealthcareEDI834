"use strict";
(function(){
const $=id=>document.getElementById(id);let results=null;
function csvRows(raw){let rows=[],row=[],cell="",quoted=false;for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===","&&!quoted){row.push(cell);cell="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&raw[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}else cell+=c;}if(quoted)throw Error("CSV has an unclosed quoted field.");row.push(cell);if(row.some(x=>x!==""))rows.push(row);return rows;}
function formatDate(raw){const s=String(raw||"").trim();if(/^\d{8}$/.test(s))return s;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.replace(/-/g,"");return s;}
function expected(raw){
const text=raw.trim();if(!text)throw Error("Load synthetic EDI into Input enrollment transaction first.");
const el=text.startsWith("ISA")?text[3]:"*",term=text.includes("~")?"~":"\n";
const seg=text.split(term).map(x=>x.trim().split(el)).filter(x=>x[0]),members=new Map();let current=null,coverage=null;
for(const p of seg){switch(p[0]){
case "INS":current={id:"",plan:"",date:"",status:p[3]||""};coverage=null;break;
case "REF":if(current&&p[1]==="0F"){current.id=p[2]||"";if(!current.id)throw Error("Missing member ID in REF*0F.");if(members.has(current.id))throw Error("Duplicate EDI member ID "+current.id);members.set(current.id,current);}break;
case "HD":if(current){current.plan=p[4]||"";coverage=current;}break;
case "DTP":if(current&&coverage&&p[1]==="348")current.date=formatDate(p[3]);break;
}}
if(!members.size)throw Error("No EDI members with REF*0F found.");return members;
}
function escape(v){return '"'+String(v??"").replace(/"/g,'""')+'"';}
function render(){
try{
const expectedRows=expected($("raw").value),csv=csvRows($("reconCsvText").value),header=(csv.shift()||[]).map(x=>x.trim().toLowerCase());
const keys=[$("reconId").value,$("reconPlan").value,$("reconDate").value].map(x=>header.indexOf(x.trim().toLowerCase()));if(keys.some(x=>x<0))throw Error("One or more mapped column names are missing in the CSV header.");
const actual=new Map();for(const r of csv){const id=(r[keys[0]]||"").trim();if(!id)continue;if(actual.has(id))throw Error("Duplicate actual CSV member ID "+id);actual.set(id,{plan:(r[keys[1]]||"").trim(),date:formatDate(r[keys[2]])});}
const out=[];
for(const [id,e] of expectedRows){const a=actual.get(id);let finding="PASS",detail="Plan and coverage effective date match";
if(!a){finding="FAIL";detail="Missing actual member";}else if(!e.plan||!e.date){finding="REVIEW";detail="EDI expected plan or DTP*348 date missing";}else{const failed=[];if(e.plan!==a.plan)failed.push("plan mismatch");if(e.date!==a.date)failed.push("effective-date mismatch");if(failed.length){finding="FAIL";detail=failed.join("; ");}}
out.push({id,expectedPlan:e.plan,actualPlan:a?.plan||"",expectedDate:e.date,actualDate:a?.date||"",finding,detail});}
for(const [id,a]of actual)if(!expectedRows.has(id))out.push({id,expectedPlan:"",actualPlan:a.plan,expectedDate:"",actualDate:a.date,finding:"REVIEW",detail:"Actual-only record; may be valid for incremental feed"});
results=out;const table=document.createElement("table"),tr=document.createElement("tr");["Member ID","Expected plan","Actual plan","Expected start","Actual start","Result","Explanation"].forEach(x=>{let c=document.createElement("th");c.textContent=x;tr.appendChild(c);});table.appendChild(tr);
for(const row of out){const t=document.createElement("tr");for(const x of [row.id,row.expectedPlan,row.actualPlan,row.expectedDate,row.actualDate,row.finding,row.detail]){const c=document.createElement("td");c.textContent=x;t.appendChild(c);}table.appendChild(t);}
$("reconResults").replaceChildren(table);const count=k=>out.filter(x=>x.finding===k).length;$("reconStatus").textContent="Members reviewed: "+out.length+" | PASS "+count("PASS")+" | FAIL "+count("FAIL")+" | REVIEW "+count("REVIEW")+".";
}catch(e){results=null;$("reconResults").replaceChildren();$("reconStatus").textContent=e.message;}}
$("reconRun").addEventListener("click",render);
$("reconExample").addEventListener("click",()=>{$("raw").value=["ST*834*0001","INS*Y*18*021*20*A***FT","REF*0F*TEST001","NM1*IL*1*EXAMPLE*SAM","HD*021**HLT*PLAN-A","DTP*348*D8*20261101","INS*Y*18*021*20*A***FT","REF*0F*TEST002","NM1*IL*1*EXAMPLE*JAMIE","HD*021**HLT*PLAN-B","DTP*348*D8*20261101","SE*12*0001"].join("~")+"~";$("reconCsvText").value="member_id,plan,effective_date\nTEST001,PLAN-A,2026-11-01\nTEST002,PLAN-C,2026-11-01\n";$("parse").click();render();});
$("reconCsv").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024){$("reconStatus").textContent="Maximum synthetic CSV size is 2MB.";return;}$("reconCsvText").value=await file.text();results=null;});
$("reconExport").addEventListener("click",()=>{if(!results){$("reconStatus").textContent="Run reconciliation before exporting.";return;}const rows=[["member_id","expected_plan","actual_plan","expected_date","actual_date","result","explanation"],...results.map(r=>[r.id,r.expectedPlan,r.actualPlan,r.expectedDate,r.actualDate,r.finding,r.detail])];const csv=rows.map(row=>row.map(escape).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),a=document.createElement("a");a.href=url;a.download="enrollment-reconciliation-evidence.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();