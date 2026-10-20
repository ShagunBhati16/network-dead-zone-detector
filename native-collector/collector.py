#!/usr/bin/env python3
"""Local-only Wi-Fi signal adapter for NetSpot walk-test surveys.

Binds to loopback only. Windows standard WLAN interfaces expose signal quality (%),
not RSSI; this script deliberately does not manufacture an actual signalDbm value.
"""
import json
import platform
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8765
ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}


def run(args, timeout=2):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout, errors="replace")
        return (result.stdout or "") if result.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def get_signal():
    system = platform.system()
    if system == "Windows":
        text = run(["netsh", "wlan", "show", "interfaces"])
        if not text:
            return {"available": False, "connected": False, "signalDbm": None, "signalQualityPct": None, "estimatedSignalDbm": None, "signalDbmIsEstimate": False, "method": "windows-netsh", "note": "No connected Wi-Fi interface was reported by netsh."}
        state = re.search(r"^\s*State\s*:\s*(.+?)\s*$", text, re.I | re.M)
        ssid = re.search(r"^\s*SSID\s*:\s*(.+?)\s*$", text, re.I | re.M)
        signal = re.search(r"^\s*Signal\s*:\s*(\d+)\s*%\s*$", text, re.I | re.M)
        connected = bool(state and state.group(1).strip().lower() == "connected")
        pct = int(signal.group(1)) if signal else None
        # This is a rough quality-derived estimate, not a measured RSSI value.
        estimated = round(-100 + (pct / 2)) if pct is not None else None
        return {"available": bool(connected and pct is not None), "connected": connected, "ssid": ssid.group(1).strip() if ssid else None, "signalDbm": None, "signalQualityPct": pct, "estimatedSignalDbm": estimated, "signalDbmIsEstimate": False, "method": "windows-netsh-signal-quality", "note": "Windows netsh exposes signal quality percentage, not actual RSSI in dBm. estimatedSignalDbm is a rough conversion only; it is not used as measured RSSI."}

    if system == "Linux":
        interfaces = run(["iw", "dev"])
        names = re.findall(r"^\s*Interface\s+(\S+)", interfaces, re.M)
        for interface in names:
            text = run(["iw", "dev", interface, "link"])
            if "Connected to" not in text:
                continue
            ssid = re.search(r"^\s*SSID:\s*(.+)$", text, re.M)
            signal = re.search(r"^\s*signal:\s*(-?\d+)\s*dBm", text, re.M)
            if signal:
                dbm = int(signal.group(1))
                return {"available": True, "connected": True, "ssid": ssid.group(1).strip() if ssid else None, "signalDbm": dbm, "signalQualityPct": None, "estimatedSignalDbm": None, "signalDbmIsEstimate": False, "method": "linux-iw-link", "note": "RSSI reported by iw from the active Wi-Fi interface."}
        return {"available": False, "connected": False, "signalDbm": None, "signalQualityPct": None, "estimatedSignalDbm": None, "signalDbmIsEstimate": False, "method": "linux-iw-link", "note": "No connected Wi-Fi interface with RSSI was found. Install iw and ensure the current user can query the interface."}

    if system == "Darwin":
        airport = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
        text = run([airport, "-I"])
        signal = re.search(r"^\s*agrCtlRSSI:\s*(-?\d+)", text, re.M)
        ssid = re.search(r"^\s*SSID:\s*(.+)$", text, re.M)
        if signal:
            return {"available": True, "connected": True, "ssid": ssid.group(1).strip() if ssid else None, "signalDbm": int(signal.group(1)), "signalQualityPct": None, "estimatedSignalDbm": None, "signalDbmIsEstimate": False, "method": "macos-airport-rssi", "note": "RSSI reported by the macOS airport utility."}
        return {"available": False, "connected": False, "signalDbm": None, "signalQualityPct": None, "estimatedSignalDbm": None, "signalDbmIsEstimate": False, "method": "macos-airport-rssi", "note": "RSSI is unavailable from the airport utility on this macOS version."}

    return {"available": False, "connected": False, "signalDbm": None, "signalQualityPct": None, "estimatedSignalDbm": None, "signalDbmIsEstimate": False, "method": "unsupported-platform", "note": f"Unsupported platform: {system}."}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, body):
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            return self.send_json(403, {"available": False, "error": "Origin not allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "300")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"available": True, "service": "netspot-native-wifi-collector", "platform": platform.system()})
        if self.path == "/signal":
            return self.send_json(200, get_signal())
        return self.send_json(404, {"available": False, "error": "Not found"})

    def log_message(self, fmt, *args):
        # Keep local collector logs concise; never log signal contents or SSIDs.
        print("[netspot-collector] " + (fmt % args))


if __name__ == "__main__":
    print(f"NetSpot native Wi-Fi collector listening on http://{HOST}:{PORT}")
    print("Loopback only. Keep this service local; it does not accept remote connections.")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
