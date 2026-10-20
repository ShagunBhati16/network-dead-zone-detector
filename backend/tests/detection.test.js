'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyMeasurement, classifySequence, DEFAULT_THRESHOLDS } = require('../detection');

test('disconnected device is classified as dead zone',()=>assert.equal(classifyMeasurement({connected:false}).quality,'Dead Zone'));
test('very weak Wi-Fi signal is classified as dead zone',()=>assert.equal(classifyMeasurement({signalDbm:-87}).isDeadZone,true));
test('moderate signal is classified as moderate',()=>assert.equal(classifyMeasurement({signalDbm:-67,latencyMs:30,packetLossPct:0}).quality,'Moderate'));
test('strong signal and low latency is good',()=>assert.equal(classifyMeasurement({signalDbm:-45,latencyMs:20,packetLossPct:0}).quality,'Good'));
test('empty metrics do not claim a dead zone',()=>assert.equal(classifyMeasurement({}).quality,'Unknown'));
test('strong Wi-Fi with failed internet probe is outage, not dead zone',()=>{const r=classifyMeasurement({signalDbm:-48,connected:true,gatewayReachable:true,internetReachable:false});assert.equal(r.quality,'Outage');assert.equal(r.issueType,'internet-or-server-outage')});
test('repeated weak signal across enough samples is a confirmed dead zone',()=>{const samples=Array.from({length:4},(_,i)=>({timestamp:new Date(Date.now()-i*1000).toISOString(),signalDbm:-88,connected:true,isMeasured:true}));const r=classifySequence(samples);assert.equal(r.quality,'Dead Zone');assert.equal(r.repeatedDeadZone,true);assert.ok(r.confidence>=70)});
test('mixed disconnects identify intermittent connectivity',()=>{const samples=[{connected:true,signalDbm:-55},{connected:false,signalDbm:-55},{connected:true,signalDbm:-55},{connected:false,signalDbm:-55}];const r=classifySequence(samples);assert.equal(r.quality,'Unstable');assert.equal(r.issueType,'intermittent-connectivity')});
test('thresholds can be overridden',()=>assert.equal(classifyMeasurement({signalDbm:-68},{...DEFAULT_THRESHOLDS,goodSignalMinDbm:-70}).quality,'Good'));

test('Wi-Fi below -70 dBm is classified as weak/poor by the default threshold',()=>assert.equal(classifyMeasurement({signalDbm:-71,connected:true,gatewayReachable:true,internetReachable:true,serverReachable:true}).quality,'Poor'));
test('Wi-Fi at -70 dBm is not below the configured weak-signal threshold',()=>assert.equal(classifyMeasurement({signalDbm:-70,connected:true,gatewayReachable:true,internetReachable:true,serverReachable:true}).quality,'Moderate'));
