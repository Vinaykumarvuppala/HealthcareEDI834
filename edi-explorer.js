"use strict";
(function(){
const $=x=>document.getElementById(x);
const SAMPLE=["ISA*00*          *00*          *ZZ*SYNTHETICSENDER *ZZ*SYNTHETICRECV   *261023*1200*^*00501*000000001*0*T*:","GS*BE*SYNTHETICSENDER*SYNTHETICRECV*20261023*1200*1*X*005010X220A1","ST*834*0001*005010X220A1","BGN*00*DEMO1001*20261023*1200","INS*Y*18*021*20*A***FT","REF*0F*SUB-DEMO-001","NM1*IL*1*EXAMPLE*SAM****34*DEMO001","DTP*303*D8*20261101","HD*021**HLT*PPO-DEMO*EMP","DTP*348*D8*20261101","INS*N*19*021*20*A***FT","REF*0F*DEP-DEMO-002","NM1*IL*1*EXAMPLE*JAMIE****34*DEMO002","HD*021**HLT*PPO-DEMO*FAM","DTP*348*D8*20261101","SE*14*0001","GE*1*1","IEA*1*000000001"].join("~")+"~";
const labels={ISA:"Interchange control header",IEA:"Interchange control trailer",GS:"Functional group header",GE:"Functional group trailer",ST:"Transaction set header",SE:"Transaction set trailer",BGN:"Beginning segment",INS:"Member enrollment detail",NM1:"Name identification",REF:"Reference identification",HD:"Health coverage",DTP:"Date or time period",N3:"Address",N4:"City/state/ZIP",DMG:"Member demographics",PER:"Administrative contact",LS:"Loop start",LE:"Loop end"};
function parse(text){
const clean=text.trim();if(!clean)throw Error("Enter or load synthetic EDI first.");
let element="*",segment="~";
if(clean.startsWith("ISA")) {
  element=clean[3]||"*";
  // Fixed-position ISA detection is reliable only for correctly padded ISA headers.
  // Prefer an explicit tilde if present: educational test files often have short ISA fields.
  if(clean.includes("~")) segment="~";
  else if(clean.length>=106) segment=clean[105];
}
const parts=clean.split(segment).map(s=>s.trim()).filter(Boolean),rows=parts.map((s,i)=>({num:i+1,parts:s.split(element),raw:s}));
let members=[],current=null,issues=[];
for(const r of rows){const p=r.parts,tag=p[0];
if(tag==="INS"){current={subscriber:p[1]==="Y",relation:p[2]||"?",name:"(missing NM1)",id:"",coverages:[],dates:[]};members.push(current);}
if(tag==="NM1"&&current&&p[1]==="IL")current.name=[p[4],p[3]].filter(Boolean).join(" ")||"(missing name)";
if(tag==="REF"&&current&&p[1]==="0F")current.id=p[2]||"";
if(tag==="HD"&&current)current.coverages.push({action:p[1]||"",type:p[3]||"",plan:p[4]||"",tier:p[5]||""});
if(tag==="DTP"&&current)current.dates.push({qualifier:p[1],format:p[2],date:p[3]});}
for(const required of ["ISA","GS","ST","BGN","SE","GE","IEA"])if(!rows.some(r=>r.parts[0]===required))issues.push("Missing "+required+" segment.");
const st=rows.findIndex(r=>r.parts[0]==="ST"),se=rows.findIndex(r=>r.parts[0]==="SE");
if(st>=0&&se>=st){const actual=se-st+1,declared=Number(rows[se].parts[1]);if(actual!==declared)issues.push("SE01 transaction segment count is "+declared+" but actual ST-through-SE count is "+actual+".");
if(rows[st].parts[2]!==rows[se].parts[2])issues.push("ST02 and SE02 control numbers do not match.");}
if(members.length===0)issues.push("No INS member-detail segments found.");
members.forEach((m,i)=>{if(m.name==="(missing NM1)")issues.push("Member "+(i+1)+" is missing an NM1*IL name.");if(!m.coverages.length)issues.push("Member "+(i+1)+" has no HD coverage segment (may be intentional for some transaction types).");});
if(!issues.length)issues.push("Basic structure checks passed. Payer-level and implementation-guide compliance have not been checked.");
return {rows,members,issues};}
function td(row,value){const cell=document.createElement(row);cell.textContent=value;return cell;}
function table(headers,records){const t=document.createElement("table"),head=document.createElement("tr");headers.forEach(x=>head.appendChild(td("th",x)));t.appendChild(head);records.forEach(rec=>{const row=document.createElement("tr");rec.forEach(x=>row.appendChild(td("td",String(x??""))));t.appendChild(row);});return t;}
function render(){
try{const out=parse($("raw").value);
$("status").textContent="Parsed "+out.rows.length+" segments and "+out.members.length+" member records.";
$("metrics").textContent=out.members.filter(x=>x.subscriber).length+" subscriber(s), "+out.members.filter(x=>!x.subscriber).length+" dependent(s).";
$("issues").replaceChildren(...out.issues.map(x=>{const d=document.createElement("div");d.className="issue";d.textContent=x;return d;}));
$("members").replaceChildren(table(["Role","Member name","Reference ID","Coverage / effective date"],out.members.map(m=>[m.subscriber?"Subscriber":"Dependent",m.name,m.id,m.coverages.map(c=>[c.type,c.plan,c.tier].filter(Boolean).join(" / ")).join("; ")+" | "+m.dates.map(d=>d.qualifier+":"+d.date).join("; ")])));
$("segments").replaceChildren(table(["#","Segment","Meaning","Data"],out.rows.map(r=>[r.num,r.parts[0],labels[r.parts[0]]||"Other / companion-guide specific",r.raw])));
}catch(e){$("status").textContent=e.message;$("issues").replaceChildren();$("members").replaceChildren();$("segments").replaceChildren();$("metrics").textContent="";}}
$("sample").addEventListener("click",()=>{$("raw").value=SAMPLE;render();});
$("parse").addEventListener("click",render);
$("clear").addEventListener("click",()=>{$("raw").value="";render();});
$("ediFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024){$("status").textContent="Please use a synthetic file smaller than 2 MB.";return;}$("raw").value=await file.text();render();});
$("raw").value=SAMPLE;render();
})();