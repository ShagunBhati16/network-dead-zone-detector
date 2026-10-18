
import { useState } from "react";
import {
  Activity,
  Wifi,
  MapPin,
  FileChartColumn,
  Gauge,
  Bell,
  Search,
  Play,
  CheckCircle2,
  Clock3,
  RefreshCw,
  AlertTriangle,
  Menu,
} from "lucide-react";
import "./App.css";

const initialLocations = [
  { name: "Main Library", area: "North Campus", latency: 24, loss: 0, quality: "Good" },
  { name: "Computer Lab 3", area: "Academic Block", latency: 86, loss: 1.8, quality: "Moderate" },
  { name: "Parking Area", area: "East Campus", latency: 192, loss: 8.4, quality: "Poor" },
  { name: "College Canteen", area: "Central Campus", latency: 38, loss: 0.4, quality: "Good" },
];

const navigation = [
  { name: "Dashboard", icon: Activity },
  { name: "Network Test", icon: Gauge },
  { name: "Dead Zone Map", icon: MapPin },
  { name: "Test History", icon: Clock3 },
  { name: "Reports", icon: FileChartColumn },
];

function StatCard({ title, value, unit, icon: Icon, note, color }) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-title">
        <span>{title}</span>
        <Icon size={17} />
      </div>
      <div className="ops-big-value">
        {value}
        {unit && <span style={{ fontSize: 14, marginLeft: 5 }}>{unit}</span>}
      </div>
      <div className="ops-subtitle">{note}</div>
      <div
        style={{
          height: 3,
          marginTop: 16,
          background: "#1b3550",
          borderRadius: 5,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(8, Math.min(Number(value) || 8, 100))}%`,
            background: color,
            borderRadius: 5,
          }}
        />
      </div>
    </section>
  );
}

function QualityBadge({ quality }) {
  return (
    <span className={`quality-badge ${quality.toLowerCase()}`}>
      <span />
      {quality}
    </span>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [locations, setLocations] = useState(initialLocations);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function runNetworkTest() {
    setTesting(true);
    setError("");
    setResult(null);

    try {
      const start = performance.now();

      const response = await fetch("http://localhost:5000/api/health", {
        method: "GET",
        cache: "no-store",
      });

      const elapsed = Math.round(performance.now() - start);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data = await response.json();

      setResult({
        latency: elapsed,
        message: data.message || "Backend responded successfully.",
      });
    } catch (err) {
      setError(
        "Could not reach the backend. Make sure your backend server is running at localhost:5000."
      );
    } finally {
      setTesting(false);
    }
  }

  function refreshDemoLocations() {
    setLocations((current) => [...current]);
  }

  const filteredLocations = locations.filter((location) =>
    `${location.name} ${location.area} ${location.quality}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="ops-app">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <div className="ops-brand-icon">
            <Wifi size={24} />
          </div>
          <div>
            <strong>NetSpot</strong>
            <span>NETWORK INTELLIGENCE</span>
          </div>
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
              {name === "Dead Zone Map" && (
                <span className="ops-nav-count">12</span>
              )}
            </button>
          ))}
        </nav>

        <div className="ops-sidebar-bottom">
          <div className="ops-online">
            <span />
            <span>System online</span>
            <strong>Connected</strong>
          </div>
          <div className="ops-version">NETSPOT v1.0.0</div>
        </div>
      </aside>

      <main className="ops-main">
        <header className="ops-topbar">
          <div className="ops-page-title">
            <span>Workspace</span>
            <b>/</b>
            <strong>{activePage}</strong>
          </div>

          <div className="ops-top-actions">
            <label className="search-box">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search locations..."
                aria-label="Search locations"
              />
            </label>
            <button className="ops-top-icon" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <div className="ops-user-avatar">NS</div>
          </div>
        </header>

        <div className="ops-content">
          <div className="ops-heading-row">
            <div>
              <div className="ops-overline">NETWORK OPERATIONS CENTER</div>
              <h1>
                {activePage === "Dashboard"
                  ? "Network Intelligence Dashboard"
                  : activePage}
              </h1>
              <p>
                Monitor connectivity, identify weak signal areas, and review
                network performance.
              </p>
            </div>

            <button
              className="ops-run-button"
              onClick={runNetworkTest}
              disabled={testing}
            >
              {testing ? (
                <RefreshCw size={16} className="spin" />
              ) : (
                <Play size={16} />
              )}
              {testing ? "TESTING..." : "RUN NETWORK TEST"}
            </button>
          </div>

          {result && (
            <div className="ops-result">
              <CheckCircle2 size={20} />
              <div>
                <strong>Backend connectivity test completed</strong>
                <span>
                  Browser-to-backend response time: {result.latency} ms.
                  {` ${result.message} `}
                  This measures response time to your backend, not your
                  general internet speed or cellular signal strength.
                </span>
              </div>
              <button onClick={() => setResult(null)} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="ops-error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {activePage === "Dashboard" && (
            <>
              <div className="ops-dashboard-grid">
                <section className="ops-panel status-panel">
                  <div className="ops-panel-title">
                    <span>SYSTEM STATUS</span>
                    <Activity size={17} />
                  </div>
                  <div className="system-health">
                    <span className="health-light" />
                    <div>
                      <span className="health-caption">DEMO DASHBOARD STATUS</span>
                      <strong>Monitoring Ready</strong>
                    </div>
                  </div>
                  <div className="health-score-row">
                    <strong>4</strong>
                    <span>Sample locations displayed</span>
                  </div>
                  <div className="ops-divider" />
                  <div className="status-stat-row">
                    <span><i className="cyan-dot" /> Good</span>
                    <strong>2 locations</strong>
                  </div>
                  <div className="status-stat-row">
                    <span><i className="amber-dot" /> Moderate</span>
                    <strong>1 location</strong>
                  </div>
                  <div className="status-stat-row">
                    <span><i className="red-dot" /> Poor</span>
                    <strong>1 location</strong>
                  </div>
                </section>

                <section className="ops-panel world-panel">
                  <div className="ops-panel-title">
                    <span>MONITORED CAMPUS AREAS</span>
                    <span className="ops-mini-tag">ILLUSTRATIVE VIEW</span>
                  </div>

                  <div className="world-map">
                    <svg
                      className="world-svg"
                      viewBox="0 0 600 330"
                      role="img"
                      aria-label="Illustrative network monitoring map"
                    >
                      <defs>
                        <pattern
                          id="grid"
                          width="30"
                          height="30"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 30 0 L 0 0 0 30"
                            fill="none"
                            stroke="#1c3853"
                            strokeWidth="0.7"
                          />
                        </pattern>
                      </defs>
                      <rect width="600" height="330" fill="url(#grid)" />
                      <path
                        d="M60 75 L120 45 L180 63 L205 102 L170 128 L138 113 L115 150 L75 125 Z
                           M240 75 L285 52 L335 65 L365 100 L342 135 L300 124 L278 150 L248 120 Z
                           M395 80 L455 60 L520 90 L535 130 L495 150 L455 132 L420 145 L390 115 Z
                           M180 190 L220 170 L250 205 L230 260 L205 282 L188 238 Z
                           M405 190 L455 180 L485 215 L455 250 L425 238 Z"
                        fill="#15314d"
                        stroke="#254765"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M100 100 L180 110 L290 90 L445 120 M180 110 L215 225 L445 120 L445 215"
                        fill="none"
                        stroke="#31cfe0"
                        strokeWidth="1.4"
                        strokeDasharray="5 6"
                        opacity="0.65"
                      />
                    </svg>

                    {[
                      { x: 19, y: 28, quality: "good" },
                      { x: 30, y: 35, quality: "good" },
                      { x: 45, y: 27, quality: "moderate" },
                      { x: 58, y: 41, quality: "poor" },
                      { x: 74, y: 30, quality: "good" },
                      { x: 84, y: 48, quality: "poor" },
                      { x: 36, y: 67, quality: "good" },
                      { x: 68, y: 72, quality: "moderate" },
                      { x: 52, y: 55, quality: "good" },
                    ].map((point, index) => (
                      <div
                        key={index}
                        className={`world-marker ${point.quality}`}
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        <span />
                      </div>
                    ))}

                    <div className="map-tooltip">
                      <span className="tooltip-dot" />
                      <div>
                        <strong>Campus monitoring view</strong>
                        <small>Sample markers — not live GPS data</small>
                      </div>
                    </div>

                    <div className="world-legend">
                      <span><i className="green-dot" /> Good</span>
                      <span><i className="amber-dot" /> Moderate</span>
                      <span><i className="red-dot" /> Poor</span>
                    </div>
                  </div>
                </section>

                <section className="ops-panel alerts-panel">
                  <div className="ops-panel-title">
                    <span>CONNECTIVITY INSIGHTS</span>
                    <Bell size={16} />
                  </div>
                  <div className="ops-alert-list">
                    <div className="ops-alert critical">
                      <AlertTriangle size={16} className="alert-symbol" />
                      <div>
                        <strong>Weak connectivity detected</strong>
                        <small>Parking Area · Sample data</small>
                      </div>
                    </div>
                    <div className="ops-alert warning">
                      <Activity size={16} className="alert-symbol" />
                      <div>
                        <strong>Elevated latency</strong>
                        <small>Computer Lab 3 · Sample data</small>
                      </div>
                    </div>
                    <div className="ops-alert info">
                      <CheckCircle2 size={16} className="alert-symbol" />
                      <div>
                        <strong>Backend endpoint configured</strong>
                        <small>Run a test to verify the connection</small>
                      </div>
                    </div>
                  </div>
                  <div className="ops-panel-foot">
                    Insights are illustrative until real measurements are saved.
                  </div>
                </section>

                <StatCard
                  title="SAMPLE TEST LOCATIONS"
                  value="04"
                  icon={MapPin}
                  note="Example entries for the interface"
                  color="#37d7e7"
                />

                <section className="ops-panel uptime-panel">
                  <div className="ops-panel-title">
                    <span>TEST ENGINE</span>
                    <Gauge size={17} />
                  </div>
                  <div className="ops-big-value">
                    {result ? `${result.latency} ms` : "Ready"}
                  </div>
                  <div className="ops-subtitle">
                    {result
                      ? "Latest backend response time"
                      : "Run a test to measure backend response time"}
                  </div>
                  <button
                    className="ops-run-button"
                    style={{ width: "100%", marginTop: 16 }}
                    onClick={runNetworkTest}
                    disabled={testing}
                  >
                    <Play size={14} />
                    {testing ? "TESTING..." : "TEST CONNECTION"}
                  </button>
                </section>

                <section className="ops-panel signal-panel">
                  <div className="ops-panel-title">
                    <span>LATENCY OVERVIEW</span>
                    <Activity size={17} />
                  </div>
                  <div className="ops-big-value">
                    {result ? `${result.latency} ms` : "—"}
                  </div>
                  <div className="ops-subtitle">
                    {result
                      ? "Latest measured backend round-trip"
                      : "No test result yet"}
                  </div>
                  <svg className="chart-svg" viewBox="0 0 300 100">
                    {[20, 45, 70].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        x2="300"
                        y1={y}
                        y2={y}
                        stroke="#1e3b56"
                        strokeWidth="1"
                      />
                    ))}
                    <path
                      d="M0 65 Q25 45 50 58 T100 49 T150 37 T200 48 T250 30 T300 39"
                      fill="none"
                      stroke="#39d9e9"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="ops-chart-axis">
                    <span>Earlier</span>
                    <span>Latest</span>
                  </div>
                </section>

                <section className="ops-panel topology-panel">
                  <div className="ops-panel-title">
                    <span>NETWORK TOPOLOGY CONCEPT</span>
                    <Activity size={17} />
                  </div>
                  <svg
                    className="topology-svg"
                    viewBox="0 0 420 230"
                    role="img"
                    aria-label="Illustrative network topology"
                  >
                    <g fill="none" strokeWidth="2">
                      <path d="M65 70 L205 42 L345 78 L305 172 L160 185 L65 70" stroke="#39dba4" />
                      <path d="M65 70 L160 185 L205 42 L305 172 L345 78" stroke="#e9b454" />
                      <path d="M205 42 L220 115 L345 78 M220 115 L160 185" stroke="#39d9e9" />
                    </g>
                    {[
                      { x: 65, y: 70, label: "Node A" },
                      { x: 205, y: 42, label: "Gateway" },
                      { x: 345, y: 78, label: "Node B" },
                      { x: 305, y: 172, label: "Node C" },
                      { x: 160, y: 185, label: "Node D" },
                      { x: 220, y: 115, label: "Core" },
                    ].map((node) => (
                      <g key={node.label}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="13"
                          className="topology-node-halo"
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="8"
                          className="topology-node"
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="2"
                          className="topology-node-center"
                        />
                        <text
                          x={node.x}
                          y={node.y + 25}
                          textAnchor="middle"
                          className="topology-label"
                        >
                          {node.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <div className="ops-subtitle">
                    Illustrative links only; actual topology discovery is not
                    implemented yet.
                  </div>
                </section>

                <section className="ops-panel locations-panel">
                  <div className="ops-panel-title">
                    <span>LOCATION CONNECTIVITY</span>
                    <button
                      className="ops-top-icon"
                      onClick={refreshDemoLocations}
                      aria-label="Refresh sample locations"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  {filteredLocations.map((location) => (
                    <div className="ops-location-row" key={location.name}>
                      <span
                        className={`location-quality-dot ${location.quality.toLowerCase()}`}
                      />
                      <div>
                        <strong>{location.name}</strong>
                        <small>{location.area}</small>
                      </div>
                      <b>{location.latency} ms</b>
                      <QualityBadge quality={location.quality} />
                    </div>
                  ))}
                  {filteredLocations.length === 0 && (
                    <div className="ops-empty">
                      <Search size={20} />
                      <span>No matching locations</span>
                    </div>
                  )}
                  <div className="ops-panel-foot">
                    Example values only; replace with measured results in a later step.
                  </div>
                </section>

                <section className="ops-panel locations-panel">
                  <div className="ops-panel-title">
                    <span>RECENT TEST HISTORY</span>
                    <Clock3 size={17} />
                  </div>
                  {result ? (
                    <div className="ops-history-row">
                      <span className="history-state good" />
                      <div>
                        <strong>Backend connectivity test</strong>
                        <small>{new Date().toLocaleTimeString()}</small>
                      </div>
                      <span className="history-speed">{result.latency} ms</span>
                    </div>
                  ) : (
                    <div className="ops-empty">
                      <Clock3 size={22} />
                      <span>No live test history yet</span>
                      <small>Run a connection test to add a result.</small>
                    </div>
                  )}
                </section>
              </div>

              <footer className="ops-footer">
                <span>NETSPOT · NETWORK DEAD ZONE DETECTOR</span>
                <span><i className="green-dot" /> Frontend running · Demo data shown</span>
              </footer>
            </>
          )}

          {activePage !== "Dashboard" && (
            <section className="ops-panel" style={{ marginTop: 20 }}>
              <div className="ops-panel-title">
                <span>{activePage.toUpperCase()}</span>
                <Menu size={17} />
              </div>
              {activePage === "Network Test" ? (
                <>
                  <p className="ops-subtitle">
                    Test the browser's response time to the NetSpot backend.
                    This does not measure cellular signal strength or general
                    internet bandwidth.
                  </p>
                  <button
                    className="ops-run-button"
                    onClick={runNetworkTest}
                    disabled={testing}
                  >
                    <Play size={15} />
                    {testing ? "TESTING..." : "RUN CONNECTION TEST"}
                  </button>
                </>
              ) : activePage === "Dead Zone Map" ? (
                <p className="ops-subtitle">
                  The map is currently illustrative. GPS location capture and
                  real mapped test results will be added in a later step.
                </p>
              ) : activePage === "Test History" ? (
                <p className="ops-subtitle">
                  Completed tests will appear here. Persistent database-backed
                  history has not been added yet.
                </p>
              ) : (
                <p className="ops-subtitle">
                  Report generation will be added after test results can be
                  collected and saved.
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
