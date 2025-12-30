# Audit Logs

A comprehensive, immutable record of all system activities and security events.

## Log Interface

- **Timeline**: A chronological feed of events showing who did what, when, and the result.
- **Icons & Colors**: Actions are visually prioritized (Green for success, Red for failure/blocking).

## Filtering

Narrow down the logs to find specific events:

- **Search**: Filter by user name, action type, or resource name.
- **Resource Filter**: limit to specific types like `Query`, `User`, `Role`, `System`.
- **Status Filter**: Show only Failures or Warnings to spot issues quickly.
- **Time Range**: Toggle between Today, 7 Days, 30 Days, or All Time.

## Log Details

Clicking a log entry reveals the JSON payload containing the specific details of the event, such as the full SQL query executed, reason for blocking, or IP address.

## Export

Download the currently filtered log set as a CSV file for external compliance reporting or offline analysis.
