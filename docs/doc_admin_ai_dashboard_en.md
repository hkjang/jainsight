# AI Monitoring Dashboard

Real-time visibility into the performance, health, and usage of the AI services.

## System Health

- **Provider Status**: Live status indicators for each configured AI Provider (Online/Offline) with latency metrics.
- **Success Rate**: Today's aggregate success rate for AI requests.
- **Response Time**: Average latency in milliseconds.

## Key Metrics

- **Today's Requests**: Total count of AI interactions for the current day.
- **Token Usage**: Input (prompt) and Output (completion) token consumption tracking.
- **Blocked Requests**: Count of requests blocked by security policies (e.g., DDL attempts, PII access).

## Visualizations

- **7-Day Trend**: Bar chart showing request volume and success rates over the last week.
- **Model Usage**: Breakdown of active vs. total models and usage distribution by purpose (SQL Generation, Explanation, General).

## Quick Actions

Direct links to common administrative tasks:

- Add Provider
- Configure Models
- Manage Prompts
- View Audit Logs
