'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

let server, baseUrl, tempDir, token;
test('authenticated measurement API, persistence, validation, reports and CSV', async t => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'netspot-api-test-'));
  process.env.NETSPOT_DATA_DIR = tempDir;
  process.env.AUTH_SECRET = 'integration-test-secret-with-at-least-32-chars';
  process.env.NODE_ENV = 'test';
  const { app } = require('../server');
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(tempDir,{recursive:true,force:true}); });

  const unauth = await fetch(`${baseUrl}/api/network-tests`);
  assert.equal(unauth.status, 401, 'protected history requires authentication');
  const register = await fetch(`${baseUrl}/api/auth/register`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test User',email:'integration@example.test',password:'a-strong-test-password'})});
  assert.equal(register.status,201);
  token = (await register.json()).token;
  assert.ok(token);
  const login = await fetch(`${baseUrl}/api/auth/login`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'integration@example.test',password:'a-strong-test-password'})});
  assert.equal(login.status,200,'registered account can log in');
  token = (await login.json()).token;
  const headers = {'content-type':'application/json',authorization:`Bearer ${token}`};

  const badCoordinates = await fetch(`${baseUrl}/api/network-tests`, {method:'POST',headers,body:JSON.stringify({lat:91,lng:73,latencyMs:20})});
  assert.equal(badCoordinates.status,400,'out-of-range coordinates must be rejected');
  const incompleteCoordinates = await fetch(`${baseUrl}/api/network-tests`, {method:'POST',headers,body:JSON.stringify({lat:18.4,latencyMs:20})});
  assert.equal(incompleteCoordinates.status,400,'latitude and longitude must be supplied together');
  const invalidLoss = await fetch(`${baseUrl}/api/network-tests`, {method:'POST',headers,body:JSON.stringify({packetLossPct:120})});
  assert.equal(invalidLoss.status,400,'invalid packet-loss percentages must be rejected');

  const saved = await fetch(`${baseUrl}/api/network-tests`, {method:'POST',headers,body:JSON.stringify({latencyMs:42,jitterMs:4,packetLossPct:0,downloadMbps:25,uploadMbps:8,signalDbm:-52,signalQualityPct:88,estimatedSignalDbm:-56,signalMethod:'integration-native-test',walkSessionId:'walk-session-test',sampleIndex:1,floorPlanName:'level-1.png',floorPlanX:0.375,floorPlanY:0.625,lat:18.4575,lng:73.8203,locationName:'Integration Point',isMeasured:true,connected:true,internetReachable:true})});
  assert.equal(saved.status,201);
  const savedBody = await saved.json();
  assert.equal(savedBody.data.latencyMs,42);
  assert.equal(savedBody.data.locationName,'Integration Point');
  assert.equal(savedBody.data.signalDbm,-52);
  assert.equal(savedBody.data.signalQualityPct,88);
  assert.equal(savedBody.data.signalMethod,'integration-native-test');
  assert.equal(savedBody.data.walkSessionId,'walk-session-test');
  assert.equal(savedBody.data.floorPlanName,'level-1.png');
  assert.equal(savedBody.data.floorPlanX,0.375);
  assert.equal(savedBody.data.floorPlanY,0.625);
  const id = savedBody.data.id;

  // Restart the HTTP listener to verify history is backed by persistent storage, not memory.
  await new Promise(resolve => server.close(resolve));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const historyResponse = await fetch(`${baseUrl}/api/network-tests`, {headers:{authorization:`Bearer ${token}`}});
  assert.equal(historyResponse.status,200);
  const history = await historyResponse.json();
  assert.equal(history.total,1);
  assert.equal(history.data[0].id,id,'saved history must persist and be retrievable');

  const summaryResponse = await fetch(`${baseUrl}/api/reports/summary?days=365`, {headers:{authorization:`Bearer ${token}`}});
  assert.equal(summaryResponse.status,200);
  const summary = await summaryResponse.json();
  assert.equal(summary.data.totalTests,1);
  assert.equal(summary.data.averageLatencyMs,42);

  const csvResponse = await fetch(`${baseUrl}/api/reports.csv`, {headers:{authorization:`Bearer ${token}`}});
  assert.equal(csvResponse.status,200);
  assert.match(csvResponse.headers.get('content-type'),/text\/csv/);
  const csv = await csvResponse.text();
  assert.match(csv,/Integration Point/);
  assert.match(csv,/latencyMs/);

  // Basic scale check exercises storage, classification and history listing for a batch.
  for (let i=0;i<20;i++) {
    const response = await fetch(`${baseUrl}/api/network-tests`, {method:'POST',headers,body:JSON.stringify({latencyMs:20+i,packetLossPct:0,locationName:`Load point ${i}`,isMeasured:true})});
    assert.equal(response.status,201);
  }
  const many = await fetch(`${baseUrl}/api/network-tests?limit=100`, {headers:{authorization:`Bearer ${token}`}});
  const manyBody = await many.json();
  assert.equal(manyBody.total,21);
  assert.equal(manyBody.data.length,21);
});
