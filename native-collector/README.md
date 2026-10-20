# NetSpot native Wi-Fi collector

This optional local companion lets the Walk-test Survey query the operating system's Wi-Fi interface while it samples GPS locations. It uses only Python's standard library and binds to `127.0.0.1:8765` (loopback), not the LAN.

## Start on Windows

1. Install Python 3 if it is not installed.
2. Double-click `start-collector.bat`, or run `py -3 collector.py` in this folder.
3. Leave the console open during the survey.
4. In the app, open **Walk-test Survey** and start a survey. The browser will request GPS permission.

Test `http://127.0.0.1:8765/health` in your browser to check that the service is running.

## Measurement limits

- **Windows:** `netsh wlan show interfaces` provides signal quality as a percentage on standard Windows WLAN interfaces, not a trustworthy RSSI value in dBm. The collector therefore leaves `signalDbm` null and returns `signalQualityPct`. It may also show a rough `estimatedSignalDbm`, clearly labelled as an estimate, which is never stored as actual RSSI.
- **Linux:** `iw dev <interface> link` can report actual RSSI in dBm when `iw` is installed and the driver exposes it.
- **macOS:** the legacy `airport -I` utility may report `agrCtlRSSI` on supported macOS versions; recent versions may not include this utility.
- Drivers, OS permissions, Wi-Fi hardware, and platform updates affect availability. A null value means unavailable, not zero.
- The collector does not read cellular RSRP/SINR, packet loss, or internet speed. The walk-test UI separately records GPS and the round-trip time of the local backend ping; that latency is not internet latency.

The service intentionally has no remote-control, shell-command, or data-upload endpoint. It only returns current Wi-Fi interface information.
