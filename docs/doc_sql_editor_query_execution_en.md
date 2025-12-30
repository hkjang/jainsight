# Query Execution & Management

Mastering query execution is essential for efficient data analysis.

## Writing Queries

- **Auto-Complete**: As you type, the editor suggests SQL keywords, table names, and column names based on the connected schema.
- **Syntax Highlighting**: Keywords, strings, and comments are color-coded for readability.
- **Multi-Query**: You can write multiple queries separated by semicolons (`;`). Using `Execute All` runs them sequentially.

## Execution Controls

1.  **Execute (Ctrl+Enter)**: Runs the currently selected query or the query at the cursor position.
2.  **Cancel**: If a query takes too long, a "Cancel" button appears, allowing you to abort the request.
3.  **Explain (Analyze)**: View the execution plan (using `EXPLAIN ANALYZE`) to understand query performance and cost.

## Status Feedback

- **Success**: A green notification appears with the execution time (e.g., "Success (12ms)").
- **Error**: A red alert box displays specific error messages from the database driver, often with suggestions for fixes.
