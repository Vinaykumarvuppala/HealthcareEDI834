# Deployable AWS training pipeline (synthetic EDI only)

Architecture: S3 ZIP in raw bucket → Step Functions → Lambda extraction → S3 staging → AWS Glue Python Shell → curated JSON in staging bucket.

Requires AWS CLI, AWS SAM CLI, access to deploy IAM/S3/Lambda/Glue/Step Functions, Python 3.12, unique S3 bucket names. **This creates billable cloud resources.** Never use real PHI.

## Deploy
```bash
cd examples/aws-pipeline
sam build
sam deploy --guided --capabilities CAPABILITY_IAM \
  --parameter-overrides RawBucketName=YOUR-UNIQUE-RAW StageBucketName=YOUR-UNIQUE-STAGE ArtifactBucketName=YOUR-UNIQUE-ARTIFACT
aws s3 cp src/parse_834.py s3://YOUR-UNIQUE-ARTIFACT/scripts/parse_834.py
python create_sample.py
aws s3 cp sample834.zip s3://YOUR-UNIQUE-RAW/inbox/sample834.zip
aws stepfunctions start-execution --state-machine-arn YOUR_PIPELINE_ARN --input '{"bucket":"YOUR-UNIQUE-RAW","key":"inbox/sample834.zip"}'
aws s3 ls s3://YOUR-UNIQUE-STAGE/curated/
```
Use the state machine execution ARN with `aws stepfunctions describe-execution` or open the AWS console.

This is manually triggered, not auto-triggered by S3; no extra eventing services are required for the lab.

## Safety / scope
The educational parser handles only selected INS/REF/NM1/HD/DTP fields. It is not a certified X12 parser or companion-guide validator. Use only synthetic files. Lambda assumes one EDI file and small ZIPs; it is not hardened for arbitrary/untrusted archives. Set a billing budget, inspect IAM, add idempotency/alerts/quarantine before any operational adaptation.

## Cleanup
Delete objects from all three buckets first, then delete the CloudFormation stack using `sam delete`. Confirm remaining S3 resources and CloudWatch log groups in your account.
