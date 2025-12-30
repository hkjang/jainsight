# IP Security

Manage network-level access control to the Jainsight platform.

## Global IP Allowlist

Restrict access to the entire Admin Console or specific API endpoints based on the requestor's IP address.

- **CIDR Support**: Define ranges using standard CIDR notation (e.g., `192.168.1.0/24`).
- **Description**: Tag each IP entry with a recognizable name (e.g., "Seoul Office VPN").
- **Enforcement Scope**:
  - **Admin Console**: Restrict login to the web interface.
  - **API**: Restrict programmatic access (can be overridden by specific API Key settings).

## Incident Response

- **Blocklist**: Temporarily ban specific IPs that show suspicious activity (auto-populated by Rate Limiting rules).
- **Access Logs**: View a filtered stream of "Access Denied" events due to IP restrictions.
