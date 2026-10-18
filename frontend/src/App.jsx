import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Wifi, MapPinned, Gauge, Bell, Search, Play, CheckCircle2, Clock3,
  RefreshCw, AlertTriangle, CalendarDays, Filter, X, Download, ChevronDown,
  Settings, LogOut, Signal, Router, ArrowDownToLine, ArrowUpFromLine,
  CircleHelp, Menu, Zap, ShieldCheck, MapPin, RadioTower, FileChartColumn,
  Trash2, ExternalLink, Sun, Moon, LogIn
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const seedLocations = [
  { id: 1, name: 'Main Library', area: 'North Campus', lat: 18.4575, lng: 73.8203, latency: 24, loss: 0, quality: 'Good', date: '2026-10-18', signal: -48, tests: 18 },
  { id: 2, name: 'Computer Lab 3', area: 'Academic Block', lat: 18.4585, lng: 73.8218, latency: 86, loss: 1.8, quality: 'Moderate', date: '2026-10-17', signal: -67, tests: 12 },
  { id: 3, name: 'Parking Area', area: 'East Campus', lat: 18.4578, lng: 73.8240, latency: 192, loss: 8.4, quality: 'Poor', date: '2026-10-18', signal: -83, tests: 9 },
  { id: 4, name: 'College Canteen', area: 'Central Campus', lat: 18.4565, lng: 73.8220, latency: 38, loss: 0.4, quality: 'Good', date: '2026-10-16', signal: -54, tests: 15 },
  { id: 5, name: 'Sports Ground', area: 'South Campus', lat: 18.4549, lng: 73.8215, latency: 128, loss: 4.1, quality: 'Moderate', date: '2026-10-15', signal: -74, tests: 7 },
  { id: 6, name: 'Hostel Entrance', area: 'West Campus', lat: 18.4568, lng: 73.8189, latency: 31, loss: 0, quality: 'Good', date: '2026-10-18', signal: -51, tests: 14 },
  { id: 7, name: 'Auditorium', area: 'Academic Block', lat: 18.4594, lng: 73.8231, latency: 164, loss: 6.2, quality: 'Poor', date: '2026-10-14', signal: -80, tests: 6 },
];
const qualityColor = { Good: '#2ed6a1', Moderate: '#ffbd4a', Poor: '#ff5d73' };
const nav = [
  { label: 'Dashboard', icon: Activity }, { label: 'Network Test', icon: Gauge },
  { label: 'Dead Zone Map', icon: MapPinned }, { label: 'Test History', icon: Clock3 },
  { label: 'Reports', icon: FileChartColumn },
];
const trendSeed = [
  { time: '08:00', latency: 42, download: 86 }, { time: '09:00', latency: 38, download: 92 },
  { time: '10:00', latency: 51, download: 89 }, { time: '11:00', latency: 35, download: 105 },
  { time: '12:00', latency: 47, download: 98 }, { time: '13:00', latency: 31, download: 112 },
  { time: '14:00', latency: 39, download: 108 }, { time: '15:00', latency: 28, download: 119 },
];
function Badge({ quality }) { return <span className={`quality-badge ${quality.toLowerCase()}`}><i />{quality}</span>; }
function MapFocus({ selected }) { const map = useMap(); useEffect(() => { if (selected) map.flyTo([selected.lat, selected.lng], 17, { duration: .55 }); }, [selected, map]); return null; }
function Header({ page, onRefresh, apiOnline, signedInAs }) {
  return <header className="topbar"><div className="breadcrumb"><span>NETSPOT</span><b>/</b><strong>{page}</strong></div><div className="topbar-right"><span className={`connection-pill ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'API CONNECTED' : 'API DISCONNECTED'}</span><button className="icon-button" title="Refresh data" onClick={onRefresh}><RefreshCw size={16}/></button><button className="icon-button" title="Notifications"><Bell size={16}/><i className="notification-dot"/></button><span className="top-divider"/><div className="user-chip"><span className="avatar">ND</span><span><b>{signedInAs || 'Network Admin'}</b><small>Demo session</small></span><ChevronDown size={14}/></div></div></header>;
}
function PanelTitle({ children, icon: Icon, right }) { return <div className="panel-title"><div>{Icon && <Icon size={15}/>}<span>{children}</span></div>{right}</div>; }
function StatCard({ label, value, unit, note, icon: Icon, tone = 'cyan', trend }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={17}/></span></div><div className="stat-value">{value}<small>{unit}</small></div><div className="stat-foot"><span className={trend === 'down' ? 'trend-good' : 'trend-neutral'}>{trend === 'down' ? '↓' : '•'} {note}</span></div><div className={`stat-spark ${tone}`}><span/><span/><span/><span/><span/><span/><span/><span/><span/></div></article>;
}
function Dashboard({ locations, history, runTest, testing, result, openMap }) {
  const avg = history.length ? Math.round(history.reduce((a, x) => a + Number(x.latency || 0), 0) / history.length) : 42;
  const chartData = history.length ? [...history].slice(0, 8).reverse().map((x, i) => ({ time: x.createdAt ? new Date(x.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `T${i + 1}`, latency: Number(x.latency || 0), upload: Math.max(15, 65 - Number(x.latency || 0) / 4), download: Math.max(25, 125 - Number(x.latency || 0) / 2) })) : [
    {time:'00',latency:18,upload:20,download:44},{time:'03',latency:22,upload:26,download:56},{time:'06',latency:17,upload:24,download:48},{time:'09',latency:31,upload:31,download:84},{time:'12',latency:26,upload:29,download:70},{time:'15',latency:34,upload:38,download:105},{time:'18',latency:28,upload:34,download:90},{time:'21',latency:42,upload:41,download:115}
  ];
  const nodes = [{x:60,y:95,c:'#35e9df'},{x:80,y:72,c:'#35e9df'},{x:105,y:103,c:'#42e8a1'},{x:124,y:91,c:'#42e8a1'},{x:149,y:116,c:'#42e8a1'},{x:176,y:80,c:'#35e9df'},{x:190,y:105,c:'#42e8a1'},{x:213,y:132,c:'#ffbf4d'},{x:230,y:98,c:'#ffbf4d'},{x:254,y:112,c:'#ff6678'},{x:273,y:87,c:'#ff6678'},{x:300,y:135,c:'#ffbf4d'},{x:320,y:111,c:'#42e8a1'},{x:340,y:143,c:'#ff6678'},{x:365,y:101,c:'#42e8a1'},{x:386,y:128,c:'#ffbf4d'}];
  return <div className="rms-dashboard">
    <div className="rms-page-title"><div><span className="rms-kicker">NETWORK OPERATIONS CENTER</span><h1>Dashboard</h1><p>Live overview of network health, device distribution and connectivity performance.</p></div><button className="rms-run" onClick={runTest} disabled={testing}><Play size={15}/>{testing?'Running test…':'Run network test'}</button></div>
    <div className="rms-layout">
      <section className="rms-panel rms-status"><div className="rms-panel-title">System Status</div><div className="rms-health"><i/><div><b>Network Healthy</b><strong>98.4%</strong></div></div><div className="rms-rule"/><div className="rms-total">Total Devices: <b>12,450</b></div><div className="rms-mini-counts"><span>Online: 12,015</span><span>Offline: 435</span><span>Warnings: 78</span></div></section>
      <section className="rms-panel rms-world"><div className="rms-panel-title">Global Device Distribution <span>•••</span></div><div className="rms-world-map"><svg viewBox="0 0 430 245" role="img" aria-label="Illustrative global device distribution map"><defs><pattern id="rmsdots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.2" fill="#254b70"/></pattern></defs><rect width="430" height="245" fill="url(#rmsdots)" opacity=".18"/><g fill="#254b70" stroke="#31577b" strokeWidth="1.2"><path d="M28 48 L48 30 76 24 92 34 116 32 137 45 126 59 103 65 91 82 70 80 58 97 41 84 36 67 20 61Z"/><path d="M93 96 L112 101 125 122 120 146 109 168 103 194 90 181 87 154 76 133 80 111Z"/><path d="M185 48 L207 36 227 42 238 56 227 67 209 65 200 80 186 71Z"/><path d="M202 77 L225 72 247 83 255 104 245 124 232 139 224 163 211 155 205 129 193 109Z"/><path d="M236 43 L268 28 305 32 331 45 357 43 378 59 368 73 344 72 332 87 306 82 292 97 269 89 253 69 236 63Z"/><path d="M344 111 L367 104 390 115 397 132 383 145 360 141 348 129Z"/><path d="M368 174 L393 168 408 183 399 199 380 194Z"/><path d="M155 33 L170 27 182 34 177 46 164 48Z"/></g><g>{nodes.map((n,i)=><g key={i}><circle cx={n.x+20} cy={n.y+18} r="7" fill={n.c} opacity=".16"/><circle cx={n.x+20} cy={n.y+18} r="4.2" fill={n.c} stroke="#d8faff" strokeWidth=".7"/><circle cx={n.x+20} cy={n.y+18} r="1.5" fill="#062033"/></g>)}</g><g fill="#dce9f8" fontSize="8"><text x="196" y="72">Site 45: London</text><text x="196" y="82" fill="#42e8a1">Status: Online 509</text><text x="196" y="92" fill="#ff6678">Offline: 9</text><text x="20" y="120">Site 12: SF</text><text x="20" y="130" fill="#42e8a1">Status: Online</text><text x="340" y="159">Site 99: Tokyo</text><text x="340" y="169" fill="#42e8a1">Status: Tokyo</text></g></svg></div></section>
      <section className="rms-panel rms-alerts"><div className="rms-panel-title">Active Alerts <span>•••</span></div><div className="rms-alert critical"><i>!</i><span><b>Critical</b> Device Offline R-459</span><small>2 min ago</small></div><div className="rms-alert warning"><i>▲</i><span><b>Warning</b> High Latency Site 8</span><small>14:36</small></div><div className="rms-alert info"><i>i</i><span><b>Info</b> Firmware Update R 212</span><small>14:30</small></div></section>
      <section className="rms-panel rms-uptime"><div className="rms-panel-title">Device Uptime</div><div className="rms-gauge"><svg viewBox="0 0 200 120"><defs><linearGradient id="uptimeGradient"><stop offset="0" stopColor="#28d9f1"/><stop offset="1" stopColor="#40e8a4"/></linearGradient></defs><path d="M25 96 A75 75 0 0 1 175 96" fill="none" stroke="#183b54" strokeWidth="11" strokeLinecap="round"/><path d="M25 96 A75 75 0 0 1 175 96" fill="none" stroke="url(#uptimeGradient)" strokeWidth="9" strokeLinecap="round" strokeDasharray="225 240"/></svg><strong>97.6%</strong></div></section>
      <section className="rms-panel rms-topology"><div className="rms-panel-title">Network Topology View</div><svg viewBox="0 0 500 220" className="rms-topology-svg"><g strokeWidth="2.5" fill="none"><path d="M70 86 L205 40 L330 65 L415 133 L285 180 L110 165 Z" stroke="#35e9a0"/><path d="M70 86 L218 105 L330 65 L285 180 L205 40 L110 165" stroke="#ffb84c"/><path d="M110 165 L218 105 L415 133" stroke="#ff6376"/><path d="M70 86 L330 65 L218 105 L285 180" stroke="#35e9df"/></g>{[{x:70,y:86,t:'Edge_12'},{x:205,y:40,t:'HQ Core'},{x:330,y:65,t:'Edge_12'},{x:415,y:133,t:'Site B'},{x:285,y:180,t:'Site B'},{x:110,y:165,t:'Site A'},{x:218,y:105,t:'Edge A'}].map((n,i)=><g key={i}><circle cx={n.x} cy={n.y} r="14" fill="#0e2b43" stroke="#31dce8" strokeWidth="2"/><circle cx={n.x} cy={n.y} r="5" fill="#31dce8"/><text x={n.x} y={n.y+27} fill="#d4e5f6" fontSize="12" textAnchor="middle">{n.t}</text></g>)}</svg><div className="rms-topology-legend"><span><i className="good"/>Green=Strong</span><span><i className="mid"/>Orange=Moderate</span><span><i className="bad"/>Red=Failed</span></div></section>
      <section className="rms-panel rms-signal"><div className="rms-panel-title">Signal Strength (dBm) <span>•••</span></div><ResponsiveContainer width="100%" height={150}><BarChart data={[{n:'Region',a:28,b:20},{n:'East',a:23,b:34},{n:'India',a:45,b:29},{n:'Asia',a:37,b:20},{n:'West',a:44,b:31},{n:'Region',a:25,b:18}]}><CartesianGrid stroke="#1d3550" vertical={false}/><XAxis dataKey="n" tick={{fill:'#91a7c0',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#91a7c0',fontSize:9}} axisLine={false} tickLine={false} width={25}/><Tooltip contentStyle={{background:'#0c2037',border:'1px solid #294766',color:'#fff'}}/><Bar dataKey="a" fill="#2bd9e8" radius={[2,2,0,0]}/><Bar dataKey="b" fill="#40e5a3" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer></section>
      <section className="rms-panel rms-latency"><div className="rms-panel-title">Latency (ms) <span>•••</span></div><div className="rms-latency-average"><span>Average</span><b>{result?.latency ?? avg}ms</b></div><ResponsiveContainer width="100%" height={85}><AreaChart data={chartData}><defs><linearGradient id="rmsLatencyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#28dce9" stopOpacity={.35}/><stop offset="1" stopColor="#28dce9" stopOpacity={0}/></linearGradient></defs><Area dataKey="latency" stroke="#2bd9e8" strokeWidth={2} fill="url(#rmsLatencyFill)"/><XAxis dataKey="time" hide/><YAxis hide/><Tooltip contentStyle={{background:'#0c2037',border:'1px solid #294766',color:'#fff'}}/></AreaChart></ResponsiveContainer><div className="rms-chart-foot"><span>24h</span><span>12h</span><span>24h</span></div></section>
      <section className="rms-panel rms-bandwidth"><div className="rms-panel-title">Bandwidth Usage (Upload/Download) <span>•••</span></div><ResponsiveContainer width="100%" height={145}><AreaChart data={chartData}><defs><linearGradient id="rmsDl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2bd9e8" stopOpacity={.45}/><stop offset="1" stopColor="#2bd9e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1d3550" vertical={false}/><XAxis dataKey="time" tick={{fill:'#91a7c0',fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Area dataKey="download" stroke="#2bd9e8" fill="url(#rmsDl)" strokeWidth={2}/><Area dataKey="upload" stroke="#42e7a5" fill="#42e7a5" fillOpacity={.12} strokeWidth={2}/><Tooltip contentStyle={{background:'#0c2037',border:'1px solid #294766',color:'#fff'}}/></AreaChart></ResponsiveContainer></section>
      <section className="rms-panel rms-clients"><div className="rms-panel-title">Connected Clients <span>•••</span></div><ResponsiveContainer width="100%" height={145}><AreaChart data={[{t:'00',v:12},{t:'04',v:14},{t:'08',v:13},{t:'12',v:21},{t:'16',v:24},{t:'20',v:25},{t:'24',v:32},{t:'28',v:31},{t:'32',v:36}]}><defs><linearGradient id="rmsClientFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2bd9e8" stopOpacity={.4}/><stop offset="1" stopColor="#2bd9e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1d3550" vertical={false}/><XAxis dataKey="t" tick={{fill:'#91a7c0',fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Area dataKey="v" stroke="#2bd9e8" fill="url(#rmsClientFill)" strokeWidth={2}/><Tooltip contentStyle={{background:'#0c2037',border:'1px solid #294766',color:'#fff'}}/></AreaChart></ResponsiveContainer></section>
    </div>
    <div className="rms-dashboard-bottom"><span><i/> Live sample dashboard</span><span>{history.length} saved network tests</span><button onClick={openMap}><MapPinned size={13}/> Open dead zone map</button></div>
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
function MapScreen({ locations }) {
  const [query, setQuery] = useState('');
  const [quality, setQuality] = useState('All');
  const [date, setDate] = useState('all');
  const [selectedId, setSelectedId] = useState(1);
  const filtered = useMemo(() => locations.filter(l => (`${l.name} ${l.area}`).toLowerCase().includes(query.toLowerCase()) && (quality === 'All' || l.quality === quality) && (date === 'all' || l.date === date)), [locations,query,quality,date]);
  const selected = filtered.find(l => l.id === selectedId) || filtered[0] || locations[0] || null;
  const center = selected ? [selected.lat, selected.lng] : [18.4575,73.8217];
  const hexes = useMemo(() => makeHexSurvey(locations), [locations]);
  return <div className="survey-screen">
    <div className="survey-topline"><div className="survey-appmark">V</div><div className="survey-title">WiFi Coverage Survey Historical</div><div className="survey-top-spacer"/><span className="survey-search-user"><Search size={13}/> demo</span><span className="survey-user"><span>♟</span> Demo V-App <ChevronDown size={13}/></span></div>
    <div className="survey-toolbar"><div className="survey-rail"><button title="Survey home">⌂</button><button title="Coverage surveys">▣</button><button title="Access points">▰</button><button title="Wi-Fi">◉</button><button title="Battery">▰</button></div><div className="survey-workspace">
      <div className="survey-controls"><label><CalendarDays size={13}/><input type="date" aria-label="Survey start date" defaultValue="2026-10-08"/></label><span className="survey-date-dash">–</span><label><input type="date" aria-label="Survey end date" defaultValue="2026-10-18"/></label><span className="survey-survey-label">Coverage Survey</span><div className="survey-filter-spacer"/><label className="survey-search"><Search size={13}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search location"/></label><select aria-label="Quality filter" value={quality} onChange={e=>setQuality(e.target.value)}><option>All</option><option>Good</option><option>Moderate</option><option>Poor</option></select></div>
      <div className="survey-columns"><div className="survey-left-column"><CoverageChart/><section className="access-points"><h3>Access Points</h3><table><thead><tr><th>Name</th><th>Model</th></tr></thead><tbody>{['Access Point MR2','Access Point MR1','Access Point MR3'].map((name,i)=><tr key={name}><td>{name}</td><td>{['MR32','MR33','MR33'][i]}</td></tr>)}</tbody></table><div className="survey-match-count">Showing {filtered.length} matching survey locations</div></section></div>
      <section className="survey-map-panel"><div className="survey-map-caption">Coverage Survey <span>{selected ? `${selected.name} · ${selected.signal} dBm` : 'No matching locations'}</span></div><div className="survey-map-wrap"><MapContainer key="coverage-survey-map" center={center} zoom={18} scrollWheelZoom zoomControl={false} attributionControl={true}><TileLayer attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"/><ZoomControl position="topleft"/><SurveyZoomBridge/>{hexes.map(cell=><Polygon key={cell.id} positions={cell.positions} pathOptions={{color:cell.color,fillColor:cell.color,fillOpacity:.72,weight:.7,opacity:.8}}><Popup><b>Coverage sample</b><br/>Estimated signal: {cell.signal} dBm<br/>Illustrative survey grid</Popup></Polygon>)}{filtered.map(loc=><CircleMarker key={loc.id} center={[loc.lat,loc.lng]} radius={selected?.id===loc.id?8:6} pathOptions={{color:'#0879bd',fillColor:'#0879bd',fillOpacity:1,weight:2}} eventHandlers={{click:()=>setSelectedId(loc.id)}}><Popup><b>{loc.name}</b><br/>{loc.area}<br/>Signal: {loc.signal} dBm<br/>Latency: {loc.latency} ms<br/>Quality: {loc.quality}</Popup></CircleMarker>)}</MapContainer><div className="survey-map-tools"><button title="Zoom in" onClick={()=>window.dispatchEvent(new CustomEvent('netspot-map-zoom',{detail:1}))}>＋</button><button title="Zoom out" onClick={()=>window.dispatchEvent(new CustomEvent('netspot-map-zoom',{detail:-1}))}>−</button><button title="Home view" onClick={()=>setSelectedId(filtered[0]?.id || 1)}>⌂</button></div><div className="survey-scale"><span>-95.00</span><i /><span>-30.00</span></div></div><div className="survey-map-status">{selected ? <><b>{selected.name}</b> · {selected.area} · {selected.signal} dBm · {selected.latency} ms</> : 'No locations match your filters'} <span>Hexagon colors show estimated signal strength</span></div></section></div>
    </div></div>
  </div>;
}
const surveyInputStyle = { width:'100%', boxSizing:'border-box', padding:'10px 11px', borderRadius:8, border:'1px solid var(--border,#344054)', background:'var(--panel,#111827)', color:'inherit', outline:'none' };
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
      <div className="nt-actions"><button className="nt-button muted" onClick={()=>setPaused(v=>!v)}><span>{paused?'▶':'Ⅱ'}</span>{paused?'Resume charts':'Pause charts'}</button><button className="nt-button primary" onClick={()=>{const loc=surveyLocation();if(loc)runTest(loc);}} disabled={testing||!apiOnline}><RefreshCw size={14} className={testing?'nt-spin':''}/>{testing?'Testing…':'Run / Retest'}</button><button className="nt-social download" title="Download PDF report" onClick={()=>window.open(`${API}/api/reports.pdf`,'_blank','noopener,noreferrer')}><Download size={14}/></button><span className="nt-measured"><Clock3 size={12}/> {result?`Measured at ${measuredAt}`:'No real measurement yet'}</span></div>
    </section>
    <div className="nt-lower-grid">
      <section className="nt-location-panel"><div className="nt-lower-title">Connection availability</div><div className="nt-location-details"><div><Router size={13}/><span>Backend: <b>{apiOnline?'Reachable':'Unavailable'}</b></span></div><div><Wifi size={13}/><span>Internet probes: <b>{result?.successfulProbes!=null?`${result.successfulProbes}/${result.probeCount} successful`:'Not tested'}</b></span></div><div><Signal size={13}/><span>Measurement source: <b>Browser HTTP probes</b></span></div><div><Activity size={13}/><span>Result: <b>{result?.issueType || result?.quality || 'Awaiting test'}</b></span></div></div></section>
      <section className="nt-latency-panel"><div className="nt-lower-title">Repeated latency probes</div><div className="nt-boxplot-card"><div className="nt-boxplot-head"><b>HTTP round-trip samples</b><span>({latencySamples.length} samples)</span></div>{latencySamples.length?<div className="nt-probe-list">{latencySamples.map((v,i)=><div className="nt-probe-row" key={i}><span>Probe {i+1}</span><div className="nt-probe-track"><i style={{width:`${Math.min(100,Number(v)/Math.max(1,...latencySamples)*100)}%`}}/></div><b>{Number(v).toFixed(1)} ms</b></div>)}</div>:<div className="nt-no-probes">Repeated latency samples will appear here after the next test.</div>}<div className="nt-latency-footer"><span>{result?.isMeasured?'Measured values':'No measured result'}</span><b>{loss===null?'—':`${loss.toFixed(1)}% loss`}</b></div></div><div className="nt-measurement-note"><Activity size={14}/><span>Latency is HTTP round-trip time to an external test endpoint. Packet loss is failed probes divided by attempted probes. Jitter is mean absolute change between consecutive successful latency samples. Browser measurements may differ from ICMP tests.</span></div></section>
    </div>
  </div>;
}
function History({ history, onClear }) {
  const [range, setRange] = useState('24h');
  const [aggregation, setAggregation] = useState('Mean');
  const [alignment, setAlignment] = useState('Auto');
  const [page, setPage] = useState({ latency: 0, jitter: 0, loss: 0 });
  const series = [
    { name: 'Confluence | HTTP', color: '#64b5f6', base: 158, amp: 3.5 },
    { name: 'Confluence | ICMP', color: '#d6dce4', base: 151, amp: 2.3 },
    { name: 'Google | HTTP', color: '#8edc85', base: 72, amp: 1.7 },
    { name: 'Google | ICMP', color: '#f0a66a', base: 160, amp: 2.4 },
    { name: 'Microsoft Office365 | HTTP', color: '#a8b9ff', base: 70, amp: 1.4 },
    { name: 'Microsoft Office365 | ICMP', color: '#f16b8b', base: 32, amp: 1.1 },
    { name: 'Microsoft Teams', color: '#d4c45c', base: 5, amp: 1.8 },
  ];
  const timeLabels = Array.from({ length: 25 }, (_, i) => {
    const d = new Date(Date.now() - (24 - i) * 60 * 60 * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });
  const jitterSeries = series.map((s, si) => ({ ...s, base: [38, 37, 16, 39, 18, 32, 2][si], amp: [1.8,1.2,1.3,2.1,0.8,1.2,2.8][si] }));
  const lossSeries = series.map((s, si) => ({ ...s, base: si === 0 ? 0.15 : si === 1 ? 0.05 : si === 3 ? 0.25 : 0.02, amp: si === 4 ? 0.05 : 0.12 }));
  const buildData = (set) => timeLabels.map((time, i) => {
    const row = { time };
    set.forEach((s, si) => {
      const wobble = Math.sin(i * (0.7 + si * 0.11) + si) * s.amp + Math.cos(i * 0.37 + si) * s.amp * 0.4;
      let value = Math.max(0, s.base + wobble);
      if (set === jitterSeries && [12, 18, 21].includes(i) && si === 0) value += 12;
      if (set === jitterSeries && i === 6 && si === 2) value += 9;
      row[`s${si}`] = Number(value.toFixed(2));
    });
    return row;
  });
  const latencyData = buildData(series);
  const jitterData = buildData(jitterSeries);
  const lossData = buildData(lossSeries);
  const exportCsv = () => {
    const keys = ['id','createdAt','latency','status','message'];
    const quote = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const csv = [keys.join(','), ...history.map(x => keys.map(k => quote(x[k])).join(','))].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'netspot-test-history.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  const graph = (title, kind, data, max, unit) => {
    const key = kind;
    const set = kind === 'latency' ? series : kind === 'jitter' ? jitterSeries : lossSeries;
    const activePage = page[key] || 0;
    return <section className={`history-graph history-${kind}`} key={kind}>
      <div className="history-step"><span>{kind === 'latency' ? '2' : kind === 'jitter' ? '3' : '4'}</span></div>
      <div className="history-graph-content">
        <div className="history-graph-head"><h2>{title}</h2><button onClick={() => setPage(p => ({ ...p, [key]: (activePage + 1) % 3 }))} className="history-reset">{kind === 'latency' ? 'Reset All' : `${activePage + 1}/3  ▶`}</button></div>
        <div className="history-chart-layout">
          <div className="history-legend">{set.map((s, i) => <div key={s.name}><i style={{ background: s.color }}/><span>{s.name}</span></div>)}<button onClick={() => setPage(p => ({ ...p, [key]: (activePage + 1) % 3 }))}>◀  {activePage + 1}/3 ▶</button></div>
          <div className="history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 6, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="#4a5357" strokeDasharray="3 4" vertical={false}/>
                <XAxis dataKey="time" interval={3} tick={{ fill: '#879196', fontSize: 9 }} axisLine={{ stroke: '#697277' }} tickLine={false}/>
                <YAxis domain={[0, max]} ticks={kind === 'loss' ? [0,25,50,75,100] : kind === 'jitter' ? [0,10,20,30,40] : [0,50,100,150]} tickFormatter={v => `${v}${unit}`} tick={{ fill: '#879196', fontSize: 9 }} width={36} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: '#f4f6f7', border: '1px solid #9ba4a8', color: '#17212a', fontSize: 10, borderRadius: 3 }} labelStyle={{ color: '#17212a' }} formatter={(v, n) => [`${Number(v).toFixed(2)}${unit}`, set.find((s,i)=>`s${i}`===n)?.name || n]}/>
                {set.map((s, i) => <Line key={s.name} type="monotone" dataKey={`s${i}`} stroke={s.color} strokeWidth={1.35} dot={false} activeDot={{ r: 2.5 }} isAnimationActive={false}/>)}
              </LineChart>
            </ResponsiveContainer>
            <div className="history-crosshair" aria-hidden="true"><span>{timeLabels[12]}<br/>{title} · {aggregation}</span></div>
          </div>
        </div>
      </div>
    </section>;
  };
  return <div className="history-monitor">
    <div className="history-controls">
      <div className="history-step"><span>1</span></div>
      <label>Time Range<select value={range} onChange={e=>setRange(e.target.value)}><option value="24h">2022-10-02 09:00 to 2022-10-04 09:00</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label>
      <label>Aggregation<select value={aggregation} onChange={e=>setAggregation(e.target.value)}><option>Mean</option><option>Maximum</option><option>Minimum</option><option>95th percentile</option></select></label>
      <label>Alignment Period<select value={alignment} onChange={e=>setAlignment(e.target.value)}><option>Auto</option><option>1 minute</option><option>5 minutes</option><option>1 hour</option></select></label>
      <div className="history-control-actions"><button onClick={exportCsv} title="Export test history">Export CSV</button><button onClick={onClear} disabled={!history.length} title="Clear saved test history">Clear</button></div>
    </div>
    {graph('Latency','latency',latencyData,180,' ms')}
    {graph('Jitter','jitter',jitterData,45,' ms')}
    {graph('Loss','loss',lossData,100,'%')}
    <div className="history-live-footer"><span><i/> Historical performance overview</span><span>{history.length} saved backend test{history.length===1?'':'s'} · plotted series are illustrative monitoring samples</span></div>
  </div>;
}
function Reports({ history, locations }) {
  const [range, setRange] = useState('Last 7 days');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [qualityFilter, setQualityFilter] = useState('All Quality');
  const [reportSearch, setReportSearch] = useState('');

  const demoTrend = [
    { day: 'Oct 20', latency: 45, download: 76, upload: 27, loss: 5 },
    { day: 'Oct 21', latency: 54, download: 90, upload: 33, loss: 11 },
    { day: 'Oct 22', latency: 59, download: 94, upload: 37, loss: 12 },
    { day: 'Oct 23', latency: 52, download: 89, upload: 41, loss: 14 },
    { day: 'Oct 24', latency: 61, download: 100, upload: 38, loss: 13 },
    { day: 'Oct 25', latency: 56, download: 86, upload: 34, loss: 18 },
    { day: 'Oct 26', latency: 56, download: 94, upload: 37, loss: 15 },
  ];
  const displayTrend = history.length >= 2
    ? [...history].slice(0, 7).reverse().map((item, i) => ({
        day: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : `Test ${i + 1}`,
        latency: Number(item.latency || 0),
        download: Math.max(12, 119 - Number(item.latency || 0) * .38),
        upload: Math.max(8, 80 - Number(item.latency || 0) * .28),
        loss: Number(item.loss || 0),
      })) : demoTrend;
  const displayLocations = locations.map((l, i) => ({
    ...l,
    reportName: ({ 'Main Library': 'Library', 'College Canteen': 'Canteen', 'Sports Ground': 'Sports Complex', 'Computer Lab 3': 'Hostel Block B', 'Parking Area': 'Hostel Block A', 'Hostel Entrance': 'Lab', 'Auditorium': 'Auditorium' })[l.name] || l.name,
    download: Math.max(18, Math.round(122 - Number(l.latency || 40) * .38)),
    upload: Math.max(10, Math.round(72 - Number(l.latency || 40) * .25)),
  }));
  const avgLatency = history.length
    ? Math.round(history.reduce((sum, item) => sum + Number(item.latency || 0), 0) / history.length)
    : 42;
  const totalTests = history.length || 248;
  const poorCount = locations.filter(l => l.quality === 'Poor').length || 7;
  const visibleLocations = displayLocations.filter(l =>
    (locationFilter === 'All Locations' || l.reportName === locationFilter || l.name === locationFilter) &&
    (qualityFilter === 'All Quality' || l.quality === qualityFilter) &&
    l.reportName.toLowerCase().includes(reportSearch.toLowerCase())
  );
  const recentRows = (history.length ? history.slice(0, 5).map((item, i) => {
    const loc = displayLocations[i % Math.max(displayLocations.length, 1)];
    return { id: item.id || i, date: item.createdAt ? new Date(item.createdAt) : new Date(), location: loc?.reportName || 'Library', latency: Number(item.latency || 0), download: loc?.download || 92, upload: loc?.upload || 48, quality: Number(item.latency || 0) > 100 ? 'Poor' : Number(item.latency || 0) > 55 ? 'Moderate' : 'Good' };
  }) : [
    { id: 1, date: new Date('2026-10-26T14:32:00'), location: 'Library', latency: 28, download: 92, upload: 48, quality: 'Good' },
    { id: 2, date: new Date('2026-10-26T12:17:00'), location: 'Hostel Block B', latency: 78, download: 42, upload: 18, quality: 'Poor' },
    { id: 3, date: new Date('2026-10-26T11:03:00'), location: 'Lab', latency: 34, download: 88, upload: 46, quality: 'Good' },
    { id: 4, date: new Date('2026-10-25T16:45:00'), location: 'Canteen', latency: 49, download: 60, upload: 32, quality: 'Moderate' },
    { id: 5, date: new Date('2026-10-25T10:20:00'), location: 'Sports Complex', latency: 23, download: 95, upload: 52, quality: 'Good' },
  ]).filter(row => (locationFilter === 'All Locations' || row.location === locationFilter) && (qualityFilter === 'All Quality' || row.quality === qualityFilter));

  const exportReport = () => {
    // The report endpoint returns a real PDFKit-generated A4 PDF with attachment headers.
    window.open(`${API}/api/reports.pdf`, '_blank', 'noopener,noreferrer');
  };

  const qualityClass = q => q.toLowerCase().replace(/\s+/g, '-');
  const mapDots = [
    { x: 35, y: 25, name: 'Library', q: 'Good' }, { x: 19, y: 44, name: 'Hostel Block A', q: 'Moderate' },
    { x: 68, y: 36, name: 'Hostel Block B', q: 'Poor' }, { x: 54, y: 55, name: 'Lab', q: 'Good' },
    { x: 43, y: 72, name: 'Canteen', q: 'Moderate' }, { x: 76, y: 82, name: 'Sports Complex', q: 'Good' },
  ];

  return <div className="reports-v2">
    <div className="reports-v2-heading">
      <div className="reports-title-wrap"><span className="reports-title-icon"><FileChartColumn size={31}/></span><div><h1>Network Reports</h1><p>Performance analytics <span>·</span> Historical overview</p></div></div>
      <div className="reports-filters">
        <label><CalendarDays size={15}/><select value={range} onChange={e => setRange(e.target.value)} aria-label="Date range"><option>Last 7 days</option><option>Last 24 hours</option><option>Last 30 days</option><option>All time</option></select><ChevronDown size={14}/></label>
        <label><MapPin size={15}/><select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} aria-label="Location filter"><option>All Locations</option>{[...new Set(displayLocations.map(l => l.reportName))].map(name => <option key={name}>{name}</option>)}</select><ChevronDown size={14}/></label>
        <label><Filter size={15}/><select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} aria-label="Quality filter"><option>All Quality</option><option>Good</option><option>Moderate</option><option>Poor</option></select><ChevronDown size={14}/></label>
        <button className="reports-export" onClick={exportReport}><Download size={15}/> Export Report</button>
      </div>
    </div>

    <div className="reports-v2-stats">
      <article className="reports-stat"><span className="reports-stat-icon cyan"><Activity size={26}/></span><div><small>TOTAL TESTS</small><strong>{totalTests}</strong><p className="positive">↑ 12% <span>vs. previous 7 days</span></p></div></article>
      <article className="reports-stat"><span className="reports-stat-icon blue"><Gauge size={27}/></span><div><small>AVG. LATENCY</small><strong>{history.length ? avgLatency : 42}<em> ms</em></strong><p className="positive">↓ 18% <span>vs. previous 7 days</span></p></div></article>
      <article className="reports-stat"><span className="reports-stat-icon green"><ArrowDownToLine size={27}/></span><div><small>AVG. DOWNLOAD SPEED</small><strong>{history.length ? Math.round(displayLocations.reduce((a,l)=>a+l.download,0)/Math.max(displayLocations.length,1)) : 86}<em> Mbps</em></strong><p className="positive">↑ 24% <span>vs. previous 7 days</span></p></div></article>
      <article className="reports-stat"><span className="reports-stat-icon red"><MapPin size={27}/></span><div><small>POOR LOCATIONS</small><strong>{poorCount}</strong><p className="negative">↑ 2 <span>vs. previous 7 days</span></p></div></article>
    </div>

    <div className="reports-v2-grid reports-top-grid">
      <section className="reports-card reports-trend-card"><div className="reports-card-head"><h2><Activity size={19}/>Performance Trends</h2><div className="reports-legend"><span><i className="dot-cyan"/>Latency (ms)</span><span><i className="dot-green"/>Download (Mbps)</span><span><i className="dot-purple"/>Upload (Mbps)</span><span><i className="dot-amber"/>Packet Loss (%)</span></div></div>
        <div className="reports-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={displayTrend} margin={{ top: 12, right: 10, left: -8, bottom: 0 }}><CartesianGrid stroke="#12314a" strokeDasharray="2 4" vertical={false}/><XAxis dataKey="day" tick={{ fill:'#a5c6df', fontSize:11 }} axisLine={{stroke:'#1b4562'}} tickLine={false}/><YAxis domain={[0,120]} ticks={[0,20,40,60,80,100,120]} tick={{fill:'#a5c6df',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#061c31',border:'1px solid #145071',borderRadius:8,color:'#e9f7ff'}}/><Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#00d8f5" strokeWidth={2} dot={{r:3,fill:'#00d8f5'}}/><Line type="monotone" dataKey="download" name="Download (Mbps)" stroke="#00e6a0" strokeWidth={2} dot={{r:3,fill:'#00e6a0'}}/><Line type="monotone" dataKey="upload" name="Upload (Mbps)" stroke="#b05cff" strokeWidth={2} dot={{r:3,fill:'#b05cff'}}/><Line type="monotone" dataKey="loss" name="Packet Loss (%)" stroke="#ffb21d" strokeWidth={2} dot={{r:3,fill:'#ffb21d'}}/></LineChart></ResponsiveContainer></div>
      </section>
      <section className="reports-card"><div className="reports-card-head"><h2><MapPin size={19}/>Location Comparison</h2><div className="reports-legend"><span><i className="dot-cyan"/>Latency (ms)</span><span><i className="dot-green"/>Download (Mbps)</span></div></div>
        <div className="reports-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={displayLocations.slice(0,6).map(l=>({...l, shortName:l.reportName.length>13?l.reportName.slice(0,12)+'…':l.reportName}))} margin={{top:14,right:8,left:-8,bottom:0}}><CartesianGrid stroke="#12314a" strokeDasharray="2 4" vertical={false}/><XAxis dataKey="shortName" tick={{fill:'#00dafa',fontSize:10}} axisLine={{stroke:'#1b4562'}} tickLine={false}/><YAxis domain={[0,120]} ticks={[0,30,60,90,120]} tick={{fill:'#a5c6df',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#061c31',border:'1px solid #145071',borderRadius:8,color:'#e9f7ff'}}/><Bar dataKey="latency" name="Latency (ms)" fill="#05c8e9" radius={[3,3,0,0]} maxBarSize={24}/><Bar dataKey="download" name="Download (Mbps)" fill="#13ce91" radius={[3,3,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer></div>
      </section>
    </div>

    <div className="reports-v2-grid reports-bottom-grid">
      <section className="reports-card reports-quality-card"><div className="reports-card-head"><h2><Activity size={19}/>Network Quality by Location</h2></div><div className="reports-quality-content">
        <div className="reports-mini-map"><div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/><div className="map-road road-d"/>{mapDots.map(dot=><div key={dot.name} className={`reports-map-dot ${qualityClass(dot.q)}`} style={{left:`${dot.x}%`,top:`${dot.y}%`}} title={`${dot.name} · ${dot.q}`}><span>{dot.name}</span></div>)}<div className="map-zoom"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div><span className="map-target"><MapPin size={16}/></span></div>
        <div className="reports-quality-table"><div className="quality-key"><span><i className="dot-green"/>Good</span><span><i className="dot-amber"/>Moderate</span><span><i className="dot-red"/>Poor</span></div><div className="quality-table-head"><span>Location</span><span>Avg. Latency</span><span>Quality</span></div>{visibleLocations.slice(0,6).map(l=><div className="quality-table-row" key={l.id}><span>{l.reportName}</span><span>{l.latency} ms</span><span><b className={`quality-tag ${qualityClass(l.quality)}`}>{l.quality}</b></span></div>)}</div>
      </div></section>
      <section className="reports-card reports-recent-card"><div className="reports-card-head"><h2><Clock3 size={19}/>Recent Test Reports</h2><button className="reports-view-all" onClick={()=>setRange('All time')}>View All</button></div>
        <div className="reports-table-wrap"><table className="reports-recent-table"><thead><tr><th>Date &amp; Time</th><th>Location</th><th>Latency</th><th>Download</th><th>Upload</th><th>Quality</th><th/></tr></thead><tbody>{recentRows.map(row=><tr key={row.id}><td>{row.date.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})} {row.date.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}</td><td>{row.location}</td><td>{row.latency} ms</td><td>{row.download} Mbps</td><td>{row.upload} Mbps</td><td><b className={`quality-tag ${qualityClass(row.quality)}`}>{row.quality}</b></td><td><ChevronDown className="row-chevron" size={14}/></td></tr>)}</tbody></table></div>
        <div className="reports-table-foot"><span>{history.length ? `Showing ${recentRows.length} saved test records` : 'Demo preview · values are illustrative'}</span><input value={reportSearch} onChange={e=>setReportSearch(e.target.value)} placeholder="Filter locations…" aria-label="Filter locations"/></div>
      </section>
    </div>
    <div className="reports-v2-note">Note: Data shown is based on actual tests and backend records. For demonstration purposes, some values may be simulated.</div>
  </div>;
}
function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const switchMode = (next) => { setMode(next); setError(''); setNotice(''); };
  const submit = (event) => {
    event.preventDefault();
    setError(''); setNotice('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) { setError('Enter your email and password.'); return; }
    // Prototype-only local account storage. Do not use this for real or sensitive accounts.
    let users = [];
    try { users = JSON.parse(localStorage.getItem('netspot-demo-users') || '[]'); } catch { users = []; }
    if (mode === 'register') {
      if (!name.trim()) { setError('Enter your name.'); return; }
      if (password.length < 6) { setError('Use a password with at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (users.some(user => user.email === normalizedEmail)) { setError('An account with this email already exists. Please sign in.'); return; }
      users.push({ name: name.trim(), email: normalizedEmail, password });
      localStorage.setItem('netspot-demo-users', JSON.stringify(users));
      setNotice('Account created. You can now sign in.');
      setMode('login'); setPassword(''); setConfirmPassword('');
      return;
    }
    const user = users.find(item => item.email === normalizedEmail && item.password === password);
    if (user) { onLogin(user.email, user.name); return; }
    setError(users.length ? 'Email or password is incorrect. Create an account if you are new.' : 'No account found yet. Choose Create account first.');
  };
  return <div className={`login-screen ${theme === 'light' ? 'light-mode' : ''}`}>
    <div className="login-theme"><button className="icon-button" onClick={onToggleTheme} aria-label="Toggle color theme">{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button></div>
    <form className="login-card" onSubmit={submit}>
      <div className="login-brand-mark"><Wifi size={27}/></div>
      <div className="eyebrow centered">NETWORK OPERATIONS CENTER</div>
      <h1>{mode === 'login' ? 'Welcome to NetSpot' : 'Create your account'}</h1>
      <p>{mode === 'login' ? 'Sign in to your network intelligence workspace.' : 'Register to start monitoring network performance.'}</p>
      {mode === 'register' && <label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name" required /></label>}
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 6 : undefined} required /></label>
      {mode === 'register' && <label>Confirm password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" required /></label>}
      {error && <div className="login-error" role="alert">{error}</div>}
      {notice && <div className="login-notice" role="status">{notice}</div>}
      <button className="primary-button login-submit" type="submit"><LogIn size={16}/>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <div className="login-switch">{mode === 'login' ? "Don't have an account?" : 'Already registered?'} <button type="button" onClick={()=>switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div>
      <small className="login-disclaimer">Demo authentication stores accounts in this browser only. Do not use a real password; secure backend authentication is required before deployment.</small>
    </form>
  </div>;
}

export default function App() {
  const [activePage,setActivePage]=useState('Dashboard'); const [history,setHistory]=useState([]); const [theme,setTheme]=useState(()=>localStorage.getItem('netspot-theme') || 'dark'); const [signedInAs,setSignedInAs]=useState(''); const [apiOnline,setApiOnline]=useState(false); const [testing,setTesting]=useState(false); const [result,setResult]=useState(null); const [toast,setToast]=useState(''); const [sidebarOpen,setSidebarOpen]=useState(false); const [progress,setProgress]=useState(0); const [testStatus,setTestStatus]=useState(''); const [testError,setTestError]=useState('');
  const locations=seedLocations;
  const notify=useCallback((message)=>{setToast(message);window.setTimeout(()=>setToast(''),3200)},[]);
  const normalizeRecord=(r)=>({...r,latency:r.latencyMs??r.latency??null,loss:r.packetLossPct??r.loss??null,createdAt:r.timestamp??r.createdAt});
  const refresh=useCallback(async()=>{try{const [health,records]=await Promise.all([fetch(`${API}/api/health`,{cache:'no-store'}),fetch(`${API}/api/network-tests`,{cache:'no-store'})]);setApiOnline(health.ok);if(records.ok){const body=await records.json();const rows=(Array.isArray(body.data)?body.data:Array.isArray(body.records)?body.records:[]).map(normalizeRecord);setHistory(rows);if(rows[0])setResult(rows[0])}}catch{setApiOnline(false)}},[]);
  useEffect(()=>{refresh();const timer=window.setInterval(refresh,30000);return()=>window.clearInterval(timer)},[refresh]);
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
      const saved=await fetch(`${API}/api/network-tests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(measured),cache:'no-store'});
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
  const clearHistory=async()=>{if(!window.confirm('Clear all saved network test history?'))return;try{const r=await fetch(`${API}/api/network-tests`,{method:'DELETE'});if(!r.ok)throw new Error('Could not clear history');setHistory([]);setResult(null);notify('Test history cleared')}catch(e){notify(e.message)}};
  if(!signedInAs) return <LoginPage theme={theme} onToggleTheme={()=>setTheme(t=>{const next=t==='dark'?'light':'dark';localStorage.setItem('netspot-theme',next);return next})} onLogin={(email, name)=>{setSignedInAs(name || email);notify('Signed in to demo workspace')}} />;
  return <div className={`ops-app ${theme==='light'?'light-mode':''}`}><aside className={`sidebar ${sidebarOpen?'sidebar-open':''}`}><div className="brand"><div className="brand-mark"><Wifi size={22}/><span/></div><div><b>NETSPOT</b><small>NETWORK INTELLIGENCE</small></div><button className="sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={17}/></button></div><div className="nav-section-label">WORKSPACE</div><nav className="nav-list">{nav.map(item=>{const Icon=item.icon;return <button key={item.label} className={`nav-item ${activePage===item.label?'active':''}`} onClick={()=>{setActivePage(item.label);setSidebarOpen(false)}}><Icon size={17}/><span>{item.label}</span>{item.label==='Dead Zone Map'&&<span className="nav-count">2</span>}</button>})}</nav><div className="sidebar-spacer"/><div className="sidebar-system"><div className="sidebar-system-icon"><ShieldCheck size={16}/></div><div><b>Monitoring active</b><small>Local demo environment</small></div><i className={apiOnline?'green':'amber'}/></div><div className="sidebar-bottom"><span className="sidebar-avatar">ND</span><div><b>{signedInAs || 'Network Admin'}</b><small>NetSpot workspace</small></div><Settings size={15}/></div><div className="sidebar-utility"><button className="theme-toggle" onClick={()=>setTheme(t=>{const next=t==='dark'?'light':'dark';localStorage.setItem('netspot-theme',next);return next})}><span>{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>} Appearance</span><b>{theme==='dark'?'Dark':'Light'}</b></button><button className="theme-toggle logout-toggle" onClick={()=>{setSignedInAs('');setActivePage('Dashboard')}}><span><LogOut size={15}/> Sign out</span><ExternalLink size={13}/></button></div><div className="sidebar-version">NETSPOT UI <span>v2.1.0</span></div></aside><main className="main-area"><Header page={activePage} onRefresh={refresh} apiOnline={apiOnline} signedInAs={signedInAs}/><div className="page-content">{activePage==='Dashboard'&&<Dashboard locations={locations} history={history} runTest={runTest} testing={testing} result={result} openMap={()=>setActivePage('Dead Zone Map')}/ >}{activePage==='Dead Zone Map'&&<MapScreen locations={locations}/ >}{activePage==='Network Test'&&<NetworkTest runTest={runTest} testing={testing} result={result} apiOnline={apiOnline} progress={progress} testStatus={testStatus} testError={testError}/ >}{activePage==='Test History'&&<History history={history} onClear={clearHistory}/ >}{activePage==='Reports'&&<Reports history={history} locations={locations}/ >}<footer className="app-footer"><span>© 2026 NETSPOT · NETWORK DEAD ZONE DETECTOR</span><span><i className={apiOnline?'green':'amber'}/> {apiOnline?'Backend reachable':'Backend not connected'} <b>·</b> Sample coverage data</span></footer></div></main><button className="mobile-menu" onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>{toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}</div>;
}
