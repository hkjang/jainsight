# RBAC Policies & Simulation

Manage the specific rules that govern access and verify their meaningful application.

## Permissions (Policies)

For each role, you can define a list of permissions:

- **Scope**: The domain of the permission (System, Database, Schema, Table, Query).
- **Resource**: The target identifier. Supports wildcards (e.g., `db:production:*`).
- **Action**: What is allowed? (`read`, `execute`, `modify`, `delete`, `admin`).
- **Effect**: **Allow** (Green) or **Deny** (Red). Explicit Deny overrides Allow.

## Simulation Tool

The **Simulation** tab allows admins to dry-run permission checks without affecting real users.

- **Inputs**: User ID, Resource String, and Action.
- **Output**: A clear `Access Allowed` or `Access Denied` result.
- **Reasoning**: Displays exactly which permission rule matched and caused the result (e.g., "Role 'Admin' grants read access to database:\*").

## Matrix & Templates

- **Matrix**: (Coming Soon) A visual grid comparing permissions across multiple roles.
- **Templates**: (Coming Soon) Reusable policy sets for quick application.
