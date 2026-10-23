"use strict";
(function(){
const $=id=>document.getElementById(id);let latest=null;
function parse(text){
 const input=text.trim();if(!input)throw Error("Both inputs need EDI content.");
 const e=input.startsWith("ISA")?input[3]:"*";
 const seg=input.includes("~")?"~":(input.startsWith("ISA")&&input.length>=106?input[105]:"~");
 const rows=input.split(seg).map(x=>x.trim()).filter(Boolean).map(x=>x.split(e));
 const members=new Map(),duplicates=[];let current=null;
 for(const p of rows){
  const type=p[0];
  if(type==="INS"){current={key:null,relationship:p[2]||"",indicator:p[1]||"",maintenance:p[3]||"",reason:p[4]||"",name:"",coverage:[],dates:[],refs:[]};continue;}
  if(!current)continue;
  if(type==="REF"){current.refs.push({qualifier:p[1]||"",value:p[2]||""});if(p[1]==="0F"&&p[2]){current.key=p[2];if(members.has(current.key))duplicates.push(current.key);members.set(current.key,current);}}
  if(type==="NM1"&&p[1]==="IL")current.name=[p[3],p[4]].filter(Boolean).join(", ");
  if(type==="HD")current.coverage.push({action:p[1]||"",type:p[3]||"",plan:p[4]||"",tier:p[5]||"",dates:[]});
  if(type==="DTP"){const d={qualifier:p[1]||"",format:p[2]||"",value:p[3]||""};current.dates.push(d);if(current.coverage.length&&["348","349"].includes(d.qualifier))current.coverage[current.coverage.length-1].dates.push(d);}
 }
 if(!rows.some(p=>p[0]==="ST")||!rows.some(p=>p[0]==="SE"))throw Error("Missing ST or SE transaction segment.");
 if(duplicates.length)throw Error("Duplicate member REF*0F IDs: "+duplicates.slice(0,5).join(", ")+". Cannot reliably compare.");
 if(!members.size)throw Error("No member REF*0F identifiers detected.");
 return members;
}
const normal=m=>JSON.stringify({indicator:m.indicator,relationship:m.relationship,maintenance:m.maintenance,reason:m.reason,name:m.name,coverage:m.coverage,dates:m.dates,refs:m.refs.filter(x=>x.qualifier!=="0F")});
const summary=m=>m.coverage.map(x=>[x.type,x.plan,x.tier,x.dates.map(d=>d.qualifier+":"+d.value).join("|")].join("/")).join("; ")||"(no HD)";
function compare(){
 try{
 const before=parse($("compareBeforeText").value),after=parse($("compareAfterText").value),diffs=[];
 for(const [id,b]of before){const a=after.get(id);if(!a){diffs.push({id,kind:"Absent from after file",before:summary(b),after:"",detail:"Not necessarily terminated: confirm full snapshot vs delta feed"});continue;}
 if(normal(a)!==normal(b)){
 const changed=[];for(const field of ["indicator","relationship","maintenance","reason","name"]){if(a[field]!==b[field])changed.push(field);}
 if(JSON.stringify(a.coverage)!==JSON.stringify(b.coverage))changed.push("coverage/plan/dates");
 if(JSON.stringify(a.dates)!==JSON.stringify(b.dates)&&!changed.includes("coverage/plan/dates"))changed.push("dates");
 if(JSON.stringify(a.refs)!==JSON.stringify(b.refs))changed.push("references");
 diffs.push({id,kind:"Changed",before:summary(b),after:summary(a),detail:changed.join(", ")||"Other details changed"});
 }}
 for(const [id,a]of after)if(!before.has(id))diffs.push({id,kind:"New in after file",before:"",after:summary(a),detail:"New file occurrence; validate eligibility before assuming addition"});
 latest=diffs;
 const table=document.createElement("table"),head=document.createElement("tr");["Member ID","Finding","Before coverage","After coverage","Details"].forEach(s=>{const th=document.createElement("th");th.textContent=s;head.appendChild(th);});table.appendChild(head);
 for(const d of diffs){const tr=document.createElement("tr");[d.id,d.kind,d.before,d.after,d.detail].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});table.appendChild(tr);}
 $("compareResults").replaceChildren(diffs.length?table:document.createTextNode("No member-level changes detected."));
 $("compareStatus").textContent="Before: "+before.size+" members. After: "+after.size+" members. Differences: "+diffs.length+".";
 }catch(error){latest=null;$("compareResults").replaceChildren();$("compareStatus").textContent=error.message;}
}
function example(){
 function file(plan,extra){const s=["ISA*00*          *00*          *ZZ*DEMOA           *ZZ*DEMOB           *261023*1200*^*00501*000000001*0*T*:","GS*BE*DEMOA*DEMOB*20261023*1200*1*X*005010X220A1","ST*834*0001*005010X220A1","BGN*00*DEMO*20261023*1200","INS*Y*18*021*20*A***FT","REF*0F*TEST001","NM1*IL*1*EXAMPLE*JAMIE****34*TEST001","HD*021**HLT*"+plan,"DTP*348*D8*20261101"];if(extra)s.push("INS*Y*18*021*20*A***FT","REF*0F*TEST002","NM1*IL*1*EXAMPLE*ALEX****34*TEST002","HD*021**HLT*DEMO-PLAN","DTP*348*D8*20261101");s.push("SE*"+(s.length-2+1)+"*0001","GE*1*1","IEA*1*000000001");return s.join("~")+"~";}
 $("compareBeforeText").value=file("PLAN-A",false);$("compareAfterText").value=file("PLAN-B",true);compare();
}
function csv(s){return '"'+String(s).replace(/"/g,'""')+'"';}
$("compareRun").addEventListener("click",compare);$("compareExample").addEventListener("click",example);
$("compareExport").addEventListener("click",()=>{if(!latest){$("compareStatus").textContent="Run comparison first.";return;}const text=[["member_id","finding","before_coverage","after_coverage","details"],...latest.map(d=>[d.id,d.kind,d.before,d.after,d.detail])].map(r=>r.map(csv).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([text],{type:"text/csv"})),a=document.createElement("a");a.href=url;a.download="edi834-differences.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
for(const side of ["Before","After"])$( "compare"+side).addEventListener("change",async ev=>{const file=ev.target.files[0];if(!file)return;if(file.size>2*1024*1024){$("compareStatus").textContent="Each file must be 2 MB or smaller.";return;}$("compare"+side+"Text").value=await file.text();latest=null;});
})();