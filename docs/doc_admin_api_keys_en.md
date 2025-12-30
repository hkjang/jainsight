# System API Keys

Manage programmatic access to the Jainsight platform.

## Key Management

- **API Key List**: View all active keys, their owners, and current status.
- **Prefix**: Keys are displayed with a prefix (e.g., `jsk_live_***`) for easy identification while keeping the secret secure.
- **Status**: Keys can be Active, Revoked, or Expired.

## Creating a Key

When generating a new API key, you control:

- **Scopes**: Define precise permissions (e.g., `query:read`, `query:execute`, `schema:read`).
- **Rate Limit**: Limit the number of requests per minute to prevent abuse.
- **Expiry**: Set a validity period (e.g., 30 days, 1 year, or Never).
- **IP Whitelist**: Restrict usage to specific IP addresses or CIDR blocks for enhanced security.

## Monitoring Usage

Click "Details" on any key to view:

- **Total Usage**: Lifetime request count.
- **Trend**: A bar chart showing usage activity over the last 7 days.
