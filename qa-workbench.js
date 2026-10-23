"use strict";
(function(){
 const el=id=>document.getElementById(id);
 let last=null;
 function num(id,min,max){const n=Number(el(id).value);if(!Number.isInteger(n)||n<min||n>max)throw Error("Invalid "+id+" (expected "+min+"–"+max+").");return n;}
 function safe(x){return String(x).trim().replace(/[^A-Za-z0-9_-]/g,"").slice(0,28);}
 function rng(seed){let state=seed>>>0;return ()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};}
 function download(text,name,type){if(!last){el("qaStatus").textContent="Build a QA batch first.";return;}const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function csv(rows){return rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(",")).join("\r\n")+"\r\n";}
 function build(){
 try{
 const n=num("qaCount",1,500),bad=num("qaBad",0,n),seed=num("qaSeed",1,2147483647);
 const program=el("qaProgram").value,plan=safe(el("qaPlan").value),date=el("qaEffective").value.replace(/-/g,"");
 if(!plan||!/^20\d{6}$/.test(date))throw Error("Enter a fictional plan and valid effective date in the 2000s.");
 const mix=el("qaMix").value,neg=el("qaNegative").value,random=rng(seed);
 // Deterministic uniformly spaced negative records. No real identities.
 const badSet=new Set();for(let i=0;i<bad;i++)badSet.add(Math.floor((i+.5)*n/bad));
 const segments=[
 "ISA*00*          *00*          *ZZ*TRAININGSENDER *ZZ*TRAININGRECV   *261023*1200*^*00501*000000001*0*T*:",
 "GS*BE*TRAININGSENDER*TRAININGRECV*"+date+"*1200*1*X*005010X220A1",
 "ST*834*0001*005010X220A1","BGN*00*QATEST"+seed+"*"+date+"*1200",
 "N1*P5*INDIANA TRAINING SENDER*FI*000000000","N1*IN*FICTIONAL RECEIVER*FI*000000001"
 ];
 const manifest=[["test_id","synthetic_member_id","program","plan","scenario","negative_type","expected_qa_outcome","expected_finding"]];
 const checklist=[["test_id","step","expected_result"]];
 const actions=["021","001","024"];
 for(let i=0;i<n;i++){
 const action=mix==="mixed"?actions[Math.floor(random()*actions.length)]:(mix==="add"?"021":mix==="change"?"001":"024");
 const isBad=badSet.has(i),type=isBad?(neg==="mixed"?["missing-nm1","missing-hd","missing-dtp"][i%3]:neg):"none";
 const id="TEST"+String(seed).slice(-4)+String(i+1).padStart(5,"0"),testId="QA-"+String(i+1).padStart(4,"0");
 segments.push("INS*Y*18*"+action+"*"+(action==="024"?"59":"20")+"*A***FT","REF*0F*"+id);
 if(type!=="missing-nm1")segments.push("NM1*IL*1*EXAMPLE*MEMBER"+(i+1)+"****34*"+id);
 if(type!=="missing-hd")segments.push("HD*"+action+"**HLT*"+plan);
 if(type!=="missing-dtp")segments.push("DTP*"+(action==="024"?"349":"348")+"*D8*"+date);
 const finding=type==="missing-nm1"?"Missing NM1*IL":type==="missing-hd"?"Missing HD":"Missing coverage DTP";
 manifest.push([testId,id,program,plan,action,type,isBad?"FAIL":"PASS",isBad?finding:"Basic member structure present"]);
 checklist.push([testId,"Parse member "+id+" and inspect INS/REF/NM1/HD/DTP",isBad?"Flag deliberately missing "+finding:"Member loops structurally present; validate business rules separately"]);
 }
 const seCount=segments.length-2+1;segments.push("SE*"+seCount+"*0001","GE*1*1","IEA*1*000000001");
 last={edi:segments.join("~")+"~",manifest:csv(manifest),checklist:csv(checklist),n,bad,seed};
 el("raw").value=last.edi;el("parse").click();
 el("qaStatus").textContent="Generated "+n+" synthetic Indiana "+program+" records with "+bad+" intentional negative test cases. Seed "+seed+".";
 el("qaSummary").textContent="Expected: "+(n-bad)+" positive member cases and "+bad+" negative cases. Transaction ST–SE count: "+seCount+".";
 }catch(e){el("qaStatus").textContent=e.message;}
 }
 el("qaGenerate").addEventListener("click",build);
 el("qaEdiDownload").addEventListener("click",()=>last&&download(last.edi,"qa-enrollment-"+last.seed+".edi","text/plain"));
 el("qaCsvDownload").addEventListener("click",()=>last&&download(last.manifest,"qa-expected-results-"+last.seed+".csv","text/csv"));
 el("qaChecklistDownload").addEventListener("click",()=>last&&download(last.checklist,"qa-checklist-"+last.seed+".csv","text/csv"));
})();