# AWS Engineer Starter Kit — Synthetic EDI 834

This module provides **runnable Python** for local EDI 834 training, not a real AWS deployment. Python 3.9+ and no third-party packages required.

```bash
cd examples/aws-edi-starter
python edi_lab.py --make-sample
python -m unittest -v
```

Input: `sample834.zip` containing `synthetic.edi`. Output: `members.json` containing normalized member and coverage data.

## Connect this to AWS (architecture, not automatically deployed)

1. Store an approved synthetic ZIP in an S3 `raw/` prefix.
2. A Step Functions workflow invokes a small archive-extraction Lambda for ZIP files with appropriate limits.
3. Store extracted EDI in `stage/`.
4. Glue runs a production-tested X12 parser and emits normalized JSON; PySpark transforms validated JSON to Parquet.
5. Store curated output in `curated/`, invalid records in `quarantine/`, and audit counts in `audit/`.

Do not deploy this simple parser as production X12 validation. Production requires complete 005010X220A1 loop support, duplicate and control-number checks, code-set/companion-guide validation, retry/idempotency, encryption, access controls, logging without PHI, and batch reconciliation.

See: https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html and https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
