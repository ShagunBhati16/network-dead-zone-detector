# NetSpot Automated Testing and Production Readiness

## 1. Automated test suite

From `backend/`, run `npm test`. The suite uses Node's built-in test runner and a temporary data directory, so the integration test does not change the project's real `backend/data` records.

Coverage includes:
- Unit tests for dead-zone, outage, unstable and connection-quality classification, signal thresholds and configurable thresholds.
- API integration tests for account creation, protected routes, saving and retrieving measurements, persistence, coordinate pairing/range checks, invalid packet loss, report summary calculations, CSV content and a 21-record history/performance smoke test.
- Frontend contract checks for loading and empty states and for the dashboard's use of saved measurements rather than the old sample locations/alerts.

The API integration test exercises the real Express app on a temporary local port. A successful test run is not a substitute for browser-based E2E testing on every target OS.

## 2. Manual verification checklist

Use a real Wi-Fi network and check each item:

- [ ] Register, sign in, sign out, and sign in again; verify protected pages require a session.
- [ ] Run a network test and confirm the saved result appears in Dashboard, Test History and Reports.
- [ ] Refresh the browser; confirm the saved record remains available.
- [ ] Verify values in the UI match the corresponding `/api/network-tests` record and exported CSV.
- [ ] Try location permission **granted** and **denied**; denied permission must not crash testing and should not create map coordinates.
- [ ] Test weak Wi-Fi by moving farther from the access point; repeat samples before interpreting a dead-zone classification.
- [ ] Disable Wi-Fi / disconnect from the network; confirm the UI reports failed/unavailable probes rather than inventing latency or speed values.
- [ ] Test a Wi-Fi connection without internet access, where available, to distinguish local Wi-Fi reachability from internet/server failure.
- [ ] Check loading, error and no-data states with a fresh account and with the backend stopped.
- [ ] Check map zoom/pan, point popups, quality filters and the absence of a point when coordinates are unavailable.
- [ ] Export CSV and PDF and compare values against stored records.
- [ ] Try malformed coordinates, latitude without longitude, longitude without latitude, and out-of-range metrics using the API integration test or a REST client.
- [ ] Repeat the workflow on supported browsers/devices; browser JavaScript cannot reliably read Wi-Fi RSSI. A native OS measurement component is required for actual signal-strength readings.

## 3. Development installation

Requirements: a supported Node.js LTS release and npm. Open two VS Code terminals.

Terminal A (backend):

```powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\backend
npm install
npm test
npm start
```

Terminal B (frontend):

```powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:5000` for the API and Vite commonly serves the frontend at `http://localhost:5173`. Set `VITE_API_URL` in `frontend/.env` if the API address differs.

## 4. Environment configuration

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Never commit either `.env` file.

Backend variables:
- `PORT`: HTTP listening port (default `5000`).
- `NODE_ENV`: use `production` in production.
- `AUTH_SECRET`: a unique random secret of at least 32 characters in production.
- `CORS_ORIGIN`: comma-separated exact frontend origins; do not use `*` for a public deployment.
- `NETSPOT_DATA_DIR`: optional absolute path for persistent JSON data, outside the deployment/release directory where practical.
- `LOG_LEVEL=silent`: optional local-only way to silence request logs; normally leave unset to emit structured JSON request/error logs to stdout/stderr.

Frontend variable: `VITE_API_URL`, the publicly reachable backend base URL. Frontend variables prefixed `VITE_` are embedded in the client build and must never contain secrets.

## 5. Production deployment checklist

