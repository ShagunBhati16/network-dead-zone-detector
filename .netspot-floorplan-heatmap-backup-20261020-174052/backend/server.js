require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const { DEFAULT_THRESHOLDS, classifyMeasurement, classifySequence } = require('./detection');
const app = express();
const PORT = Number(process.env.PORT || 5000);
const DATA_DIR = path.resolve(process.env.NETSPOT_DATA_DIR || path.join(__dirname, 'data'));
const TESTS_FILE = path.join(DATA_DIR, 'network-tests.json');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json');
const THRESHOLDS_FILE = path.join(DATA_DIR, 'detection-thresholds.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUTH_SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-change-this-secret-before-deployment');
if (process.env.NODE_ENV === 'production' && (!AUTH_SECRET || AUTH_SECRET.length < 32)) throw new Error('Set AUTH_SECRET to a random value of at least 32 characters in production.');
const authAttempts = new Map();
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim());
app.disable('x-powered-by');
app.use(cors({ origin(origin, cb) { if (!origin || origins.includes('*') || origins.includes(origin)) return cb(null,true); return cb(new Error('Origin not allowed by CORS')); }, methods:['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders:['Content-Type','Authorization'] }));
app.use(express.json({ limit: '256kb' }));
// Compact request logs for local diagnostics and production log collectors.
app.use((req,res,next)=>{ const started=Date.now(); res.on('finish',()=>{ if(process.env.LOG_LEVEL==='silent') return; const entry={level:res.statusCode>=500?'error':res.statusCode>=400?'warn':'info',event:'http_request',method:req.method,path:req.path,status:res.statusCode,durationMs:Date.now()-started,requestId:req.headers['x-request-id']||undefined}; console.log(JSON.stringify(entry)); }); next(); });
async function read(file, fallback=[]) { try { const x=JSON.parse(await fs.readFile(file,'utf8')); return Array.isArray(x)?x:fallback; } catch(e) { if(e.code==='ENOENT') return fallback; throw e; } }
async function write(file, data) {
 await fs.mkdir(DATA_DIR,{recursive:true});
 const tmp=file+'.tmp';
 // Keep a last-known-good backup for recovery from accidental corruption.
 try { await fs.copyFile(file, file+'.bak'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 await fs.writeFile(tmp,JSON.stringify(data,null,2),{encoding:'utf8',flag:'w'});
 await fs.rename(tmp,file);
} 
function filteredTests(rows, query={}) {
 let out = rows.slice();
 const from = query.from || query.startDate; const to = query.to || query.endDate;
 if (from && Number.isFinite(Date.parse(from))) out = out.filter(r => Date.parse(r.timestamp) >= Date.parse(from));
 if (to && Number.isFinite(Date.parse(to))) out = out.filter(r => Date.parse(r.timestamp) <= Date.parse(to));
 if (query.location) out = out.filter(r => String(r.locationName||'').toLowerCase().includes(String(query.location).toLowerCase()));
 if (query.quality && !['all','all quality'].includes(String(query.quality).toLowerCase())) out = out.filter(r => String(r.quality||'Unknown').toLowerCase() === String(query.quality).toLowerCase());
 if (query.source && !['all','all sources'].includes(String(query.source).toLowerCase())) out = out.filter(r => (String(query.source).toLowerCase()==='measured' ? r.isMeasured === true : r.isMeasured !== true));
 const sortKeys = {date:'timestamp',timestamp:'timestamp',latency:'latencyMs',jitter:'jitterMs',loss:'packetLossPct',packetLoss:'packetLossPct',download:'downloadMbps',upload:'uploadMbps',quality:'quality',location:'locationName'};
 const sortKey = sortKeys[String(query.sort||'date')] || 'timestamp';
 const direction = String(query.order||'desc').toLowerCase()==='asc' ? 1 : -1;
 out.sort((a,b) => { const av=a[sortKey], bv=b[sortKey]; if (av==null && bv==null) return 0; if (av==null) return 1; if (bv==null) return -1; if (typeof av==='number' && typeof bv==='number') return (av-bv)*direction; return String(av).localeCompare(String(bv))*direction; });
 return out;
}
function reportStats(rows) {
 const avg = k => { const a=rows.map(r=>r[k]).filter(v=>typeof v==='number'&&Number.isFinite(v)); return a.length ? Number((a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)) : null; };
 const count = q => rows.filter(r=>r.quality===q).length;
 return {totalTests:rows.length,averageLatencyMs:avg('latencyMs'),averageJitterMs:avg('jitterMs'),averagePacketLossPct:avg('packetLossPct'),averageDownloadMbps:avg('downloadMbps'),averageUploadMbps:avg('uploadMbps'),good:count('Good'),moderate:count('Moderate'),poor:count('Poor'),deadZones:count('Dead Zone'),unstable:count('Unstable'),outages:count('Outage'),measured:rows.filter(r=>r.isMeasured===true).length,simulated:rows.filter(r=>r.isMeasured!==true).length,missingMetrics:{latency:rows.filter(r=>!Number.isFinite(r.latencyMs)).length,jitter:rows.filter(r=>!Number.isFinite(r.jitterMs)).length,packetLoss:rows.filter(r=>!Number.isFinite(r.packetLossPct)).length,download:rows.filter(r=>!Number.isFinite(r.downloadMbps)).length,upload:rows.filter(r=>!Number.isFinite(r.uploadMbps)).length},generatedAt:new Date().toISOString()};
}
function numeric(v,min,max) { if(v===undefined||v===null||v==='') return null; const n=Number(v); return Number.isFinite(n)&&n>=min&&n<=max?n:null; }
async function getThresholds() { try { const raw=JSON.parse(await fs.readFile(THRESHOLDS_FILE,'utf8')); return { ...DEFAULT_THRESHOLDS, ...raw }; } catch(e) { if(e.code==='ENOENT') return { ...DEFAULT_THRESHOLDS }; throw e; } }
function locationKey(m) { if(Number.isFinite(m.lat)&&Number.isFinite(m.lng)) return `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`; return String(m.locationName||m.location||'Unspecified location').trim().toLowerCase(); }
function validate(body) {
 const m={...body};
 const fields=[['latencyMs',0,600000],['jitterMs',0,600000],['packetLossPct',0,100],['downloadMbps',0,100000],['uploadMbps',0,100000],['signalDbm',-120,0],['rssi',-120,0],['lat',-90,90],['lng',-180,180]];
 for(const [k,min,max] of fields) if(m[k]!==undefined && m[k]!==null && numeric(m[k],min,max)===null) return `${k} must be between ${min} and ${max}`;
 if(m.lat!==undefined && m.lng===undefined || m.lng!==undefined && m.lat===undefined) return 'lat and lng must be supplied together';
 return null;
}
function safeUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, name: user.name, iat: now, exp: now + 8 * 60 * 60 })).toString('base64url');
  const data = `v1.${payload}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}
function verifyToken(token) {
  if (!AUTH_SECRET || typeof token !== 'string') return null;
  const parts = token.split('.'); if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest();
  let actual; try { actual = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try { const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now()/1000)) return null; return payload; } catch { return null; }
}
function authMiddleware(req, res, next) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return res.status(401).json({ status:'error', code:'AUTH_REQUIRED', message:'Sign in to access this resource.' });
  const payload = verifyToken(header.slice(7));
  if (!payload) return res.status(401).json({ status:'error', code:'SESSION_EXPIRED', message:'Your session is invalid or expired. Please sign in again.' });
  req.user = { id: payload.sub, email: payload.email, name: payload.name };
  next();
}
function authRateLimit(req, res, next) {
  const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${String(req.body?.email || '').toLowerCase()}`;
  const now = Date.now(); const old = authAttempts.get(key) || { count:0, reset:now + 15*60*1000 };
  if (old.reset <= now) { old.count = 0; old.reset = now + 15*60*1000; }
  old.count += 1; authAttempts.set(key, old);
  if (old.count > 12) return res.status(429).json({ status:'error', message:'Too many authentication attempts. Try again in 15 minutes.' });
  next();
}
app.post('/api/auth/register', authRateLimit, async (req,res,next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (name.length < 1 || name.length > 100) return res.status(400).json({status:'error',message:'Name is required and must be at most 100 characters.'});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({status:'error',message:'Enter a valid email address.'});
    if (password.length < 10 || password.length > 128) return res.status(400).json({status:'error',message:'Password must be 10–128 characters.'});
    const users = await read(USERS_FILE);
    if (users.some(u => u.email === email)) return res.status(409).json({status:'error',message:'An account with this email already exists.'});
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64)).toString('hex');
    const user = { id:crypto.randomUUID(), name, email, salt, passwordHash:hash, createdAt:new Date().toISOString() };
    users.push(user); await write(USERS_FILE, users);
    // On a fresh, single-user installation only, attach pre-auth legacy records to the first account.
    if (users.length === 1) {
      const legacyTests = await read(TESTS_FILE); let changedTests = false;
      for (const record of legacyTests) if (!record.userId) { record.userId = user.id; changedTests = true; }
      if (changedTests) await write(TESTS_FILE, legacyTests);
      const legacyLocations = await read(LOCATIONS_FILE); let changedLocations = false;
      for (const record of legacyLocations) if (!record.userId) { record.userId = user.id; changedLocations = true; }
      if (changedLocations) await write(LOCATIONS_FILE, legacyLocations);
    }
    const token = signToken(user);
    res.status(201).json({status:'success',token,expiresIn:28800,user:safeUser(user)});
  } catch(e) { next(e); }
});
app.post('/api/auth/login', authRateLimit, async (req,res,next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 254 || password.length > 128) return res.status(400).json({status:'error',message:'Enter a valid email and password.'});
    const users = await read(USERS_FILE); const user = users.find(u => u.email === email);
    // Perform a scrypt operation even for unknown users to reduce timing differences.
    const salt = user?.salt || 'netspot-invalid-user-salt';
    const candidate = await scrypt(password, salt, 64);
    const expected = user ? Buffer.from(user.passwordHash, 'hex') : Buffer.alloc(64);
    const matches = candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    if (!user || !matches) return res.status(401).json({status:'error',message:'Email or password is incorrect.'});
    res.json({status:'success',token:signToken(user),expiresIn:28800,user:safeUser(user)});
  } catch(e) { next(e); }
});
app.get('/api/auth/me', authMiddleware, (req,res)=>res.json({status:'success',user:{id:req.user.id,name:req.user.name,email:req.user.email}}));
app.post('/api/auth/logout', authMiddleware, (req,res)=>res.json({status:'success',message:'Signed out. Clear the client token to end this session on this device.'}));

