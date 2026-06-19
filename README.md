# Production Tracker — Tejeduría

A desktop app for tracking, visualizing and comparing factory production data and machine status. The app combines a native desktop UI with a small local server to parse files, query a database, and provide interactive charts and tables.

## Achievements

* Cut down data entry times by 60%.
* Reduced production inquiries by 90%.

## Key capabilities

* Import and parse production PDFs to compare production schedules and identify differences to compute revised targets.
* Live dashboards showing machine states, daily/monthly production, efficiency metrics and estimates.
* Interactive tables with filtering, editing and PDF export for reports.
* Alerts (audio/notifications) and simple telemetry for process monitoring.

## Architecture (high-level)

* Desktop Shell: Electron hosts the app, providing native windows and packaging.
* Renderer: Modern React UI renders dashboards, tables and file upload flows.
* Bridge: A secure preload/context bridge allows renderer ↔ native operations.
* Local Server: Embedded Node/Express process exposes HTTP endpoints for parsing, DB access and heavy processing tasks.
* Database: Microsoft SQL Server backend for production data.
* PDF: Parsing and generation libraries handle import/export workflows.

