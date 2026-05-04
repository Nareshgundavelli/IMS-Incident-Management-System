const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { env } = require('../config/env');
const { enqueueSignal } = require('../services/ingestionService');
const router = express.Router();
const signalSchema = z.object({ componentId:z.string().min(1), componentType:z.enum(['API','MCP_HOST','CACHE','QUEUE','RDBMS','NOSQL']).default('API'), severity:z.enum(['P0','P1','P2','P3']).default('P3'), message:z.string().optional(), payload:z.record(z.any()).optional(), occurredAt:z.string().datetime().optional() });
router.post('/', rateLimit({ windowMs: env.INGESTION_RATE_LIMIT_WINDOW_MS, limit: env.INGESTION_RATE_LIMIT_MAX, standardHeaders:true, legacyHeaders:false }), (req,res,next)=>{ try { const signal = enqueueSignal(signalSchema.parse(req.body)); res.status(202).json({ accepted:true, signalId: signal.id }); } catch(e){ next(e); } });
module.exports = router;
