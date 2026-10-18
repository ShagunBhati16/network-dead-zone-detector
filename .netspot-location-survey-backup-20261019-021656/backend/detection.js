'use strict';

const DEFAULT_THRESHOLDS = Object.freeze({
  goodSignalMinDbm: -60,
  moderateSignalMinDbm: -75,
  poorSignalMinDbm: -85,
  goodLatencyMaxMs: 60,
  moderateLatencyMaxMs: 150,
  poorLatencyMaxMs: 300,
  goodLossMaxPct: 1,
  moderateLossMaxPct: 5,
  poorLossMaxPct: 25,
  repeatWindowMinutes: 30,
  minimumSamples: 3,
  deadZoneRepeatCount: 2,
  unstableDisconnectCount: 2
});

function finite(v) { if (v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function classifyMeasurement(m, thresholds = DEFAULT_THRESHOLDS) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const signal = finite(m.signalDbm ?? m.rssi ?? m.signal);
  const latency = finite(m.latencyMs ?? m.latency);
  const loss = finite(m.packetLossPct ?? m.loss);
  const connected = m.connected !== false && m.connectivityStatus !== 'disconnected';
  const gatewayReachable = m.gatewayReachable !== false;
  const internetReachable = m.internetReachable !== false;
  const serverReachable = m.serverReachable !== false;
  const reasons = [];
  let issueType = 'normal';

  // A strong Wi-Fi signal with a reachable gateway but failed internet/server probes
  // indicates an upstream service/outage, not a radio-coverage dead zone.
  if (connected && signal !== null && signal >= t.moderateSignalMinDbm && gatewayReachable && (!internetReachable || !serverReachable)) {
    issueType = 'internet-or-server-outage';
    reasons.push(!internetReachable ? 'Internet probe failed while Wi-Fi signal/gateway are available' : 'Target server probe failed while Wi-Fi signal/gateway are available');
  } else if (!connected || !gatewayReachable) {
    issueType = signal !== null && signal <= t.moderateSignalMinDbm ? 'weak-signal-or-local-connectivity' : 'local-connectivity-failure';
    reasons.push(!connected ? 'Device reports disconnected' : 'Local gateway probe failed');
  }
  if (signal !== null && signal < t.moderateSignalMinDbm) reasons.push(`Weak Wi-Fi RSSI (${signal} dBm)`);
  if (loss !== null && loss >= t.moderateLossMaxPct) reasons.push(`Elevated packet loss (${loss}%)`);
  if (latency !== null && latency >= t.poorLatencyMaxMs) reasons.push(`Very high latency (${latency} ms)`);

  let quality = 'Unknown';
  if (issueType === 'internet-or-server-outage') quality = 'Outage';
  else if (!connected || !gatewayReachable || (signal !== null && signal <= t.poorSignalMinDbm) || (loss !== null && loss >= t.poorLossMaxPct)) quality = 'Dead Zone';
  else if ((signal !== null && signal < t.moderateSignalMinDbm) || (loss !== null && loss >= t.moderateLossMaxPct) || (latency !== null && latency >= t.moderateLatencyMaxMs)) quality = 'Poor';
  else if ((signal !== null && signal < t.goodSignalMinDbm) || (loss !== null && loss >= t.goodLossMaxPct) || (latency !== null && latency >= t.goodLatencyMaxMs)) quality = 'Moderate';
  else if (signal !== null || latency !== null || loss !== null || m.connected !== undefined) quality = 'Good';
  if (issueType === 'local-connectivity-failure' && signal !== null && signal >= t.moderateSignalMinDbm) quality = 'Connectivity Failure';

  const available = [signal, latency, loss].filter(v => v !== null).length + (m.connected !== undefined ? 1 : 0) + (m.gatewayReachable !== undefined ? 1 : 0) + (m.internetReachable !== undefined ? 1 : 0);
  const confidence = available === 0 ? 0 : Math.min(90, 25 + available * 10 + (m.isMeasured !== false ? 10 : 0));
  return { quality, issueType, isDeadZone: quality === 'Dead Zone', confidence, reasons, classificationSource: 'threshold-rule-based', isMeasured: m.isMeasured !== false };
}

function classifySequence(samples, thresholds = DEFAULT_THRESHOLDS) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const ordered = [...samples].sort((a,b) => Date.parse(a.timestamp || 0) - Date.parse(b.timestamp || 0));
  const latest = ordered[ordered.length - 1] || {};
  const classifications = ordered.map(s => classifyMeasurement(s, t));
  const deadCount = classifications.filter(c => c.quality === 'Dead Zone').length;
  const outageCount = classifications.filter(c => c.quality === 'Outage').length;
  const disconnectCount = ordered.filter(s => s.connected === false || s.gatewayReachable === false).length;
  const measuredCount = ordered.filter(s => s.isMeasured !== false).length;
  const signals = ordered.map(s => finite(s.signalDbm ?? s.rssi)).filter(v => v !== null);
  const losses = ordered.map(s => finite(s.packetLossPct)).filter(v => v !== null);
  const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const avgSignalDbm = mean(signals);
  const signalSpreadDb = signals.length > 1 ? Math.max(...signals)-Math.min(...signals) : 0;
  const repeated = ordered.length >= t.minimumSamples;
  const repeatedDeadZone = deadCount >= t.deadZoneRepeatCount && repeated;
  const intermittent = disconnectCount >= t.unstableDisconnectCount && disconnectCount < ordered.length;
  let quality = classifyMeasurement(latest, t).quality;
  let issueType = classifyMeasurement(latest, t).issueType;
  if (outageCount >= Math.max(1, Math.ceil(ordered.length * 0.5)) && avgSignalDbm !== null && avgSignalDbm >= t.moderateSignalMinDbm) {
    quality = 'Outage'; issueType = 'internet-or-server-outage';
  } else if (repeatedDeadZone) {
    quality = 'Dead Zone'; issueType = 'repeated-dead-zone';
  } else if (intermittent) {
    quality = 'Unstable'; issueType = 'intermittent-connectivity';
  }
  const consistency = ordered.length ? Math.max(deadCount, outageCount, classifications.filter(c=>c.quality===quality).length) / ordered.length : 0;
  const quantityFactor = Math.min(1, ordered.length / Math.max(1, t.minimumSamples));
  const measurementFactor = ordered.length ? measuredCount / ordered.length : 0;
  const confidence = ordered.length ? Math.round(Math.min(99, 20 + quantityFactor * 35 + consistency * 30 + measurementFactor * 14)) : 0;
  const reasons = [...new Set(classifications.flatMap(c=>c.reasons))];
  if (repeatedDeadZone) reasons.push(`${deadCount} of ${ordered.length} recent samples classified as dead-zone conditions`);
  if (intermittent) reasons.push(`${disconnectCount} disconnect/local-gateway failures across ${ordered.length} samples`);
  if (signalSpreadDb > 15) reasons.push(`Highly variable RSSI (${signalSpreadDb} dB spread)`);
  return { ...classifyMeasurement(latest, t), quality, issueType, isDeadZone: quality === 'Dead Zone', confidence, sampleCount: ordered.length, repeatedDeadZone, intermittent, disconnectCount, deadZoneCount: deadCount, outageCount, avgSignalDbm: avgSignalDbm === null ? null : Number(avgSignalDbm.toFixed(1)), signalSpreadDb: Number(signalSpreadDb.toFixed(1)), averagePacketLossPct: mean(losses), reasons, classificationSource: 'repeated-threshold-analysis' };
}

module.exports = { DEFAULT_THRESHOLDS, classifyMeasurement, classifySequence };
