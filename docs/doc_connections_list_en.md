# Connections List

The **Connections List** acts as your address book for databases, providing a status-aware overview of all linked data sources.

## Dashboard Stats

At the top of the page, four status cards provide an immediate health check:

- **Total Connections**: Total configured databases.
- **Online**: Number of connections currently active and reachable.
- **Offline**: Number of connections that failed the last health check.
- **Types**: The diversity of database systems (e.g., Postgres, MySQL) in use.

## Connection Cards

Each connection is represented by a card containing:

1.  **Status Indicator**: A blinking dot (Green/Online, Red/Offline, Orange/Testing) offering real-time health feedback.
2.  **Database Icon**: Visual identifier for the DB type (e.g., Elephant for PostgreSQL).
3.  **Details**: Host IP, Port, and Database Name.
4.  **Creation Date**: When the connection was added.

## Actions

- **Test (🔌)**: Triggers a ping to verify connectivity.
- **Query (⚡)**: Opens the SQL Editor with this connection pre-selected.
- **Schema (📊)**: Opens the Schema Explorer for this connection.
- **Duplicate (📋)**: Creates a copy of the connection settings (useful for similar environments like Dev/Prod).
- **Edit (✏️)**: Modify connection details.
- **Delete (🗑️)**: Remove the connection configuration.
