# RBAC Roles

Role-Based Access Control (RBAC) allows you to define granular permissions based on user roles.

## Role Types

- **System Roles (Red)**: Built-in immutable roles (e.g., Super Admin, Admin). These ensure core system functionality remains accessible.
- **Custom Roles (Blue)**: User-defined roles (e.g., Data Analyst, Query Viewer) that can be tailored to specific business needs.

## Creating a Role

- **Name & Description**: Clearly identify the role's purpose.
- **Parent Role**: Inherit permissions from another role.
- **Priority**: Define conflict resolution priority (1-100). Higher numbers take precedence.

## Dashboard

The RBAC dashboard provides a summary of:

- Total Role count.
- Distribution of System vs Custom roles.
- Total number of users assigned to these roles.
