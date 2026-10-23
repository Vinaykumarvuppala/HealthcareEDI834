# Payer-System-Agnostic Data Mapping

HealthcareEDI834 is an educational, synthetic-data EDI 834 test workbench. It does not require or embed database schemas from Facets, QNXT, HealthRules, or any other proprietary payer platform.

## Portable reconciliation interface

The reconciliation CSV uses **user-configurable** field names, with generic example headers:

- `member_id`: synthetic member identifier
- `plan`: synthetic plan/product identifier
- `effective_date`: coverage start date, ISO 8601 preferred

These represent a normalized interchange model, **not actual database table or column names**. Analysts can map columns from approved synthetic test exports from their own payer systems using the on-screen mapping controls. No database credentials or connections are needed.

## Potential future mapping model

Allow users to define abstract fields (`memberIdentifier`, `coverageProduct`, `coverageStart`, `coverageEnd`, `enrollmentStatus`) and bind them to **user-supplied** CSV columns. Do not ship vendor-specific SQL statements or claim knowledge of proprietary table schemas.

## Safety and validation scope

Use synthetic data only. The client-side GitHub Pages prototype is not approved for PHI. It performs limited structural checks and selected field comparisons, not full X12 005010X220A1 or Indiana companion-guide certification. Effective-date and enrollment-status semantics vary by payer, program, and feed type.
