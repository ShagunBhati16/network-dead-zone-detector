# Additive patch: passive monitoring, carrier comparison, handheld detector

This patch is cumulative from the threshold/recommendations patch and includes its prior files, plus three additive frontend workspaces.

## Added
- **Passive Monitor:** page-open periodic HTTP reachability/latency probes with optional geolocation tags, in-session sample list, and CSV export. Browser timers may pause in background tabs; this is not silent OS-level background collection. It does not fabricate Wi-Fi RSSI or cellular radio readings.
- **Carrier Comparison:** side-by-side manual entry of measured carrier technology, RSRP, RSRQ, SINR, download speed, and latency. An indicative score compares only populated fields. Browsers generally cannot directly access raw cellular radio metrics.
- **Handheld Detector:** LED status preview and integration notes for a physical microcontroller-based detector. The web UI does not itself drive physical LEDs; hardware/firmware and a local data interface are separate requirements.

No existing pages are intentionally redesigned. The installer creates a timestamped backup of replaced files.

## Apply
Run `apply-patch.ps1` with `-ProjectPath` set to the project root. Then restart backend and frontend. See the prior `README-THRESHOLDS-RECOMMENDATIONS-PATCH.md` for normal run commands.

## Hardware reality check
A real handheld device needs a compatible Wi-Fi scanning chipset/API and, for cellular comparison, a modem/module that exposes cellular metrics. RSSI/RSP data should be marked measured only when obtained from the hardware. The browser-only passive page provides active HTTP probes while open, not OS-wide passive packet monitoring.
