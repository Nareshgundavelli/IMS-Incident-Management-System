const express = require('express');
const cors = require('cors');
const { pool } = require('./db/postgres');
const { connectMongo } = require('./db/mongo');
const { redis } = require('./db/redis');
const { env } = require('./config/env');
const signalRoutes = require('./routes/signalRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const { metrics, startMetricsLogger } = require('./services/metrics');
const fs = require('fs');
const path = require('path');
const { enqueueSignal, startWorker } = require('./services/ingestionService');
const app = express();
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit:'1mb' }));
app.get('/health', async (_req,res)=>{ try{ await pool.query('SELECT 1'); await connectMongo(); await redis.ping(); res.json({status:'ok', dependencies:{postgres:'ok',mongo:'ok',redis:'ok'}, startedAt:metrics.startedAt}); } catch(e){ res.status(503).json({status:'degraded', error:e.message}); } });
app.get('/metrics', (_req,res)=>res.type('text/plain').send(`# HELP ims_signals_accepted_total accepted signals\nims_signals_accepted_total ${metrics.accepted}\n# HELP ims_signals_processed_total processed signals\nims_signals_processed_total ${metrics.processed}\n# HELP ims_signal_queue_depth queue depth\nims_signal_queue_depth ${metrics.queueDepth}\n`));
app.use('/signals', signalRoutes);
app.use('/incidents', incidentRoutes);
app.use((err,_req,res,_next)=>{ console.error(err); res.status(err.statusCode || 400).json({ error: err.message || 'Unexpected error' }); });
if(require.main === module){ 
  startWorker(); 
  startMetricsLogger(); 
  
  // Auto-seed sample data on startup
  const seedFilePath = '/sample-data/failure-events.json';
  try {
    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    seedData.forEach(event => enqueueSignal(event));
    console.log(`Seeded ${seedData.length} sample signals`);
  } catch (error) {
    console.error('Failed to seed sample data:', error.message);
  }
  
  app.listen(env.BACKEND_PORT, ()=>console.log(`IMS backend listening on ${env.BACKEND_PORT}`)); 
}
module.exports = app;
