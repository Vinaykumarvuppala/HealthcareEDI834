"use strict";
(function(){
const $=id=>document.getElementById(id);
const decoder=new TextDecoder();
let entries=[],results=null;
const demo="ST*834*0001~BGN*00*DEMO834*20261101~INS*Y*18*021*20*A***FT~REF*0F*TEST00001~NM1*IL*1*EXAMPLE*JAMIE~HD*021**HLT*DEMO-PLAN~DTP*348*D8*20261101~SE*7*0001~";
function u16(d,p){return d[p]|(d[p+1]<<8)}
function u32(d,p){return (d[p]|(d[p+1]<<8)|(d[p+2]<<16)|(d[p+3]<<24))>>>0}
async function unzip(bytes){
const d=new Uint8Array(bytes),files=[];let p=0,total=0;
while(p+30<=d.length&&u32(d,p)===0x04034b50){
const flags=u16(d,p+6),method=u16(d,p+8),compressed=u32(d,p+18),uncompressed=u32(d,p+22),nameLen=u16(d,p+26),extra=u16(d,p+28);
if(flags&1)throw Error("Encrypted ZIP archives are unsupported.");
if(flags&8)throw Error("ZIP data-descriptor format is unsupported in this training lab. Repackage without data descriptors.");
if(![0,8].includes(method))throw Error("Unsupported ZIP compression method "+method+".");
const end=p+30+nameLen+extra+compressed;if(end>d.length)throw Error("ZIP entry extends beyond file bounds.");
const name=decoder.decode(d.slice(p+30,p+30+nameLen));if(name.includes("..")||name.startsWith("/")||name.includes("\\")||/^[a-z]:/i.test(name))throw Error("Unsafe ZIP entry name.");
if(uncompressed>4*1024*1024)throw Error("ZIP entry too large.");
total+=uncompressed;if(total>8*1024*1024)throw Error("Total extracted size limit exceeded.");
if(/\.(edi|txt)$/i.test(name)&&!name.endsWith("/")){
let data=d.slice(p+30+nameLen+extra,end);
if(method===8){
if(typeof DecompressionStream==="undefined")throw Error("Your browser doesn't support ZIP deflate decompression. Try an uncompressed ZIP.");
let stream;try{stream=new DecompressionStream("deflate-raw");}catch{throw Error("Browser doesn't support raw DEFLATE ZIP data. Use a ZIP with Store compression or upload .edi directly.");}
const buffer=await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer();data=new Uint8Array(buffer);
}
if(data.length!==uncompressed)throw Error("ZIP uncompressed size mismatch.");
files.push({name,text:decoder.decode(data)});
}
p=end;if(files.length>50)throw Error("Too many ZIP entries.");
}
if(!files.length)throw Error("No supported .edi or .txt entries found in ZIP.");
return files;
}
function parse(raw){
const segs=raw.split("~").map(x=>x.trim()).filter(Boolean).map(x=>x.split("*"));
const members=[];let member=null,coverage=null;
for(const a of segs){if(a[0]==="INS"){member={memberIdentifier:"",subscriber:a[1]==="Y",relationship:a[2]||"",maintenanceAction:a[3]||"",name:"",coverages:[]};members.push(member);coverage=null;}
else if(member&&a[0]==="REF"&&a[1]==="0F")member.memberIdentifier=a[2]||"";
else if(member&&a[0]==="NM1"&&a[1]==="IL")member.name=[a[4],a[3]].filter(Boolean).join(" ");
else if(member&&a[0]==="HD"){coverage={action:a[1]||"",product:a[3]||"",planIdentifier:a[4]||"",startDate:null,endDate:null};member.coverages.push(coverage);}
else if(coverage&&a[0]==="DTP"&&["348","349"].includes(a[1])){const date=a[3]||"";const normalized=/^\d{8}$/.test(date)?date.slice(0,4)+"-"+date.slice(4,6)+"-"+date.slice(6):date;if(a[1]==="348")coverage.startDate=normalized;else coverage.endDate=normalized;}
}
if(!members.length)throw Error("No INS member loops detected. File may be unsupported or malformed.");
return {source:"synthetic-browser-edi834",segments:segs.length,memberCount:members.length,members};
}
function display(text,name){
const parsed=parse(text);results=parsed;$("zipRaw").textContent=text.slice(0,2500)+(text.length>2500?"\n…preview truncated":"");$("zipJson").textContent=JSON.stringify(parsed,null,2).slice(0,16000);$("zipStatus").textContent=name+" → "+parsed.memberCount+" member(s) → normalized JSON ready.";
}
$("zipInput").addEventListener("change",async e=>{try{results=null;entries=[];const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)throw Error("File exceeds 3 MB.");if(/\.zip$/i.test(file.name))entries=await unzip(await file.arrayBuffer());else if(/\.(edi|txt)$/i.test(file.name))entries=[{name:file.name,text:await file.text()}];else throw Error("Use a .zip, .edi or .txt file.");$("zipEntry").replaceChildren(...entries.map((x,i)=>new Option(x.name,String(i))));$("zipStatus").textContent="Loaded "+entries.length+" EDI text file(s). Click Extract and transform.";}catch(err){$("zipStatus").textContent=err.message;}});
window.addEventListener("edi-generated-for-zip",event=>{const d=event.detail;entries=[{name:d.name,text:d.edi}];$("zipEntry").replaceChildren(new Option(d.name,"0"));display(d.edi,d.name);});
$("zipDemo").addEventListener("click",()=>{entries=[{name:"sample.edi",text:demo}];$("zipEntry").replaceChildren(new Option("sample.edi","0"));display(demo,"sample.edi");});
$("zipProcess").addEventListener("click",()=>{try{if(!entries.length)throw Error("Load a synthetic file first.");const entry=entries[Number($("zipEntry").value)||0];display(entry.text,entry.name);}catch(err){results=null;$("zipStatus").textContent=err.message;}});
$("zipDownload").addEventListener("click",()=>{if(!results){$("zipStatus").textContent="Transform a file first.";return;}const url=URL.createObjectURL(new Blob([JSON.stringify(results,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="synthetic-edi834-normalized.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();