app.get('/api/health',(req,res)=>res.json({status:'success',message:'NetSpot backend is running',timestamp:new Date().toISOString()}));
app.get('/api/ping',(req,res)=>res.set('Cache-Control','no-store').json({status:'success',timestamp:new Date().toISOString()}));
app.get('/api/speed-test',(req,res)=>{const bytes=Math.max(1024,Math.min(5*1024*1024,Number(req.query.bytes)||1024*1024));res.set({'Content-Type':'application/octet-stream','Content-Length':bytes,'Cache-Control':'no-store'});res.end(Buffer.alloc(bytes));});
// Upload throughput endpoint: accepts a bounded binary payload and reports bytes accepted.
app.post('/api/speed-test/upload', express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req,res)=>{const bytes=Buffer.isBuffer(req.body)?req.body.length:0;res.set('Cache-Control','no-store').json({status:'success',bytesReceived:bytes,timestamp:new Date().toISOString()});});
app.use('/api', authMiddleware);
app.get('/api/network-tests',async(req,res,next)=>{try{const all=(await read(TESTS_FILE)).filter(r=>r.userId===req.user.id);const rows=filteredTests(all,req.query);const total=rows.length;const limit=Math.min(500,Math.max(1,Number(req.query.limit)||100));const offset=Math.max(0,Math.min(1000000,Number(req.query.offset)||0));res.json({status:'success',data:rows.slice(offset,offset+limit),total,limit,offset,hasMore:offset+limit<total});}catch(e){next(e)}});
app.post('/api/network-tests',async(req,res,next)=>{try{const error=validate(req.body||{});if(error)return res.status(400).json({status:'error',message:error});const b=req.body||{};const m={latencyMs:numeric(b.latencyMs??b.latency,0,600000),jitterMs:numeric(b.jitterMs??b.jitter,0,600000),packetLossPct:numeric(b.packetLossPct??b.loss,0,100),downloadMbps:numeric(b.downloadMbps??b.download,0,100000),uploadMbps:numeric(b.uploadMbps??b.upload,0,100000),signalDbm:numeric(b.signalDbm??b.rssi??b.signal,-120,0),connected:b.connected!==false,gatewayReachable:b.gatewayReachable!==false,internetReachable:b.internetReachable!==false,serverReachable:b.serverReachable!==false,lat:numeric(b.lat,-90,90),lng:numeric(b.lng,-180,180),sampleCount:numeric(b.sampleCount,1,1000)??1,isMeasured:b.isMeasured!==false,source:String(b.source||'browser').slice(0,40)};const precision=b.locationPrecision==='precise'?5:3;if(m.lat!==null&&m.lng!==null){m.lat=Number(m.lat.toFixed(precision));m.lng=Number(m.lng.toFixed(precision));}const accuracyMeters=numeric(b.accuracyMeters,0,100000);const locationSource=String(b.locationSource||'none').slice(0,30);const locationPrecision=b.locationPrecision==='precise'?'precise':'approximate';const indoorSurvey=b.indoorSurvey===true;const surveyName=String(b.surveyName||'Network survey').slice(0,160);const locationName=String(b.locationName||b.location||'Location not shared').slice(0,160);const timestamp=new Date().toISOString();const rows=await read(TESTS_FILE);const thresholds=await getThresholds();const windowMs=thresholds.repeatWindowMinutes*60000;const key=locationKey({...m,locationName});const previous=rows.filter(r=>r.userId===req.user.id&&locationKey({...r,locationName:r.locationName})===key&&timestamp-Date.parse(r.timestamp)<=windowMs).slice(-(Math.max(20,thresholds.minimumSamples*5)));const row={id:crypto.randomUUID(),userId:req.user.id,timestamp,locationName,surveyName,accuracyMeters,locationSource,locationPrecision,indoorSurvey,...m,...classifyMeasurement(m,thresholds),source:m.source,probeCount:numeric(b.probeCount,0,1000),successfulProbes:numeric(b.successfulProbes,0,1000),latencySamples:Array.isArray(b.latencySamples)?b.latencySamples.filter(v=>Number.isFinite(Number(v))).slice(0,100).map(Number):[],downloadSamples:Array.isArray(b.downloadSamples)?b.downloadSamples.filter(v=>Number.isFinite(Number(v))).slice(0,100).map(Number):[],uploadSamples:Array.isArray(b.uploadSamples)?b.uploadSamples.filter(v=>Number.isFinite(Number(v))).slice(0,100).map(Number):[],measurementError:String(b.measurementError||'').slice(0,1000),signalQualityPct:numeric(b.signalQualityPct,0,100),estimatedSignalDbm:numeric(b.estimatedSignalDbm,-120,0),signalMethod:String(b.signalMethod||'').slice(0,100),signalDbmIsEstimate:b.signalDbmIsEstimate===true,floorPlanName:String(b.floorPlanName||'').slice(0,160),floorPlanX:numeric(b.floorPlanX,0,1),floorPlanY:numeric(b.floorPlanY,0,1),walkSessionId:String(b.walkSessionId||'').slice(0,100),sampleIndex:numeric(b.sampleIndex,1,1000000)};const sequence=classifySequence([...previous,row],thresholds);Object.assign(row,{quality:sequence.quality,issueType:sequence.issueType,isDeadZone:sequence.isDeadZone,confidence:sequence.confidence,sequenceSampleCount:sequence.sampleCount,repeatedDeadZone:sequence.repeatedDeadZone,intermittent:sequence.intermittent,disconnectCount:sequence.disconnectCount,deadZoneCount:sequence.deadZoneCount,outageCount:sequence.outageCount,avgSignalDbm:sequence.avgSignalDbm,signalSpreadDb:sequence.signalSpreadDb,reasons:sequence.reasons,classificationSource:sequence.classificationSource});rows.push(row);await write(TESTS_FILE,rows.slice(-10000));res.status(201).json({status:'success',data:row,analysis:{sampleCount:sequence.sampleCount,requiredSamples:thresholds.minimumSamples,repeatWindowMinutes:thresholds.repeatWindowMinutes,classification:sequence.quality,issueType:sequence.issueType,confidence:sequence.confidence,reasons:sequence.reasons}});}catch(e){next(e)}});
app.get('/api/network-tests/:id',async(req,res,next)=>{try{const row=(await read(TESTS_FILE)).find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!row)return res.status(404).json({status:'error',message:'Test not found'});res.json({status:'success',data:row});}catch(e){next(e)}});
app.delete('/api/network-tests/:id',async(req,res,next)=>{try{const rows=await read(TESTS_FILE);const index=rows.findIndex(x=>x.id===req.params.id&&x.userId===req.user.id);if(index<0)return res.status(404).json({status:'error',message:'Test not found'});const [deleted]=rows.splice(index,1);await write(TESTS_FILE,rows);res.json({status:'success',message:'Test deleted',data:{id:deleted.id}});}catch(e){next(e)}});
app.delete('/api/network-tests',async(req,res,next)=>{try{const rows=await read(TESTS_FILE);const mine=rows.filter(x=>x.userId===req.user.id);await write(TESTS_FILE,rows.filter(x=>x.userId!==req.user.id));res.json({status:'success',message:'Test history cleared',deleted:mine.length});}catch(e){next(e)}});
app.get('/api/locations',async(req,res,next)=>{try{const tests=(await read(TESTS_FILE)).filter(t=>t.userId===req.user.id);const saved=(await read(LOCATIONS_FILE)).filter(l=>l.userId===req.user.id);const fromTests=tests.filter(t=>t.lat!==null&&t.lng!==null).map(t=>({id:t.id,name:t.locationName,lat:t.lat,lng:t.lng,date:t.timestamp,latency:t.latencyMs,loss:t.packetLossPct,signal:t.signalDbm,quality:t.quality,isMeasured:t.isMeasured,confidence:t.confidence}));res.json({status:'success',data:[...saved,...fromTests]});}catch(e){next(e)}});
app.post('/api/locations',async(req,res,next)=>{try{const b=req.body||{};const error=validate(b);if(error)return res.status(400).json({status:'error',message:error});if(b.lat===undefined||b.lng===undefined)return res.status(400).json({status:'error',message:'lat and lng are required'});const rows=await read(LOCATIONS_FILE);const row={id:crypto.randomUUID(),userId:req.user.id,name:String(b.name||'Survey point').slice(0,160),area:String(b.area||'').slice(0,160),lat:Number(b.lat),lng:Number(b.lng),createdAt:new Date().toISOString(),isMeasured:b.isMeasured!==false};rows.push(row);await write(LOCATIONS_FILE,rows);res.status(201).json({status:'success',data:row});}catch(e){next(e)}});
app.get('/api/detection/thresholds',async(req,res,next)=>{try{res.json({status:'success',data:await getThresholds(),note:'Thresholds are configurable. RSSI must be supplied by a native OS collector; browser-only JavaScript cannot reliably read Wi-Fi RSSI.'});}catch(e){next(e)}});
app.patch('/api/detection/thresholds',async(req,res,next)=>{try{const current=await getThresholds();const allowed=Object.keys(DEFAULT_THRESHOLDS);const nextValues={...current};for(const k of allowed){if(req.body?.[k]!==undefined){const n=Number(req.body[k]);if(!Number.isFinite(n))return res.status(400).json({status:'error',message:`${k} must be numeric`});nextValues[k]=n;}}const valid=nextValues.goodSignalMinDbm>nextValues.moderateSignalMinDbm&&nextValues.moderateSignalMinDbm>nextValues.poorSignalMinDbm&&nextValues.goodLatencyMaxMs<nextValues.moderateLatencyMaxMs&&nextValues.moderateLatencyMaxMs<nextValues.poorLatencyMaxMs&&nextValues.goodLossMaxPct<nextValues.moderateLossMaxPct&&nextValues.moderateLossMaxPct<nextValues.poorLossMaxPct&&nextValues.minimumSamples>=1&&nextValues.minimumSamples<=100&&nextValues.repeatWindowMinutes>=1&&nextValues.repeatWindowMinutes<=1440&&nextValues.deadZoneRepeatCount>=1&&nextValues.unstableDisconnectCount>=1;if(!valid)return res.status(400).json({status:'error',message:'Thresholds are inconsistent or outside supported bounds'});await write(THRESHOLDS_FILE,nextValues);res.json({status:'success',data:nextValues});}catch(e){next(e)}});
app.get('/api/dead-zones',async(req,res,next)=>{try{const rows=(await read(TESTS_FILE)).filter(r=>r.userId===req.user.id);const thresholds=await getThresholds();const windowMs=thresholds.repeatWindowMinutes*60000;const groups=new Map();for(const r of rows){const key=locationKey({...r,locationName:r.locationName});if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}const data=[];for(const [key,samples] of groups){const recent=samples.filter(s=>Date.now()-Date.parse(s.timestamp)<=windowMs);if(!recent.length)continue;const analysis=classifySequence(recent,thresholds);if(analysis.quality==='Dead Zone'||analysis.quality==='Unstable'||analysis.quality==='Outage'||analysis.disconnectCount>0)data.push({locationKey:key,locationName:recent[recent.length-1].locationName,lat:recent[recent.length-1].lat,lng:recent[recent.length-1].lng,lastSeen:recent[recent.length-1].timestamp,...analysis});}data.sort((a,b)=>b.confidence-a.confidence);res.json({status:'success',data,thresholds,windowMinutes:thresholds.repeatWindowMinutes});}catch(e){next(e)}});
app.get('/api/outages',async(req,res,next)=>{try{const rows=(await read(TESTS_FILE)).filter(r=>r.userId===req.user.id);const data=rows.filter(r=>r.issueType==='internet-or-server-outage'||r.quality==='Outage').sort((a,b)=>b.timestamp.localeCompare(a.timestamp));res.json({status:'success',data:data.slice(0,500),total:data.length,note:'Outages are inferred from failed internet/server probes with Wi-Fi/gateway availability; provide probe fields for reliable differentiation.'});}catch(e){next(e)}});
app.get('/api/reports/summary',async(req,res,next)=>{try{let rows=filteredTests((await read(TESTS_FILE)).filter(r=>r.userId===req.user.id),req.query);if(!req.query.from&&!req.query.startDate&&!req.query.to&&!req.query.endDate){const days=Math.min(3650,Math.max(1,Number(req.query.days)||30));const since=Date.now()-days*86400000;rows=rows.filter(r=>Date.parse(r.timestamp)>=since);}res.json({status:'success',data:{...reportStats(rows),period:{from:req.query.from||req.query.startDate||null,to:req.query.to||req.query.endDate||null,location:req.query.location||null,quality:req.query.quality||null},dataQuality:rows.length===0?'insufficient data':(rows.some(r=>r.isMeasured!==true)?'contains simulated or unverified records':'measured records only')}});}catch(e){next(e)}});
app.get('/api/reports/trends',async(req,res,next)=>{try{const rows=filteredTests((await read(TESTS_FILE)).filter(r=>r.userId===req.user.id),req.query);const buckets=new Map();for(const r of rows){if(!r.timestamp)continue;const d=new Date(r.timestamp);if(!Number.isFinite(d.getTime()))continue;const key=d.toISOString().slice(0,10);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}const avg=(arr,k)=>{const v=arr.map(r=>r[k]).filter(Number.isFinite);return v.length?Number((v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)):null};const data=[...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,a])=>({date,count:a.length,latencyMs:avg(a,'latencyMs'),jitterMs:avg(a,'jitterMs'),packetLossPct:avg(a,'packetLossPct'),downloadMbps:avg(a,'downloadMbps'),uploadMbps:avg(a,'uploadMbps'),measured:a.filter(r=>r.isMeasured===true).length,simulated:a.filter(r=>r.isMeasured!==true).length}));res.json({status:'success',data,recordsUsed:rows.length,note:rows.length?'Daily averages use the same filtered persistent records. Null means no valid measurement.':'Insufficient saved records for a trend.'});}catch(e){next(e)}});
app.get('/api/reports/locations',async(req,res,next)=>{try{const rows=filteredTests((await read(TESTS_FILE)).filter(r=>r.userId===req.user.id),req.query);const groups=new Map();for(const r of rows){const name=String(r.locationName||'Location not shared');if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r);}const avg=(a,k)=>{const v=a.map(r=>r[k]).filter(Number.isFinite);return v.length?Number((v.reduce((x,y)=>x+y,0)/v.length).toFixed(2)):null};const data=[...groups.entries()].map(([location,a])=>({location,...reportStats(a),averageLatencyMs:avg(a,'latencyMs'),averageJitterMs:avg(a,'jitterMs'),averagePacketLossPct:avg(a,'packetLossPct'),averageDownloadMbps:avg(a,'downloadMbps'),averageUploadMbps:avg(a,'uploadMbps'),poorSharePct:a.length?Number((a.filter(r=>['Poor','Dead Zone','Unstable','Outage'].includes(r.quality)).length/a.length*100).toFixed(1)):null,consistentlyPoor:a.length>=3&&a.filter(r=>['Poor','Dead Zone','Unstable','Outage'].includes(r.quality)).length/a.length>=0.6})).sort((a,b)=>(b.poorSharePct??-1)-(a.poorSharePct??-1));res.json({status:'success',data,recordsUsed:rows.length,note:rows.length?'Location comparison uses persistent records and the active filters.':'Insufficient saved records for location comparison.'});}catch(e){next(e)}});
app.get('/api/reports.csv',async(req,res,next)=>{try{const rows=filteredTests((await read(TESTS_FILE)).filter(r=>r.userId===req.user.id),req.query);const cols=['id','timestamp','surveyName','locationName','lat','lng','accuracyMeters','locationSource','locationPrecision','indoorSurvey','signalDbm','signalQualityPct','estimatedSignalDbm','signalMethod','signalDbmIsEstimate','walkSessionId','sampleIndex','latencyMs','jitterMs','packetLossPct','downloadMbps','uploadMbps','quality','issueType','confidence','sequenceSampleCount','repeatedDeadZone','intermittent','disconnectCount','isMeasured','source','classificationSource','measurementError'];const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv=[cols.join(','),...rows.map(r=>cols.map(k=>esc(r[k])).join(','))].join('\r\n');res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="netspot-network-report.csv"'}).send(csv);}catch(e){next(e)}});
app.get('/api/reports.pdf',async(req,res,next)=>{try{const PDFDocument=require('pdfkit');const rows=filteredTests((await read(TESTS_FILE)).filter(r=>r.userId===req.user.id),req.query);const doc=new PDFDocument({size:'A4',margin:48,info:{Title:'NetSpot Network Survey Report',Author:'Network Dead Zone Detector'}});res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="netspot-network-report.pdf"'});doc.pipe(res);doc.fontSize(20).fillColor('#13233a').text('NETWORK DEAD ZONE DETECTOR',{align:'left'});doc.moveDown(.3).fontSize(15).fillColor('#167d8d').text('Network Survey Report');doc.moveDown(.5).fontSize(9).fillColor('#555').text(`Generated: ${new Date().toLocaleString()} | Records: ${rows.length}`);doc.moveDown().strokeColor('#167d8d').moveTo(48,doc.y).lineTo(547,doc.y).stroke();doc.moveDown();const qs=['Good','Moderate','Poor','Dead Zone','Unstable','Outage','Connectivity Failure'];doc.fontSize(11).fillColor('#111').text('Summary', {underline:true});doc.moveDown(.4);doc.fontSize(9);doc.text(`Total tests: ${rows.length}`);for(const q of qs)doc.text(`${q}: ${rows.filter(r=>r.quality===q).length}`);const avg=k=>{const a=rows.map(r=>r[k]).filter(Number.isFinite);return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2):'N/A'};doc.moveDown(.4).text(`Average latency: ${avg('latencyMs')} ms | Download: ${avg('downloadMbps')} Mbps | Upload: ${avg('uploadMbps')} Mbps | Packet loss: ${avg('packetLossPct')}%`);doc.moveDown(.4).fontSize(8).fillColor('#555').text('Location handling: coordinates are optional. Approximate mode rounds coordinates to 3 decimal places before storage; precise mode stores up to 5 decimal places. GPS accuracy is recorded when the browser provides it. Indoor survey flags identify potentially unreliable GPS fixes.',{width:499});doc.moveDown().fontSize(11).fillColor('#111').text('Measurement Records',{underline:true});doc.moveDown(.5);const headers=['Timestamp / Survey / Location','RSSI','Latency','Loss','Samples','Quality / Issue'];const widths=[170,55,55,45,45,120];let y=doc.y;let x=48;doc.fontSize(8).fillColor('#fff');doc.rect(48,y,499,20).fill('#167d8d');headers.forEach((h,i)=>{doc.fillColor('#fff').text(h,x+4,y+6,{width:widths[i]-8});x+=widths[i]});y+=20;rows.slice(0,500).forEach((r,i)=>{if(y>710){doc.addPage();y=48;}x=48;if(i%2===0)doc.rect(48,y,499,38).fill('#f1f6f8');const vals=[`${(r.timestamp||'').slice(0,19).replace('T',' ')}\n${r.surveyName||'Survey'} · ${r.locationName||'Location not shared'}\n${Number.isFinite(r.lat)&&Number.isFinite(r.lng)?`${r.lat}, ${r.lng}`:'Coordinates not recorded'}${r.accuracyMeters!=null?` · ±${r.accuracyMeters} m`:''}${r.indoorSurvey?' · Indoor':''}`,r.signalDbm==null?'N/A':`${r.signalDbm} dBm`,r.latencyMs==null?'N/A':`${r.latencyMs} ms`,r.packetLossPct==null?'N/A':`${r.packetLossPct}%`,r.sequenceSampleCount==null?'1':String(r.sequenceSampleCount),`${r.quality||'Unknown'}\n${r.issueType||''}\n${r.isMeasured===true?'Measured':'Unverified/simulated'}`];doc.fillColor('#182535').fontSize(7);vals.forEach((v,j)=>{doc.text(String(v),x+4,y+5,{width:widths[j]-8,height:32,ellipsis:true});x+=widths[j]});y+=38;});doc.moveDown();doc.fontSize(8).fillColor('#555').text('Methodology: configurable rule-based classification aggregates recent measurements at the same location. Repeated weak-signal/disconnect samples increase confidence; strong Wi-Fi with failed internet/server probes is classified separately as an outage. Browser-only JavaScript cannot reliably measure Wi-Fi RSSI: use a native OS collector and set isMeasured=true only for real observations. Treat simulated or missing inputs as provisional.',{width:499});doc.end();}catch(e){next(e)}});
app.use((req,res)=>res.status(404).json({status:'error',message:'API endpoint not found',path:req.path}));
app.use((err,req,res,next)=>{console.error(JSON.stringify({level:'error',event:'request_failed',method:req.method,path:req.path,message:err.message,stack:process.env.NODE_ENV==='production'?undefined:err.stack}));if(res.headersSent)return next(err);if(err instanceof SyntaxError && err.status===400 && 'body' in err)return res.status(400).json({status:'error',message:'Malformed JSON request body'});if(err.type==='entity.too.large')return res.status(413).json({status:'error',message:'Request payload exceeds the allowed size'});if(err.message==='Origin not allowed by CORS')return res.status(403).json({status:'error',message:'Origin not allowed by CORS'});res.status(err.status||500).json({status:'error',message:process.env.NODE_ENV==='production'?'Request failed':err.message||'Internal server error'});});
if(require.main===module){
 const server=app.listen(PORT,()=>console.log(JSON.stringify({level:'info',event:'server_started',port:PORT,nodeEnv:process.env.NODE_ENV||'development'})));
 server.requestTimeout=30000; server.headersTimeout=35000; server.keepAliveTimeout=5000;
 const shutdown=(signal)=>{console.log(JSON.stringify({level:'info',event:'shutdown_started',signal}));server.close(()=>{console.log(JSON.stringify({level:'info',event:'server_stopped'}));process.exit(0)});setTimeout(()=>process.exit(1),10000).unref();};
 process.on('SIGINT',()=>shutdown('SIGINT'));process.on('SIGTERM',()=>shutdown('SIGTERM'));
}
module.exports={app};
