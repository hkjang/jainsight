# AI Audit Logs

Comprehensive granular logs of every interaction between the system and AI models.

## Log Details

Each audit entry creates a detailed record containing:

- **Timestamp**: Exact time of the request.
- **Status**: Success, Failure, or Blocked (by policy).
- **Inputs & Outputs**: The exact User Input text and the Generated SQL coverage.
- **Metadata**: Provider used, Model used, Token counts (Input/Output), and Latency.
- **Errors**: Specific error messages or blocking reasons (e.g., "DDL Blocked").

## Filtering & Navigation

- **Search**: Filter logs by status (Success/Failure), date range, or provider.
- **Pagination**: Navigate through large volumes of history efficiently.
- **Keyboard Support**: Use standard shortcuts (Arrow keys, J/K) to browse logs and Enter to view details.

## Export

- **CSV/JSON**: Download the full audit history or filtered results for external analysis or compliance reporting.
