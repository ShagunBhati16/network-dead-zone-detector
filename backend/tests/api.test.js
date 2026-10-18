const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const tempDir = path.join(os.tmpdir(), `netspot-api-test-${process.pid}-${Date.now()}`);
process.env.NETSPOT_DATA_FILE = path.join(tempDir, "network-tests.json");
process.env.NETSPOT_LOCATIONS_FILE = path.join(tempDir, "locations.json");
process.env.CORS_ORIGIN = "*";

const { app } = require("../server");
let server;
let baseUrl;

before(async () => {
  await fs.mkdir(tempDir, { recursive: true });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("GET /api/health returns success", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "success");
  assert.equal(body.service, "NetSpot API");
});

test("GET /api/ping returns a timestamp and disables caching", async () => {
  const response = await fetch(`${baseUrl}/api/ping`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "success");
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("POST /api/network-tests validates and persists a test", async () => {
  const response = await fetch(`${baseUrl}/api/network-tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latency: 23.7, jitter: 2.1, packetLoss: 0, download: 92, upload: 44, location: "Main Library" }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.status, "success");
  assert.equal(body.record.latency, 23.7);
  assert.equal(body.record.location, "Main Library");
  assert.equal(body.record.quality, "Good");
  assert.ok(body.record.id);
});

test("POST /api/network-tests rejects missing or invalid latency", async () => {
  const missing = await fetch(`${baseUrl}/api/network-tests`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
  });
  assert.equal(missing.status, 400);
  const invalid = await fetch(`${baseUrl}/api/network-tests`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latency: -5 }),
  });
  assert.equal(invalid.status, 400);
});

test("GET /api/network-tests returns saved records and filters", async () => {
  const response = await fetch(`${baseUrl}/api/network-tests`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
  assert.equal(body.records[0].location, "Main Library");
  const filtered = await fetch(`${baseUrl}/api/network-tests?quality=Poor`);
  assert.equal((await filtered.json()).total, 0);
});

test("GET /api/locations returns seeded survey locations", async () => {
  const response = await fetch(`${baseUrl}/api/locations`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.locations.length >= 1);
  assert.ok(Number.isFinite(body.locations[0].lat));
});

test("GET /api/reports/summary reflects saved test records", async () => {
  const response = await fetch(`${baseUrl}/api/reports/summary?days=7`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.totalTests, 1);
  assert.equal(body.averageLatency, 23.7);
  assert.ok(body.locationCount >= 1);
});

test("GET /api/reports.csv returns a downloadable CSV", async () => {
  const response = await fetch(`${baseUrl}/api/reports.csv`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/csv/);
  assert.match(body, /createdAt/);
  assert.match(body, /Main Library/);
});

test("GET /api/speed-test returns a bounded binary payload", async () => {
  const response = await fetch(`${baseUrl}/api/speed-test?bytes=4096`);
  const body = await response.arrayBuffer();
  assert.equal(response.status, 200);
  assert.equal(body.byteLength, 4096);
  const tooLarge = await fetch(`${baseUrl}/api/speed-test?bytes=999999999`);
  assert.equal(tooLarge.status, 400);
});

test("DELETE /api/network-tests clears saved history", async () => {
  const response = await fetch(`${baseUrl}/api/network-tests`, { method: "DELETE" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.records, []);
  const records = await (await fetch(`${baseUrl}/api/network-tests`)).json();
  assert.equal(records.total, 0);
});

test("unknown routes return JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).status, "error");
});
