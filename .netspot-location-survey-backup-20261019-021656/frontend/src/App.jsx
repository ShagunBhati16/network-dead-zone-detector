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
const qualityColor = { Good: '#2ed6a1', Moderate: '#ffbd4a', Poor: '#ff5d73' };
const nav = [
  { label: 'Dashboard', icon: Activity }, { label: 'Network Test', icon: Gauge },
  { label: 'Dead Zone Map', icon: MapPinned }, { label: 'Test History', icon: Clock3 },
  { label: 'Reports', icon: FileChartColumn },
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
  const valid = history.filter(x => Number.isFinite(Number(x.latency)) || Number.isFinite(Number(x.downloadMbps ?? x.download)));
  const metricAvg = (key, alias) => { const vals=history.map(x=>x[key] ?? x[alias]).filter(v=>v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v)>=0).map(Number); return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null; };
  const qualityOf = x => { const rawLatency=x.latencyMs ?? x.latency, rawLoss=x.packetLossPct ?? x.loss, rawDl=x.downloadMbps ?? x.download; const latency=rawLatency == null || rawLatency === '' ? NaN : Number(rawLatency), loss=rawLoss == null || rawLoss === '' ? NaN : Number(rawLoss), dl=rawDl == null || rawDl === '' ? NaN : Number(rawDl); if (![latency,loss,dl].some(Number.isFinite)) return 'Unknown'; if ((Number.isFinite(latency)&&latency>150)||(Number.isFinite(loss)&&loss>=5)||(Number.isFinite(dl)&&dl<5)) return 'Poor'; if ((Number.isFinite(latency)&&latency>60)||(Number.isFinite(loss)&&loss>1)||(Number.isFinite(dl)&&dl<25)) return 'Moderate'; return 'Good'; };
  const counts = history.reduce((a,x)=>{a[qualityOf(x)]=(a[qualityOf(x)]||0)+1;return a;},{Good:0,Moderate:0,Poor:0,Unknown:0});
  const avgLatency=metricAvg('latencyMs','latency'), avgDownload=metricAvg('downloadMbps','download'), avgUpload=metricAvg('uploadMbps','upload');
  const points = history.filter(x => { const lat=x.lat ?? x.latitude; const lng=x.lng ?? x.lon ?? x.longitude; return lat !== null && lat !== undefined && lat !== '' && lng !== null && lng !== undefined && lng !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180; });
  const locationCounts = new Map(); points.forEach(x=>{const name=x.locationName||x.location||x.surveyName||'Survey location'; const q=qualityOf(x); if(!locationCounts.has(name))locationCounts.set(name,{name,count:0,qualities:[],latency:[],download:[]}); const v=locationCounts.get(name);v.count++;v.qualities.push(q);const l=Number(x.latencyMs??x.latency),d=Number(x.downloadMbps??x.download);if(Number.isFinite(l))v.latency.push(l);if(Number.isFinite(d))v.download.push(d);});
  const recent=[...history].sort((a,b)=>new Date(b.timestamp??b.createdAt??0)-new Date(a.timestamp??a.createdAt??0)).slice(0,6);
  const fmt=(n,d=1)=>n==null?'—':Number(n).toFixed(d);
  const stat=(label,value,unit,icon,color)=> <article key={label} className="stat-card" style={{padding:18,border:'1px solid var(--border,#1c3c56)',borderRadius:12,background:'var(--panel,#0b1d31)'}}><div style={{display:'flex',justifyContent:'space-between',color:'var(--muted,#91a4b7)',fontSize:13}}>{label}<span style={{color}}>{icon}</span></div><div style={{fontSize:28,fontWeight:750,marginTop:10}}>{value}<small style={{fontSize:13,marginLeft:5,color:'var(--muted,#91a4b7)'}}>{unit||''}</small></div></article>;
  return <div className="rms-dashboard" style={{display:'grid',gap:18}}>
    <div className="rms-page-title"><div><span className="rms-kicker">NETWORK OPERATIONS CENTER</span><h1>Dashboard</h1><p>Live statistics calculated from saved network-test records.</p></div><button className="rms-run" onClick={runTest} disabled={testing}><Play size={15}/>{testing?'Running test…':'Run network test'}</button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
      {stat('Total network tests',history.length,'saved',Activity,'#35e9df')}
      {stat('Average latency',fmt(avgLatency),'ms',Gauge,'#35e9df')}
      {stat('Average download',fmt(avgDownload),'Mbps',ArrowDownToLine,'#42e8a1')}
      {stat('Average upload',fmt(avgUpload),'Mbps',ArrowUpFromLine,'#b05cff')}
      {stat('Good locations',counts.Good,'records',CheckCircle2,'#42e8a1')}
      {stat('Moderate locations',counts.Moderate,'records',Activity,'#ffbd4a')}
      {stat('Poor locations / dead-zone candidates',counts.Poor,'records',AlertTriangle,'#ff6678')}
    </div>
    <section className="rms-panel" style={{padding:20,border:'1px solid var(--border,#1c3c56)',borderRadius:12,background:'var(--panel,#0b1d31)'}}><div className="rms-panel-title">Survey data availability</div><div style={{display:'flex',gap:20,flexWrap:'wrap',marginTop:14}}><span>Geolocated measurements: <b>{points.length}</b></span><span>Distinct surveyed locations: <b>{locationCounts.size}</b></span><span>Unknown quality: <b>{counts.Unknown}</b></span><span>Device availability: <b>Not supported by current browser measurements</b></span></div><p style={{color:'var(--muted,#91a4b7)',fontSize:12,marginTop:12}}>Quality labels are derived from saved latency, packet loss and download metrics. Dead-zone candidates are poor-quality records, not proof of absent Wi-Fi signal.</p></section>
    <section className="rms-panel" style={{padding:20,border:'1px solid var(--border,#1c3c56)',borderRadius:12,background:'var(--panel,#0b1d31)'}}><div className="rms-panel-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>Recent network tests <button className="rms-run" onClick={openMap}><MapPinned size={14}/> Open dead zone map</button></div>
      {recent.length ? <div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Date & time','Location / survey','Latency','Download','Upload','Quality'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 8px',color:'var(--muted,#91a4b7)',borderBottom:'1px solid var(--border,#1c3c56)'}}>{h}</th>)}</tr></thead><tbody>{recent.map((x,i)=>{const q=qualityOf(x);const dt=x.timestamp??x.createdAt;return <tr key={x.id??`${dt}-${i}`}><td style={{padding:'11px 8px',borderBottom:'1px solid var(--border,#1c3c56)'}}>{dt&& !Number.isNaN(new Date(dt).getTime())?new Date(dt).toLocaleString():'Time unavailable'}</td><td style={{padding:'11px 8px',borderBottom:'1px solid var(--border,#1c3c56)'}}>{x.locationName||x.location||x.surveyName||'Location not recorded'}</td><td style={{padding:'11px 8px',borderBottom:'1px solid var(--border,#1c3c56)'}}>{fmt(x.latencyMs??x.latency)} ms</td><td style={{padding:'11px 8px',borderBottom:'1px solid var(--border,#1c3c56)'}}>{fmt(x.downloadMbps??x.download)} Mbps</td><td style={{padding:'11px 8px',borderBottom:'1px solid var(--border,#1c3c56)'}}>{fmt(x.uploadMbps??x.upload)} Mbps</td><td style={{padding:'11px 8px',borderBottom:'1px solid var(--border,#1c3c56)',color:q==='Good'?'#42e8a1':q==='Moderate'?'#ffbd4a':q==='Poor'?'#ff6678':'#91a4b7'}}>{q}</td></tr>})}</tbody></table></div> : <div style={{padding:'32px 12px',textAlign:'center',color:'var(--muted,#91a4b7)'}}><Activity size={26}/><h3 style={{color:'var(--text,#e7f4ff)'}}>No network test data yet</h3><p>Run a network test to populate real dashboard statistics. No demo values are displayed.</p><button className="rms-run" onClick={runTest} disabled={testing}><Play size={14}/> Run first test</button></div>}
    </section>
    <section className="rms-panel" style={{padding:20,border:'1px solid var(--border,#1c3c56)',borderRadius:12,background:'var(--panel,#0b1d31)'}}><div className="rms-panel-title">Location-wise network quality</div>{locationCounts.size ? <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginTop:12}}>{[...locationCounts.values()].map(v=>{const q=v.qualities.includes('Poor')?'Poor':v.qualities.includes('Moderate')?'Moderate':v.qualities.every(x=>x==='Good')?'Good':'Unknown';return <div key={v.name} style={{padding:13,borderRadius:9,border:'1px solid var(--border,#1c3c56)'}}><b>{v.name}</b><div style={{fontSize:12,color:'var(--muted,#91a4b7)',marginTop:5}}>{v.count} measurement(s) · Avg latency {v.latency.length?fmt(v.latency.reduce((a,b)=>a+b,0)/v.latency.length):'—'} ms · Avg download {v.download.length?fmt(v.download.reduce((a,b)=>a+b,0)/v.download.length):'—'} Mbps</div><div style={{marginTop:8,fontWeight:700,color:q==='Good'?'#42e8a1':q==='Moderate'?'#ffbd4a':q==='Poor'?'#ff6678':'#91a4b7'}}>{q}</div></div>})}</div>:<p style={{color:'var(--muted,#91a4b7)',marginTop:12}}>No location-wise data yet. Save a test with a survey name or location to see quality summaries.</p>}</section>
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
function MapScreen({ records }) {
  const [query, setQuery] = useState('');
  const [quality, setQuality] = useState('All');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [searchFocus, setSearchFocus] = useState(null);
  const [showInterpolation, setShowInterpolation] = useState(true);

  const measured = useMemo(() => (records || []).map((r, i) => {
    const latRaw = r.lat ?? r.latitude;
    const lngRaw = r.lng ?? r.lon ?? r.longitude;
    const lat = latRaw == null || latRaw === '' ? NaN : Number(latRaw);
    const lng = lngRaw == null || lngRaw === '' ? NaN : Number(lngRaw);
    const hasCoordinates = Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0 && r.lat == null && r.latitude == null);
    const latencyRaw = r.latencyMs ?? r.latency;
    const lossRaw = r.packetLossPct ?? r.loss;
    const downloadRaw = r.downloadMbps ?? r.download;
    const uploadRaw = r.uploadMbps ?? r.upload;
    const latency = latencyRaw == null || latencyRaw === '' ? NaN : Number(latencyRaw);
    const loss = lossRaw == null || lossRaw === '' ? NaN : Number(lossRaw);
    const download = downloadRaw == null || downloadRaw === '' ? NaN : Number(downloadRaw);
    const upload = uploadRaw == null || uploadRaw === '' ? NaN : Number(uploadRaw);
    const validLatency = Number.isFinite(latency) && latency >= 0;
    const validLoss = Number.isFinite(loss) && loss >= 0;
    const validDownload = Number.isFinite(download) && download >= 0;
    const validUpload = Number.isFinite(upload) && upload >= 0;
    let q = 'Unknown';
    if (validLatency || validLoss || validDownload || validUpload) {
      const poor = (validLatency && latency >= 150) || (validLoss && loss >= 5) || (validDownload && download < 5);
      const moderate = (validLatency && latency >= 60) || (validLoss && loss >= 2) || (validDownload && download < 25);
      q = poor ? 'Poor' : moderate ? 'Moderate' : 'Good';
    }
    const created = r.createdAt ?? r.timestamp ?? r.created_at;
    const dt = created ? new Date(created) : null;
    return { ...r, _key: String(r.id ?? `${created ?? 'record'}-${i}`), lat, lng, hasCoordinates,
      name: r.locationName || r.location || r.surveyName || 'Unnamed survey point',
      area: r.surveyName || 'Network survey', latency: validLatency ? latency : null,
      loss: validLoss ? loss : null, download: validDownload ? download : null,
      upload: validUpload ? upload : null, quality: q, dateTime: dt && !Number.isNaN(dt.getTime()) ? dt : null,
      actual: r.isMeasured === true || r.source === 'browser-external-http' || Boolean(created) };
  }), [records]);
  const filtered = useMemo(() => measured.filter(r => {
    const matchesQuery = `${r.name} ${r.area}`.toLowerCase().includes(query.toLowerCase());
    const matchesQuality = quality === 'All' || r.quality === quality;
    const t = r.dateTime?.getTime();
    const matchesStart = !startTime || (t != null && t >= new Date(startTime).getTime());
    const matchesEnd = !endTime || (t != null && t <= new Date(endTime).getTime());
    return matchesQuery && matchesQuality && matchesStart && matchesEnd;
  }), [measured, query, quality, startTime, endTime]);
  const geolocated = filtered.filter(r => r.hasCoordinates);
  const selected = geolocated.find(r => r._key === selectedId) || geolocated[0] || null;
  const center = selected ? [selected.lat, selected.lng] : searchFocus ? [searchFocus.lat, searchFocus.lng] : geolocated.length ? [geolocated[0].lat, geolocated[0].lng] : [20.5937, 78.9629];
  const colorFor = q => q === 'Poor' ? '#ef4444' : q === 'Moderate' ? '#f59e0b' : q === 'Good' ? '#22c55e' : '#64748b';
  const qualityScore = r => {
    const values = [];
    if (r.latency != null) values.push(Math.max(0, Math.min(100, 100 - r.latency * .45)));
    if (r.loss != null) values.push(Math.max(0, Math.min(100, 100 - r.loss * 12)));
    if (r.download != null) values.push(Math.max(0, Math.min(100, r.download * 2.5)));
    if (r.upload != null) values.push(Math.max(0, Math.min(100, r.upload * 4)));
    return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  };
  const cells = useMemo(() => {
    if (!showInterpolation || geolocated.length < 2) return [];
    const points = geolocated.map(p => ({...p, score: qualityScore(p)})).filter(p => p.score != null);
    if (points.length < 2) return [];
    const latMin = Math.min(...points.map(p=>p.lat)), latMax = Math.max(...points.map(p=>p.lat));
    const lngMin = Math.min(...points.map(p=>p.lng)), lngMax = Math.max(...points.map(p=>p.lng));
    const latSpan = Math.max(latMax-latMin, 0.0008), lngSpan = Math.max(lngMax-lngMin, 0.0008);
    const padLat = Math.max(latSpan*.18, 0.00025), padLng = Math.max(lngSpan*.18, 0.00025);
    const loLat=latMin-padLat, hiLat=latMax+padLat, loLng=lngMin-padLng, hiLng=lngMax+padLng;
    const rows=7, cols=7, dLat=(hiLat-loLat)/rows, dLng=(hiLng-loLng)/cols;
    const out=[];
    for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) {
      const lat=loLat+(y+.5)*dLat, lng=loLng+(x+.5)*dLng;
      const distances=points.map(p=>({p,d:Math.hypot((p.lat-lat), (p.lng-lng)*Math.cos(lat*Math.PI/180))})).sort((a,b)=>a.d-b.d);
      const nearest=distances[0];
      // Avoid extrapolating far beyond the sampled area; cells outside this radius are not shown.
      if(!nearest || nearest.d > Math.max(latSpan,lngSpan)*.72 + .00015) continue;
      const weighted=distances.slice(0,Math.min(4,distances.length)).reduce((acc,item)=>{const w=1/Math.max(item.d,0.000015)**2;return {score:acc.score+item.p.score*w,weight:acc.weight+w};},{score:0,weight:0});
      const score=weighted.score/weighted.weight;
      const q=score<42?'Poor':score<70?'Moderate':'Good';
      const confidence=nearest.d < .0003 ? 'Higher' : nearest.d < .001 ? 'Medium' : 'Low';
      out.push({id:`cell-${y}-${x}`,positions:[[loLat+y*dLat,loLng+x*dLng],[loLat+(y+1)*dLat,loLng+x*dLng],[loLat+(y+1)*dLat,loLng+(x+1)*dLng],[loLat+y*dLat,loLng+(x+1)*dLng]],q,color:colorFor(q),score:Math.round(score),confidence,opacity:confidence==='Higher'?.42:confidence==='Medium'?.27:.16,nearestMeters:Math.round(nearest.d*111000)});
    }
    return out;
  }, [geolocated, showInterpolation]);
  const searchPlace = async () => {
    if (!placeQuery.trim()) { setPlaceError('Enter a place, building, address or survey area.'); return; }
    setPlaceSearching(true); setPlaceError('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(placeQuery.trim())}`, {headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Place search is temporarily unavailable.');
      const data = await response.json();
      if (!data.length) throw new Error('No place found. Try a nearby landmark or search your saved survey names.');
      setSearchFocus({lat:Number(data[0].lat),lng:Number(data[0].lon),label:data[0].display_name});
    } catch(e) { setPlaceError(e.message || 'Could not search for that place.'); }
    finally { setPlaceSearching(false); }
  };
  const metric = (label, value, unit='') => <div key={label} style={{padding:'10px 12px',border:'1px solid var(--border,#344054)',borderRadius:9,minWidth:0}}><div style={{fontSize:11,color:'var(--muted,#91a4b7)',marginBottom:5}}>{label}</div><strong style={{fontSize:16,overflowWrap:'anywhere'}}>{value == null ? 'Not available' : `${value}${unit}`}</strong></div>;
  return <div className="survey-screen" style={{paddingBottom:24}}>
    <div className="survey-topline"><div className="survey-appmark"><MapPinned size={18}/></div><div className="survey-title">Measured Network Coverage Map</div><div className="survey-top-spacer"/><span className="survey-search-user">{geolocated.length} mapped points</span><span className="survey-user">Live saved survey data</span></div>
    <div className="survey-toolbar"><div className="survey-workspace" style={{width:'100%'}}>
      <div className="survey-controls" style={{flexWrap:'wrap',gap:8}}>
        <label><CalendarDays size={13}/><input type="datetime-local" aria-label="Filter measurements from" value={startTime} onChange={e=>setStartTime(e.target.value)} title="From date and time"/></label>
        <span className="survey-date-dash">to</span>
        <label><input type="datetime-local" aria-label="Filter measurements until" value={endTime} onChange={e=>setEndTime(e.target.value)} title="To date and time"/></label>
        <label className="survey-search"><Search size={13}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter saved survey names"/></label>
        <select aria-label="Coverage quality filter" value={quality} onChange={e=>setQuality(e.target.value)}><option>All</option><option>Good</option><option>Moderate</option><option>Poor</option><option>Unknown</option></select>
        <label className="survey-search"><MapPin size={13}/><input value={placeQuery} onChange={e=>setPlaceQuery(e.target.value)} placeholder="Search map location" onKeyDown={e=>{if(e.key==='Enter')searchPlace()}}/></label>
        <button type="button" onClick={searchPlace} disabled={placeSearching} style={{padding:'8px 12px',borderRadius:8,border:'1px solid var(--border,#344054)',background:'var(--panel,#111827)',color:'inherit',cursor:'pointer'}}>{placeSearching?'Searching…':'Find place'}</button>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}><input type="checkbox" checked={showInterpolation} onChange={e=>setShowInterpolation(e.target.checked)}/> Interpolated coverage</label>
      </div>
      {placeError && <div role="status" style={{margin:'8px 0',color:'#f59e0b',fontSize:12}}>{placeError}</div>}
      {searchFocus && <div style={{padding:'8px 12px',fontSize:12,color:'var(--muted,#91a4b7)'}}>Map search target: {searchFocus.label} · Search results are not survey measurements.</div>}
      <div className="survey-columns" style={{gridTemplateColumns:'minmax(240px, 300px) minmax(0,1fr)',alignItems:'stretch'}}>
        <div className="survey-left-column" style={{gap:12}}>
          <section className="access-points" style={{padding:16}}><h3>Coverage legend</h3>
            {[['Good','#22c55e','Lower latency/loss or stronger measured throughput'],['Moderate','#f59e0b','Mixed or mid-range network metrics'],['Poor','#ef4444','High latency/loss or low download throughput'],['Unknown','#64748b','Insufficient usable metrics']].map(([name,color,desc])=><div key={name} style={{display:'flex',gap:9,alignItems:'flex-start',margin:'12px 0',fontSize:12}}><i style={{width:11,height:11,flex:'0 0 11px',borderRadius:'50%',background:color,marginTop:3}}/><div><b>{name}</b><div style={{color:'var(--muted,#91a4b7)',lineHeight:1.4}}>{desc}</div></div></div>)}
            <div style={{borderTop:'1px solid var(--border,#344054)',paddingTop:12,marginTop:12,fontSize:12,color:'var(--muted,#91a4b7)'}}><b>Map data integrity</b><p style={{margin:'6px 0'}}>Solid markers = saved measurements with coordinates. Shaded cells = spatial estimates, not direct measurements.</p><p style={{margin:'6px 0'}}>Interpolation uncertainty is based on distance to the nearest measured point. No coverage is extrapolated without at least two geolocated records.</p></div>
          </section>
          <section className="access-points" style={{padding:16}}><h3>Selected measurement</h3>
            {selected ? <><div style={{fontWeight:700,marginBottom:5,overflowWrap:'anywhere'}}>{selected.name}</div><div style={{fontSize:12,color:'var(--muted,#91a4b7)',marginBottom:12}}>{selected.area} · {selected.dateTime ? selected.dateTime.toLocaleString() : 'Timestamp unavailable'}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{metric('Latency',selected.latency,' ms')}{metric('Packet loss',selected.loss,'%')}{metric('Download',selected.download,' Mbps')}{metric('Upload',selected.upload,' Mbps')}{metric('Signal strength',selected.signalDbm ?? selected.signalStrength ?? null,' dBm')}{metric('GPS accuracy',selected.accuracyMeters,' m')}</div><div style={{fontSize:11,color:'var(--muted,#91a4b7)',marginTop:10}}>Source: {selected.actual?'Saved measurement':'Unverified legacy record'} · {selected.indoorSurvey?'Indoor survey': 'Outdoor/unspecified'} · {selected.locationSource || 'location source unavailable'}</div></> : <div style={{fontSize:13,color:'var(--muted,#91a4b7)',lineHeight:1.5}}>No saved measurements with coordinates match these filters. Run a network test with GPS or manually selected coordinates to add a real point. No sample markers are shown.</div>}
          </section>
          <section className="access-points" style={{padding:16}}><h3>Survey records</h3><div className="survey-match-count">{filtered.length} saved · {geolocated.length} mapped · {filtered.length-geolocated.length} without coordinates</div><div style={{maxHeight:240,overflow:'auto'}}>{filtered.map(r=><button key={r._key} onClick={()=>{if(r.hasCoordinates){setSelectedId(r._key);setSearchFocus(null)}}} style={{display:'flex',width:'100%',textAlign:'left',gap:9,alignItems:'flex-start',padding:'10px 0',border:0,borderBottom:'1px solid var(--border,#344054)',background:'transparent',color:'inherit',cursor:r.hasCoordinates?'pointer':'default',opacity:r.hasCoordinates?1:.65}}><i style={{width:9,height:9,marginTop:4,borderRadius:'50%',background:colorFor(r.quality),flex:'0 0 9px'}}/><span style={{minWidth:0,flex:1,fontSize:12,overflowWrap:'anywhere'}}><b>{r.name}</b><span style={{display:'block',color:'var(--muted,#91a4b7)',marginTop:3}}>{r.dateTime?r.dateTime.toLocaleString():'Timestamp unavailable'} · {r.hasCoordinates?'Mapped':'No coordinates'} · {r.quality}</span></span></button>)}</div></section>
        </div>
        <section className="survey-map-panel" style={{minWidth:0}}><div className="survey-map-caption">Actual survey points <span>{geolocated.length} visible · {cells.length} interpolated cells</span></div>
          <div className="survey-map-wrap" style={{height:'min(68vh,720px)',minHeight:420}}><MapContainer key="actual-measurement-map" center={center} zoom={geolocated.length?16:5} scrollWheelZoom zoomControl={true} attributionControl={true} style={{height:'100%',width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapFocus selected={selected || searchFocus}/>{cells.map(cell=><Polygon key={cell.id} positions={cell.positions} pathOptions={{color:cell.color,fillColor:cell.color,fillOpacity:cell.opacity,weight:1,opacity:.55,dashArray:cell.confidence==='Low'?'3 4':undefined}}><Popup><b>Interpolated estimate · {cell.q}</b><br/>Estimated quality score: {cell.score}/100<br/>Confidence: {cell.confidence}<br/>Nearest measurement: about {cell.nearestMeters} m<br/><small>Estimated between actual samples; not directly measured.</small></Popup></Polygon>)}{geolocated.map(loc=><CircleMarker key={loc._key} center={[loc.lat,loc.lng]} radius={selected?selected._key===loc._key?9:6:7} pathOptions={{color:loc.quality==='Poor'?'#991b1b':'#ffffff',fillColor:colorFor(loc.quality),fillOpacity:1,weight:2}} eventHandlers={{click:()=>setSelectedId(loc._key)}}><Popup><b>{loc.name}</b><br/>{loc.area}<br/>Quality: {loc.quality}<br/>Latency: {loc.latency == null?'N/A':`${loc.latency} ms`}<br/>Packet loss: {loc.loss == null?'N/A':`${loc.loss}%`}<br/>Download: {loc.download == null?'N/A':`${loc.download} Mbps`}<br/>Upload: {loc.upload == null?'N/A':`${loc.upload} Mbps`}<br/>Signal strength: {loc.signalDbm ?? loc.signalStrength ?? 'Not available'}<br/>Measured: {loc.dateTime?loc.dateTime.toLocaleString():'Timestamp unavailable'}<br/>Source: {loc.actual?'Actual saved measurement':'Legacy record; source unverified'}</Popup></CircleMarker>)}</MapContainer></div>
          <div className="survey-map-status" style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'space-between'}}><span>{selected?`${selected.name} · ${selected.quality} · ${selected.dateTime?selected.dateTime.toLocaleString():'time unavailable'}`:'No matching measured points'}</span><span>{cells.length?'Shaded coverage is interpolated; low-confidence cells are more transparent/dashed.':'Need at least two geolocated measurements for interpolation.'}</span></div>
        </section>
      </div>
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
  const locations=history.filter(x=>Number.isFinite(Number(x.lat ?? x.latitude)) && Number.isFinite(Number(x.lng ?? x.lon ?? x.longitude))).map((x,i)=>({id:x.id??i+1,name:x.locationName||x.location||x.surveyName||`Survey point ${i+1}`,area:x.locationName||x.location||x.surveyName||'Recorded survey',lat:Number(x.lat??x.latitude),lng:Number(x.lng??x.lon??x.longitude),latency:x.latencyMs??x.latency??null,download:x.downloadMbps??x.download??null,upload:x.uploadMbps??x.upload??null,loss:x.packetLossPct??x.loss??null,quality:'Unknown',date:x.timestamp??x.createdAt,signalDbm:x.signalDbm??x.signalStrength??null}));
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
        // Use several real transfers instead of one tiny transfer. Small single requests
        // are dominated by connection/request overhead and often under-report fast links.
        const median=(values)=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const mid=Math.floor(sorted.length/2);return Number((sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2).toFixed(2));};
        setTestStatus('Measuring download speed (3 real samples)…');setProgress(42);
        for(let i=0;i<3;i++){
          try{
            const bytes=[5,10,15][i]*1024*1024;const started=performance.now();
            const r=await timedFetch(`${endpoint}/__down?bytes=${bytes}&cacheBust=${Date.now()}-${i}-${Math.random()}`,{},35000);
            if(!r.ok)throw new Error(`Download sample ${i+1} returned HTTP ${r.status}`);
            const data=await r.arrayBuffer();const seconds=Math.max((performance.now()-started)/1000,.001);
            if(data.byteLength>0)downloadSamples.push(Number((data.byteLength*8/seconds/1e6).toFixed(2)));
          }catch(e){failureMessages.push(`Download sample ${i+1}: ${e.message||'failed'}`)}
          setProgress(42+Math.round(((i+1)/3)*17));
        }
        downloadMbps=median(downloadSamples);
        setTestStatus('Measuring upload speed (3 real samples)…');setProgress(62);
        for(let i=0;i<3;i++){
          try{
            const bytes=[2,4,6][i]*1024*1024;const data=new Uint8Array(bytes);
            if(window.crypto?.getRandomValues){for(let offset=0;offset<bytes;offset+=65536)window.crypto.getRandomValues(data.subarray(offset,Math.min(offset+65536,bytes)));}
            const started=performance.now();
            const r=await timedFetch(`${endpoint}/__up?cacheBust=${Date.now()}-${i}-${Math.random()}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:data},35000);
            if(!r.ok)throw new Error(`Upload sample ${i+1} returned HTTP ${r.status}`);
            await r.arrayBuffer().catch(()=>null);const seconds=Math.max((performance.now()-started)/1000,.001);
            uploadSamples.push(Number((bytes*8/seconds/1e6).toFixed(2)));
          }catch(e){failureMessages.push(`Upload sample ${i+1}: ${e.message||'failed'}`)}
          setProgress(62+Math.round(((i+1)/3)*24));
        }
        uploadMbps=median(uploadSamples);
        if(!downloadSamples.length)failureMessages.push('All download speed samples failed.');
        if(!uploadSamples.length)failureMessages.push('All upload speed samples failed.');
      }
      setTestStatus('Saving test results…');setProgress(90);
      // Include both current and legacy field names so this frontend can save to
      // either the latest NetSpot backend or an older compatible API build.
      const measured={latencyMs,jitterMs,packetLossPct,downloadMbps,uploadMbps,
        latency:latencyMs,jitter:jitterMs,loss:packetLossPct,download:downloadMbps,upload:uploadMbps,
        connected:successCount>0,gatewayReachable:successCount>0,internetReachable,
        serverReachable:successCount>0,isMeasured:true,source:'browser-external-http',
        locationName:survey.locationName||'Location not shared',location:survey.locationName||'Location not shared',surveyName:survey.surveyName||'Network survey',lat:survey.lat??null,lng:survey.lng??null,accuracyMeters:survey.accuracyMeters??null,locationSource:survey.locationSource||'none',locationPrecision:survey.locationPrecision||'approximate',indoorSurvey:survey.indoorSurvey===true,sampleCount:8,
        downloadSampleCount:downloadSamples.length,uploadSampleCount:uploadSamples.length,
        probeCount:8,successfulProbes:successCount,latencySamples:valid,downloadSamples,uploadSamples,
        measurementError:failureMessages.slice(0,5).join('; ')};
      const saved=await fetch(`${API}/api/network-tests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(measured),cache:'no-store'});
      if(!saved.ok){
        let detail='';
        try{const errBody=await saved.json();detail=errBody.message||errBody.error||'';}catch{}
        throw new Error(`Measurements completed but saving failed (HTTP ${saved.status})${detail?`: ${detail}`:'. Check that the backend is updated and restarted.'}`);
      }
      const body=await saved.json();const record=normalizeRecord(body.data||body.record||{});const next={...measured,...record,latencySamples:valid,downloadSamples,uploadSamples,probeCount:8,successfulProbes:successCount,downloadSampleCount:downloadSamples.length,uploadSampleCount:uploadSamples.length};
      setResult(next);setHistory(prev=>[next,...prev.filter(x=>x.id!==next.id)]);setApiOnline(true);setProgress(100);setTestStatus('Test complete');
      if(successCount===0){const msg='No external connectivity probes succeeded. A failed test was saved; check internet access, firewall and CORS restrictions.';setTestError(msg);notify(msg)}else if(downloadMbps===null||uploadMbps===null){const msg='Connectivity and latency were measured, but one or more speed tests failed. The available measurements were saved.';setTestError(msg);notify(msg)}else{notify(`Network test complete · ${latencyMs} ms average latency`)}
    } catch(error){
      const msg=error.message==='Failed to fetch'?'Cannot reach the backend. Start the backend on port 5000 and check CORS settings.':error.message||'Network test failed.';setTestError(msg);setApiOnline(false);notify(msg);
    } finally{setTesting(false);window.setTimeout(()=>setProgress(0),1800)}
  };
  const clearHistory=async()=>{if(!window.confirm('Clear all saved network test history?'))return;try{const r=await fetch(`${API}/api/network-tests`,{method:'DELETE'});if(!r.ok)throw new Error('Could not clear history');setHistory([]);setResult(null);notify('Test history cleared')}catch(e){notify(e.message)}};
  if(!signedInAs) return <LoginPage theme={theme} onToggleTheme={()=>setTheme(t=>{const next=t==='dark'?'light':'dark';localStorage.setItem('netspot-theme',next);return next})} onLogin={(email, name)=>{setSignedInAs(name || email);notify('Signed in to demo workspace')}} />;
  return <div className={`ops-app ${theme==='light'?'light-mode':''}`}><aside className={`sidebar ${sidebarOpen?'sidebar-open':''}`}><div className="brand"><div className="brand-mark"><Wifi size={22}/><span/></div><div><b>NETSPOT</b><small>NETWORK INTELLIGENCE</small></div><button className="sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={17}/></button></div><div className="nav-section-label">WORKSPACE</div><nav className="nav-list">{nav.map(item=>{const Icon=item.icon;return <button key={item.label} className={`nav-item ${activePage===item.label?'active':''}`} onClick={()=>{setActivePage(item.label);setSidebarOpen(false)}}><Icon size={17}/><span>{item.label}</span>{item.label==='Dead Zone Map'&&<span className="nav-count">2</span>}</button>})}</nav><div className="sidebar-spacer"/><div className="sidebar-system"><div className="sidebar-system-icon"><ShieldCheck size={16}/></div><div><b>Monitoring active</b><small>Local demo environment</small></div><i className={apiOnline?'green':'amber'}/></div><div className="sidebar-bottom"><span className="sidebar-avatar">ND</span><div><b>{signedInAs || 'Network Admin'}</b><small>NetSpot workspace</small></div><Settings size={15}/></div><div className="sidebar-utility"><button className="theme-toggle" onClick={()=>setTheme(t=>{const next=t==='dark'?'light':'dark';localStorage.setItem('netspot-theme',next);return next})}><span>{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>} Appearance</span><b>{theme==='dark'?'Dark':'Light'}</b></button><button className="theme-toggle logout-toggle" onClick={()=>{setSignedInAs('');setActivePage('Dashboard')}}><span><LogOut size={15}/> Sign out</span><ExternalLink size={13}/></button></div><div className="sidebar-version">NETSPOT UI <span>v2.1.0</span></div></aside><main className="main-area"><Header page={activePage} onRefresh={refresh} apiOnline={apiOnline} signedInAs={signedInAs}/><div className="page-content">{activePage==='Dashboard'&&<Dashboard locations={locations} history={history} runTest={runTest} testing={testing} result={result} openMap={()=>setActivePage('Dead Zone Map')}/ >}{activePage==='Dead Zone Map'&&<MapScreen records={history}/ >}{activePage==='Network Test'&&<NetworkTest runTest={runTest} testing={testing} result={result} apiOnline={apiOnline} progress={progress} testStatus={testStatus} testError={testError}/ >}{activePage==='Test History'&&<History history={history} onClear={clearHistory}/ >}{activePage==='Reports'&&<Reports history={history} locations={locations}/ >}<footer className="app-footer"><span>© 2026 NETSPOT · NETWORK DEAD ZONE DETECTOR</span><span><i className={apiOnline?'green':'amber'}/> {apiOnline?'Backend reachable':'Backend not connected'} <b>·</b> Map uses saved survey data</span></footer></div></main><button className="mobile-menu" onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>{toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}</div>;
}
