# Recent Activity

The **Recent Activity** section provides a real-time log of the latest operations performed within the system, ensuring you strictly monitor query usage and system interactions.

## Activity Table Columns

The table displays the following information for each activity:

1.  **Time**: Relative time since execution (e.g., "5 mins ago"). Hovering over this timestamp reveals the exact date and time.
2.  **User**: The username of the person who executed the query.
3.  **Connection**: The specific database connection used for the query.
4.  **Query**: A snippet of the executed SQL query. Long queries are truncated for readability.
5.  **Status**: The outcome of the query.
    - **Success (✓)**: The query executed without errors.
    - **Failure (✗)**: The query encountered an error.
6.  **Action**:
    - **Copy (📋)**: A button to quickly copy the full SQL query to your clipboard for reuse or debugging.

## Empty State

If no queries have been executed recently, an "Empty" state illustration will appear with a prompt to start your first query in the SQL Editor.
