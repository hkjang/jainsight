# API Builder

The **API Builder** allows you to instantly transform a SQL query into a secure, consumable REST API endpoint without deploying backend code.

## Builder Interface

### 1. Basic Info

- **API Name**: Uniquely identify your endpoint (e.g., `get-user-by-id`).
- **Connection**: Select which database the query will run against.

### 2. SQL Definition

Write your SQL logic in the editor.

- **Parameters**: Use the colon syntax (`:variableName`) to define dynamic parameters.
  - _Example_: `SELECT * FROM users WHERE id = :userId`
  - The system automatically parses these variables and creates a parameter configuration section.

### 3. Parameter Configuration

For each detected parameter (e.g., `userId`), configure:

- **Type**: String, Number, or Boolean.
- **Required**: Toggle whether this parameter is mandatory for the API call.

### 4. Testing

Use the integrated test panel to execute the API with sample parameter values before saving to ensure it behaves as expected.
