# AI Providers

Manage the connections to various AI services (LLMs) used across the platform.

## Supported Provider Types

- **vLLM**: High-performance open-source model serving.
- **Ollama**: Local LLM execution for privacy and cost savings.
- **OpenAI**: Standard GPT-4/3.5 integration.

## Provider Configuration

- **Endpoint**: The API URL (e.g., `http://localhost:11434` for Ollama).
- **API Key**: Securely stored credentials (optional for local providers).
- **Priority**: Define fallback order. Higher priority providers are tried first.
- **Timeout & Retries**: Configure resilience settings for network stability.

## Testing & Validation

- **Connection Test**: "Test All" button instantly validates connectivity to all active providers.
- **Latency Check**: Measures response time in milliseconds to ensure performance.
- **Bulk Actions**: Enable/Disable multiple providers at once for maintenance.
