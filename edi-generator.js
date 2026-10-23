"use strict";
(function(){
const get=id=>document.getElementById(id);
let generated="";
const safe=(value,max)=>String(value||"").trim().slice(0,max).replace(/[^A-Za-z0-9 ._-]/g,"").trim();
const date=(value)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Enter a valid date.");return value.replace(/-/g,"");};
function generate(){
try{
const program=get("program").value,scenario=get("scenario").value,member=safe(get("syntheticId").value,30),name=safe(get("syntheticName").value,60),plan=safe(get("planCode").value,30),when=date(get("effectiveDate").value);
if(!member||!name||!plan)throw Error("Complete fictional member ID, name and plan.");
if(!/^(TEST|DEMO|SAMPLE)/i.test(member))throw Error("Use a synthetic member ID starting with TEST, DEMO, or SAMPLE.");
if(scenario==="025"&&program!=="HIP")throw Error("This example supports reinstatement INS03=025 only for HIP. Refer to the guide for other programs.");
const [first,...rest]=name.split(/\s+/),last=rest.join(" ")||"Example";
const termination=scenario==="024";
const segments=[
"ISA*00*          *00*          *ZZ*DEMOIHCP        *ZZ*DEMOMCO         *261023*1200*^*00501*000000001*0*T*:",
"GS*BE*DEMOIHCP*DEMOMCO*20261023*1200*1*X*005010X220A1",
"ST*834*0001*005010X220A1",
"BGN*00*DEMO"+when+"*20261023*1200",
"N1*P5*Indiana Health Coverage Program*FI*IHCP",
"N1*IN*DEMO MANAGED CARE PLAN*FI*000000000",
"INS*Y*18*"+scenario+"*"+(termination?"59":"20")+"*A***FT",
"REF*0F*"+member,
"NM1*IL*1*"+last.toUpperCase()+"*"+first.toUpperCase()+"****34*"+member,
"HD*"+scenario+"**HLT*"+plan,
"DTP*"+(termination?"349":"348")+"*D8*"+when
];
segments.push("SE*"+(segments.length-2+1)+"*0001","GE*1*1","IEA*1*000000001");
// Number of transaction-set segments runs inclusively from ST to SE.
const seIndex=segments.findIndex(x=>x.startsWith("SE*"));
segments[seIndex]="SE*"+(seIndex-2+1)+"*0001";
generated=segments.join("~")+"~";
get("raw").value=generated;
get("parse").click();
get("generatorNotice").textContent="Generated synthetic "+program+" "+scenario+" demonstration. Reviewed in the explorer above. Not a production-certified IHCP transaction.";
}catch(e){get("generatorNotice").textContent=e.message;}
}
function download(){
if(!generated){get("generatorNotice").textContent="Generate a synthetic 834 first.";return;}
const blob=new Blob([generated],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="indiana-medicaid-834-synthetic-demo.edi";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
get("generate").addEventListener("click",generate);
get("download").addEventListener("click",download);
get("program").addEventListener("change",()=>{if(get("scenario").value==="025"&&get("program").value!=="HIP")get("scenario").value="021";});
})();