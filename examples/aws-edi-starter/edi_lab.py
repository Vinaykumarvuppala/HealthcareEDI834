"""Runnable synthetic 834 ZIP -> JSON example. Python 3.9+; standard library only."""
import argparse, json, zipfile
from pathlib import Path

SAMPLE = "~".join(["ST*834*0001","BGN*00*DEMO*20261028","INS*Y*18*021*20*A***FT","REF*0F*TEST001","NM1*IL*1*EXAMPLE*JAMIE","HD*021**HLT*DEMO-PLAN","DTP*348*D8*20261101","SE*7*0001",""])

def parse_edi(raw):
    members=[]; member=None; coverage=None
    for segment in raw.split("~"):
        if not segment.strip(): continue
        p=segment.strip().split("*")
        def get(i): return p[i] if i<len(p) else ""
        if p[0]=="INS":
            member={"id":"","name":"","action":get(3),"coverage":[]}
            members.append(member); coverage=None
        elif member is not None and p[0]=="REF" and get(1)=="0F": member["id"]=get(2)
        elif member is not None and p[0]=="NM1" and get(1)=="IL": member["name"]=get(4)+" "+get(3)
        elif member is not None and p[0]=="HD":
            coverage={"product":get(3),"plan":get(4),"start":None}
            member["coverage"].append(coverage)
        elif coverage is not None and p[0]=="DTP" and get(1)=="348":
            d=get(3); coverage["start"]=d[:4]+"-"+d[4:6]+"-"+d[6:] if len(d)==8 else d
    if not members: raise ValueError("No INS member loops")
    return {"member_count":len(members),"members":members}

def process(zipfile_path, output):
    with zipfile.ZipFile(zipfile_path) as archive:
        entries=[x for x in archive.infolist() if not x.is_dir() and x.filename.endswith(".edi")]
        if len(entries)!=1: raise ValueError("Expected exactly one synthetic .edi")
        entry=entries[0]
        if entry.file_size>2000000 or "/" in entry.filename or "\\" in entry.filename: raise ValueError("Unsafe or oversized archive member")
        result=parse_edi(archive.read(entry).decode("utf-8"))
    Path(output).write_text(json.dumps(result,indent=2),encoding="utf-8")
    return result

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--make-sample",action="store_true")
    p.add_argument("--zip",default="sample834.zip")
    p.add_argument("--out",default="members.json")
    a=p.parse_args()
    if a.make_sample:
        with zipfile.ZipFile(a.zip,"w",zipfile.ZIP_DEFLATED) as z: z.writestr("synthetic.edi",SAMPLE)
    print(json.dumps(process(a.zip,a.out),indent=2))
