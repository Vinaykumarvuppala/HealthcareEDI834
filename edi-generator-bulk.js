"use strict";
(function(){
const get=id=>document.getElementById(id);
let generated="";
const safe=(v,max)=>String(v||"").trim().slice(0,max).replace(/[^A-Za-z0-9 ._-]/g,"").trim();
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v+"T00:00:00Z")))throw Error("Enter a valid effective date.");return v.replace(/-/g,"");};
function count(id,max){const n=Number(get(id).value);if(!Number.isInteger(n)||n<0||n>max)throw Error("Invalid count for "+id+".");return n;}
function generate(){
try{
const mode=get("memberModel").value,program=get("program").value,scenario=get("scenario").value,state=get("medicaidState").value;
const subscribers=count("subscriberCount",100),deps=count("dependentsCount",10);
if(subscribers<1)throw Error("At least one subscriber is required.");
if(mode==="indiana"&&state!=="IN")throw Error("Indiana subscriber-only model is only for Indiana. Choose Generic X12 training for this state.");
if(mode==="indiana"&&deps>0)throw Error("Indiana IHCP MCE format represents each individual as a subscriber. Set dependents to 0, or select Generic X12 training.");
const total=subscribers*(1+deps);if(total>300)throw Error("Maximum 300 total members per example.");
if(scenario==="025"&&program!=="HIP"&&mode==="indiana")throw Error("The Indiana training reinstatement scenario is limited to HIP.");
const prefix=safe(get("syntheticId").value,18),name=safe(get("syntheticName").value,30),plan=safe(get("planCode").value,24),when=date(get("effectiveDate").value),coverage=get("product").value;
if(!prefix||!name||!plan||!/^(TEST|DEMO|SAMPLE)/i.test(prefix))throw Error("Enter a fictional ID prefix starting TEST, DEMO or SAMPLE, a name and a plan.");
const stamp=when,segments=[
"ISA*00*          *00*          *ZZ*DEMOIHCP        *ZZ*DEMOMCO         *261023*1200*^*00501*000000001*0*T*:",
"GS*BE*DEMOIHCP*DEMOMCO*"+stamp+"*1200*1*X*005010X220A1",
"ST*834*0001*005010X220A1",
"BGN*00*DEMO"+stamp+"*"+stamp+"*1200",
"N1*P5*INDIANA TRAINING SENDER*FI*000000000",
"N1*IN*FICTIONAL RECEIVER*FI*000000001"
];
const type=scenario==="024"?"349":"348";
for(let s=1;s<=subscribers;s++){
for(let d=0;d<=(mode==="generic"?deps:0);d++){
const subscriber=d===0;
const id=(prefix+"-S"+String(s).padStart(3,"0")+(subscriber?"":"-D"+String(d).padStart(2,"0")));
const memberName=(name.replace(/\s+/g,"_")+"_"+s+"_"+d).toUpperCase();
segments.push("INS*"+(subscriber?"Y":"N")+"*"+(subscriber?"18":"19")+"*"+scenario+"*"+(scenario==="024"?"59":"20")+"*A***FT");
segments.push("REF*0F*"+id);
segments.push("NM1*IL*1*EXAMPLE*"+memberName+"****34*"+id);
if(!subscriber)segments.push("REF*1L*"+prefix+"-S"+String(s).padStart(3,"0"));
segments.push("HD*"+scenario+"**"+coverage+"*"+plan);
segments.push("DTP*"+type+"*D8*"+when);
}}
const transactionCount=segments.length-2+1;
segments.push("SE*"+transactionCount+"*0001","GE*1*1","IEA*1*000000001");
generated=segments.join("~")+"~";get("raw").value=generated;get("parse").click();
get("generatorNotice").textContent="State "+state+": generated "+total+" synthetic members ("+subscribers+" subscribers, "+(total-subscribers)+" dependents). "+(mode==="indiana"?"Indiana MCE training model.":"Generic subscriber/dependent training model.")+" Not a certified submission file.";
}catch(e){get("generatorNotice").textContent=e.message;}
}
function sync(){const indiana=get("memberModel").value==="indiana";get("dependentsCount").disabled=indiana;if(indiana)get("dependentsCount").value="0";}
get("memberModel").addEventListener("change",sync);
get("generate").addEventListener("click",generate);
get("download").addEventListener("click",()=>{if(!generated){get("generatorNotice").textContent="Generate an example first.";return;}const url=URL.createObjectURL(new Blob([generated],{type:"text/plain"})),a=document.createElement("a");a.href=url;a.download="synthetic-834-"+get("medicaidState").value.toLowerCase()+"-"+get("program").value.toLowerCase().replace(/[^a-z0-9]/g,"-")+".edi";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
sync();
})();