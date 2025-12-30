# Schema Browser

The **Schema Browser** provides a hierarchical view of your database structure, allowing you to explore tables, views, and columns without writing a single query.

## Interface Components

### 1. Connection Selector

- **Purpose**: Choose which database connection to explore.
- **Action**: Select a connection from the drop-down menu. If no connections exist, a button to "Add Connection" is provided.

### 2. Table List (Left Panel)

Once a connection is selected, the left panel populates with a list of all available tables and views.

- **Statistics**: Top summary shows the total count of Tables and Views.
  - **Filter**: Click "Table" or "View" cards to filter the list by type.
- **Search**: Real-time search bar to filter tables by name.
- **List Items**:
  - **Icons**: Green indicators for Tables, Yellow for Views.
  - **Status**: Highlighted background indicates the currently selected table.

## Empty State

When no connection is selected, a "Plug" icon prompts you to select a database to begin exploration.
