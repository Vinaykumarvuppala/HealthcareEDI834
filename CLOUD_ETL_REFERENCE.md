# Cloud EDI 834 ETL reference lab

This is a **synthetic training architecture**. It is not a disclosure of any Blue plan's private environment.

## Minimal AWS pattern
S3 `raw/` -> EventBridge/S3 notification -> Step Functions -> Lambda safe ZIP extraction to `stage/` -> Glue parsing -> S3 `curated/` and `quarantine/`.

### Example S3 organization
```text
s3://example-enrollment-lab/
  raw/state=IN/received_date=2026-11-01/batch-001.zip
  stage/state=IN/batch=batch-001/member.edi
  curated/state=IN/year=2026/month=11/part-000.json
  quarantine/state=IN/batch=batch-001/rejected.json
  audit/state=IN/batch=batch-001/manifest.json
```

### Illustrative ZIP extraction (small, approved synthetic files only)
```python
import io
import zipfile

def extract_edi_zip(zip_bytes: bytes) -> list[tuple[str, bytes]]:
    output = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for entry in z.infolist():
            name = entry.filename
            # Never use extractall on an untrusted archive.
            if entry.is_dir():
                continue
            if not name.lower().endswith((".edi", ".txt")):
                raise ValueError("Unsupported archive member")
            if "/" in name or "\\" in name or name.startswith("."):
                raise ValueError("Unsafe path")
            if entry.file_size > 20 * 1024 * 1024:
                raise ValueError("Entry exceeds training limit")
            output.append((name, z.read(entry)))
    return output
```
Real deployments additionally need compressed/uncompressed size ratios, total size and entry-count limits, decompression resource limits, encrypted ZIP handling, checksum and signature validation, idempotency, safe logging, least privilege, encryption, and retention controls.

### Step Functions sketch
```json
{
  "StartAt": "UnpackZip",
  "States": {
    "UnpackZip": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {"FunctionName": "REPLACE_WITH_DEPLOYED_FUNCTION_ARN", "Payload.$": "$"},
      "OutputPath": "$.Payload",
      "Next": "Parse834"
    },
    "Parse834": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "example-parse-edi834",
        "Arguments": {"--batch-key.$": "$.batch_key"}
      },
      "End": true
    }
  }
}
```
Illustrative only: requires actual IAM, error handlers, resources, deployed code, and input/output contracts.

## Azure equivalent
ADLS Gen2 `raw/` -> Azure Data Factory -> Copy decompression (where compatible) -> transformation with tested parsing library -> ADLS `curated/` and `quarantine/` -> Azure Monitor.

## Normalized member data model
```json
{"memberIdentifier":"TEST001","program":"HIP","coverageProduct":"HLT","planIdentifier":"DEMO-PLAN","coverageStart":"2026-11-01","maintenanceAction":"021","sourceBatch":"batch-001"}
```
These are **abstract business fields**, not actual payer platform tables or columns.

## LLM policy
Never send PHI, member IDs from real records, credentials, production logs, or complete unredacted EDI files to a public model. An LLM can summarize synthetic pipeline failures, explain segment meaning with citations to approved companion guides and draft test cases. Do not use generative output as an eligibility or X12 compliance authority.

## Public references
- https://docs.aws.amazon.com/solutions/modern-insurance-data-lakes-on-aws/
- https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
- https://aws.amazon.com/blogs/storage/automatically-decompress-files-in-amazon-s3-using-aws-step-functions/
- https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-blob-storage
