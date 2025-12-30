# Security Settings

Configure the global security parameters for the AI and Data Platform.

## Security Score

A real-time security posture assessment (0-100) based on your current configuration. Enabling features like Injection Checks and PII Masking increases your score.

## Protection Layers

1.  **Injection Defense**:
    - **Prompt Injection**: Detects attempts to manipulate the AI's instructions.
    - **SQL Injection**: Scans generated SQL for malicious patterns.
2.  **Statement Control**:
    - **Block DDL**: Globally prevent schema modifications.
    - **Block DML**: Globally prevent data modifications.
    - **Keyword Blocklist**: Define specific forbidden words (e.g., `GRANT`, `REVOKE`).
3.  **Data Privacy (PII)**:
    - **Column Patterns**: Define regex/patterns for columns to automatically treat as sensitive (e.g., `*password*`, `*ssn*`).
4.  **Operational Limits**:
    - **Rate Limiting**: Set max requests per minute.
    - **Audit**: retention policy settings for security logs.

## Security Events

A live feed of recent security interventions, such as "DDL Blocked" or "Injection Attempt Prevented", providing immediate visibility into threats.
