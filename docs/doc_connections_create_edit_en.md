# Creating & Editing Connections

Securely configure access to your external database systems.

## Supported Databases

Jainsight currently supports the following database types:

- **PostgreSQL**: (Port 5432 default)
- **MySQL**: (Port 3306 default)
- **MariaDB**: (Port 3306 default)
- **Oracle**: (Port 1521 default)
- **MSSQL**: (Port 1433 default)
- **SQLite**: (File path based)

## Configuration Fields

- **Connection Name**: A friendly name to identify this connection (e.g., "Production Core").
- **Type**: Select the database vendor.
- **Host**: IP address or domain name.
- **Port**: Listener port number.
- **Database**: The specific database name to connect to.
- **Username**: Database user credentials.
- **Password**: Password (stored securely).
- **Test Connection**: Always click this before saving to ensure the credentials are valid and the firewall allows access.
