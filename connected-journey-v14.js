"use strict";
(function(){
const $=id=>document.getElementById(id);
const notes={
business:"Follow eligibility → program / plan assignment → 834 delivery → coverage. Compare selected state/program with the member and coverage results; do not infer eligibility from an 834 alone.",
qa:"Create synthetic positive and negative enrollment cases. Validate member count and coverage dates; inspect exceptions, compare files, and reconcile expected versus actual results.",
developer:"See the SAME EDI from the generator packaged as a ZIP, extracted locally and transformed to JSON. Then explore Glue/PySpark or Azure orchestration examples.",
architect:"Review landing → extraction → orchestration → normalized storage. Discuss trace IDs, schema evolution, retry/idempotency, quarantine, encryption, observability and payer-neutral contracts."
};
let current=null;
function state(){return $("workspaceState")?.value||$("medicaidState")?.value||"IN";}
function capture(){const edi=$("raw").value.trim();if(!edi||!edi.includes("INS*"))throw Error("Generate synthetic EDI first.");const members=(edi.match(/(?:^|~)INS\*/g)||[]).length;const segments=edi.split("~").filter(x=>x.trim()).length;if(!members)throw Error("No member records in EDI.");current={edi,members,segments,state:state(),program:$("program")?.value||"Training"};return current;}
function status(t){$("journeyStatus").textContent=t;}
function goto(tab){location.hash=tab;document.getElementById("tabWorkspace")?.scrollIntoView({block:"start"});}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function put16(a,v){a.push(v&255,(v>>>8)&255);}
function put32(a,v){put16(a,v&65535);put16(a,v>>>16);}
function zipSingle(name,contents){
const enc=new TextEncoder(),n=enc.encode(name),data=enc.encode(contents),crc=crc32(data);
const local=[0x50,0x4b,3,4];put16(local,20);put16(local,0);put16(local,0);put16(local,0);put16(local,0);put32(local,crc);put32(local,data.length);put32(local,data.length);put16(local,n.length);put16(local,0);
const central=[0x50,0x4b,1,2];put16(central,20);put16(central,20);put16(central,0);put16(central,0);put16(central,0);put16(central,0);put32(central,crc);put32(central,data.length);put32(central,data.length);put16(central,n.length);put16(central,0);put16(central,0);put16(central,0);put16(central,0);put32(central,0);put32(central,0);
const cdOffset=local.length+n.length+data.length,cdSize=central.length+n.length;const end=[0x50,0x4b,5,6];put16(end,0);put16(end,0);put16(end,1);put16(end,1);put32(end,cdSize);put32(end,cdOffset);put16(end,0);
return new Blob([new Uint8Array(local),n,data,new Uint8Array(central),n,new Uint8Array(end)],{type:"application/zip"});
}
function download(){const b=capture(),name="synthetic-"+b.state.toLowerCase()+"-834.edi",blob=zipSingle(name,b.edi);const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name+".zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("Downloaded ZIP containing exactly "+b.members+" generated members; "+b.segments+" EDI segments.");}
function transfer(){const b=capture();const select=$("zipEntry");select.replaceChildren(new Option("generated-"+b.state+".edi","0"));window.dispatchEvent(new CustomEvent("edi-generated-for-zip",{detail:{name:"generated-"+b.state+".edi",edi:b.edi}}));status("Transferred "+b.members+" member(s) to ZIP → JSON lab.");goto("cloud");}
$("journeyGenerate").addEventListener("click",()=>{goto("generate");status("Choose program and member count, then click Generate EDI 834. Return here or use the generated batch in Cloud Lab.");});
$("journeyZip").addEventListener("click",()=>{try{download();}catch(e){status(e.message);}});
$("journeyExtract").addEventListener("click",()=>{try{transfer();}catch(e){status(e.message);}});
$("journeyCloud").addEventListener("click",()=>{try{capture();goto("cloud");$("cloudRun").click();status("Cloud simulation now references this synthetic batch.");}catch(e){status(e.message);}});
$("zipFromGenerated")?.addEventListener("click",()=>{try{transfer();}catch(e){$("zipStatus").textContent=e.message;}});
$("journeyPerspective").addEventListener("change",()=>{$("journeyPerspectiveNotes").textContent=notes[$("journeyPerspective").value];});
$("journeyPerspectiveNotes").textContent=notes.business;
$("generate").addEventListener("click",()=>{try{const b=capture();status("Generated batch ready: "+b.members+" member(s), "+b.segments+" segments, state "+b.state+". Continue with ZIP, JSON or Cloud ETL.");}catch(e){status(e.message);}});
$("qaGenerate")?.addEventListener("click",()=>{try{const b=capture();status("QA batch ready: "+b.members+" member(s).");}catch(e){status(e.message);}});
})();