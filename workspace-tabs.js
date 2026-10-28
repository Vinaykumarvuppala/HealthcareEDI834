"use strict";
(function(){
 const $=id=>document.getElementById(id);
 const config=[
 {id:"state",title:"1. State Selection",sections:[]},
 {id:"generate",title:"2. Generate",sections:["edi-generator","qa-workbench"]},
 {id:"validate",title:"3. Validate",sections:["edi-reader","validation-results","member-results"],extra:["segments"]},
 {id:"compare",title:"4. Compare",sections:["edi-compare"]},
 {id:"reconcile",title:"5. Reconcile",sections:["reconciliation"]},
 {id:"cloud",title:"6. Cloud ETL & AI",sections:["cloud-etl-lab"]}
 ];
 const menu=$("tabButtons"),container=$("tabPanels"),tabs=new Map();
 for(const cfg of config){
 const button=document.createElement("button");button.type="button";button.id="tab-"+cfg.id;button.textContent=cfg.title;button.setAttribute("role","tab");button.setAttribute("aria-controls","pane-"+cfg.id);button.setAttribute("aria-selected","false");button.tabIndex=-1;menu.appendChild(button);
 const pane=document.createElement("div");pane.id="pane-"+cfg.id;pane.className="tabpane";pane.setAttribute("role","tabpanel");pane.setAttribute("aria-labelledby",button.id);container.appendChild(pane);
 for(const id of cfg.sections){const section=$(id);if(section)pane.appendChild(section);}
 if(cfg.id==="validate"){const segmentSection=[...document.querySelectorAll("section")].find(x=>x.querySelector("#segments"));if(segmentSection)pane.appendChild(segmentSection);}
 tabs.set(cfg.id,{button,pane});button.addEventListener("click",()=>activate(cfg.id,true));
 }
 const statePane=tabs.get("state").pane,card=document.createElement("section");card.className="panel state-hub";const title=document.createElement("h2");title.textContent="Choose your Medicaid state";const description=document.createElement("p");description.textContent="Select the state here once. The Generate and QA Workbench forms will use the same state, with program options updated automatically. This is a training catalog, not state-specific EDI certification.";
 const selectLabel=document.createElement("label");selectLabel.htmlFor="workspaceState";selectLabel.textContent="State";
 const select=document.createElement("select");select.id="workspaceState";
 const info=document.createElement("p");info.className="hint";info.id="workspaceStateInfo";
 card.append(title,description,selectLabel,select,info);statePane.appendChild(card);
 const genState=$("medicaidState"),qaState=$("qaState");
 for(const o of genState.options)select.appendChild(new Option(o.text,o.value));
 function stateUpdated(origin){
 const v=origin.value;for(const field of [select,genState,qaState])if(field!==origin&&field.value!==v){field.value=v;field.dispatchEvent(new Event("change"));}
 const cat=window.ediMedicaidCatalog?.[v];info.textContent=(cat?cat.name:"Selected state")+" — choose a program under Generate. State-specific guide checks are not yet certified.";
 }
 select.addEventListener("change",()=>stateUpdated(select));
 genState.addEventListener("change",()=>stateUpdated(genState));qaState.addEventListener("change",()=>stateUpdated(qaState));
 stateUpdated(genState);
 const hashRoutes={"edi-generator":"generate","qa-workbench":"generate","edi-reader":"validate","validation-results":"validate","member-results":"validate","edi-compare":"compare","reconciliation":"reconcile"};
 function activate(id,changeHash){
 if(!tabs.has(id))id="state";
 for(const [key,t]of tabs){let active=key===id;t.pane.classList.toggle("active",active);t.button.setAttribute("aria-selected",String(active));t.button.tabIndex=active?0:-1;}
 if(changeHash){history.replaceState(null,"","#"+id);window.scrollTo({top:0,behavior:"auto"});}
 }
 function fromHash(){const h=decodeURIComponent(location.hash.slice(1));activate(tabs.has(h)?h:hashRoutes[h]||"state",false);}
 for(const [id,t] of tabs)t.button.addEventListener("keydown",e=>{if(!["ArrowRight","ArrowLeft","Home","End"].includes(e.key))return;e.preventDefault();const ids=[...tabs.keys()],i=ids.indexOf(id);const next=e.key==="Home"?0:e.key==="End"?ids.length-1:(i+(e.key==="ArrowRight"?1:-1)+ids.length)%ids.length;const key=ids[next];tabs.get(key).button.focus();activate(key,true);});
 window.addEventListener("hashchange",fromHash);
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{const target=a.hash.slice(1),tab=hashRoutes[target]||target;if(tabs.has(tab)){e.preventDefault();activate(tab,true);}}));
 fromHash();
})();