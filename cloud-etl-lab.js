"use strict";
(function(){
 const $=id=>document.getElementById(id);
 const workflows={
 aws:[
 ["Amazon S3","Receive ZIP in raw/state=IN/batch=DEMO001.zip; checksum and object metadata recorded."],
 ["AWS Step Functions","Start workflow with S3 bucket/key reference, correlation ID and retry policy."],
 ["AWS Lambda","Inspect ZIP safely and extract accepted .edi/.txt entries to staging S3 objects."],
 ["AWS Glue","Parse X12 member and coverage loops, map to payer-neutral model, validate structural fields."],
 ["S3 curated + quarantine","Write normalized JSON/Parquet and audit summary; quarantine invalid content."],
 ["Operational review","Report counts, error codes, batch status, file lineage and next action."]
 ],
 azure:[
 ["Azure Data Lake Storage Gen2","Receive ZIP in a protected raw landing container; track metadata."],
 ["Azure Data Factory","Start pipeline with batch correlation ID and governed triggers."],
 ["ADF Copy / decompression","Decompress eligible archives into staging; use suitable compute for unusual/large archives."],
 ["Data transformation","Apply reusable X12 parsing code and normalize members and coverage."],
 ["ADLS curated + quarantine","Store structured output and exceptions with partitioned batch metadata."],
 ["Operational review","Review pipeline run, activity output, validation metrics and investigation notes."]
 ]
 };
 let index=-1, batch=null;

let investigation=null;
function analyzeBatch(){
 const b=currentBatch(),parts=b.text.split("~").map(s=>s.trim()).filter(Boolean).map(s=>s.split("*"));
 const members=[];let m=null,cover=null;
 for(const p of parts){
 if(p[0]==="INS"){m={id:"",action:p[3]||"",name:"",coverages:[]};members.push(m);cover=null;}
 else if(m&&p[0]==="REF"&&p[1]==="0F")m.id=p[2]||"";
 else if(m&&p[0]==="NM1"&&p[1]==="IL")m.name=[p[4],p[3]].filter(Boolean).join(" ");
 else if(m&&p[0]==="HD"){cover={product:p[3]||"",plan:p[4]||"",effective:""};m.coverages.push(cover);}
 else if(cover&&p[0]==="DTP"&&p[1]==="348")cover.effective=p[3]||"";
 }
 const errors=[];members.forEach((v,i)=>{if(!v.id)errors.push("Member "+(i+1)+" missing REF*0F");if(!v.coverages.length)errors.push("Member "+(i+1)+" missing HD");});
 const scenario=$("cloudScenario").value;const failed=scenario!=="success";
 const step=scenario==="badzip"?"Extraction":scenario==="duplicate"?"Intake duplicate check":scenario==="invalid"?"EDI validation":"";
 const events=[
 {stage:"Landing",status:"PASS",detail:b.segments+" EDI segments received (browser-local, synthetic)"},
 {stage:"Archive extraction",status:scenario==="badzip"?"FAIL":"PASS",detail:scenario==="badzip"?"Injected malformed archive; extraction must stop":"EDI text staged for transformation"},
 {stage:"Duplicate detection",status:scenario==="duplicate"?"FAIL":"PASS",detail:scenario==="duplicate"?"Injected duplicate batch key; block repeated processing":"Check batch ID/hash before processing"},
 {stage:"X12 structural screening",status:scenario==="invalid"||errors.length?"FAIL":"PASS",detail:scenario==="invalid"?"Injected invalid segment/required field error":errors.length?errors.join("; "):"Selected member loops found"},
 {stage:"Normalize members",status:failed||errors.length?"SKIPPED":"PASS",detail:failed?"Stopped after injected failure":members.length+" member objects normalized"},
 {stage:"Curated output",status:failed||errors.length?"SKIPPED":"PASS",detail:failed?"Not published":"JSON preview produced locally; production Parquet is not written"}
 ];
 const firstFail=events.findIndex(e=>e.status==="FAIL");
 if(firstFail>=0){for(let i=firstFail+1;i<events.length;i++)events[i].status="SKIPPED";}
 return {batch:b,members,events,errors,failed,step};
}
function showEvidence(report){
 const grid=$("cloudEvidence");grid.replaceChildren();
 function pane(title,value){const section=document.createElement("section");section.className="panel";const head=document.createElement("h3");head.textContent=title;const pre=document.createElement("pre");pre.textContent=value;section.append(head,pre);grid.appendChild(section);}
 pane("Source EDI · first 1,000 characters",report.batch.text.slice(0,1000));
 pane("Normalized enrollment JSON",JSON.stringify({state:report.batch.state,program:report.batch.program,members:report.members},null,2).slice(0,11000));
 pane("Stage-by-stage audit",report.events.map(e=>e.status+" — "+e.stage+": "+e.detail).join("\n"));
 pane("Investigation guidance",report.failed?"Failure injection: "+report.step+". Verify source archive, deduplication key or parsing rules. Quarantine safely; retry only after checking idempotency.":"Review member/coverage counts, effective dates, source tracking, malformed loops, and downstream publish results.");
}

 function currentBatch(){const text=$("raw").value.trim();if(!text||!text.includes("INS*"))throw Error("Generate or load a synthetic EDI 834 file first.");const segments=text.split("~").map(x=>x.trim()).filter(Boolean);const count=segments.filter(x=>x.startsWith("INS*")).length;if(!count)throw Error("No INS member records found.");const state=$("medicaidState")?.value||"IN",program=$("program")?.value||"Training";return {text,segments:segments.length,members:count,state,program};}
 function refreshInput(){try{const b=currentBatch();$("cloudInputSummary").textContent="Current synthetic input: "+b.members+" member(s), "+b.segments+" segments · "+b.state+" / "+b.program+". Pipeline will use this EDI, not a fixed DEMO001 batch.";}catch(err){$("cloudInputSummary").textContent=err.message;}}
 function show(){
 const provider=$("cloudProvider").value,steps=workflows[provider],scenario=$("cloudScenario").value;
 const fail=scenario==="badzip"?2:scenario==="invalid"?3:scenario==="duplicate"?1:-1;
 const names=steps.map(([name],i)=>i>index?"○ "+name:i===fail?"✕ "+name:"✓ "+name);
 const out=document.createElement("ol");for(const name of names){const li=document.createElement("li");li.textContent=name;out.appendChild(li);} $("cloudStages").replaceChildren(out);
 const state=index<0?"Not started":(index===fail?"Stopped for investigation":(index===steps.length-1?"Simulation complete":"In progress"));
 $("cloudStatus").textContent=state+" · "+provider.toUpperCase()+" · "+scenario+(batch?" · "+batch.members+" synthetic members / "+batch.segments+" segments":" · no EDI batch selected");
 let text=index<0?"Generate synthetic EDI and run the pipeline to inspect real sample counts.":steps[index][1]; if(batch&&index>=0)text+=" Input contains "+batch.members+" members across "+batch.segments+" segments. Source state: "+batch.state+", program: "+batch.program+". (Simulated pipeline; no S3 objects were created.)";
 if(index===fail)text+=" Stop processing; write an audit event, preserve original file, and quarantine the file for authorized review. Do not silently drop member records.";
 $("cloudDetails").textContent=text;
 $("cloudNext").disabled=index<0||index===fail||index>=steps.length-1;
 }
 $("cloudRun").addEventListener("click",()=>{try{investigation=analyzeBatch();batch=investigation.batch;index=0;refreshInput();show();showEvidence(investigation);$("cloudStatus").textContent=investigation.events.some(e=>e.status==="FAIL")?"Batch investigation completed with failure / quarantine decision.":"Batch analysis completed. Inspect source EDI, normalized members and stage audit below."; }catch(e){$("cloudStatus").textContent=e.message;}});
 $("sendGeneratedCloud")?.addEventListener("click",()=>{refreshInput();location.hash="cloud";$("cloudRun").click();});
 $("raw").addEventListener("input",()=>{batch=null;index=-1;refreshInput();show();});
 $("generate")?.addEventListener("click",()=>{batch=null;index=-1;refreshInput();show();});
 $("qaGenerate")?.addEventListener("click",()=>{batch=null;index=-1;refreshInput();show();});
 $("cloudNext").addEventListener("click",()=>{index++;show();});
 $("cloudReset").addEventListener("click",()=>{index=-1;show();});
 for(const id of ["cloudProvider","cloudScenario"])$(id).addEventListener("change",()=>{index=-1;show();});
 $("cloudPrompt").addEventListener("click",async()=>{
 const provider=$("cloudProvider").value,scenario=$("cloudScenario").value;
 const prompt="You are a healthcare payer cloud ETL support engineer. Using only the following SYNTHETIC scenario, explain the likely failure mode, operational checks, safe remediation, and tests to prevent recurrence. Cloud: "+provider+". Scenario: "+scenario+". Reference flow: "+workflows[provider].map(x=>x[0]).join(" -> ")+". Do not invent actual payer-system schemas or assert a real production incident. Return a checklist, sample pseudocode, and a concise root-cause investigation plan. Do not request PHI or secrets.";
 try{await navigator.clipboard.writeText(prompt);$("cloudStatus").textContent="Synthetic AI investigation prompt copied. Paste it into an approved LLM; no data was transmitted.";}
 catch(e){$("cloudStatus").textContent="Clipboard unavailable. Open this page over HTTPS and grant clipboard permission.";}
 });
$("cloudEvidenceDownload").addEventListener("click",()=>{if(!investigation){$("cloudStatus").textContent="Run batch analysis first.";return;}const csv=[["stage","status","detail"],...investigation.events.map(e=>[e.stage,e.status,e.detail])].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),a=document.createElement("a");a.href=url;a.download="synthetic-cloud-etl-evidence.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 refreshInput();show();
})();