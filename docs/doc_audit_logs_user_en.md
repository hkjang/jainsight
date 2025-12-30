# User Audit Logs

A user-facing history of SQL queries executed within the platform, distinct from the system-wide AI audit.

## Features

- **Query History**: View a chronological list of all executed SQL queries.
- **Execution Details**:
  - **User**: Who executed the query.
  - **Connection**: Which database connection was used.
  - **Duration**: Execution time in milliseconds (color-coded for performance awareness).
  - **Status**: Success or Failure state.
  - **Relative Time**: "Just now", "5 mins ago" for quick context.

## Actions

- **Search**: Real-time search by query content, username, or connection name.
- **Copy Query**: One-click button to copy the original SQL query to the clipboard for re-use.
- **Expand View**: Click on any truncated query to view the full SQL text.
- **Auto-Refresh**: Toggle to automatically look for new queries every 5 seconds.
