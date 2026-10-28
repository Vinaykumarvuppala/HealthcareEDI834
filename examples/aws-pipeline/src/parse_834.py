"""AWS Glue Python shell job: minimal synthetic 834 -> JSON. Not X12 compliant."""
import sys,json,boto3
from awsglue.utils import getResolvedOptions
args=getResolvedOptions(sys.argv,["INPUT_BUCKET","INPUT_KEY","OUTPUT_BUCKET"])
s3=boto3.client("s3")
raw=s3.get_object(Bucket=args["INPUT_BUCKET"],Key=args["INPUT_KEY"])["Body"].read().decode("utf-8")
members=[];member=None;coverage=None
for seg in raw.split("~"):
    p=seg.strip().split("*")
    if not p[0]:continue
    field=lambda n:p[n] if len(p)>n else ""
    if p[0]=="INS":
        member={"id":"","action":field(3),"name":"","coverages":[]};members.append(member);coverage=None
    elif member and p[0]=="REF" and field(1)=="0F":member["id"]=field(2)
    elif member and p[0]=="NM1" and field(1)=="IL":member["name"]=(field(4)+" "+field(3)).strip()
    elif member and p[0]=="HD":
        coverage={"product":field(3),"plan":field(4),"start":None};member["coverages"].append(coverage)
    elif coverage and p[0]=="DTP" and field(1)=="348":coverage["start"]=field(3)
if not members:raise ValueError("No members")
output={"source":args["INPUT_KEY"],"member_count":len(members),"members":members}
key="curated/"+args["INPUT_KEY"].split("/")[-1]+".json"
s3.put_object(Bucket=args["OUTPUT_BUCKET"],Key=key,Body=json.dumps(output,indent=2).encode(),ContentType="application/json")
print(json.dumps({"output_key":key,"members":len(members)}))
