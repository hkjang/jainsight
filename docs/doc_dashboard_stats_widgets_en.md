# Dashboard Statistics & Widgets

The statistics grid provides a quantitative overview of your workspace usage and stability.

## Metric Cards

### 1. Total Connections (전체 연결)

- **Icon**: 🔗
- **Description**: Displays the total number of database connections actively configured in your workspace.
- **Purpose**: Helps track the scale of your database integrations.

### 2. Executed Queries (실행된 쿼리)

- **Icon**: 📊
- **Description**: The total number of queries executed.
- **Visual Enhancements**:
  - **Mini Sparkline**: A small line chart showing the trend of query volume over the last 7 time periods.
  - **Success Rate Bar**: A progress bar visualization showing the percentage of successful queries versus failures. Green indicates a high success rate (>80%), Orange for medium (>50%), and Red for low.

### 3. Failed Queries (실패한 쿼리)

- **Icon**: ⚠️
- **Description**: The count of queries that resulted in errors.
- **Purpose**: Monitoring this helps identify potential connectivity issues or SQL syntax errors affecting users.

## Interactivity

- Hovering over any card applies a "glassmorphism" effect and slightly lifts the card, indicating it is an active UI element.
- Numbers are animated, counting up from zero when the dashboard loads for a dynamic feel.
