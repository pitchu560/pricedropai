# AI Price Drop Watcher Agent - Frontend

Modern React 19 + TypeScript + Vite responsive dashboard for real-time price monitoring, evidence inspection, deduplicated alert triage, and approval-gated simulated cart reservations.

## Technology Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Language**: TypeScript

## Key Capabilities
- **Real-Time Monitoring Feed**: Displays tracked items, latest price, target threshold, and percentage drop delta.
- **Product Registration**: Modal for entering target price, variant specifications, authorized merchant, and stable product ID.
- **Deduplicated Alert Stream**: Filter by `CONFIRMED`, `MUTED`, or `RESOLVED`.
- **Approval-Gated Cart Actions**: Explicit user confirmation workflow preventing autonomous execution. Approved actions generate synthetic cart reservation vouchers with session tokens and tax estimation.
- **Decision Engine Audit Logs**: Tabular audit trail with search, decision filters, JSON evidence inspector, and CSV export.
- **Interactive Test Harness**: Runs test probes for the 8 edge-case scenarios in `test_cases.csv` with live pass/fail results.

## Windows Setup & Execution
Open PowerShell or Command Prompt in this folder:

```powershell
# 1. Install dependencies
npm install

# 2. Start the Vite development server (proxies API calls to FastAPI on port 8080)
npm run dev
```

The frontend dashboard will be available at: `http://localhost:3000`.
