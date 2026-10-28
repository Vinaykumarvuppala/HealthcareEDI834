# AWS S3 → Lambda ZIP extraction lab

Runs on Python 3.12+ using boto3 in AWS Lambda; unit tests use only standard Python.

## Test locally
```bash
cd examples/aws-lambda-zip
python -m unittest -v
```

## Deploy in AWS (synthetic training buckets)
1. Create separate S3 raw and staging buckets in your own account.
2. Create a Lambda function with Python 3.12 and handler `lambda_function.lambda_handler`.
3. Upload `lambda_function.py` as Lambda code.
4. Set environment variable `STAGING_BUCKET` to the staging bucket name.
5. Grant the execution role read permission on raw bucket, write on staging bucket, and CloudWatch Logs permissions. Scope to needed prefixes.
6. Configure S3 event notifications on the raw bucket for `ObjectCreated` and `.zip` suffix. Avoid triggering on staging output.
7. Upload a *synthetic* ZIP containing one `.edi` file under the raw prefix. Confirm the staging object and CloudWatch logs.

## Example event payload
```json
{"Records":[{"eventSource":"aws:s3","s3":{"bucket":{"name":"RAW_BUCKET"},"object":{"key":"inbox%2Fsample.zip"}}}]}
```

The function is designed for small training archives; it does not execute Step Functions or Glue. For production, add idempotency, structured audits, policy-enforced encryption, alerting, CRC/zip-bomb hardening, object versioning, retention, and a reviewed X12 parser; do not process PHI through this training setup.

References:
- https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html
