# NetSpot cumulative implementation patch — restored dashboard + testing/deployment

This patch is cumulative: it keeps the previous location survey/privacy, measurement classification, functional map, persistent test history, reports/analytics, API validation/management, registration/login, protected user-scoped records, and authenticated CSV/PDF exports.

## Dashboard change
- Keeps the restored NetSpot dashboard layout and uses a world-map topology graph in the map panel. Topology nodes and route links are derived only from actual saved geolocated records; no fake network nodes or metric values are generated.
- Replaces sample campus locations, demo alerts and seeded metrics with actual saved backend records only.
- Displays clear empty/loading states when measurements or coordinates do not exist. It does not generate a fake point or fabricate values to fill charts.
- Corrects location filtering so null coordinates are not accidentally converted to zero.

## Walk-test survey and Wi-Fi signal collection
- Adds a **Walk-test Survey** page without redesigning existing pages. It requests GPS permission, tracks movement, and saves a location-tagged measurement every 3/5/10/15 seconds until stopped. Samples persist in existing authenticated history and appear on the map/dashboard.
- Adds `native-collector/`, a Python 3 loopback-only companion service. Start it with `native-collector\start-collector.bat`, then keep its console open during a walk-test. It uses no extra Python packages.
- Linux/macOS return actual RSSI when the operating system command exposes it. Standard Windows `netsh` exposes signal quality percentage, not reliable actual RSSI; the collector stores percentage separately and may show a clearly labelled rough estimate, never as measured `signalDbm`. Actual Windows RSSI needs a supported driver/vendor API or compatible external adapter.
- Walk-test also saves GPS and local backend round-trip time. This local API latency is not labelled as internet latency. Missing native signal values remain null rather than being fabricated.

## Added testing and production-readiness work
- Unit tests for classification thresholds and dead-zone/outage quality decisions.
- API integration tests for auth, saving/retrieving persistent measurements, invalid/incomplete values, coordinate validation, report summaries, CSV export and a 21-record scale smoke test.
- Frontend contract checks for empty/loading states and no demo dashboard records.
- Structured server request/error logs, request timeout settings and graceful SIGINT/SIGTERM shutdown.
- Deployment, environment, backup/recovery, manual Wi-Fi/location-permission test and native Wi-Fi collector documentation in `docs/TESTING-AND-DEPLOYMENT.md`.

## Apply from VS Code PowerShell
Download this ZIP into your Windows Downloads folder, open VS Code, open **Terminal → New Terminal**, and paste:

```powershell
$project = "C:\Users\shagu\Desktop\network-dead-zone-detector"
$zip = "$env:USERPROFILE\Downloads\network-dead-zone-detector-dashboard-testing-deployment-patch.zip"
$patch = Join-Path $env:TEMP "netspot-dashboard-testing-deployment-patch"
if (!(Test-Path $project)) { throw "Project folder not found: $project" }
if (!(Test-Path $zip)) { throw "Patch ZIP not found in Downloads: $zip" }
Remove-Item $patch -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $zip -DestinationPath $patch -Force
& (Join-Path $patch "apply-patch.ps1") -ProjectPath $project
```

If script execution is blocked in this terminal, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and run the command again. The installer backs up replaced source files to a timestamped `.netspot-dashboard-testing-deployment-backup-*` folder and preserves `backend/data`.

## Run it
Optional Wi-Fi collector (separate terminal on the survey laptop): double-click `native-collector\start-collector.bat`. Keep it open during walk-test collection.

Backend terminal:

```powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\backend
npm install
npm test
npm start
```

Frontend terminal:

```powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\frontend
npm install
npm run dev
```

Read `docs/TESTING-AND-DEPLOYMENT.md` for detailed testing and deployment steps. Note: browser-only code cannot reliably read Wi-Fi RSSI. The optional native collector uses platform-specific OS facilities; on standard Windows interfaces it reports signal quality percent rather than claiming an actual RSSI value. The JSON store is intended for a single-instance prototype, and production scaling should use a transactional database.


## Add-on: floor-plan marking and signal heatmap

This cumulative patch adds an indoor floor-plan marking panel to the existing Dead Zone Map page and a heatmap metric selector. It does not replace the dashboard or redesign existing screens.

- Upload a PNG/JPG floor plan (up to 2 MB) and click the image to place named points. Floor-plan image and annotation markers are stored in this browser's local storage. Clearing browser site data removes these local annotations.
- Optionally enter an actual RSSI reading (−120 to 0 dBm) for a point. The measurement is saved through the authenticated API and carries floor-plan name and normalized X/Y coordinates in the record. The value is manually entered; it is not claimed to be an automatic radio reading.
- The map's heatmap selector supports Auto, RSSI, and Latency. Auto chooses RSSI only when at least three geolocated records contain non-estimated measured RSSI; otherwise it uses measured latency. RSSI cells use green at/above −60 dBm, yellow from −70 to below −60 dBm, and red below −70 dBm. Latency cells use green up to 50 ms, yellow up to 100 ms, and red above 100 ms.
- Heatmap cells are inverse-distance-weighted estimates and are clearly labeled as estimates. The RSSI mode excludes percentage-based or estimated dBm values. At least three qualifying points with geographic coordinates are required for a heatmap.

The floor-plan image itself is local to the browser, not uploaded to the server. API records store normalized floor-plan coordinates but do not contain the image.
