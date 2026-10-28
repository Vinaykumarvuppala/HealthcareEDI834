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
 let index=-1;
 function show(){
 const provider=$("cloudProvider").value,steps=workflows[provider],scenario=$("cloudScenario").value;
 const fail=scenario==="badzip"?2:scenario==="invalid"?3:scenario==="duplicate"?1:-1;
 const names=steps.map(([name],i)=>i>index?"○ "+name:i===fail?"✕ "+name:"✓ "+name);
 const out=document.createElement("ol");for(const name of names){const li=document.createElement("li");li.textContent=name;out.appendChild(li);} $("cloudStages").replaceChildren(out);
 const state=index<0?"Not started":(index===fail?"Stopped for investigation":(index===steps.length-1?"Simulation complete":"In progress"));
 $("cloudStatus").textContent=state+" · "+provider.toUpperCase()+" · "+scenario+" (synthetic DEMO001)";
 let text=index<0?"Start to see stage-by-stage engineering notes.":steps[index][1];
 if(index===fail)text+=" Stop processing; write an audit event, preserve original file, and quarantine the file for authorized review. Do not silently drop member records.";
 $("cloudDetails").textContent=text;
 $("cloudNext").disabled=index<0||index===fail||index>=steps.length-1;
 }
 $("cloudRun").addEventListener("click",()=>{index=0;show();});
 $("cloudNext").addEventListener("click",()=>{index++;show();});
 $("cloudReset").addEventListener("click",()=>{index=-1;show();});
 for(const id of ["cloudProvider","cloudScenario"])$(id).addEventListener("change",()=>{index=-1;show();});
 $("cloudPrompt").addEventListener("click",async()=>{
 const provider=$("cloudProvider").value,scenario=$("cloudScenario").value;
 const prompt="You are a healthcare payer cloud ETL support engineer. Using only the following SYNTHETIC scenario, explain the likely failure mode, operational checks, safe remediation, and tests to prevent recurrence. Cloud: "+provider+". Scenario: "+scenario+". Reference flow: "+workflows[provider].map(x=>x[0]).join(" -> ")+". Do not invent actual payer-system schemas or assert a real production incident. Return a checklist, sample pseudocode, and a concise root-cause investigation plan. Do not request PHI or secrets.";
 try{await navigator.clipboard.writeText(prompt);$("cloudStatus").textContent="Synthetic AI investigation prompt copied. Paste it into an approved LLM; no data was transmitted.";}
 catch(e){$("cloudStatus").textContent="Clipboard unavailable. Open this page over HTTPS and grant clipboard permission.";}
 });
 show();
})();