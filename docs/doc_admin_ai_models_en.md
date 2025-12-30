# AI Models

Define specific model configurations for different system purposes.

## Model Configuration

- **Base Model ID**: The actual model name on the provider side (e.g., `gpt-4`, `llama3`).
- **Provider Link**: Associate the model with a configured AI Provider.
- **Parameters**: Fine-tune `Temperature` (creativity), `Top-P`, and `Max Tokens`.
- **System Prompt**: Set a default system behavior for this specific model configuration.

## Purpose Types

Assign models to specific tasks to optimize performance and cost:

- **SQL Generation**: Models optimized for code generation (e.g., strict, low temperature).
- **Explanation**: Models good at natural language reasoning for explaining queries.
- **General**: Fallback for other tasks.

## Testing

- **Interactive Test**: Send a sample "SELECT 1" prompt directly from the UI to verify the model is responding correctly and check the latency.
