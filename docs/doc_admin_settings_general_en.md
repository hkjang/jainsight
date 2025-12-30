# General Settings

Configure global platform behaviors and policies.

## Configuration Categories

### 1. General & Security

- **Site Identity**: Set the site name and description.
- **Maintenance**: Toggle Maintenance Mode to lock out non-admin users.
- **Security Policy**:
  - **Session Timeout**: Auto-logout duration.
  - **MFA**: Enforce Multi-Factor Authentication.
  - **Password Policy**: Set minimum length requirements.

### 2. Query execution

- **Default Limit**: Maximum rows returned if users don't specify a LIMIT.
- **Max Execution Time**: Timeout for long-running queries to prevent DB lockups.
- **DDL Allowance**: Global switch to Allow/Deny dangerous DDL commands.
- **Audit Policy**: Toggle logging for all queries vs only risky ones.

### 3. API & Notifications

- **Rate Limits**: Global default API rate limits.
- **Notifications**:
  - **Email**: Enable system emails.
  - **Slack**: Configure Webhook URL for Slack integration.
  - **Alert Threshold**: Set the risk score (0-100) that triggers an alert.
