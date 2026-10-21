# Floor-plan marking and coverage heatmap

## Floor-plan workflow
1. Open **Dead Zone Map**.
2. Upload a PNG/JPG floor-plan image no larger than 2 MB.
3. Click the image to position a marker. Enter a label.
4. Optionally enter an actual measured Wi-Fi RSSI value from −120 to 0 dBm and save. An RSSI value entered manually is recorded as a manual measurement, not as a reading captured by the browser.
5. Use the point list to review or remove annotations.

The floor-plan image and marker list are stored in browser local storage. They are local to the browser profile and are not synced between devices. If a numeric RSSI value is supplied, the measurement record is also saved to the authenticated backend with `floorPlanName`, `floorPlanX`, and `floorPlanY` normalized to 0–1.

## Heatmap workflow
- Select **Auto** to use measured RSSI when at least three eligible geolocated records have actual non-estimated RSSI; otherwise it uses measured latency.
- Select **RSSI** to render a signal-strength heatmap only from actual measured RSSI values. Estimated dBm and signal-quality percentages are excluded.
- Select **Latency** to render the latency heatmap.

### Classification thresholds
| Metric | Green | Yellow | Red |
|---|---|---|---|
| Wi-Fi RSSI | ≥ −60 dBm | −70 to < −60 dBm | < −70 dBm |
| Latency | ≤ 50 ms | > 50 to 100 ms | > 100 ms |

Cells use inverse-distance weighting from measured points and are estimates, not direct measurements. Confidence is lower where the nearest measurement is far away. At least three qualifying geolocated measurements are required. Floor-plan coordinates are a separate indoor coordinate system and are not silently converted to GPS coordinates.
