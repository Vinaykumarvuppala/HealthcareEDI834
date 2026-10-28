"""Synthetic-only ZIP extraction invoked by Step Functions."""
import io, os, zipfile
import boto3

s3=boto3.client("s3")
def handler(event,context):
    bucket=event["bucket"];key=event["key"]
    raw=s3.get_object(Bucket=bucket,Key=key)["Body"].read(3_000_001)
    if len(raw)>3_000_000: raise ValueError("ZIP exceeds 3 MB")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        files=[i for i in z.infolist() if not i.is_dir()]
        if len(files)!=1: raise ValueError("Expected one .edi entry")
        item=files[0]
        if not item.filename.endswith(".edi") or "/" in item.filename or "\\" in item.filename or ".." in item.filename or item.file_size>2_000_000:
            raise ValueError("Unsafe or oversized entry")
        data=z.read(item)
    stage_bucket=os.environ["STAGE_BUCKET"]
    stage_key="stage/"+os.path.basename(key).replace(".zip",".edi")
    s3.put_object(Bucket=stage_bucket,Key=stage_key,Body=data,ContentType="text/plain")
    return {"bucket":stage_bucket,"key":stage_key,"source_key":key}
