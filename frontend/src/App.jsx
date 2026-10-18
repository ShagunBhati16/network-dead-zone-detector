import "./App.css";
import { useMemo, useState } from "react";
import {
  Activity, Wifi, MapPin, FileChartColumn, Gauge, Bell, Search,
  Play, CheckCircle2, Clock3, RefreshCw, AlertTriangle,
  CalendarDays, Filter, MapPinned, Layers, X
} from "lucide-react";
import {
  MapContainer, TileLayer, CircleMarker, Popup, ZoomControl, useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";


const demoLocations = [
  { id: 1, name: "Main Library", area: "North Campus", lat: 18.4575, lng: 73.8203, latency: 24, loss: 0, quality: "Good", date: "2026-10-18", signal: -48, tests: 18 },
  { id: 2, name: "Computer Lab 3", area: "Academic Block", lat: 18.4585, lng: 73.8218, latency: 86, loss: 1.8, quality: "Moderate", date: "2026-10-17", signal: -67, tests: 12 },
  { id: 3, name: "Parking Area", area: "East Campus", lat: 18.4578, lng: 73.8240, latency: 192, loss: 8.4, quality: "Poor", date: "2026-10-18", signal: -83, tests: 9 },
  { id: 4, name: "College Canteen", area: "Central Campus", lat: 18.4565, lng: 73.8220, latency: 38, loss: 0.4, quality: "Good", date: "2026-10-16", signal: -54, tests: 15 },
  { id: 5, name: "Sports Ground", area: "South Campus", lat: 18.4549, lng: 73.8215, latency: 128, loss: 4.1, quality: "Moderate", date: "2026-10-15", signal: -74, tests: 7 },
  { id: 6, name: "Hostel Entrance", area: "West Campus", lat: 18.4568, lng: 73.8189, latency: 31, loss: 0, quality: "Good", date: "2026-10-18", signal: -51, tests: 14 },
  { id: 7, name: "Auditorium", area: "Academic Block", lat: 18.4594, lng: 73.8231, latency: 164, loss: 6.2, quality: "Poor", date: "2026-10-14", signal: -80, tests: 6 },
];

const colors = {
  Good: "#42dfa4",
  Moderate: "#ffbd52",
  Poor: "#ff6877",
};

const navigation = [
  { name: "Dashboard", icon: Activity },
  { name: "Network Test", icon: Gauge },
  { name: "Dead Zone Map", icon: MapPin },
  { name: "Test History", icon: Clock3 },
  { name: "Reports", icon: FileChartColumn },
];

function QualityBadge({ quality }) {
  return (
    <span className={`quality-badge ${quality.toLowerCase()}`}>
      <span />
      {quality}
    </span>
  );
}

function MapRecenter({ location }) {
  const map = useMap();

  if (location) {
    map.flyTo([location.lat, location.lng], 17, { duration: 0.5 });
  }

  return null;
}

function MapScreen({ locations }) {
  const [query, setQuery] = useState("");
  const [quality, setQuality] = useState("All");
  const [date, setDate] = useState("all");
  const [selectedId, setSelectedId] = useState(3);
  const [showLegend, setShowLegend] = useState(true);

  const dates = [...new Set(locations.map((item) => item.date))].sort().reverse();

  const filtered = useMemo(() => {
    return locations.filter((location) => {
      const matchesSearch =
        `${location.name} ${location.area}`
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchesQuality =
        quality === "All" || location.quality === quality;

      const matchesDate = date === "all" || location.date === date;

      return matchesSearch && matchesQuality && matchesDate;
    });
  }, [locations, query, quality, date]);

  const selected =
    filtered.find((item) => item.id === selectedId) || filtered[0] || null;

  function resetFilters() {
    setQuery("");
    setQuality("All");
    setDate("all");
  }

  return (
    <div className="map-screen">
      <section className="ops-panel map-controls-panel">
        <div className="map-controls-heading">
          <div>
            <div className="ops-panel-title">
              <span>LOCATION EXPLORER</span>
              <MapPinned size={17} />
            </div>
            <p className="ops-subtitle">
              Search locations and filter observations by date or connection quality.
            </p>
          </div>
          <span className="ops-mini-tag">DEMO DATA</span>
        </div>

        <div className="map-filter-grid">
          <label className="map-search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search area or location..."
              aria-label="Search area or location"
            />
          </label>

          <label className="map-select-field">
            <Filter size={15} />
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              aria-label="Filter by connection quality"
            >
              <option value="All">All quality levels</option>
              <option value="Good">Good</option>
              <option value="Moderate">Moderate</option>
              <option value="Poor">Poor</option>
            </select>
          </label>

          <label className="map-select-field">
            <CalendarDays size={15} />
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Filter by date"
            >
              <option value="all">All dates</option>
              {dates.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>

          <button className="map-reset-button" onClick={resetFilters}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>

        <div className="map-result-count">
          Showing <strong>{filtered.length}</strong> of {locations.length} sample locations
        </div>
      </section>

      <div className="map-workspace">
        <section className="ops-panel interactive-map-panel">
          <div className="ops-panel-title">
            <span>CONNECTIVITY COVERAGE MAP</span>
            <span className="ops-mini-tag">INTERACTIVE</span>
          </div>

          <div className="leaflet-map-wrap">
            <MapContainer
              center={[18.4573, 73.8217]}
              zoom={16}
              scrollWheelZoom
              zoomControl={false}
              className="leaflet-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ZoomControl position="topright" />

              {selected && <MapRecenter location={selected} />}

              {filtered.map((location) => (
                <CircleMarker
                  key={location.id}
                  center={[location.lat, location.lng]}
                  radius={selected?.id === location.id ? 11 : 8}
                  pathOptions={{
                    color: colors[location.quality],
                    fillColor: colors[location.quality],
                    fillOpacity: 0.85,
                    weight: selected?.id === location.id ? 4 : 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedId(location.id),
                  }}
                >
                  <Popup>
                    <div className="map-popup">
                      <strong>{location.name}</strong>
                      <span>{location.area}</span>
                      <b style={{ color: colors[location.quality] }}>
                        {location.quality} · {location.latency} ms
                      </b>
                      <button onClick={() => setSelectedId(location.id)}>
                        View metrics
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {showLegend ? (
              <div className="leaflet-legend">
                <div className="legend-head">
                  CONNECTION QUALITY
                  <button onClick={() => setShowLegend(false)} aria-label="Hide legend">
                    <X size={12} />
                  </button>
                </div>
                <span><i style={{ background: colors.Good }} /> Good</span>
                <span><i style={{ background: colors.Moderate }} /> Moderate</span>
                <span><i style={{ background: colors.Poor }} /> Poor</span>
                <small>Illustrative sample records</small>
              </div>
            ) : (
              <button className="show-legend-button" onClick={() => setShowLegend(true)}>
                <Layers size={14} /> Legend
              </button>
            )}
          </div>

          <div className="map-caption">
            <MapPin size={14} />
            Sample campus coordinates — not live GPS or verified dead zones.
          </div>
        </section>

        <aside className="ops-panel map-details-panel">
          <div className="ops-panel-title">
            <span>LOCATION DETAILS</span>
            <Activity size={17} />
          </div>

          {selected ? (
            <>
              <div className="selected-location-head">
                <span className="selected-location-icon"><MapPin size={19} /></span>
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.area}</p>
                </div>
              </div>

              <QualityBadge quality={selected.quality} />

              <div className="selected-map-metrics">
                <div><span>HTTP latency*</span><strong>{selected.latency} <small>ms</small></strong></div>
                <div><span>Packet loss*</span><strong>{selected.loss}<small>%</small></strong></div>
                <div><span>Signal estimate*</span><strong>{selected.signal}<small> dBm</small></strong></div>
                <div><span>Recorded tests*</span><strong>{selected.tests}</strong></div>
              </div>

              <div className="selected-detail-row">
                <span>Observation date</span><strong>{selected.date}</strong>
              </div>
              <div className="selected-detail-row">
                <span>Coordinates</span>
                <strong>{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</strong>
              </div>

              <div className="demo-warning">
                <AlertTriangle size={15} />
                <span>Demo record only. These values are not measured device data.</span>
              </div>

              <p className="map-metric-foot">
                *Illustrative metrics. Real latency, packet loss, and signal strength are not collected by this map yet.
              </p>
            </>
          ) : (
            <div className="ops-empty">
              <MapPin size={22} />
              <span>No matching locations</span>
              <small>Change the search or filters to see markers.</small>
            </div>
          )}
        </aside>
      </div>

      <section className="ops-panel map-location-list">
        <div className="ops-panel-title">
          <span>OBSERVATIONS IN VIEW</span>
          <span className="ops-mini-tag">{filtered.length} LOCATIONS</span>
        </div>

        {filtered.length ? (
          <div className="map-location-table">
            <div className="map-table-head">
              <span>LOCATION</span><span>AREA</span><span>LATENCY*</span>
              <span>QUALITY</span><span>DATE</span>
            </div>

            {filtered.map((location) => (
              <button
                key={location.id}
                className={`map-table-row ${selected?.id === location.id ? "selected" : ""}`}
                onClick={() => setSelectedId(location.id)}
              >
                <span className="map-table-name">
                  <i style={{ background: colors[location.quality] }} />
                  {location.name}
                </span>
                <span>{location.area}</span>
                <strong>{location.latency} ms</strong>
                <QualityBadge quality={location.quality} />
                <span>{location.date}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ops-empty">
            <Search size={22} />
            <span>No matching locations</span>
            <small>Try another search term or reset the filters.</small>
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [testHistory, setTestHistory] = useState([]);

  async function runNetworkTest() {
    setTesting(true);
    setError("");
    setResult(null);

    const start = performance.now();

    try {
      const response = await fetch("http://localhost:5000/api/health", {
        method: "GET",
        cache: "no-store",
      });

      const latency = Math.round(performance.now() - start);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data = await response.json();

      const record = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        latency,
        status: "Success",
        message: data.message,
      };

      setResult(record);
      setTestHistory((current) => [record, ...current]);
    } catch {
      setError(
        "Could not reach the backend. Make sure it is running at localhost:5000."
      );
    } finally {
      setTesting(false);
    }
  }

  const filteredLocations = demoLocations.filter((location) =>
    `${location.name} ${location.area} ${location.quality}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="ops-app">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <div className="ops-brand-icon"><Wifi size={24} /></div>
          <div><strong>NetSpot</strong><span>NETWORK INTELLIGENCE</span></div>
        </div>

        <div className="ops-nav-label">WORKSPACE</div>

        <nav className="ops-nav">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`ops-nav-item ${activePage === name ? "active" : ""}`}
              onClick={() => setActivePage(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {name === "Dead Zone Map" && <span className="ops-nav-count">{demoLocations.length}</span>}
            </button>
          ))}
        </nav>

        <div className="ops-sidebar-bottom">
          <div className="ops-online"><span /><span>Backend</span><strong>Local API</strong></div>
          <div className="ops-version">NETSPOT v1.0.0</div>
        </div>
      </aside>

      <main className="ops-main">
        <header className="ops-topbar">
          <div className="ops-page-title">
            <span>Workspace</span><b>/</b><strong>{activePage}</strong>
          </div>
          <div className="ops-top-actions">
            <label className="search-box">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search locations..."
                aria-label="Search locations"
              />
            </label>
            <button className="ops-top-icon" aria-label="Notifications"><Bell size={17} /></button>
            <div className="ops-user-avatar">NS</div>
          </div>
        </header>

        <div className="ops-content">
          <div className="ops-heading-row">
            <div>
              <div className="ops-overline">NETWORK OPERATIONS CENTER</div>
              <h1>{activePage === "Dashboard" ? "Network Intelligence Dashboard" : activePage}</h1>
              <p>Monitor connectivity, identify weak signal areas, and review network performance.</p>
            </div>
            <button className="ops-run-button" onClick={runNetworkTest} disabled={testing}>
              {testing ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
              {testing ? "TESTING..." : "RUN NETWORK TEST"}
            </button>
          </div>

          {result && (
            <div className="ops-result">
              <CheckCircle2 size={20} />
              <div>
                <strong>Backend connectivity test completed</strong>
                <span>
                  Browser-to-backend HTTP response time: {result.latency} ms.
                  This is not general internet speed or cellular signal strength.
                </span>
              </div>
              <button onClick={() => setResult(null)} aria-label="Dismiss">×</button>
            </div>
          )}

          {error && <div className="ops-error"><AlertTriangle size={18} /><span>{error}</span></div>}

          {activePage === "Dead Zone Map" && <MapScreen locations={demoLocations} />}

          {activePage === "Dashboard" && (
            <>
              <div className="ops-dashboard-grid">
                <section className="ops-panel status-panel">
                  <div className="ops-panel-title"><span>SYSTEM STATUS</span><Activity size={17} /></div>
                  <div className="system-health"><span className="health-light" /><div><span className="health-caption">DEMO DASHBOARD STATUS</span><strong>Monitoring Ready</strong></div></div>
                  <div className="health-score-row"><strong>{demoLocations.length}</strong><span>Sample locations displayed</span></div>
                  <div className="ops-divider" />
                  {["Good", "Moderate", "Poor"].map((quality) => (
                    <div className="status-stat-row" key={quality}>
                      <span><i className={quality === "Good" ? "cyan-dot" : quality === "Moderate" ? "amber-dot" : "red-dot"} />{quality}</span>
                      <strong>{demoLocations.filter((item) => item.quality === quality).length} locations</strong>
                    </div>
                  ))}
                </section>

                <section className="ops-panel world-panel">
                  <div className="ops-panel-title"><span>MONITORED CAMPUS AREAS</span><span className="ops-mini-tag">DEMO MAP</span></div>
                  <div className="dashboard-map-preview">
                    <MapContainer center={[18.4573, 73.8217]} zoom={15} scrollWheelZoom={false} zoomControl={false}>
                      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {demoLocations.map((location) => (
                        <CircleMarker key={location.id} center={[location.lat, location.lng]} radius={7} pathOptions={{ color: colors[location.quality], fillColor: colors[location.quality], fillOpacity: 0.85 }}>
                          <Popup>{location.name} · {location.quality} (demo)</Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                  <button className="map-open-button" onClick={() => setActivePage("Dead Zone Map")}>Open Dead Zone Map <MapPin size={14} /></button>
                </section>

                <section className="ops-panel alerts-panel">
                  <div className="ops-panel-title"><span>CONNECTIVITY INSIGHTS</span><Bell size={16} /></div>
                  <div className="ops-alert-list">
                    <div className="ops-alert critical"><AlertTriangle size={16} /><div><strong>Weak connectivity sample</strong><small>Parking Area · Demo data</small></div></div>
                    <div className="ops-alert warning"><Activity size={16} /><div><strong>Elevated latency sample</strong><small>Computer Lab 3 · Demo data</small></div></div>
                    <div className="ops-alert info"><CheckCircle2 size={16} /><div><strong>Backend endpoint configured</strong><small>Run a test to verify connection</small></div></div>
                  </div>
                  <div className="ops-panel-foot">Insights are illustrative until real measurements are saved.</div>
                </section>

                <section className="ops-panel">
                  <div className="ops-panel-title"><span>SAMPLE LOCATIONS</span><MapPin size={17} /></div>
                  <div className="ops-big-value">{demoLocations.length}</div>
                  <div className="ops-subtitle">Example entries for the interface</div>
                </section>

                <section className="ops-panel">
                  <div className="ops-panel-title"><span>TEST ENGINE</span><Gauge size={17} /></div>
                  <div className="ops-big-value">{result ? `${result.latency} ms` : "Ready"}</div>
                  <div className="ops-subtitle">Browser-to-backend response time</div>
                  <button className="ops-run-button full-button" onClick={runNetworkTest} disabled={testing}><Play size={14} />{testing ? "TESTING..." : "TEST CONNECTION"}</button>
                </section>

                <section className="ops-panel">
                  <div className="ops-panel-title"><span>LAST TEST LATENCY</span><Activity size={17} /></div>
                  <div className="ops-big-value">{result ? `${result.latency} ms` : "—"}</div>
                  <div className="ops-subtitle">{result ? "Latest HTTP response" : "No test result yet"}</div>
                  <div className="latency-bars">{[35, 52, 42, 72, 48, 64, result ? Math.min(result.latency, 100) : 30].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div>
                </section>

                <section className="ops-panel locations-panel">
                  <div className="ops-panel-title"><span>LOCATION CONNECTIVITY</span><MapPin size={17} /></div>
                  {filteredLocations.map((location) => (
                    <div className="ops-location-row" key={location.id}>
                      <span className={`location-quality-dot ${location.quality.toLowerCase()}`} />
                      <div><strong>{location.name}</strong><small>{location.area}</small></div>
                      <b>{location.latency} ms</b><QualityBadge quality={location.quality} />
                    </div>
                  ))}
                  {!filteredLocations.length && <div className="ops-empty">No matching locations</div>}
                  <div className="ops-panel-foot">Example values only; not live measurements.</div>
                </section>

                <section className="ops-panel locations-panel">
                  <div className="ops-panel-title"><span>RECENT TEST HISTORY</span><Clock3 size={17} /></div>
                  {testHistory.length ? testHistory.slice(0, 4).map((test) => (
                    <div className="ops-history-row" key={test.id}>
                      <span className="history-state good" />
                      <div><strong>Backend connectivity test</strong><small>{test.time}</small></div>
                      <span className="history-speed">{test.latency} ms</span>
                    </div>
                  )) : <div className="ops-empty"><Clock3 size={22} /><span>No test run in this session</span><small>History is not persistent yet.</small></div>}
                </section>
              </div>
              <footer className="ops-footer"><span>NETSPOT · NETWORK DEAD ZONE DETECTOR</span><span>Demo location data · Local backend test</span></footer>
            </>
          )}

          {activePage === "Network Test" && (
            <section className="ops-panel screen-placeholder">
              <div className="ops-panel-title"><span>NETWORK TEST</span><Gauge size={17} /></div>
              <h2>Backend connectivity check</h2>
              <p className="ops-subtitle">Measures HTTP response time to the local NetSpot backend, not general internet speed or cellular signal.</p>
              <button className="ops-run-button" onClick={runNetworkTest} disabled={testing}><Play size={15} />{testing ? "TESTING..." : "RUN CONNECTION TEST"}</button>
              {result && <p className="screen-result">Last result: {result.latency} ms · {result.time}</p>}
            </section>
          )}

          {activePage === "Test History" && (
            <section className="ops-panel screen-placeholder">
              <div className="ops-panel-title"><span>TEST HISTORY</span><Clock3 size={17} /></div>
              <p className="ops-subtitle">History is currently held in memory for this browser session. Database persistence is a future step.</p>
              {testHistory.length ? testHistory.map((test) => (
                <div className="ops-history-row" key={test.id}>
                  <span className="history-state good" />
                  <div><strong>Backend connectivity test</strong><small>{test.time}</small></div>
                  <span className="history-speed">{test.latency} ms</span>
                </div>
              )) : <div className="ops-empty"><Clock3 size={22} /><span>No tests recorded in this session</span></div>}
            </section>
          )}

          {activePage === "Reports" && (
            <section className="ops-panel screen-placeholder">
              <div className="ops-panel-title"><span>REPORTS</span><FileChartColumn size={17} /></div>
              <h2>Reports are not generated yet</h2>
              <p className="ops-subtitle">When test records are stored, this page can summarize latency and failed requests. It does not generate reports from sample map data.</p>
              <div className="report-preview">
                <span>Tests this session</span><strong>{testHistory.length}</strong>
                <span>Average backend response time</span>
                <strong>{testHistory.length ? `${Math.round(testHistory.reduce((sum, test) => sum + test.latency, 0) / testHistory.length)} ms` : "—"}</strong>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
