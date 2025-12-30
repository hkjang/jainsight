# Schema Details

The **Schema Details** panel (Right Panel) reveals in-depth information about the selected table or view.

## Header Information

- **Title**: Displays the table name and type (TABLE/VIEW) with distinct badges.
- **Metadata**: Shows total column count, primary key (PK) count, and nullable column count.
- **Actions**:
  - **Generate SELECT**: Copies a `SELECT * FROM table LIMIT 100` query to your clipboard.
  - **Open in Editor**: Navigates to the SQL Editor with a pre-filled query for this table.

## Column Grid

A detailed table listing all columns in the selected object.

- **PK**: Key icon indicating Primary Key columns.
- **Column Name**: The technical name of the column (monospace font).
- **Data Type**: The specific database type (e.g., `VARCHAR`, `INTEGER`).
- **Nullable**: Yellow badge for `NULL`, Red badge for `NOT NULL`.
- **Copy Action**: One-click button to copy the column name to clipboard.

## Bulk Actions

- **Column Search**: Filter columns within the table.
- **Copy All Columns**: Copies a comma-separated list of all column names, useful for writing SQL `INSERT` or `SELECT` statements.
