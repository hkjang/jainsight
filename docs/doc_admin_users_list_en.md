# User Management

The **User Management** page is the central hub for administering all user accounts within the Jainsight platform.

## User List

The main table displays comprehensive details for each user:

- **User Profile**: Name and Email address.
- **Role**: Current system role (e.g., Admin, User).
- **Status**:
  - **Active** (Green): Normal account status.
  - **Locked** (Red): Account blocked due to security reasons or admin action.
  - **Invited** (Yellow): Invitation sent but not yet accepted.
- **Source**: How the user was created (e.g., Email, SSO).
- **Last Login**: Timestamp of the last successful sign-in.

## Actions

### Bulk Actions

Select multiple users using the checkboxes to perform batch operations:

- **Activate**: Restore access to locked users.
- **Lock**: Temporarily disable access for selected users.
- **Delete**: Permanently remove user accounts (irreversible).

### Individual Actions

Click the "More Options" (three dots) menu on a user row:

- **Unlock**: specific action to restore a locked account.
- **Resend Invite**: For users in 'Invited' status, send the email again.
- **Force Logout**: Invalidate the user's current session immediately.

## Search & Filter

- **Search**: Filter by name or email.
- **Status Filter**: View only Active, Locked, or Invited users.
