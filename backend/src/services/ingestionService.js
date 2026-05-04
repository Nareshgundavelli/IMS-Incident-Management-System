const { v4: uuid } = require('uuid');
const { pool } = require('../db/postgres');
const { connectMongo } = require('../db/mongo');
const { redis } = require('../db/redis');
const { env } = require('../config/env');
const { withRetry } = require('./retry');
const { metrics } = require('./metrics');
const { strategyFor } = require('../patterns/alertStrategies');
const queue = [];
const debounce = new Map();
function normalizeSignal(body){ const now = new Date(); return { id: uuid(), componentId: body.componentId, componentType: body.componentType, severity: body.severity || 'P3', message: body.message || 'No message', payload: body.payload || {}, occurredAt: body.occurredAt || now.toISOString(), receivedAt: now.toISOString() }; }
function enqueueSignal(body){ if(queue.length >= env.SIGNAL_QUEUE_MAX_SIZE){ metrics.rejected++; const err = new Error('Backpressure: signal queue is full'); err.statusCode = 503; throw err; } const signal = normalizeSignal(body); queue.push(signal); metrics.accepted++; metrics.queueDepth = queue.length; return signal; }
async function ensureWorkItem(signal){ const now = Date.now(); let entry = debounce.get(signal.componentId); if(entry && entry.expiresAt > now) return entry.workItemId;
  const workItemId = uuid(); debounce.set(signal.componentId, { workItemId, expiresAt: now + env.DEBOUNCE_WINDOW_MS });
  setTimeout(()=>debounce.delete(signal.componentId), env.DEBOUNCE_WINDOW_MS + 100).unref();
  const title = `${signal.severity} incident on ${signal.componentId}`;
  const result = await withRetry(()=>pool.query(`INSERT INTO work_items(id, component_id, component_type, severity, title, status, signal_count, first_signal_time, last_signal_time) VALUES($1,$2,$3,$4,$5,'OPEN',0,$6,$6) RETURNING *`, [workItemId, signal.componentId, signal.componentType, signal.severity, title, signal.occurredAt]), 'create work item');
  await redis.hset('dashboard:active', workItemId, JSON.stringify(result.rows[0]));
  await strategyFor(signal.componentType, signal.severity).send(result.rows[0]);
  return workItemId;
}
async function processSignal(signal){ const workItemId = await ensureWorkItem(signal); const mongo = await connectMongo();
  await withRetry(()=>mongo.collection('raw_signals').insertOne({ ...signal, workItemId }), 'insert raw signal');
  await withRetry(()=>pool.query(`UPDATE work_items SET signal_count = signal_count + 1, last_signal_time = GREATEST(last_signal_time, $2), updated_at=now() WHERE id=$1 RETURNING *`, [workItemId, signal.occurredAt]), 'update work item count');
  const bucket = new Date(Math.floor(new Date(signal.occurredAt).getTime()/60000)*60000).toISOString();
  await withRetry(()=>pool.query(`INSERT INTO signal_aggregations(bucket, component_id, severity, signal_count) VALUES($1,$2,$3,1) ON CONFLICT(bucket, component_id, severity) DO UPDATE SET signal_count = signal_aggregations.signal_count + 1`, [bucket, signal.componentId, signal.severity]), 'upsert aggregation');
  const wi = (await pool.query('SELECT * FROM work_items WHERE id=$1',[workItemId])).rows[0];
  if(wi.status !== 'CLOSED') await redis.hset('dashboard:active', workItemId, JSON.stringify(wi));
  metrics.processed++;
}
async function drain(){ const batch = queue.splice(0, env.SIGNAL_BATCH_SIZE); metrics.queueDepth = queue.length; await Promise.allSettled(batch.map(processSignal)); }
function startWorker(){ setInterval(drain, env.SIGNAL_PROCESS_INTERVAL_MS).unref(); }
module.exports = { enqueueSignal, startWorker, processSignal };
