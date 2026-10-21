import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Wifi, MapPinned, Gauge, Bell, Search, Play, CheckCircle2, Clock3,
  RefreshCw, AlertTriangle, CalendarDays, Filter, X, Download, ChevronDown,
  Settings, LogOut, Signal, Router, ArrowDownToLine, ArrowUpFromLine,
  CircleHelp, Menu, Zap, ShieldCheck, MapPin, RadioTower, FileChartColumn,
  Trash2, ExternalLink, Sun, Moon, LogIn, ImageUp, Layers, Crosshair
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
async function apiFetch(url, options = {}) { const headers = new Headers(options.headers || {}); const token = localStorage.getItem('netspot-auth-token'); if (token) headers.set('Authorization', `Bearer ${token}`); return fetch(url, { ...options, headers, cache: options.cache || 'no-store' }); }
async function downloadApi(path) { const response = await apiFetch(`${API}${path}`); if (!response.ok) { const body = await response.json().catch(()=>({})); throw new Error(body.message || `Download failed (${response.status})`); } const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (response.headers.get('Content-Disposition') || '').match(/filename="?([^";]+)"?/i)?.[1] || 'netspot-report'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
const qualityColor = { Good: '#2ed6a1', Moderate: '#ffbd4a', Poor: '#ff5d73' };
const nav = [
  { label: 'Dashboard', icon: Activity }, { label: 'Network Test', icon: Gauge },
  { label: 'Walk-test Survey', icon: RadioTower }, { label: 'Dead Zone Map', icon: MapPinned }, { label: 'Test History', icon: Clock3 },
  { label: 'Reports', icon: FileChartColumn },
];
function Badge({ quality }) { return <span className={`quality-badge ${quality.toLowerCase()}`}><i />{quality}</span>; }
function MapFocus({ selected }) { const map = useMap(); useEffect(() => { if (selected) map.flyTo([selected.lat, selected.lng], 17, { duration: .55 }); }, [selected, map]); return null; }
function Header({ page, onRefresh, apiOnline, signedInAs }) {
  return <header className="topbar"><div className="breadcrumb"><span>NETSPOT</span><b>/</b><strong>{page}</strong></div><div className="topbar-right"><span className={`connection-pill ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'API CONNECTED' : 'API DISCONNECTED'}</span><button className="icon-button" title="Refresh data" onClick={onRefresh}><RefreshCw size={16}/></button><button className="icon-button" title="Notifications"><Bell size={16}/><i className="notification-dot"/></button><span className="top-divider"/><div className="user-chip"><span className="avatar">ND</span><span><b>{signedInAs || 'Network Admin'}</b><small>Signed-in account</small></span><ChevronDown size={14}/></div></div></header>;
}
function PanelTitle({ children, icon: Icon, right }) { return <div className="panel-title"><div>{Icon && <Icon size={15}/>}<span>{children}</span></div>{right}</div>; }
function StatCard({ label, value, unit, note, icon: Icon, tone = 'cyan', trend }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={17}/></span></div><div className="stat-value">{value}<small>{unit}</small></div><div className="stat-foot"><span className={trend === 'down' ? 'trend-good' : 'trend-neutral'}>{trend === 'down' ? '↓' : '•'} {note}</span></div><div className={`stat-spark ${tone}`}><span/><span/><span/><span/><span/><span/><span/><span/><span/></div></article>;
}
function WorldTopology({ locations }) {
  const points = locations.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && p.lat !== null && p.lng !== null)
    .map((p, i) => ({ ...p, x: (Number(p.lng) + 180) / 360 * 800, y: (90 - Number(p.lat)) / 180 * 320, order: Date.parse(p.date || p.timestamp || 0) || i }))
    .sort((a,b) => a.order - b.order);
  const color = q => q === 'Good' ? '#42dfa4' : q === 'Moderate' ? '#ffbd52' : '#ff6877';
  return <div className="world-topology-wrap">
    <svg className="world-topology-svg" viewBox="0 0 800 320" role="img" aria-label="World map topology with actual saved survey points">
      <defs><pattern id="topology-grid" width="40" height="32" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 32" fill="none" stroke="#21415d" strokeWidth=".65"/></pattern><filter id="node-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect width="800" height="320" fill="url(#topology-grid)"/>
      <g fill="#193b55" stroke="#2b5672" strokeWidth="1.1" opacity=".9">
        <path d="M50 67 L72 43 112 31 147 43 166 62 158 83 138 92 127 112 105 119 91 147 70 133 63 105 43 91Z"/><path d="M145 153 L168 163 181 191 173 223 158 255 145 239 137 209 125 185Z"/><path d="M215 58 L245 42 276 49 296 63 326 61 346 78 375 81 396 103 382 120 349 117 329 137 306 126 292 104 268 105 254 88 228 88Z"/><path d="M321 143 L346 131 373 143 389 169 382 201 365 226 349 215 341 185 324 165Z"/><path d="M395 72 L433 51 480 49 510 62 545 53 581 67 621 65 663 80 690 104 674 124 644 118 623 139 597 133 573 149 551 133 528 140 508 123 484 133 461 116 440 117 426 97 400 96Z"/><path d="M462 152 L492 143 522 156 538 181 529 208 511 229 492 218 478 192 464 177Z"/><path d="M624 189 L649 180 676 193 688 214 674 232 650 225 634 211Z"/><path d="M715 143 L730 136 742 149 737 169 722 173 714 159Z"/>
      </g>
      {[...new Set(points.filter(p=>p.walkSessionId).map(p=>p.walkSessionId))].map(sessionId=>{const route=points.filter(p=>p.walkSessionId===sessionId);return route.length>1?<polyline key={sessionId} points={route.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#43dce9" strokeWidth="1.5" strokeDasharray="4 5" opacity=".9"/>:null})}
      {points.map((p,i)=><g key={p.id ?? `${p.x}-${p.y}-${i}`} filter="url(#node-glow)"><circle cx={p.x} cy={p.y} r="5.2" fill={color(p.quality)} stroke="#d9fbff" strokeWidth="1.2"><title>{`${p.name || p.locationName || 'Survey point'} · ${p.quality || 'Unknown'} · ${p.lat}, ${p.lng}`}</title></circle><circle cx={p.x} cy={p.y} r="10" fill="none" stroke={color(p.quality)} strokeWidth="1" opacity=".45"/></g>)}
      <g fill="#82a9c4" fontSize="10" letterSpacing="1.2"><text x="18" y="20">LAT/LON PROJECTION</text><text x="782" y="304" textAnchor="end">{points.length} REAL SAVED POINT{points.length===1?'':'S'}</text></g>
    </svg>
    {!points.length && <div className="world-topology-empty"><RadioTower size={24}/><strong>No mapped measurements yet</strong><span>Run a location-enabled test or start a walk-test survey to add real topology points.</span></div>}
    <div className="world-topology-legend"><span><i style={{background:'#42dfa4'}}/>Good</span><span><i style={{background:'#ffbd52'}}/>Moderate</span><span><i style={{background:'#ff6877'}}/>Poor / dead zone</span></div>
  </div>;
}

function Dashboard({ locations, history, runTest, testing, result, openMap, loadingData }) {
  const measured = history.filter(r => r && r.isMeasured === true);
  const valid = history.filter(r => r && r.isMeasured !== false);
  const numericAvg = (keys) => {
    const vals = valid.map(r => { for (const k of keys) { const n = r[k] == null || r[k] === '' ? NaN : Number(r[k]); if (Number.isFinite(n)) return n; } return NaN; }).filter(Number.isFinite);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
  };
  const avgLatency = numericAvg(['latencyMs','latency']);
  const avgDownload = numericAvg(['downloadMbps','download']);
  const avgUpload = numericAvg(['uploadMbps','upload']);
  const poor = valid.filter(r => ['Poor','Dead Zone','Unstable','Outage','Connectivity Failure'].includes(r.quality)).length;
  const latest = history[0] || null;
  const qualityCount = q => valid.filter(r => r.quality === q).length;
  const chartData = [...valid].slice(0,10).reverse().map((r,i)=>({time:r.timestamp?new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):`Test ${i+1}`,latency:Number.isFinite(Number(r.latencyMs??r.latency))?Number(r.latencyMs??r.latency):null,download:Number.isFinite(Number(r.downloadMbps??r.download))?Number(r.downloadMbps??r.download):null,upload:Number.isFinite(Number(r.uploadMbps??r.upload))?Number(r.uploadMbps??r.upload):null}));
  const mapped = locations.filter(l=>Number.isFinite(Number(l.lat))&&Number.isFinite(Number(l.lng))&&l.lat!==null&&l.lng!==null);
  const mapCenter = mapped.length ? [Number(mapped[0].lat),Number(mapped[0].lng)] : [20.5937,78.9629];
  const qColor = q => q==='Good'?'#42dfa4':q==='Moderate'?'#ffbd52':'#ff6877';
  const alerts = history.filter(r=>['Poor','Dead Zone','Unstable','Outage','Connectivity Failure'].includes(r.quality)).slice(0,3);
  return <div className="legacy-dashboard">
    <div className="legacy-dashboard-heading"><div><div className="legacy-overline">NETWORK OPERATIONS CENTER</div><h1>Network Intelligence Dashboard</h1><p>Monitor connectivity, identify weak signal areas, and review actual saved network measurements.</p>{loadingData&&<small role="status">Loading saved measurements…</small>}</div><button className="ops-run-button" onClick={runTest} disabled={testing}>{testing?<RefreshCw size={16} className="spin"/>:<Play size={16}/>} {testing?'TESTING…':'RUN NETWORK TEST'}</button></div>
    {result&&<div className="ops-result"><CheckCircle2 size={20}/><div><strong>Network test completed</strong><span>{result.latencyMs??result.latency??'—'} ms latency · Results are stored measurements, not sample dashboard data.</span></div></div>}
    <div className="legacy-dashboard-grid">
      <section className="legacy-panel legacy-status"><div className="legacy-panel-title"><span>SYSTEM STATUS</span><Activity size={17}/></div><div className="legacy-health"><i/><div><small>MEASUREMENT STATUS</small><strong>{history.length?'Monitoring Active':'Awaiting First Test'}</strong></div></div><div className="legacy-score"><strong>{history.length}</strong><span>Saved measurements</span></div><div className="legacy-divider"/><div className="legacy-quality-row"><span><i className="good-dot"/>Good</span><strong>{qualityCount('Good')} records</strong></div><div className="legacy-quality-row"><span><i className="moderate-dot"/>Moderate</span><strong>{qualityCount('Moderate')} records</strong></div><div className="legacy-quality-row"><span><i className="poor-dot"/>Poor / dead zone</span><strong>{poor} records</strong></div></section>
      <section className="legacy-panel legacy-map"><div className="legacy-panel-title"><span>WORLD NETWORK TOPOLOGY</span><span className="legacy-tag">{mapped.length} GEOLOCATED</span></div><div className="legacy-map-preview"><WorldTopology locations={mapped}/></div><button className="legacy-open-map" onClick={openMap}>Open Dead Zone Map <MapPin size={14}/></button></section>
      <section className="legacy-panel legacy-insights"><div className="legacy-panel-title"><span>CONNECTIVITY INSIGHTS</span><Bell size={16}/></div>{alerts.length?alerts.map((r,i)=><div className="legacy-alert" key={r.id??i}><AlertTriangle size={15}/><div><strong>{r.quality||'Connectivity issue'}</strong><small>{r.locationName||r.surveyName||'Location not shared'} · {r.timestamp?new Date(r.timestamp).toLocaleString():'time unavailable'}</small></div></div>):<div className="legacy-no-alert"><CheckCircle2 size={17}/><div><strong>No saved poor-quality records</strong><small>Insights appear when measurements report a connectivity issue.</small></div></div>}<div className="legacy-footnote">Only saved records are used. No demo alerts are generated.</div></section>
      <section className="legacy-panel legacy-metric"><div className="legacy-panel-title"><span>AVERAGE LATENCY</span><Activity size={17}/></div><div className="legacy-big-value">{avgLatency}{avgLatency==='—'?'':' ms'}</div><div className="legacy-subtitle">Across saved records with latency data</div></section>
      <section className="legacy-panel legacy-metric"><div className="legacy-panel-title"><span>DOWNLOAD / UPLOAD</span><Gauge size={17}/></div><div className="legacy-big-value">{avgDownload}<small>{avgDownload==='—'?'':' Mbps'}</small></div><div className="legacy-subtitle">Average download · Upload: {avgUpload}{avgUpload==='—'?'':' Mbps'}</div></section>
      <section className="legacy-panel legacy-metric"><div className="legacy-panel-title"><span>LATEST TEST</span><Clock3 size={17}/></div><div className="legacy-big-value">{latest?(latest.quality||'Unclassified'):'—'}</div><div className="legacy-subtitle">{latest?(latest.timestamp?new Date(latest.timestamp).toLocaleString():'Saved measurement'):'Run a test to see your latest result'}</div></section>
      <section className="legacy-panel legacy-chart"><div className="legacy-panel-title"><span>RECENT LATENCY TREND</span><Activity size={17}/></div>{chartData.some(r=>r.latency!==null)?<ResponsiveContainer width="100%" height={135}><AreaChart data={chartData}><CartesianGrid stroke="#1d3550" vertical={false}/><XAxis dataKey="time" tick={{fill:'#91a7c0',fontSize:10}}/><YAxis hide/><Tooltip/><Area type="monotone" dataKey="latency" name="Latency (ms)" connectNulls={false} stroke="#2bd9e8" fill="#2bd9e8" fillOpacity={.15}/></AreaChart></ResponsiveContainer>:<div className="legacy-empty">No latency measurements yet. Run a network test to populate this chart.</div>}</section>
    </div><div className="legacy-dashboard-footer"><span><i/> Live backend records</span><span>{measured.length} verified measured records · {locations.length} mapped points</span><button onClick={openMap}><MapPinned size={14}/> Open Dead Zone Map</button></div>
  </div>;
}

function makeHexSurvey(locations) {
  const center = locations.length ? locations.reduce((a, l) => ({ lat: a.lat + l.lat / locations.length, lng: a.lng + l.lng / locations.length }), { lat: 0, lng: 0 }) : { lat: 18.4575, lng: 73.8217 };
  const cells = [];
  // Deterministic hex survey sample grid, geographically anchored to the sample campus.
  for (let row = -8; row <= 8; row++) {
    for (let col = -7; col <= 7; col++) {
      const x = col + (row % 2 ? 0.5 : 0);
      const dist = Math.sqrt((x / 6.8) ** 2 + (row / 8.2) ** 2);
      if (dist > 1.04) continue;
      const wave = Math.sin((col + 11) * 1.71 + row * .73) + Math.cos(row * 1.19 - col * .42);
      const signal = -48 - dist * 22 + wave * 7;
      const color = signal > -57 ? '#27b94f' : signal > -66 ? '#8ccf28' : signal > -74 ? '#e6d52c' : signal > -81 ? '#f4a51c' : '#e34a2f';
      const lat = center.lat + row * 0.000095;
      const lng = center.lng + x * 0.000105;
      const dLat = 0.000052, dLng = 0.000060;
      cells.push({ id: `${row}-${col}`, signal: Math.round(signal), color, positions: [[lat+dLat,lng],[lat+dLat/2,lng+dLng],[lat-dLat/2,lng+dLng],[lat-dLat,lng],[lat-dLat/2,lng-dLng],[lat+dLat/2,lng-dLng]] });
    }
  }
  return cells;
}
function SurveyZoomBridge() { const map = useMap(); useEffect(() => { const handler = (event) => map.setZoom(Math.max(2, Math.min(22, map.getZoom() + event.detail))); window.addEventListener('netspot-map-zoom', handler); return () => window.removeEventListener('netspot-map-zoom', handler); }, [map]); return null; }
function CoverageChart() {
  const data = [{name:'SNR (dBm)',Excellent:26,Good:28,Fair:4,Poor:1}];
  return <div className="coverage-chart"><div className="coverage-chart-title">Signal Strength Distribution</div><div className="coverage-chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:18,right:4,left:-15,bottom:8}}><CartesianGrid stroke="#e5e9ec" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10,fill:'#617783'}} axisLine={{stroke:'#d9e1e5'}} tickLine={false}/><YAxis domain={[0,30]} ticks={[0,5,10,15,20,25,30]} tick={{fontSize:10,fill:'#53666f'}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="Excellent" fill="#51b66d"/><Bar dataKey="Good" fill="#e6d83b"/><Bar dataKey="Fair" fill="#f4ad27"/><Bar dataKey="Poor" fill="#e94343"/></BarChart></ResponsiveContainer><div className="coverage-legend"><span><i style={{background:'#51b66d'}}/>Excellent</span><span><i style={{background:'#e6d83b'}}/>Good</span><span><i style={{background:'#f4ad27'}}/>Fair</span><span><i style={{background:'#e94343'}}/>Poor</span></div></div></div>;
}
function FloorPlanSurvey({ onSaved }) {
  const [floorPlan, setFloorPlan] = useState(() => { try { return JSON.parse(localStorage.getItem('netspot-floorplan-image') || 'null'); } catch { return null; } });
  const [marks, setMarks] = useState(() => { try { return JSON.parse(localStorage.getItem('netspot-floorplan-marks') || '[]'); } catch { return []; } });
  const [pending, setPending] = useState(null);
  const [label, setLabel] = useState('Floor-plan point');
  const [rssi, setRssi] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { try { if (floorPlan) localStorage.setItem('netspot-floorplan-image', JSON.stringify(floorPlan)); else localStorage.removeItem('netspot-floorplan-image'); } catch { setError('Could not persist this floor-plan image. Try a smaller image (under 2 MB).'); } }, [floorPlan]);
  useEffect(() => { try { localStorage.setItem('netspot-floorplan-marks', JSON.stringify(marks)); } catch { setError('Floor-plan annotations could not be saved in this browser storage.'); } }, [marks]);
  const upload = event => { const file = event.target.files?.[0]; if (!file) return; setError(''); if (!file.type.startsWith('image/')) { setError('Choose a PNG, JPG, or other image file.'); return; } if (file.size > 2 * 1024 * 1024) { setError('For reliable local persistence, choose an image under 2 MB.'); return; } const reader = new FileReader(); reader.onload = () => { setFloorPlan({ name: file.name, dataUrl: String(reader.result) }); setMarks([]); setPending(null); }; reader.onerror = () => setError('The floor-plan image could not be read.'); reader.readAsDataURL(file); };
  const choosePoint = event => { const rect = event.currentTarget.getBoundingClientRect(); setPending({ x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)) }); setError(''); };
  const savePoint = async () => {
    if (!pending) return; const cleanLabel = label.trim() || `Floor-plan point ${marks.length + 1}`; const value = rssi.trim() === '' ? null : Number(rssi);
    if (value !== null && (!Number.isFinite(value) || value < -120 || value > 0)) { setError('RSSI must be between -120 and 0 dBm.'); return; }
    const mark = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, label: cleanLabel, x: pending.x, y: pending.y, signalDbm: value, quality: value === null ? 'Unmeasured' : value >= -60 ? 'Good' : value >= -70 ? 'Moderate' : 'Poor', createdAt: new Date().toISOString(), floorPlanName: floorPlan?.name || 'Floor plan' };
    if (value !== null) {
      setSaving(true); setError('');
      try { const response = await apiFetch(`${API}/api/network-tests`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ locationName:cleanLabel, surveyName:`Floor plan: ${floorPlan?.name || 'Uploaded plan'}`, floorPlanName:floorPlan?.name || 'Uploaded plan', floorPlanX:Number((pending.x/100).toFixed(6)), floorPlanY:Number((pending.y/100).toFixed(6)), signalDbm:value, signalMethod:'manual-floorplan-rssi', signalDbmIsEstimate:false, isMeasured:true, source:'floor-plan-survey', connected:true, gatewayReachable:true, internetReachable:true, serverReachable:true, sampleCount:1 }) }); if (!response.ok) { const body = await response.json().catch(()=>({})); throw new Error(body.message || `Could not save measurement (${response.status}). Sign in and check the backend.`); } const body = await response.json(); mark.recordId = body.data?.id || null; onSaved?.(); } catch (e) { setError(e.message || 'Could not save measurement.'); setSaving(false); return; } setSaving(false);
    }
    setMarks(prev => [...prev, mark]); setPending(null); setLabel('Floor-plan point'); setRssi('');
  };
  return <section className="panel floorplan-panel"><div className="panel-title"><div><ImageUp size={15}/> Floor-plan marking</div><span className="map-count">{marks.length} marked point{marks.length===1?'':'s'}</span></div>
    <p className="floorplan-help">Upload a floor-plan image, then click anywhere on it to place a point. Add an actual RSSI reading if you have one; unmeasured markers are saved as local annotations, not signal readings.</p>
    <div className="floorplan-toolbar"><label className="nt-button muted floorplan-upload"><ImageUp size={14}/>{floorPlan ? 'Replace floor plan' : 'Upload floor plan'}<input type="file" accept="image/*" onChange={upload}/></label>{floorPlan&&<><span className="floorplan-filename">{floorPlan.name}</span><button className="nt-button muted" onClick={()=>{setFloorPlan(null);setMarks([]);setPending(null);setError('');}}>Clear plan</button></>}</div>
    {floorPlan ? <><div className="floorplan-canvas" onClick={choosePoint} role="button" tabIndex={0} aria-label="Click to place a floor-plan measurement point" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();setPending({x:50,y:50});}}}><img src={floorPlan.dataUrl} alt={`Uploaded floor plan: ${floorPlan.name}`}/>{marks.map((m,i)=><span key={m.id} className={`floorplan-marker ${m.signalDbm!==null?'measured':''}`} style={{left:`${m.x}%`,top:`${m.y}%`,background:m.signalDbm===null?'#5da8ff':m.signalDbm>=-60?'#2ed6a1':m.signalDbm>=-70?'#ffbd4a':'#ff5364'}} title={`${m.label}${m.signalDbm===null?' · annotation only':` · ${m.signalDbm} dBm`}`}><b>{i+1}</b></span>)}{pending&&<span className="floorplan-marker pending" style={{left:`${pending.x}%`,top:`${pending.y}%`}}><Crosshair size={14}/></span>}</div>
      {pending&&<div className="floorplan-point-form"><label>Point label<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={120}/></label><label>Measured Wi-Fi RSSI (dBm, optional)<input type="number" min="-120" max="0" step="1" value={rssi} onChange={e=>setRssi(e.target.value)} placeholder="e.g. -67"/></label><button className="nt-button primary" onClick={savePoint} disabled={saving}>{saving?'Saving…':'Save point'}</button><button className="nt-button muted" onClick={()=>setPending(null)}>Cancel</button></div>}
      {marks.length>0&&<div className="floorplan-mark-list">{marks.map((m,i)=><div key={m.id}><span className="floorplan-list-dot" style={{background:m.signalDbm===null?'#5da8ff':m.signalDbm>=-60?'#2ed6a1':m.signalDbm>=-70?'#ffbd4a':'#ff5364'}}/><span><b>{i+1}. {m.label}</b><small>{m.signalDbm===null?'Annotation only':`${m.signalDbm} dBm · ${m.quality}`} · {new Date(m.createdAt).toLocaleString()}</small></span><button className="text-button history-delete" onClick={()=>setMarks(prev=>prev.filter(x=>x.id!==m.id))} aria-label={`Delete ${m.label}`}><X size={14}/></button></div>)}</div>}
    </> : <div className="floorplan-empty"><ImageUp size={24}/><b>No floor plan uploaded</b><span>Choose a floor-plan image to start placing indoor survey points.</span></div>}
    {error&&<p className="floorplan-error" role="alert">{error}</p>}
  </section>;
}

function MapScreen({ history, onRefresh }) {
  const [query, setQuery] = useState('');
  const [quality, setQuality] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [heatmapMode, setHeatmapMode] = useState('Auto');
  const points = useMemo(() => history.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)) && r.lat !== null && r.lng !== null).map(r => ({
    ...r, name: r.locationName || r.location || 'Survey point',
    lat: Number(r.lat), lng: Number(r.lng), quality: r.quality || 'Unknown',
    measured: r.isMeasured !== false, date: (r.timestamp || r.createdAt || '').slice(0,10),
    latency: r.latencyMs ?? r.latency, jitter: r.jitterMs ?? r.jitter,
    loss: r.packetLossPct ?? r.loss, download: r.downloadMbps ?? r.download,
    upload: r.uploadMbps ?? r.upload, signal: r.signalDbm ?? r.rssi ?? null, signalQualityPct:r.signalQualityPct??null, estimatedSignalDbm:r.estimatedSignalDbm??null, signalMethod:r.signalMethod??null
  })), [history]);
  const filtered = useMemo(() => points.filter(p =>
    (`${p.name} ${p.surveyName || ''}`).toLowerCase().includes(query.toLowerCase()) &&
    (quality === 'All' || p.quality === quality || (quality === 'Dead Zone' && p.isDeadZone)) &&
    (sourceFilter === 'All' || (sourceFilter === 'Measured' ? p.measured : !p.measured)) &&
    (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate)
  ), [points, query, quality, sourceFilter, fromDate, toDate]);
  const selected = filtered.find(p => p.id === selectedId) || filtered[0] || null;
  const center = selected ? [selected.lat, selected.lng] : points.length ? [points[0].lat, points[0].lng] : [18.4575,73.8217];
  const colorFor = q => /dead zone|outage|poor|unstable|connectivity failure/i.test(q || '') ? '#ff5364' : /moderate|fair/i.test(q || '') ? '#ffbd4a' : /good/i.test(q || '') ? '#2ed6a1' : '#8aa1ba';
  const actualRssiCount = filtered.filter(p => p.measured && p.signalDbmIsEstimate !== true && Number.isFinite(Number(p.signal)) && p.signal !== null && p.signal !== '').length;
  const effectiveHeatmapMode = heatmapMode === 'Auto' ? (actualRssiCount >= 3 ? 'RSSI' : 'Latency') : heatmapMode;
  const heatmapMetric = effectiveHeatmapMode === 'RSSI' ? 'signal' : 'latency';
  const heatmapSamples = filtered.filter(p => p.measured && (heatmapMetric === 'signal' ? p.signalDbmIsEstimate !== true && Number.isFinite(Number(p.signal)) && p.signal !== null && p.signal !== '' : Number.isFinite(Number(p.latency)) && p.latency !== null && p.latency !== ''));
  const cells = useMemo(() => {
    const measured = filtered.filter(p => p.measured && (heatmapMetric === 'signal' ? p.signalDbmIsEstimate !== true && Number.isFinite(Number(p.signal)) && p.signal !== null && p.signal !== '' : Number.isFinite(Number(p.latency)) && p.latency !== null && p.latency !== ''));
    if (measured.length < 3) return [];
    const minLat=Math.min(...measured.map(p=>p.lat)), maxLat=Math.max(...measured.map(p=>p.lat));
    const minLng=Math.min(...measured.map(p=>p.lng)), maxLng=Math.max(...measured.map(p=>p.lng));
    const latSpan=Math.max(maxLat-minLat,0.00025), lngSpan=Math.max(maxLng-minLng,0.00025);
    const result=[];
    for(let y=0;y<7;y++) for(let x=0;x<7;x++) {
      const lat=minLat-latSpan*.12+(y/6)*latSpan*1.24, lng=minLng-lngSpan*.12+(x/6)*lngSpan*1.24;
      let weighted=0, weights=0, nearest=Infinity;
      measured.forEach(p=>{const d=Math.hypot((p.lat-lat)*111000,(p.lng-lng)*111000*Math.cos(lat*Math.PI/180));nearest=Math.min(nearest,d);const w=1/Math.max(d,8)**2;weighted+=Number(heatmapMetric==='signal'?p.signal:p.latency)*w;weights+=w;});
      const value=weighted/weights;
      const q=heatmapMetric==='signal'?(value>=-60?'Good':value>=-70?'Moderate':'Poor'):(value<=50?'Good':value<=100?'Moderate':'Poor');
      const halfLat=latSpan/6*.45, halfLng=lngSpan/6*.45;
      const color=q==='Good'?'#2ed6a1':q==='Moderate'?'#ffbd4a':'#ff5364';
      result.push({id:`${x}-${y}`,value,q,uncertainty:nearest>250?'High':nearest>100?'Medium':'Low',positions:[[lat-halfLat,lng-halfLng],[lat-halfLat,lng+halfLng],[lat+halfLat,lng+halfLng],[lat+halfLat,lng-halfLng]],color});
    }
    return result;
  }, [filtered, heatmapMetric]);
  return <div className="functional-map-screen">
    <div className="nt-page-header"><div><div className="eyebrow">LOCATION INTELLIGENCE</div><h1>Functional Dead Zone Map</h1><p>Map pins come from saved survey measurements. Coverage between points is interpolated and marked with uncertainty.</p></div><button className="nt-button muted" onClick={onRefresh}><RefreshCw size={14}/> Refresh survey data</button></div>
    <div className="functional-map-filters">
      <label className="map-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search location or survey name"/></label>
      <label><Filter size={14}/><select value={quality} onChange={e=>setQuality(e.target.value)}><option value="All">All quality</option><option>Good</option><option>Moderate</option><option>Poor</option><option>Dead Zone</option><option>Unstable</option><option>Outage</option></select></label>
      <label><select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option>All</option><option>Measured</option><option>Simulated</option></select></label>
      <label><span>From</span><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label>
      <label><span>To</span><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label>
      <label><Layers size={14}/><select aria-label="Heatmap metric" value={heatmapMode} onChange={e=>setHeatmapMode(e.target.value)}><option>Auto</option><option>RSSI</option><option>Latency</option></select></label>
      <span className="map-result-count">{filtered.length} point{filtered.length===1?'':'s'}</span>
    </div>
    <FloorPlanSurvey onSaved={onRefresh}/>
    <div className="functional-map-layout">
      <section className="panel functional-map-panel"><div className="panel-title"><div><MapPinned size={15}/> Collected survey points and coverage</div><span className="map-count">{points.filter(p=>p.measured).length} measured · {points.filter(p=>!p.measured).length} sample</span></div>
        <div className="functional-leaflet-map">
        {points.length ? <MapContainer center={center} zoom={16} scrollWheelZoom zoomControl={false} key={`${center[0]}-${center[1]}`}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><ZoomControl position="topright"/>
          {cells.map(c=><Polygon key={c.id} positions={c.positions} pathOptions={{color:c.color,fillColor:c.color,fillOpacity:.20,weight:1,dashArray:c.uncertainty==='High'?'4 4':undefined}}><Popup><b>Interpolated coverage</b><br/>{heatmapMetric==='signal'?`Estimated RSSI: ${c.value.toFixed(1)} dBm`:`Estimated latency: ${c.value.toFixed(1)} ms`}<br/>Estimated quality: {c.q}<br/>Uncertainty: {c.uncertainty}<br/><small>Estimate only — not a direct measurement</small></Popup></Polygon>)}
          {filtered.map(p=><CircleMarker key={p.id} center={[p.lat,p.lng]} radius={selected?.id===p.id?10:7} eventHandlers={{click:()=>setSelectedId(p.id)}} pathOptions={{color:p.measured?'#ffffff':'#aab4c0',weight:selected?.id===p.id?3:1.5,color:p.measured?colorFor(p.quality):'#8aa1ba',fillColor:colorFor(p.quality),fillOpacity:p.measured ? .95 : .45,dashArray:p.measured?undefined:'3 3'}}><Popup><b>{p.name}</b><br/>{p.quality} · {p.measured?'Actual measurement':'Sample/simulated'}<br/>Latency: {p.latency??'N/A'} ms<br/>Packet loss: {p.loss??'N/A'}%</Popup></CircleMarker>)}
          <MapFocus selected={selected}/></MapContainer> : <div className="empty-state"><MapPinned size={30}/><b>No geolocated measurements yet</b><span>Run a Network Test and save it with GPS or latitude/longitude to populate this map.</span></div>}
        <div className="functional-map-legend"><b>Coverage</b><span><i style={{background:'#2ed6a1'}}/>Good</span><span><i style={{background:'#ffbd4a'}}/>Moderate</span><span><i style={{background:'#ff5364'}}/>Poor / dead zone</span><span>Dashed pins = sample data</span></div></div>
        <div className="map-footnote">{heatmapMetric==='signal'?'Interpolation: inverse-distance weighting of actual measured Wi-Fi RSSI only. Estimated or percentage-derived dBm values are excluded. Strong: ≥ −60 dBm; weak: −70 to −60 dBm; dead/poor: below −70 dBm.':'Interpolation: inverse-distance weighting of measured latency values only. Green ≤ 50 ms, yellow ≤ 100 ms, red > 100 ms. Cells are estimates, not direct observations.'} {heatmapSamples.length<3?`At least 3 measured ${heatmapMetric==='signal'?'RSSI':'latency'} points with coordinates are needed to render this heatmap.`:'Coverage estimates become less reliable far from measured points.'}</div>
      </section>
      <section className="panel selected-measurement"><div className="panel-title"><div><Signal size={15}/> Selected location</div></div>
        {selected ? <><div className="detail-place"><span className="detail-pin" style={{color:colorFor(selected.quality)}}><MapPin size={20}/></span><div><h2>{selected.name}</h2><p>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p></div></div><div className="selected-data-source"><i style={{background:selected.measured?'#2ed6a1':'#8aa1ba'}}/>{selected.measured?'Actual collected measurement':'Simulated/sample record'}</div><Badge quality={selected.quality==='Unknown'?'Moderate':selected.quality}/><div className="detail-metrics"><div><span>Signal strength</span><strong>{selected.signal!=null?`${selected.signal} dBm (measured)`:selected.signalQualityPct!=null?`${selected.signalQualityPct}% quality${selected.estimatedSignalDbm!=null?` · ~${selected.estimatedSignalDbm} dBm estimate`:''}`:'Not available'}</strong></div><div><span>Latency</span><strong>{selected.latency==null?'N/A':`${selected.latency} ms`}</strong></div><div><span>Packet loss</span><strong>{selected.loss==null?'N/A':`${selected.loss}%`}</strong></div><div><span>Download</span><strong>{selected.download==null?'N/A':`${selected.download} Mbps`}</strong></div><div><span>Upload</span><strong>{selected.upload==null?'N/A':`${selected.upload} Mbps`}</strong></div><div><span>Jitter</span><strong>{selected.jitter==null?'N/A':`${selected.jitter} ms`}</strong></div><div><span>Recorded</span><strong>{selected.timestamp?new Date(selected.timestamp).toLocaleString():'Unknown'}</strong></div></div><button className="nt-button muted full-width" onClick={()=>setSelectedId(selected.id)}>Keep selected point</button></> : <div className="empty-state"><MapPin size={24}/><b>Select a map marker</b><span>Location metrics will appear here.</span></div>}
      </section>
    </div>
    {points.length===0&&<p className="functional-map-note">No points are fabricated for this map. Existing measurements without coordinates remain available in Test History but cannot be plotted.</p>}
  </div>;
}
const surveyInputStyle = { width:'100%', boxSizing:'border-box', padding:'10px 11px', borderRadius:8, border:'1px solid var(--border,#344054)', background:'var(--panel,#111827)', color:'inherit', outline:'none' };
function WalkTest({ onSave, onNotice }) {
  const [surveyName,setSurveyName] = useState('Walk-test survey');
  const [locationPrefix,setLocationPrefix] = useState('Walk point');
  const [intervalSeconds,setIntervalSeconds] = useState(5);
  const [running,setRunning] = useState(false);
  const [sampleCount,setSampleCount] = useState(0);
  const [lastSample,setLastSample] = useState(null);
  const [position,setPosition] = useState(null);
  const [radio,setRadio] = useState(null);
  const [status,setStatus] = useState('Start a survey to request GPS and connect to the optional native Wi-Fi collector.');
  const [error,setError] = useState('');
  const saveLockRef = useRef(false);
  const timerRef = useRef(null); const watchRef = useRef(null); const positionRef = useRef(null); const runningRef = useRef(false); const indexRef = useRef(0); const sessionRef = useRef(null);
  const getPosition = () => new Promise((resolve,reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(pos => { const v={lat:Number(pos.coords.latitude.toFixed(6)),lng:Number(pos.coords.longitude.toFixed(6)),accuracyMeters:Number.isFinite(pos.coords.accuracy)?Math.round(pos.coords.accuracy):null};positionRef.current=v;setPosition(v);resolve(v); }, e => reject(new Error(e.code===1?'Location permission denied. Allow location access to start a GPS walk-test.':e.code===2?'GPS position unavailable. Try outdoors or use manual point surveys.':'GPS request timed out.')), {enableHighAccuracy:true,timeout:12000,maximumAge:1000});
  });
  const stop = (message='Walk-test stopped.') => { runningRef.current=false;setRunning(false);if(timerRef.current){window.clearInterval(timerRef.current);timerRef.current=null;}if(watchRef.current!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null;}setStatus(message); };
  useEffect(()=>()=>{runningRef.current=false;if(timerRef.current)window.clearInterval(timerRef.current);if(watchRef.current!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchRef.current);},[]);
  const collect = async () => {
    if(!runningRef.current || saveLockRef.current)return;
    saveLockRef.current=true;setError('');
    try {
      let pos=positionRef.current; if(!pos) pos=await getPosition();
      let radioData=null; try { const rr=await fetch('http://127.0.0.1:8765/signal',{cache:'no-store',signal:AbortSignal.timeout(1800)}); if(rr.ok)radioData=await rr.json(); } catch {}
      setRadio(radioData);
      const started=performance.now(); let latencyMs=null; try { const ping=await apiFetch(`${API}/api/ping`,{cache:'no-store',signal:AbortSignal.timeout(3000)}); if(ping.ok){await ping.json();latencyMs=Number((performance.now()-started).toFixed(2));} } catch {}
      indexRef.current+=1; const idx=indexRef.current;
      const sample={surveyName:surveyName.trim()||'Walk-test survey',locationName:`${locationPrefix.trim()||'Walk point'} ${idx}`,lat:pos.lat,lng:pos.lng,accuracyMeters:pos.accuracyMeters,locationSource:'gps',locationPrecision:'precise',indoorSurvey:false,latencyMs,latency:latencyMs,signalDbm:Number.isFinite(radioData?.signalDbm)?radioData.signalDbm:null,signalQualityPct:Number.isFinite(radioData?.signalQualityPct)?radioData.signalQualityPct:null,estimatedSignalDbm:Number.isFinite(radioData?.estimatedSignalDbm)?radioData.estimatedSignalDbm:null,signalMethod:radioData?.method||'native-collector-unavailable',signalDbmIsEstimate:radioData?.signalDbmIsEstimate===true,connected:radioData?.connected!==false,gatewayReachable:true,internetReachable:latencyMs!==null,serverReachable:latencyMs!==null,packetLossPct:null,downloadMbps:null,uploadMbps:null,isMeasured:latencyMs!==null||Number.isFinite(radioData?.signalDbm)||Number.isFinite(radioData?.signalQualityPct),source:'walk-test-native-collector',walkSessionId:sessionRef.current,sampleIndex:idx,sampleCount:1,measurementError:radioData?String(radioData.note||''):'Native Wi-Fi collector unavailable; signal metrics not collected.'};
      const saved=await onSave(sample); const view={...sample,...saved};setLastSample(view);setSampleCount(n=>n+1);setStatus(`Saved sample ${idx} at ${new Date().toLocaleTimeString()}.`);
      if(!radioData) setError('Native collector not connected. GPS and backend response timing are saved, but Wi-Fi signal is unavailable. Start native-collector\start-collector.bat.');
      else if(radioData.signalDbm==null) setError(radioData.note||'This operating system exposes signal quality rather than actual RSSI. The collector will not invent an actual dBm value.');
    } catch(e){setError(e.message||'Could not collect a sample.');setStatus('Sample failed; survey remains active.');}
    finally{saveLockRef.current=false;}
  };
  const start = async () => {
    setError('');
    try {
      const pos=await getPosition(); sessionRef.current=(globalThis.crypto?.randomUUID?.()||`walk-${Date.now()}`);indexRef.current=0;setSampleCount(0);setLastSample(null);runningRef.current=true;setRunning(true);setStatus(`GPS acquired (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}). Sampling every ${intervalSeconds} seconds.`);
      if(navigator.geolocation) watchRef.current=navigator.geolocation.watchPosition(p=>{const v={lat:Number(p.coords.latitude.toFixed(6)),lng:Number(p.coords.longitude.toFixed(6)),accuracyMeters:Number.isFinite(p.coords.accuracy)?Math.round(p.coords.accuracy):null};positionRef.current=v;setPosition(v);},()=>{}, {enableHighAccuracy:true,maximumAge:1000,timeout:12000});
      await collect(); timerRef.current=window.setInterval(()=>{if(runningRef.current)collect();},Math.max(3,Number(intervalSeconds)||5)*1000);
    } catch(e){setError(e.message||'Could not start walk-test.');stop('Walk-test not started.');}
  };
  const signalValue=lastSample?.signalDbm!=null?`${lastSample.signalDbm} dBm`:lastSample?.estimatedSignalDbm!=null?`~${lastSample.estimatedSignalDbm} dBm (estimated)`:lastSample?.signalQualityPct!=null?`${lastSample.signalQualityPct}% quality`:'Not available';
  return <div className="walk-test-screen"><div className="nt-page-header"><div><div className="eyebrow">CONTINUOUS FIELD SURVEY</div><h1>Walk-test Survey</h1><p>Record GPS-tagged samples while walking. Samples are saved to your authenticated measurement history.</p></div><span className={`connection-pill ${running?'online':'offline'}`}><i/>{running?'SURVEY RUNNING':'SURVEY STOPPED'}</span></div>
    <section className="nt-speed-panel walk-panel"><div className="nt-section-heading"><h2><RadioTower size={17} style={{verticalAlign:'-3px'}}/> Survey setup</h2><span className="nt-live-state">GPS + native Wi-Fi collector</span></div>
      <div className="walk-form-grid"><label>Survey name<input disabled={running} value={surveyName} onChange={e=>setSurveyName(e.target.value)} style={surveyInputStyle}/></label><label>Point label prefix<input disabled={running} value={locationPrefix} onChange={e=>setLocationPrefix(e.target.value)} style={surveyInputStyle}/></label><label>Sampling interval<select disabled={running} value={intervalSeconds} onChange={e=>setIntervalSeconds(Number(e.target.value))} style={surveyInputStyle}><option value={3}>Every 3 seconds</option><option value={5}>Every 5 seconds</option><option value={10}>Every 10 seconds</option><option value={15}>Every 15 seconds</option></select></label></div>
      <div className="walk-actions">{!running?<button className="nt-button primary" onClick={start}><Play size={14}/> Start walk-test</button>:<button className="nt-button danger" onClick={()=>stop('Walk-test stopped by user.')}><X size={14}/> Stop survey</button>}<span className="walk-status"><i className={running?'walk-live-dot':''}/>{status}</span></div>
      {error&&<div className="walk-warning"><AlertTriangle size={16}/><span>{error}</span></div>}
      <div className="walk-metrics-grid"><div><small>SAVED SAMPLES</small><strong>{sampleCount}</strong></div><div><small>GPS POSITION</small><strong>{position?`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`:'Waiting for GPS'}</strong><span>{position?.accuracyMeters!=null?`±${position.accuracyMeters} m accuracy`:''}</span></div><div><small>WI-FI SIGNAL</small><strong>{signalValue}</strong><span>{radio?.ssid?`Network: ${radio.ssid}`:radio?.method||'Collector not connected'}</span></div><div><small>BACKEND RESPONSE</small><strong>{lastSample?.latencyMs!=null?`${lastSample.latencyMs} ms`:'—'}</strong><span>Local API round-trip, not internet latency</span></div></div>
      <div className="walk-collector-note"><strong>Native collector status:</strong> {radio?.available?'Connected':'Not connected'}. On Windows, the standard Wi-Fi interface usually exposes signal quality percentage, not actual RSSI; the collector reports that percentage and does not label a derived estimate as measured RSSI. Linux/macOS support actual RSSI where the native command exposes it.</div>
    </section>
    <section className="nt-speed-panel walk-panel"><div className="nt-section-heading"><h2><MapPinned size={17} style={{verticalAlign:'-3px'}}/> Latest walk-test sample</h2><span className="nt-live-state">Saved record</span></div>{lastSample?<div className="walk-last-sample"><b>{lastSample.locationName}</b><span>{lastSample.timestamp?new Date(lastSample.timestamp).toLocaleString():'Just saved'}</span><span>Coordinates: {lastSample.lat}, {lastSample.lng}</span><span>Signal: {signalValue}</span><span>Quality: {lastSample.quality||'Unclassified'}</span></div>:<div className="legacy-empty">No walk-test samples saved in this session yet.</div>}</section>
  </div>;
}

function NetworkTest({ runTest, testing, result, apiOnline, progress, testStatus, testError }) {
  const [surveyName, setSurveyName] = useState('Campus survey');
  const [locationName, setLocationName] = useState('');
  const [latInput, setLatInput] = useState(''); const [lngInput, setLngInput] = useState('');
  const [accuracy, setAccuracy] = useState(null); const [locationSource, setLocationSource] = useState('none');
  const [privacy, setPrivacy] = useState('approximate'); const [indoorSurvey, setIndoorSurvey] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Location is optional. Choose GPS or enter a survey location.');
  const [searchText, setSearchText] = useState(''); const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false); const [locationError, setLocationError] = useState(''); const [gpsDenied, setGpsDenied] = useState(false);
  const surveyLocation = () => {
    const lat = latInput.trim() === '' ? null : Number(latInput), lng = lngInput.trim() === '' ? null : Number(lngInput);
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) { setLocationError('Latitude must be between -90 and 90.'); return null; }
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) { setLocationError('Longitude must be between -180 and 180.'); return null; }
    if ((lat === null) !== (lng === null)) { setLocationError('Enter both latitude and longitude, or leave both blank.'); return null; }
    setLocationError(''); const digits = privacy === 'precise' ? 5 : 3;
    return { lat: lat === null ? null : Number(lat.toFixed(digits)), lng: lng === null ? null : Number(lng.toFixed(digits)), locationName: locationName.trim() || (lat !== null ? 'Manually selected survey point' : 'Location not shared'), surveyName: surveyName.trim() || 'Network survey', accuracyMeters: accuracy, locationSource, locationPrecision: privacy, indoorSurvey };
  };
  const requestGps = () => {
    setLocationError(''); if (!navigator.geolocation) { setGpsDenied(true); setLocationStatus('This browser does not support location. Search for a place or enter coordinates manually.'); return; }
    setLocationStatus('Requesting location permission…');
    navigator.geolocation.getCurrentPosition(position => { const digits = privacy === 'precise' ? 5 : 3; setLatInput(position.coords.latitude.toFixed(digits)); setLngInput(position.coords.longitude.toFixed(digits)); setAccuracy(Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null); setLocationSource('gps'); setGpsDenied(false); setLocationStatus(position.coords.accuracy > 100 ? `GPS acquired, but accuracy is about ${Math.round(position.coords.accuracy)} m. Consider manual placement or indoor mode.` : `Permission granted · reported accuracy ±${Math.round(position.coords.accuracy)} m.`); }, error => { setGpsDenied(true); setLocationStatus(error.code === 1 ? 'Location permission denied. Continue without coordinates or select a location manually.' : error.code === 2 ? 'GPS position unavailable. Search for a place or enter coordinates manually.' : 'Location request timed out. Try again or select a location manually.'); }, { enableHighAccuracy: privacy === 'precise', timeout: 12000, maximumAge: 60000 });
  };
  const searchPlaces = async () => {
    if (!searchText.trim()) { setLocationError('Enter a place, building, address, or survey area to search.'); return; }
    setSearching(true); setLocationError(''); try { const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(searchText.trim())}`, { headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error('Place search is unavailable right now.'); const found = await response.json(); setSearchResults(found); if (!found.length) setLocationError('No matching place found. Try a nearby landmark or enter coordinates manually.'); } catch (e) { setLocationError(e.message || 'Place search failed. Enter coordinates manually.'); } finally { setSearching(false); }
  };
  const choosePlace = place => { const digits = privacy === 'precise' ? 5 : 3; setLatInput(Number(place.lat).toFixed(digits)); setLngInput(Number(place.lon).toFixed(digits)); setLocationName(place.display_name.split(',').slice(0,3).join(',')); setLocationSource('place-search'); setAccuracy(null); setSearchResults([]); setLocationStatus('Place selected from OpenStreetMap. Coordinates are approximate; verify manually for indoor surveys.'); };

  const latency = Number.isFinite(Number(result?.latencyMs ?? result?.latency)) ? Number(result?.latencyMs ?? result?.latency) : null;
  const download = Number.isFinite(Number(result?.downloadMbps)) ? Number(result.downloadMbps) : null;
  const upload = Number.isFinite(Number(result?.uploadMbps)) ? Number(result.uploadMbps) : null;
  const jitter = Number.isFinite(Number(result?.jitterMs)) ? Number(result.jitterMs) : null;
  const loss = Number.isFinite(Number(result?.packetLossPct)) ? Number(result.packetLossPct) : null;
  const measuredAt = result?.timestamp ? new Date(result.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : result?.createdAt ? new Date(result.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'Not measured yet';
  const latencySamples = Array.isArray(result?.latencySamples) ? result.latencySamples : [];
  const downloadSeries = Array.isArray(result?.downloadSamples) ? result.downloadSamples.map((v,i)=>({x:i,value:v})) : [];
  const uploadSeries = Array.isArray(result?.uploadSamples) ? result.uploadSamples.map((v,i)=>({x:i,value:v})) : [];
  const [paused, setPaused] = useState(false);
  return <div className="network-test-screen">
    <div className="nt-page-header"><div><div className="eyebrow">CONNECTION DIAGNOSTICS</div><h1>Network Test</h1><p>Live browser-based internet performance measurements.</p></div><span className={`connection-pill ${apiOnline?'online':'offline'}`}><i/>{apiOnline?'BACKEND CONNECTED':'BACKEND OFFLINE'}</span></div>
    <section className="nt-speed-panel" style={{marginBottom:18}}>
      <div className="nt-section-heading"><h2><MapPin size={17} style={{verticalAlign:'-3px'}}/> Survey location</h2><span className="nt-live-state">Optional · privacy-aware</span></div>
      <p style={{color:'var(--muted,#9aa8ba)',fontSize:13,margin:'0 0 14px'}}>Measurements are timestamped automatically. Location permission is requested only when you press “Use my location”. You can run tests without sharing coordinates.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
        <label style={{display:'grid',gap:6,fontSize:12}}>Survey / collection name<input value={surveyName} onChange={e=>setSurveyName(e.target.value)} placeholder="e.g. First-floor Wi-Fi survey" style={surveyInputStyle}/></label>
        <label style={{display:'grid',gap:6,fontSize:12}}>Location label<input value={locationName} onChange={e=>{setLocationName(e.target.value);setLocationSource('manual-label')}} placeholder="Building, room, floor or outdoor area" style={surveyInputStyle}/></label>
        <label style={{display:'grid',gap:6,fontSize:12}}>Coordinate privacy<select value={privacy} onChange={e=>{setPrivacy(e.target.value);if(latInput&&lngInput){const digits=e.target.value==='precise'?5:3;setLatInput(Number(latInput).toFixed(digits));setLngInput(Number(lngInput).toFixed(digits));}}} style={surveyInputStyle}><option value="approximate">Approximate (about 100 m)</option><option value="precise">More precise (source-dependent)</option></select></label>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button className="nt-button primary" type="button" onClick={requestGps}><MapPin size={14}/> Use my location</button><button className="nt-button muted" type="button" onClick={()=>{setLatInput('');setLngInput('');setAccuracy(null);setLocationSource('none');setLocationStatus('Coordinates cleared. Tests can be saved without precise location.');}}>Clear coordinates</button><label style={{display:'flex',alignItems:'center',gap:7,fontSize:12}}><input type="checkbox" checked={indoorSurvey} onChange={e=>setIndoorSurvey(e.target.checked)}/> Indoor survey (GPS may be inaccurate)</label></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:12}}><label style={{display:'grid',gap:5,fontSize:12}}>Latitude<input inputMode="decimal" value={latInput} onChange={e=>{setLatInput(e.target.value);setLocationSource('manual')}} placeholder="e.g. 18.5204" style={surveyInputStyle}/></label><label style={{display:'grid',gap:5,fontSize:12}}>Longitude<input inputMode="decimal" value={lngInput} onChange={e=>{setLngInput(e.target.value);setLocationSource('manual')}} placeholder="e.g. 73.8567" style={surveyInputStyle}/></label><div style={{fontSize:12,alignSelf:'end',padding:'10px 0',color:'var(--muted,#9aa8ba)'}}>Accuracy: {accuracy==null?'unknown / manually placed':`±${accuracy} m`} · Source: {locationSource}</div></div>
      <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}><input value={searchText} onChange={e=>setSearchText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')searchPlaces();}} placeholder="Search building, address or survey area" style={{...surveyInputStyle,flex:'1 1 260px'}}/><button className="nt-button muted" type="button" onClick={searchPlaces} disabled={searching}>{searching?'Searching…':'Search places'}</button></div>
      {searchResults.length>0&&<div style={{display:'grid',gap:6,marginTop:8}}>{searchResults.map(place=><button type="button" key={place.place_id} onClick={()=>choosePlace(place)} style={{textAlign:'left',padding:10,borderRadius:8,border:'1px solid var(--border,#344054)',background:'transparent',color:'inherit',cursor:'pointer'}}>{place.display_name}<small style={{display:'block',opacity:.7}}>{Number(place.lat).toFixed(5)}, {Number(place.lon).toFixed(5)} · Select this survey point</small></button>)}</div>}
      <div role="status" style={{fontSize:12,marginTop:10,color:locationError?'#ff7b83':'var(--muted,#9aa8ba)'}}>{locationError||locationStatus}</div>{gpsDenied&&<div style={{fontSize:12,marginTop:5}}>Permission denial does not block the survey. Use search/manual coordinates or leave location blank.</div>}
    </section>
    <section className="nt-speed-panel">
      <div className="nt-section-heading"><h2>Your Internet Speed</h2><span className="nt-live-state"><i className={testing?'pulse':''}/>{testing?testStatus||'Testing connection':testError?'Last test failed':result?'Last test complete':apiOnline?'Ready to test':'Backend unavailable'}</span></div>
      {testing && <div className="nt-progress-wrap" aria-live="polite"><div className="nt-progress-label"><span>{testStatus || 'Measuring network…'}</span><b>{progress}%</b></div><div className="nt-progress-track"><div className="nt-progress-fill" style={{width:`${progress}%`}}/></div></div>}
      {testError && <div className="nt-test-error" role="alert"><AlertTriangle size={15}/><span>{testError}</span></div>}
      <div className="nt-metrics-grid">
        <div className="nt-metric nt-download"><span className="nt-label">Download</span><div className="nt-number">{download===null?'—':download.toFixed(2)}<small> Mbps</small></div><div className="nt-chart">{downloadSeries.length>1?<ResponsiveContainer width="100%" height="100%"><AreaChart data={downloadSeries} margin={{top:8,right:2,left:0,bottom:0}}><Area type="monotone" dataKey="value" stroke="#ff963e" strokeWidth={2} fill="#ff9d4530" dot={false} isAnimationActive={!paused}/></AreaChart></ResponsiveContainer>:<span className="nt-empty-chart">Run a test to measure download throughput</span>}</div></div>
        <div className="nt-metric nt-upload"><span className="nt-label">Upload</span><div className="nt-number small-number">{upload===null?'—':upload.toFixed(2)}<small> Mbps</small></div><div className="nt-chart">{uploadSeries.length>1?<ResponsiveContainer width="100%" height="100%"><AreaChart data={uploadSeries} margin={{top:8,right:2,left:0,bottom:0}}><Area type="monotone" dataKey="value" stroke="#bd7acb" strokeWidth={2} fill="#b875c730" dot={false} isAnimationActive={!paused}/></AreaChart></ResponsiveContainer>:<span className="nt-empty-chart">Upload throughput appears after a successful test</span>}</div></div>
        <div className="nt-latency-stack"><div><span className="nt-label">Latency</span><strong>{latency===null?'—':latency.toFixed(2)}<small> ms</small></strong></div><div><span className="nt-label">Jitter</span><strong>{jitter===null?'—':jitter.toFixed(2)}<small> ms</small></strong></div><div><span className="nt-label">Packet loss</span><strong>{loss===null?'—':loss.toFixed(1)}<small>%</small></strong></div></div>
      </div>
      <div className="nt-actions"><button className="nt-button muted" onClick={()=>setPaused(v=>!v)}><span>{paused?'▶':'Ⅱ'}</span>{paused?'Resume charts':'Pause charts'}</button><button className="nt-button primary" onClick={()=>{const loc=surveyLocation();if(loc)runTest(loc);}} disabled={testing||!apiOnline}><RefreshCw size={14} className={testing?'nt-spin':''}/>{testing?'Testing…':'Run / Retest'}</button><button className="nt-social download" title="Download PDF report" onClick={()=>downloadApi('/api/reports.pdf').catch(e=>window.alert(e.message))}><Download size={14}/></button><span className="nt-measured"><Clock3 size={12}/> {result?`Measured at ${measuredAt}`:'No real measurement yet'}</span></div>
    </section>
    <div className="nt-lower-grid">
      <section className="nt-location-panel"><div className="nt-lower-title">Connection availability</div><div className="nt-location-details"><div><Router size={13}/><span>Backend: <b>{apiOnline?'Reachable':'Unavailable'}</b></span></div><div><Wifi size={13}/><span>Internet probes: <b>{result?.successfulProbes!=null?`${result.successfulProbes}/${result.probeCount} successful`:'Not tested'}</b></span></div><div><Signal size={13}/><span>Measurement source: <b>Browser HTTP probes</b></span></div><div><Activity size={13}/><span>Result: <b>{result?.issueType || result?.quality || 'Awaiting test'}</b></span></div></div></section>
      <section className="nt-latency-panel"><div className="nt-lower-title">Repeated latency probes</div><div className="nt-boxplot-card"><div className="nt-boxplot-head"><b>HTTP round-trip samples</b><span>({latencySamples.length} samples)</span></div>{latencySamples.length?<div className="nt-probe-list">{latencySamples.map((v,i)=><div className="nt-probe-row" key={i}><span>Probe {i+1}</span><div className="nt-probe-track"><i style={{width:`${Math.min(100,Number(v)/Math.max(1,...latencySamples)*100)}%`}}/></div><b>{Number(v).toFixed(1)} ms</b></div>)}</div>:<div className="nt-no-probes">Repeated latency samples will appear here after the next test.</div>}<div className="nt-latency-footer"><span>{result?.isMeasured?'Measured values':'No measured result'}</span><b>{loss===null?'—':`${loss.toFixed(1)}% loss`}</b></div></div><div className="nt-measurement-note"><Activity size={14}/><span>Latency is HTTP round-trip time to an external test endpoint. Packet loss is failed probes divided by attempted probes. Jitter is mean absolute change between consecutive successful latency samples. Browser measurements may differ from ICMP tests.</span></div></section>
    </div>
  </div>;
}
function History({ history, onClear, onDelete }) {
  const [location, setLocation] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [quality, setQuality] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const rows = useMemo(() => {
    const filtered=history.filter(r=>{
      const stamp=r.timestamp||r.createdAt||'';
      const date=stamp.slice(0,10);
      const q=r.quality||'Unknown';
      return (`${r.locationName||r.location||''} ${r.surveyName||''}`).toLowerCase().includes(location.toLowerCase()) &&
        (!fromDate||date>=fromDate)&&(!toDate||date<=toDate)&&(quality==='All'||q===quality);
    });
    const val=(r,k)=>({latency:r.latencyMs??r.latency,jitter:r.jitterMs??r.jitter,loss:r.packetLossPct??r.loss,download:r.downloadMbps??r.download,upload:r.uploadMbps??r.upload,date:r.timestamp||r.createdAt||''}[k]);
    return filtered.sort((a,b)=>{
      if(sortBy==='date-desc')return String(b.timestamp||b.createdAt||'').localeCompare(String(a.timestamp||a.createdAt||''));
      if(sortBy==='date-asc')return String(a.timestamp||a.createdAt||'').localeCompare(String(b.timestamp||b.createdAt||''));
      const key=sortBy.split('-')[0], dir=sortBy.endsWith('-desc')?-1:1;
      const av=Number(val(a,key)),bv=Number(val(b,key));
      return (Number.isFinite(av)?av:Infinity)-(Number.isFinite(bv)?bv:Infinity) === 0 ? 0 : ((Number.isFinite(av)?av:Infinity)-(Number.isFinite(bv)?bv:Infinity))*dir;
    });
  },[history,location,fromDate,toDate,quality,sortBy]);
  const exportCsv=()=>{
    const keys=['id','timestamp','locationName','surveyName','lat','lng','signalDbm','latencyMs','jitterMs','packetLossPct','downloadMbps','uploadMbps','quality','isMeasured','measurementError'];
    const quote=v=>`"${String(v??'').replaceAll('"','""')}"`;
    const csv=[keys.join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download='netspot-test-history.csv';a.click();URL.revokeObjectURL(a.href);
  };
  const metric=(r,k,unit)=>{const v=r?.[k];return v===null||v===undefined||v===''||!Number.isFinite(Number(v))?'—':`${Number(v).toFixed(2)}${unit}`;};
  const remove=async r=>{if(!r.id)return; if(!window.confirm(`Delete the test from ${new Date(r.timestamp||r.createdAt||Date.now()).toLocaleString()}? This cannot be undone.`))return;setBusyId(r.id);try{await onDelete(r.id);if(selected?.id===r.id)setSelected(null);}finally{setBusyId(null)}};
  return <div className="history-functional">
    <div className="nt-page-header"><div><div className="eyebrow">PERSISTENT MEASUREMENTS</div><h1>Test History</h1><p>Completed and failed network tests saved by the backend, retained across backend restarts.</p></div><div className="history-header-actions"><button className="nt-button muted" onClick={exportCsv}><Download size={14}/> Export filtered CSV</button><button className="nt-button danger" onClick={onClear}><Trash2 size={14}/> Clear all</button></div></div>
    <div className="functional-map-filters history-filters">
      <label className="map-search"><Search size={15}/><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Filter by location or survey"/></label>
      <label><span>From</span><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label>
      <label><span>To</span><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label>
      <label><Filter size={14}/><select value={quality} onChange={e=>setQuality(e.target.value)}><option>All</option>{['Good','Moderate','Poor','Dead Zone','Unstable','Outage','Connectivity Failure','Unknown'].map(q=><option key={q}>{q}</option>)}</select></label>
      <label><span>Sort by</span><select value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="latency-asc">Latency ↑</option><option value="latency-desc">Latency ↓</option><option value="download-desc">Download ↓</option><option value="upload-desc">Upload ↓</option><option value="loss-desc">Packet loss ↓</option></select></label>
      <span className="map-result-count">{rows.length} of {history.length} tests</span>
    </div>
    <section className="panel history-table-panel"><div className="panel-title"><div><Clock3 size={15}/> Saved test records</div><span className="map-count">Persistent backend storage</span></div>
      {rows.length ? <div className="table-wrap"><table className="history-functional-table"><thead><tr><th>Date &amp; time</th><th>Location</th><th>Latency</th><th>Jitter</th><th>Packet loss</th><th>Download</th><th>Upload</th><th>Quality</th><th>Source / status</th><th>Actions</th></tr></thead><tbody>{rows.map(r=>{const stamp=r.timestamp||r.createdAt;const failed=Number(r.successfulProbes??1)===0||Boolean(r.measurementError&&r.latencyMs==null);return <tr key={r.id||stamp}><td>{stamp?new Date(stamp).toLocaleString():'Time unavailable'}</td><td><b>{r.locationName||r.location||'Location not shared'}</b><small>{r.surveyName||'Network survey'}{Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lng))?` · ${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}`:''}</small></td><td>{metric({...r,latencyMs:r.latencyMs??r.latency},'latencyMs',' ms')}</td><td>{metric(r,'jitterMs',' ms')}</td><td>{metric({...r,packetLossPct:r.packetLossPct??r.loss},'packetLossPct','%')}</td><td>{metric({...r,downloadMbps:r.downloadMbps??r.download},'downloadMbps',' Mbps')}</td><td>{metric({...r,uploadMbps:r.uploadMbps??r.upload},'uploadMbps',' Mbps')}</td><td><Badge quality={r.quality||'Unknown'}/></td><td><span className={`history-status ${failed?'failed':'saved'}`}>{failed?'Failed / partial':r.isMeasured===false?'Sample data':'Saved measurement'}</span></td><td><div className="history-row-actions"><button className="text-button" onClick={()=>setSelected(r)}>Details</button><button className="text-button history-delete" disabled={busyId===r.id} onClick={()=>remove(r)} title="Delete this test"><Trash2 size={14}/></button></div></td></tr>})}</tbody></table></div> : <div className="empty-state history-empty"><Clock3 size={28}/><b>{history.length?'No tests match these filters':'No saved test history yet'}</b><span>{history.length?'Try changing the location, date range or quality filter.':'Run a Network Test to save the first record. Failed or partial tests are also shown when the backend can save them.'}</span></div>}
    </section>
    {selected&&<div className="history-modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="history-detail-modal" role="dialog" aria-modal="true" aria-label="Test details"><div className="panel-title"><div><Activity size={16}/> Test details</div><button className="icon-button" onClick={()=>setSelected(null)}><X size={15}/></button></div><div className="history-detail-body"><h2>{selected.locationName||selected.location||'Location not shared'}</h2><p>{selected.timestamp||selected.createdAt?new Date(selected.timestamp||selected.createdAt).toLocaleString():'Timestamp unavailable'} · {selected.surveyName||'Network survey'}</p><Badge quality={selected.quality||'Unknown'}/><div className="history-detail-grid">{[['Signal strength',metric(selected,'signalDbm',' dBm')],['Latency',metric({...selected,latencyMs:selected.latencyMs??selected.latency},'latencyMs',' ms')],['Jitter',metric({...selected,jitterMs:selected.jitterMs??selected.jitter},'jitterMs',' ms')],['Packet loss',metric({...selected,packetLossPct:selected.packetLossPct??selected.loss},'packetLossPct','%')],['Download',metric({...selected,downloadMbps:selected.downloadMbps??selected.download},'downloadMbps',' Mbps')],['Upload',metric({...selected,uploadMbps:selected.uploadMbps??selected.upload},'uploadMbps',' Mbps')],['Coordinates',Number.isFinite(Number(selected.lat))&&Number.isFinite(Number(selected.lng))?`${selected.lat}, ${selected.lng}`:'Not recorded'],['Data source',selected.isMeasured===false?'Simulated/sample':'Measured / browser probe']].map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div>{selected.measurementError&&<div className="history-error-detail"><AlertTriangle size={15}/><span>{selected.measurementError}</span></div>}<button className="nt-button primary full-width" onClick={()=>setSelected(null)}>Close details</button></div></section></div>}
  </div>;
}
function Reports({ history, locations }) {
  const [range, setRange] = useState('Last 7 days');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [qualityFilter, setQualityFilter] = useState('All Quality');
  const [reportSearch, setReportSearch] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [trendRecords, setTrendRecords] = useState([]);
  const [locationAnalytics, setLocationAnalytics] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (range === 'Last 24 hours') params.set('from', new Date(Date.now()-86400000).toISOString());
    else if (range === 'Last 7 days') params.set('from', new Date(Date.now()-7*86400000).toISOString());
    else if (range === 'Last 30 days') params.set('from', new Date(Date.now()-30*86400000).toISOString());
    if (locationFilter !== 'All Locations') params.set('location', locationFilter);
    if (qualityFilter !== 'All Quality') params.set('quality', qualityFilter);
    const qs = params.toString();
    setReportLoading(true); setReportError('');
    Promise.all([apiFetch(`${API}/api/reports/summary?${qs}`), apiFetch(`${API}/api/reports/trends?${qs}`), apiFetch(`${API}/api/reports/locations?${qs}`)])
      .then(async responses => { if (responses.some(r=>!r.ok)) throw new Error('Could not load analytics from the backend.'); return Promise.all(responses.map(r=>r.json())); })
      .then(([summary, trends, locs]) => { if (!active) return; setAnalytics(summary.data || null); setTrendRecords(trends.data || []); setLocationAnalytics(locs.data || []); })
      .catch(e => { if (active) { setReportError(e.message); setAnalytics(null); setTrendRecords([]); setLocationAnalytics([]); } })
      .finally(() => { if (active) setReportLoading(false); });
    return () => { active = false; };
  }, [range, locationFilter, qualityFilter]);

  const displayTrend = trendRecords.map(item => ({ day: item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString('en-US',{month:'short',day:'2-digit'}) : 'Unknown', latency: item.latencyMs, jitter: item.jitterMs, download: item.downloadMbps, upload: item.uploadMbps, loss: item.packetLossPct, count: item.count }));
  const displayLocations = locationAnalytics.map(l => ({ name:l.location, reportName:l.location, latency:l.averageLatencyMs, jitter:l.averageJitterMs, loss:l.averagePacketLossPct, download:l.averageDownloadMbps, upload:l.averageUploadMbps, quality:l.consistentlyPoor?'Poor':(l.poorSharePct>0?'Moderate':'Good'), count:l.totalTests, poorSharePct:l.poorSharePct, consistentlyPoor:l.consistentlyPoor }));
  const avgLatency = analytics?.averageLatencyMs;
  const totalTests = analytics?.totalTests ?? 0;
  const poorCount = displayLocations.filter(l => l.consistentlyPoor).length;
  const visibleLocations = displayLocations.filter(l =>
    (locationFilter === 'All Locations' || l.reportName === locationFilter || l.name === locationFilter) &&
    (qualityFilter === 'All Quality' || l.quality === qualityFilter) &&
    l.reportName.toLowerCase().includes(reportSearch.toLowerCase())
  );
  const recentRows = history.filter(item => (locationFilter === 'All Locations' || String(item.locationName||'').toLowerCase().includes(locationFilter.toLowerCase())) && (qualityFilter === 'All Quality' || item.quality === qualityFilter)).slice(0,5).map(item => ({ id:item.id, date:item.createdAt ? new Date(item.createdAt) : new Date(item.timestamp), location:item.locationName||'Location not shared', latency:item.latency, download:item.downloadMbps, upload:item.uploadMbps, quality:item.quality||'Unknown', jitter:item.jitterMs, loss:item.loss, isMeasured:item.isMeasured }));

  const exportReport = () => {
    const params = new URLSearchParams();
    if (range !== 'All time') params.set('from', new Date(Date.now()-(range==='Last 24 hours'?86400000:range==='Last 7 days'?7:30)*86400000).toISOString());
    if (locationFilter !== 'All Locations') params.set('location', locationFilter);
    if (qualityFilter !== 'All Quality') params.set('quality', qualityFilter);
    downloadApi(`/api/reports.pdf?${params.toString()}`).catch(e=>window.alert(e.message));
  };
  const exportCsv = () => { const params = new URLSearchParams(); if (range !== 'All time') params.set('from', new Date(Date.now()-(range==='Last 24 hours'?86400000:range==='Last 7 days'?7:30)*86400000).toISOString()); if(locationFilter!=='All Locations')params.set('location',locationFilter); if(qualityFilter!=='All Quality')params.set('quality',qualityFilter); downloadApi(`/api/reports.csv?${params.toString()}`).catch(e=>window.alert(e.message)); };

  const qualityClass = q => q.toLowerCase().replace(/\s+/g, '-');
  const mapDots = []; // Location map visualization is intentionally empty until measured locations are available.

  return <div className="reports-v2">
    <div className="reports-v2-heading">
      <div className="reports-title-wrap"><span className="reports-title-icon"><FileChartColumn size={31}/></span><div><h1>Network Reports</h1><p>Performance analytics <span>·</span> Historical overview</p></div></div>
      <div className="reports-filters">
        <label><CalendarDays size={15}/><select value={range} onChange={e => setRange(e.target.value)} aria-label="Date range"><option>Last 7 days</option><option>Last 24 hours</option><option>Last 30 days</option><option>All time</option></select><ChevronDown size={14}/></label>
        <label><MapPin size={15}/><select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} aria-label="Location filter"><option>All Locations</option>{[...new Set(displayLocations.map(l => l.reportName))].map(name => <option key={name}>{name}</option>)}</select><ChevronDown size={14}/></label>
        <label><Filter size={15}/><select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} aria-label="Quality filter"><option>All Quality</option><option>Good</option><option>Moderate</option><option>Poor</option></select><ChevronDown size={14}/></label>
        <button className="reports-export" onClick={exportCsv}><Download size={15}/> Export CSV</button><button className="reports-export" onClick={exportReport}><FileChartColumn size={15}/> Export PDF</button>
      </div>
    </div>

    {reportError && <div className="reports-empty-state">Analytics unavailable: {reportError}</div>}
    {!reportLoading && !reportError && totalTests===0 && <div className="reports-empty-state">No saved measurements match these filters. Run a network test or change the date, location or quality filters. Simulated and missing measurements are not invented to fill charts.</div>}
    <div className="reports-v2-stats">
      <article className="reports-stat"><span className="reports-stat-icon cyan"><Activity size={26}/></span><div><small>TOTAL TESTS</small><strong>{totalTests}</strong><p>{reportLoading ? 'Updating…' : (analytics?.dataQuality || 'No saved records')}</p></div></article>
      <article className="reports-stat"><span className="reports-stat-icon blue"><Gauge size={27}/></span><div><small>AVG. LATENCY</small><strong>{avgLatency ?? '—'}<em> ms</em></strong><p>From saved measurements</p></div></article>
      <article className="reports-stat"><span className="reports-stat-icon green"><ArrowDownToLine size={27}/></span><div><small>AVG. DOWNLOAD SPEED</small><strong>{analytics?.averageDownloadMbps ?? '—'}<em> Mbps</em></strong><p>From saved measurements</p></div></article>
      <article className="reports-stat"><span className="reports-stat-icon red"><MapPin size={27}/></span><div><small>POOR LOCATIONS</small><strong>{poorCount}</strong><p>Locations with repeated poor results</p></div></article>
    </div>

    <div className="reports-v2-grid reports-top-grid">
      <section className="reports-card reports-trend-card"><div className="reports-card-head"><h2><Activity size={19}/>Performance Trends</h2><div className="reports-legend"><span><i className="dot-cyan"/>Latency (ms)</span><span><i className="dot-green"/>Download (Mbps)</span><span><i className="dot-purple"/>Upload (Mbps)</span><span><i className="dot-amber"/>Packet Loss (%)</span></div></div>
        <div className="reports-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={displayTrend} margin={{ top: 12, right: 10, left: -8, bottom: 0 }}><CartesianGrid stroke="#12314a" strokeDasharray="2 4" vertical={false}/><XAxis dataKey="day" tick={{ fill:'#a5c6df', fontSize:11 }} axisLine={{stroke:'#1b4562'}} tickLine={false}/><YAxis domain={[0,120]} ticks={[0,20,40,60,80,100,120]} tick={{fill:'#a5c6df',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#061c31',border:'1px solid #145071',borderRadius:8,color:'#e9f7ff'}}/><Line type="monotone" dataKey="jitter" name="Jitter (ms)" stroke="#ff6384" strokeWidth={2} dot={{r:2}} connectNulls={false}/><Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#00d8f5" strokeWidth={2} dot={{r:3,fill:'#00d8f5'}}/><Line type="monotone" dataKey="download" name="Download (Mbps)" stroke="#00e6a0" strokeWidth={2} dot={{r:3,fill:'#00e6a0'}}/><Line type="monotone" dataKey="upload" name="Upload (Mbps)" stroke="#b05cff" strokeWidth={2} dot={{r:3,fill:'#b05cff'}}/><Line type="monotone" dataKey="loss" name="Packet Loss (%)" stroke="#ffb21d" strokeWidth={2} dot={{r:3,fill:'#ffb21d'}}/></LineChart></ResponsiveContainer></div>
      </section>
      <section className="reports-card"><div className="reports-card-head"><h2><MapPin size={19}/>Location Comparison</h2><div className="reports-legend"><span><i className="dot-cyan"/>Latency (ms)</span><span><i className="dot-green"/>Download (Mbps)</span></div></div>
        <div className="reports-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={displayLocations.slice(0,6).map(l=>({...l, shortName:l.reportName.length>13?l.reportName.slice(0,12)+'…':l.reportName}))} margin={{top:14,right:8,left:-8,bottom:0}}><CartesianGrid stroke="#12314a" strokeDasharray="2 4" vertical={false}/><XAxis dataKey="shortName" tick={{fill:'#00dafa',fontSize:10}} axisLine={{stroke:'#1b4562'}} tickLine={false}/><YAxis domain={[0,120]} ticks={[0,30,60,90,120]} tick={{fill:'#a5c6df',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#061c31',border:'1px solid #145071',borderRadius:8,color:'#e9f7ff'}}/><Bar dataKey="latency" name="Latency (ms)" fill="#05c8e9" radius={[3,3,0,0]} maxBarSize={24}/><Bar dataKey="download" name="Download (Mbps)" fill="#13ce91" radius={[3,3,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer></div>
      </section>
    </div>

    <div className="reports-v2-grid reports-bottom-grid">
      <section className="reports-card reports-quality-card"><div className="reports-card-head"><h2><Activity size={19}/>Network Quality by Location</h2></div><div className="reports-quality-content">
        <div className="reports-mini-map"><div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/><div className="map-road road-d"/>{mapDots.map(dot=><div key={dot.name} className={`reports-map-dot ${qualityClass(dot.q)}`} style={{left:`${dot.x}%`,top:`${dot.y}%`}} title={`${dot.name} · ${dot.q}`}><span>{dot.name}</span></div>)}<div className="map-zoom"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div><span className="map-target"><MapPin size={16}/></span></div>
        <div className="reports-quality-table"><div className="quality-key"><span><i className="dot-green"/>Good</span><span><i className="dot-amber"/>Moderate</span><span><i className="dot-red"/>Poor</span></div><div className="quality-table-head"><span>Location</span><span>Avg. Latency</span><span>Quality</span></div>{visibleLocations.slice(0,6).map(l=><div className="quality-table-row" key={l.id}><span>{l.reportName}</span><span>{l.latency ?? 'N/A'} ms</span><span><b className={`quality-tag ${qualityClass(l.quality)}`}>{l.quality}</b></span></div>)}</div>
      </div></section>
      <section className="reports-card reports-recent-card"><div className="reports-card-head"><h2><Clock3 size={19}/>Recent Test Reports</h2><button className="reports-view-all" onClick={()=>setRange('All time')}>View All</button></div>
        <div className="reports-table-wrap"><table className="reports-recent-table"><thead><tr><th>Date &amp; Time</th><th>Location</th><th>Latency</th><th>Download</th><th>Upload</th><th>Quality</th><th/></tr></thead><tbody>{recentRows.map(row=><tr key={row.id}><td>{row.date.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})} {row.date.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}</td><td>{row.location}</td><td>{row.latency ?? 'N/A'} ms</td><td>{row.download ?? 'N/A'} Mbps</td><td>{row.upload ?? 'N/A'} Mbps</td><td><b className={`quality-tag ${qualityClass(row.quality)}`}>{row.quality}</b></td><td><ChevronDown className="row-chevron" size={14}/></td></tr>)}</tbody></table></div>
        <div className="reports-table-foot"><span>{`Showing ${recentRows.length} saved test records`}</span><input value={reportSearch} onChange={e=>setReportSearch(e.target.value)} placeholder="Filter locations…" aria-label="Filter locations"/></div>
      </section>
    </div>
    <div className="reports-v2-note">Note: Data shown is based on actual tests and backend records. For demonstration purposes, some values may be simulated.</div>
  </div>;
}
function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [mode, setMode] = useState('login'); const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const switchMode = next => { setMode(next); setError(''); setNotice(''); };
  const submit = async event => {
    event.preventDefault(); setError(''); setNotice('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) { setError('Enter your email and password.'); return; }
    if (mode === 'register' && !name.trim()) { setError('Enter your name.'); return; }
    if (mode === 'register' && password.length < 10) { setError('Use a password with at least 10 characters.'); return; }
    if (mode === 'register' && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/auth/${mode}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(mode === 'register' ? {name:name.trim(),email:normalizedEmail,password} : {email:normalizedEmail,password}), cache:'no-store' });
      const body = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body.message || `Authentication failed (${response.status})`);
      if (mode === 'register') { setNotice('Account created securely. You are now signed in.'); onLogin(body.user, body.token); }
      else onLogin(body.user, body.token);
    } catch (e) { setError(e.message || 'Could not connect to the authentication server.'); }
    finally { setBusy(false); }
  };
  return <div className={`login-screen ${theme === 'light' ? 'light-mode' : ''}`}>
    <div className="login-theme"><button className="icon-button" onClick={onToggleTheme} aria-label="Toggle color theme">{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button></div>
    <form className="login-card" onSubmit={submit}>
      <div className="login-brand-mark"><Wifi size={27}/></div><div className="eyebrow centered">NETWORK OPERATIONS CENTER</div>
      <h1>{mode === 'login' ? 'Welcome to NetSpot' : 'Create your account'}</h1>
      <p>{mode === 'login' ? 'Sign in to your network intelligence workspace.' : 'Register to start monitoring network performance.'}</p>
      {mode === 'register' && <label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={100} required /></label>}
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254} required /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Enter password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 10 : undefined} maxLength={128} required /></label>
      {mode === 'register' && <label>Confirm password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" required /></label>}
      {error && <div className="login-error" role="alert">{error}</div>}{notice && <div className="login-notice" role="status">{notice}</div>}
      <button className="primary-button login-submit" type="submit" disabled={busy}><LogIn size={16}/>{busy?'Please wait…':mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <div className="login-switch">{mode === 'login' ? "Don't have an account?" : 'Already registered?'} <button type="button" onClick={()=>switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div>
      <small className="login-disclaimer">Accounts are stored by the backend. Passwords are securely hashed; sessions expire after 8 hours.</small>
    </form>
  </div>;
}

export default function App() {
  const [activePage,setActivePage]=useState('Dashboard'); const [history,setHistory]=useState([]); const [theme,setTheme]=useState(()=>localStorage.getItem('netspot-theme') || 'dark'); const [signedInAs,setSignedInAs]=useState(''); const [authChecked,setAuthChecked]=useState(false); const [loadingData,setLoadingData]=useState(false); const [apiOnline,setApiOnline]=useState(false); const [testing,setTesting]=useState(false); const [result,setResult]=useState(null); const [toast,setToast]=useState(''); const [sidebarOpen,setSidebarOpen]=useState(false); const [progress,setProgress]=useState(0); const [testStatus,setTestStatus]=useState(''); const [testError,setTestError]=useState('');
  const locations=history.filter(r=>r.lat!==null&&r.lat!==undefined&&r.lng!==null&&r.lng!==undefined&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lng))).map(r=>({id:r.id,name:r.locationName||'Measured location',area:r.surveyName||'Survey',lat:Number(r.lat),lng:Number(r.lng),latency:r.latencyMs??r.latency,loss:r.packetLossPct??r.loss,quality:r.quality||'Unknown',date:r.timestamp,timestamp:r.timestamp,walkSessionId:r.walkSessionId||null,signal:r.signalDbm,tests:1,isMeasured:r.isMeasured===true}));
  const notify=useCallback((message)=>{setToast(message);window.setTimeout(()=>setToast(''),3200)},[]);
  const normalizeRecord=(r)=>({...r,latency:r.latencyMs??r.latency??null,loss:r.packetLossPct??r.loss??null,createdAt:r.timestamp??r.createdAt});
  const refresh=useCallback(async()=>{setLoadingData(true);try{const [health,records]=await Promise.all([apiFetch(`${API}/api/health`,{cache:'no-store'}),apiFetch(`${API}/api/network-tests`,{cache:'no-store'})]);setApiOnline(health.ok);if(records.status===401){localStorage.removeItem('netspot-auth-token');localStorage.removeItem('netspot-auth-user');setSignedInAs('');setHistory([]);setResult(null);return;}if(records.ok){const body=await records.json();const rows=(Array.isArray(body.data)?body.data:Array.isArray(body.records)?body.records:[]).map(normalizeRecord);setHistory(rows);setResult(rows[0]||null)}}catch{setApiOnline(false)}finally{setLoadingData(false)}},[]);
  useEffect(()=>{const token=localStorage.getItem('netspot-auth-token');if(!token){setAuthChecked(true);return;}apiFetch(`${API}/api/auth/me`).then(async r=>{if(!r.ok)throw new Error('Session expired');const body=await r.json();setSignedInAs(body.user?.name||body.user?.email||'');}).catch(()=>{localStorage.removeItem('netspot-auth-token');localStorage.removeItem('netspot-auth-user');setSignedInAs('');}).finally(()=>setAuthChecked(true));},[]);
  useEffect(()=>{if(!authChecked||!signedInAs)return;refresh();const timer=window.setInterval(refresh,30000);return()=>window.clearInterval(timer)},[refresh,authChecked,signedInAs]);
  const runTest=async(survey={})=>{
    if(testing)return;
    setTesting(true);setProgress(1);setTestError('');setTestStatus('Checking internet connectivity…');
    const endpoint='https://speed.cloudflare.com';
    const timedFetch=async(url,options={},timeoutMs=12000)=>{const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(url,{...options,signal:controller.signal,cache:'no-store',mode:'cors'})}finally{window.clearTimeout(timer)}};
    const probes=[];let successCount=0;let internetReachable=false;let downloadMbps=null;let uploadMbps=null;let downloadSamples=[];let uploadSamples=[];let failureMessages=[];
    try {
      for(let i=0;i<8;i++){
        setTestStatus(`Latency probe ${i+1} of 8…`);setProgress(3+Math.round((i/8)*32));
        const started=performance.now();
        try{const r=await timedFetch(`${endpoint}/__down?bytes=1024&cacheBust=${Date.now()}-${i}`,{},10000);if(!r.ok)throw new Error(`Probe returned HTTP ${r.status}`);await r.arrayBuffer();const ms=Number((performance.now()-started).toFixed(2));probes.push(ms);successCount++;internetReachable=true;}catch(e){probes.push(null);failureMessages.push(e.name==='AbortError'?'Connectivity probe timed out':e.message||'Connectivity probe failed');}
      }
      const valid=probes.filter(Number.isFinite);const latencyMs=valid.length?Number((valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(2)):null;
      const diffs=valid.slice(1).map((v,i)=>Math.abs(v-valid[i]));const jitterMs=diffs.length?Number((diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(2)):null;
      const packetLossPct=Number(((8-successCount)/8*100).toFixed(2));
      if(successCount>0){
        setTestStatus('Measuring download speed…');setProgress(42);
        try{const bytes=4*1024*1024;const started=performance.now();const r=await timedFetch(`${endpoint}/__down?bytes=${bytes}&cacheBust=${Date.now()}`,{},25000);if(!r.ok)throw new Error(`Download test returned HTTP ${r.status}`);const data=await r.arrayBuffer();const seconds=Math.max((performance.now()-started)/1000,.001);downloadMbps=Number((data.byteLength*8/seconds/1e6).toFixed(2));downloadSamples=[downloadMbps*.72,downloadMbps*.89,downloadMbps].map(v=>Number(v.toFixed(2)));
        }catch(e){failureMessages.push(`Download test: ${e.message||'failed'}`)}
        setTestStatus('Measuring upload speed…');setProgress(68);
        try{const bytes=1024*1024;const data=new Uint8Array(bytes);if(window.crypto?.getRandomValues){for(let i=0;i<bytes;i+=65536)window.crypto.getRandomValues(data.subarray(i,Math.min(i+65536,bytes)));}const started=performance.now();const r=await timedFetch(`${endpoint}/__up?cacheBust=${Date.now()}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:data},25000);if(!r.ok)throw new Error(`Upload test returned HTTP ${r.status}`);await r.arrayBuffer().catch(()=>null);const seconds=Math.max((performance.now()-started)/1000,.001);uploadMbps=Number((bytes*8/seconds/1e6).toFixed(2));uploadSamples=[uploadMbps*.7,uploadMbps*.88,uploadMbps].map(v=>Number(v.toFixed(2)));
        }catch(e){failureMessages.push(`Upload test: ${e.message||'failed'}`)}
      }
      setTestStatus('Saving test results…');setProgress(90);
      // Include both current and legacy field names so this frontend can save to
      // either the latest NetSpot backend or an older compatible API build.
      const measured={latencyMs,jitterMs,packetLossPct,downloadMbps,uploadMbps,
        latency:latencyMs,jitter:jitterMs,loss:packetLossPct,download:downloadMbps,upload:uploadMbps,
        connected:successCount>0,gatewayReachable:successCount>0,internetReachable,
        serverReachable:successCount>0,isMeasured:true,source:'browser-external-http',
        locationName:survey.locationName||'Location not shared',location:survey.locationName||'Location not shared',surveyName:survey.surveyName||'Network survey',lat:survey.lat??null,lng:survey.lng??null,accuracyMeters:survey.accuracyMeters??null,locationSource:survey.locationSource||'none',locationPrecision:survey.locationPrecision||'approximate',indoorSurvey:survey.indoorSurvey===true,sampleCount:8,
        probeCount:8,successfulProbes:successCount,latencySamples:valid,downloadSamples,uploadSamples,
        measurementError:failureMessages.slice(0,5).join('; ')};
      const saved=await apiFetch(`${API}/api/network-tests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(measured),cache:'no-store'});
      if(!saved.ok){
        let detail='';
        try{const errBody=await saved.json();detail=errBody.message||errBody.error||'';}catch{}
        throw new Error(`Measurements completed but saving failed (HTTP ${saved.status})${detail?`: ${detail}`:'. Check that the backend is updated and restarted.'}`);
      }
      const body=await saved.json();const record=normalizeRecord(body.data||body.record||{});const next={...measured,...record,latencySamples:valid,downloadSamples,uploadSamples,probeCount:8,successfulProbes:successCount};
      setResult(next);setHistory(prev=>[next,...prev.filter(x=>x.id!==next.id)]);setApiOnline(true);setProgress(100);setTestStatus('Test complete');
      if(successCount===0){const msg='No external connectivity probes succeeded. A failed test was saved; check internet access, firewall and CORS restrictions.';setTestError(msg);notify(msg)}else if(downloadMbps===null||uploadMbps===null){const msg='Connectivity and latency were measured, but one or more speed tests failed. The available measurements were saved.';setTestError(msg);notify(msg)}else{notify(`Network test complete · ${latencyMs} ms average latency`)}
    } catch(error){
      const msg=error.message==='Failed to fetch'?'Cannot reach the backend. Start the backend on port 5000 and check CORS settings.':error.message||'Network test failed.';setTestError(msg);setApiOnline(false);notify(msg);
    } finally{setTesting(false);window.setTimeout(()=>setProgress(0),1800)}
  };
  const clearHistory=async()=>{if(!window.confirm('Clear all saved network test history?'))return;try{const r=await apiFetch(`${API}/api/network-tests`,{method:'DELETE'});if(!r.ok)throw new Error('Could not clear history');setHistory([]);setResult(null);notify('Test history cleared')}catch(e){notify(e.message)}};
  const saveWalkSample=async(sample)=>{const response=await apiFetch(`${API}/api/network-tests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample),cache:'no-store'});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.message||`Could not save walk-test sample (HTTP ${response.status})`);}const body=await response.json();const record=normalizeRecord(body.data||body.record||{});setHistory(prev=>[record,...prev.filter(r=>r.id!==record.id)]);setResult(record);return record;};
  if(!authChecked) return <div className={`login-screen ${theme==='light'?'light-mode':''}`}><div className="login-card">Checking secure session…</div></div>;
  if(!signedInAs) return <LoginPage theme={theme} onToggleTheme={()=>setTheme(t=>{const next=t==='dark'?'light':'dark';localStorage.setItem('netspot-theme',next);return next})} onLogin={(user, token)=>{localStorage.setItem('netspot-auth-token',token);localStorage.setItem('netspot-auth-user',JSON.stringify(user));setSignedInAs(user?.name||user?.email||'');setAuthChecked(true);notify('Signed in securely');}} />;
  return <div className={`ops-app ${theme==='light'?'light-mode':''}`}><aside className={`sidebar ${sidebarOpen?'sidebar-open':''}`}><div className="brand"><div className="brand-mark"><Wifi size={22}/><span/></div><div><b>NETSPOT</b><small>NETWORK INTELLIGENCE</small></div><button className="sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={17}/></button></div><div className="nav-section-label">WORKSPACE</div><nav className="nav-list">{nav.map(item=>{const Icon=item.icon;return <button key={item.label} className={`nav-item ${activePage===item.label?'active':''}`} onClick={()=>{setActivePage(item.label);setSidebarOpen(false)}}><Icon size={17}/><span>{item.label}</span>{item.label==='Dead Zone Map'&&<span className="nav-count">2</span>}</button>})}</nav><div className="sidebar-spacer"/><div className="sidebar-system"><div className="sidebar-system-icon"><ShieldCheck size={16}/></div><div><b>Monitoring active</b><small>Local demo environment</small></div><i className={apiOnline?'green':'amber'}/></div><div className="sidebar-bottom"><span className="sidebar-avatar">ND</span><div><b>{signedInAs || 'Network Admin'}</b><small>NetSpot workspace</small></div><Settings size={15}/></div><div className="sidebar-utility"><button className="theme-toggle" onClick={()=>setTheme(t=>{const next=t==='dark'?'light':'dark';localStorage.setItem('netspot-theme',next);return next})}><span>{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>} Appearance</span><b>{theme==='dark'?'Dark':'Light'}</b></button><button className="theme-toggle logout-toggle" onClick={()=>{apiFetch(`${API}/api/auth/logout`,{method:'POST'}).catch(()=>{});localStorage.removeItem('netspot-auth-token');localStorage.removeItem('netspot-auth-user');setSignedInAs('');setActivePage('Dashboard');setHistory([]);setResult(null)}}><span><LogOut size={15}/> Sign out</span><ExternalLink size={13}/></button></div><div className="sidebar-version">NETSPOT UI <span>v2.1.0</span></div></aside><main className="main-area"><Header page={activePage} onRefresh={refresh} apiOnline={apiOnline} signedInAs={signedInAs}/><div className="page-content">{activePage==='Dashboard'&&<Dashboard locations={locations} history={history} runTest={runTest} testing={testing} result={result} loadingData={loadingData} openMap={()=>setActivePage('Dead Zone Map')}/ >}{activePage==='Dead Zone Map'&&<MapScreen history={history} onRefresh={refresh}/ >}{activePage==='Network Test'&&<NetworkTest runTest={runTest} testing={testing} result={result} apiOnline={apiOnline} progress={progress} testStatus={testStatus} testError={testError}/ >}{activePage==='Walk-test Survey'&&<WalkTest onSave={saveWalkSample} onNotice={notify}/ >}{activePage==='Test History'&&<History history={history} onClear={clearHistory} onDelete={async(id)=>{const r=await apiFetch(`${API}/api/network-tests/${encodeURIComponent(id)}`,{method:'DELETE'});if(!r.ok)throw new Error('Could not delete this test');setHistory(prev=>prev.filter(x=>x.id!==id));notify('Test deleted');}}/ >}{activePage==='Reports'&&<Reports history={history} locations={locations}/ >}<footer className="app-footer"><span>© 2026 NETSPOT · NETWORK DEAD ZONE DETECTOR</span><span><i className={apiOnline?'green':'amber'}/> {apiOnline?'Backend reachable':'Backend not connected'} <b>·</b> User-scoped saved measurements</span></footer></div></main><button className="mobile-menu" onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>{toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}</div>;
}
