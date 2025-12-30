# Query Policies

Control how SQL queries are executed and enforce security standards across the organization.

## Policy Management

Define rules to automatically detect and handle risky queries.

- **Policy Types**:
  - **DDL Block**: Prevents structural changes like `DROP` or `ALTER`.
  - **WHERE Required**: Enforces usage of `WHERE` clauses in `DELETE`/`UPDATE`.
  - **Limit Required**: Ensures result sets are capped.
- **Actions**:
  - **Block**: Stop the query immediately.
  - **Warn**: Allow execution but flag it as risky.
  - **Audit**: Log silently for review.
- **Risk Score**: Assign a risk weight (0-100) to each policy.

## Execution Log

Review the history of query executions.

- **Status**: `Allowed` (Green), `Blocked` (Red), `Warned` (Orange).
- **Risk Analysis**: View the calculated risk score for each query.
- **Blocked Reason**: See exactly why a query was prevented from running.

## Test Playground

Safely validate your policies before applying them.

- **Input**: Paste a SQL query into the test area.
- **Output**: The system simulates policy checks and returns a "Valid" or "Policy Violation" result along with the risk score and triggered rules.
