# Walkthrough - Expanded Market Hours & Web Server watchdog

We have updated the cron schedules and execution gates to start the autonomous trading loop before market open and run it until after market close, and added a minute-by-minute watchdog script to ensure the website is always running.

## Changes Made

### 1. New watchdog Script
* **watchdog Implementation**: Created a new shell script [web-watchdog.sh](file:///home/caveman/Desktop/icecave/agentic-trading-desk/agent/web-watchdog.sh) that:
  * Uses `curl` to check if `http://localhost:5173` is actively responding.
  * If it fails to connect, logs the restart event to `logs/web-watchdog.log`.
  * Triggers `nohup npm run dev >> logs/web-server.log 2>&1 &` to spin up the Vite dev server in a detached, persistent background process.
* **Executable Privileges**: Configured script executable permissions (`chmod +x`).

### 2. Expanded Trading Loop Hours
* **Hours Gate Adjustment**: Modified [trade-loop.sh](file:///home/caveman/Desktop/icecave/agentic-trading-desk/agent/trade-loop.sh) to widen its local clock gate from the previous `09:30 - 16:00 ET` boundaries to `09:00 - 16:30 ET`.
* This enables:
  * Pre-market startup runs (starting at 9:00 AM) to fetch insights, playbook configurations, and candidate watchlists before execution begins.
  * Post-market wrap-up runs (ending at 4:30 PM) to settle final orders, record EOD equity curve ticks, and log final daily stats.

### 3. Crontab Installer Integration
* **installer Script**: Modified [install-cron.sh](file:///home/caveman/Desktop/icecave/agentic-trading-desk/agent/install-cron.sh) to:
  * Widen the trading loop hour triggers to `9-16` (runs hourly from 9 AM to 4:59 PM ET), capturing the expanded time window.
  * Register the minute-by-minute watchdog script `* * * * *` to continuously keep the server alive.
  * Cleanly uninstall all components (including `CRON_TZ` settings) during `--remove` operations to prevent crontab accumulation.

---

## Verification & Testing

### Installation Verification
* Executed `bash agent/install-cron.sh` successfully. The active user schedule shows both entries are correctly registered in the system crontab:
```
# agentic-trading-desk-loop
CRON_TZ=America/New_York
*/5 9-16 * * 1-5 /home/caveman/Desktop/icecave/agentic-trading-desk/agent/trade-loop.sh # agentic-trading-desk-loop
* * * * * /home/caveman/Desktop/icecave/agentic-trading-desk/agent/web-watchdog.sh # agentic-trading-desk-loop
```
* Ran `bash agent/web-watchdog.sh` manually to confirm execution is clean and detects existing dev server bindings without spawning duplicates.
