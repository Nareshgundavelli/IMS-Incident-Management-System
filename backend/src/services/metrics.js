const { env } = require('../config/env');
const metrics = { accepted:0, rejected:0, processed:0, lastAccepted:0, queueDepth:0, startedAt: new Date().toISOString() };
function startMetricsLogger(){ setInterval(()=>{ const delta=metrics.accepted-metrics.lastAccepted; metrics.lastAccepted=metrics.accepted; console.log(`[metrics] signals/sec=${(delta/(env.METRICS_LOG_INTERVAL_MS/1000)).toFixed(2)} accepted=${metrics.accepted} processed=${metrics.processed} rejected=${metrics.rejected} queueDepth=${metrics.queueDepth}`); }, env.METRICS_LOG_INTERVAL_MS).unref(); }
module.exports = { metrics, startMetricsLogger };
