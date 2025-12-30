# Prompt Templates

Manage and version-control the system prompts used for NL2SQL conversion and other AI tasks.

## Template Management

- **Versioning**: Track changes to prompts with version numbers (v1, v2...).
- **Approval Workflow**: Prompts can require approval ("Pending" vs "Approved") before being used in production.
- **Variables**: intelligent variable detection. Use `{{variable}}` syntax (e.g., `{{schema}}`, `{{userQuery}}`) which are dynamically replaced during execution.

## Editor Features

- **Preview**: Expandable content view with syntax highlighting for variables.
- **Validation**: Real-time detection of used variables.
- **Test Renderer**: Simulate prompt rendering by providing mock data for `schema` and `userQuery` to see exactly what will be sent to the AI.

## Purpose Tags

Categorize prompts by their specific use case:

- **NL2SQL**: Core natural language to SQL conversion.
- **Explain**: SQL explanation generation.
- **Optimize**: Query optimization suggestions.
- **Validate**: Security and logic validation prompts.
