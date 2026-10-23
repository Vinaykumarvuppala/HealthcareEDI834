"use strict";
(function(){
const catalog={
IN:{name:"Indiana",programs:[["HHW","Hoosier Healthwise"],["HIP","Healthy Indiana Plan"],["HCC","Hoosier Care Connect"],["PATH","PathWays for Aging"]],source:"https://www.in.gov/medicaid/"},
CA:{name:"California",programs:[["Medi-Cal Managed Care","Medi-Cal Managed Care"]],source:"https://www.dhcs.ca.gov/"},
TX:{name:"Texas",programs:[["STAR","STAR"],["STAR+PLUS","STAR+PLUS"],["STAR Kids","STAR Kids"]],source:"https://www.hhs.texas.gov/"},
FL:{name:"Florida",programs:[["MMA","Managed Medical Assistance"],["LTC","Long-Term Care"],["Dental","Dental"]],source:"https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care.html"},
NY:{name:"New York",programs:[["MMC","Medicaid Managed Care"],["MLTC","Managed Long Term Care"]],source:"https://www.health.ny.gov/health_care/managed_care/"},
GA:{name:"Georgia",programs:[["Georgia Families","Georgia Families"],["Georgia Families 360","Georgia Families 360"]],source:"https://dch.georgia.gov/"},
OH:{name:"Ohio",programs:[["Next Generation","Next Generation Medicaid Managed Care"]],source:"https://medicaid.ohio.gov/"},
NC:{name:"North Carolina",programs:[["Standard Plan","Medicaid Standard Plans"],["Tailored Plan","Behavioral Health and I/DD Tailored Plans"]],source:"https://medicaid.ncdhhs.gov/"},
AZ:{name:"Arizona",programs:[["AHCCCS Complete Care","AHCCCS Complete Care"],["ALTCS","Arizona Long Term Care System"]],source:"https://www.azahcccs.gov/"},
IL:{name:"Illinois",programs:[["HealthChoice Illinois","HealthChoice Illinois"]],source:"https://enrollhfses.illinois.gov/en/healthchoice-illinois"},
PA:{name:"Pennsylvania",programs:[["HealthChoices","HealthChoices"],["Community HealthChoices","Community HealthChoices"]],source:"https://www.pa.gov/agencies/dhs.html"},
VA:{name:"Virginia",programs:[["Cardinal Care","Cardinal Care Managed Care"]],source:"https://www.dmas.virginia.gov/"},
WA:{name:"Washington",programs:[["Apple Health","Apple Health Managed Care"]],source:"https://www.hca.wa.gov/"},
MI:{name:"Michigan",programs:[["Medicaid Health Plans","Medicaid Health Plans"]],source:"https://www.michigan.gov/mdhhs/"}
};
window.ediMedicaidCatalog=catalog;
for(const [stateId,programId] of [["medicaidState","program"],["qaState","qaProgram"]]){
const state=document.getElementById(stateId),program=document.getElementById(programId);if(!state||!program)continue;
state.replaceChildren(...Object.entries(catalog).map(([code,x])=>new Option(x.name+" ("+code+")",code)));
function update(){const cfg=catalog[state.value];program.replaceChildren(...cfg.programs.map(p=>new Option(p[1],p[0])));const infoId=stateId+"Info";let info=document.getElementById(infoId);if(!info){info=document.createElement("p");info.className="hint";info.id=infoId;state.closest("div").appendChild(info);}info.replaceChildren(document.createTextNode(cfg.name+" program choices are for synthetic test classification. State-specific EDI companion-guide validation is not implemented. Reference: "));const a=document.createElement("a");a.href=cfg.source;a.target="_blank";a.rel="noopener noreferrer";a.textContent="state Medicaid agency";info.appendChild(a);
if(stateId==="medicaidState"){const model=document.getElementById("memberModel");if(model){model.value=state.value==="IN"?"indiana":"generic";model.dispatchEvent(new Event("change"));}}}
state.addEventListener("change",update);state.value="IN";update();
}
})();