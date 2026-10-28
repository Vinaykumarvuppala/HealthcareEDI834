"""Guarded S3 ZIP extraction. Synthetic files only."""
import os, io, zipfile
from urllib.parse import unquote_plus
MAX_ZIP_BYTES=3*1024*1024
MAX_ENTRY_BYTES=2*1024*1024
MAX_TOTAL_BYTES=5*1024*1024
def process_event(event,s3,destination_bucket,prefix="stage/"):
    if not event.get("Records"): raise ValueError("Expected S3 event Records")
    results=[]
    for record in event["Records"]:
        if record.get("eventSource")!="aws:s3": raise ValueError("Not an S3 event")
        bucket=record["s3"]["bucket"]["name"]
        key=unquote_plus(record["s3"]["object"]["key"])
        if not key.lower().endswith(".zip"): raise ValueError("Only ZIP input accepted")
        raw=s3.get_object(Bucket=bucket,Key=key)["Body"].read(MAX_ZIP_BYTES+1)
        if len(raw)>MAX_ZIP_BYTES: raise ValueError("ZIP exceeds input size")
        extracted=[]
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            members=[i for i in z.infolist() if not i.is_dir()]
            if not members or len(members)>20: raise ValueError("Invalid member count")
            total=0
            # Check ALL entries before writing anything to staging.
            for item in members:
                name=item.filename
                if name.startswith("/") or "/" in name or "\\" in name or ".." in name or not name.lower().endswith((".edi",".txt")):
                    raise ValueError("Unsafe ZIP member "+name)
                if item.flag_bits&1: raise ValueError("Encrypted entry not supported")
                if item.file_size>MAX_ENTRY_BYTES: raise ValueError("Entry too large")
                total+=item.file_size
                if total>MAX_TOTAL_BYTES: raise ValueError("Total extracted size too large")
            for item in members:
                data=z.read(item)
                output=prefix.rstrip("/")+"/"+key.replace("/","_")+"/"+item.filename
                s3.put_object(Bucket=destination_bucket,Key=output,Body=data,ContentType="text/plain",ServerSideEncryption="AES256")
                extracted.append(output)
        results.append({"source_bucket":bucket,"source_key":key,"destination_bucket":destination_bucket,"extracted_keys":extracted})
    return {"batches":results}
def lambda_handler(event,context):
    import boto3
    return process_event(event,boto3.client("s3"),os.environ["STAGING_BUCKET"])
