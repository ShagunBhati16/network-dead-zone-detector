# Cumulative implementation patch: thresholds + recommendations

This patch is based on the previous floor-plan/RSSI heatmap patch and retains its files/features. It adds:

- Default Wi-Fi weak-signal threshold at -70 dBm and a stricter -80 dBm poor/dead-zone boundary in the existing backend classifier.
- Threshold-aware classification and a configurable Wi-Fi threshold on the floor-plan panel.
- A separate cellular RSRP threshold setting (default -110 dBm), with an explicit note that cellular readings are not classified until actual RSRP data is available.
- A rule-based comparison of router repositioning, mesh node, repeater/extender and wired access point options, including budget and placement inputs and an illustrative improvement estimate.
- Prioritization of saved measured floor-plan points below the active Wi-Fi threshold.
- Two regression tests for the -70 dBm boundary.

No dashboard redesign is intended. Recommendation gains are illustrative heuristics, not predictions backed by an RF propagation model. The installer creates a timestamped backup before replacing files.

Apply from PowerShell:

```powershell
$project = "C:\Users\shagu\Desktop\network-dead-zone-detector"
$zip = "$env:USERPROFILE\Downloads\network-dead-zone-detector-threshold-recommendations-patch.zip"
$patch = Join-Path $env:TEMP "netspot-threshold-recommendations-patch"
if (!(Test-Path $project)) { throw "Project folder not found: $project" }
if (!(Test-Path $zip)) { throw "Patch ZIP not found in Downloads: $zip" }
Remove-Item $patch -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $zip -DestinationPath $patch -Force
& (Join-Path $patch "apply-patch.ps1") -ProjectPath $project
```

Then run in backend:

```powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\backend
npm install
npm test
npm start
```

And in a separate terminal:

```powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\frontend
npm install
npm run dev
```