- Build and host the frontend as static files over HTTPS (for example, behind a web server/CDN) and deploy the backend to a persistent Node.js host.
- Configure the production frontend origin in `CORS_ORIGIN`, set `NODE_ENV=production`, and supply `AUTH_SECRET` through the hosting platform's secret manager.
- Use HTTPS, restrict access to host logs, set resource limits, and monitor structured stdout/stderr logs. Configure the host's log retention and alerting; this patch does not integrate a third-party error-monitoring vendor.
- Use a persistent writable `NETSPOT_DATA_DIR`. The current store is JSON-file based, with atomic replacement and `.bak` previous-file copies; it is suitable for a prototype/single instance, not concurrent multi-instance production. Move to a transactional database before scaling horizontally.
- Back up `network-tests.json`, `locations.json`, `users.json`, and `detection-thresholds.json` from the data directory. Store encrypted backups off-host and test restore procedures. To recover a corrupted JSON file, stop the service, preserve the damaged file, restore the matching `.bak` or a verified backup, then restart and verify records and reports.
- Startup: `npm start`; health check: `GET /api/health`. Shutdown: send SIGTERM/SIGINT and allow the server up to 10 seconds to close connections. Configure the hosting platform's grace period accordingly.
- Server request and error logs are structured JSON. Add host-level log collection, retention and alerting for production; do not log passwords or bearer tokens.
- API requests have a 30-second server request timeout; browser measurement probes also have client-side timeouts and report unavailable endpoints as errors. Network test services and browser restrictions may affect speed results.
- Run `npm test` on each release. Exercise the manual checklist on actual Wi-Fi, weak signal, offline internet and both location-permission states before deploying.
- Public production hardening still recommended: migrate bearer tokens from localStorage to Secure/HttpOnly/SameSite cookies, implement persistent session revocation, use a transactional database, and run full browser E2E tests (e.g. Playwright) in CI.

## 6. Native Wi-Fi measurement component

The current frontend uses browser-visible HTTP probes for latency and approximate download/upload estimates. Standard browser APIs do not provide a reliable cross-platform Wi-Fi RSSI API. For real signal strength, implement and document a native collector (for example, a signed platform-specific desktop/mobile component) that reports RSSI, interface type, timestamp, permission status and measurement source. Mark a reading as measured only when the platform actually collected it; do not infer signal strength from latency.

## 7. Known limitations

- JSON persistence is not a substitute for a production database or multi-instance locking.
- Speed-test results depend on browser, endpoint, firewall, CORS and current network load.
- Location is optional and may be unavailable indoors; coordinates should not be fabricated when permission is denied.
- Automated API and frontend-contract tests run in Node; actual browser rendering, device Wi-Fi APIs and platform permissions require manual/device or browser E2E testing.


## Continuous walk-test and native Wi-Fi signal collector

1. Start the backend and frontend as usual and sign in.
2. In a separate terminal, run `py -3 native-collector/collector.py` from the project root, or double-click `native-collector/start-collector.bat`. The service binds to `127.0.0.1:8765` only.
3. Verify `http://127.0.0.1:8765/health` returns JSON.
4. In NetSpot, open **Walk-test Survey**, enter a survey name, select the sampling interval, and press **Start walk-test**. Grant browser location permission. Walk through the target area while the page remains open; press **Stop survey** when finished.
5. Verify samples appear in Test History and map points use the recorded coordinates. Compare the UI values against the saved records and the collector's `/signal` response.

The browser uses GPS watch-position plus periodic samples. Geolocation can be inaccurate indoors; the app records the OS-reported accuracy. The companion does not record continuously when the page is closed or suspended.

### Platform-specific RSSI behavior

- Linux `iw` and supported macOS `airport -I` return actual RSSI in dBm when available. These facilities vary by driver/OS version.
- Standard Windows `netsh wlan show interfaces` exposes signal quality as a percentage. It does not provide actual RSSI in dBm, so the collector leaves `signalDbm` null and returns `signalQualityPct`; any dBm estimate is explicitly separate and must not be treated as a measured RSSI. A Windows-specific vendor driver/API or compatible external adapter is required for true RSSI.
- This release does not collect cellular RSRP/SINR or background data when the browser is closed. The walk-test's latency value is the local backend HTTP round-trip time, not a general internet latency measurement.
